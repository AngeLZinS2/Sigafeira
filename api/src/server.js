import express from 'express';
import pg from 'pg';
import multer from 'multer';
import sharp from 'sharp';
import { createPublicKey, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { jwtVerify } from 'jose';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as nsfwjs from 'nsfwjs';

const { Pool } = pg;
const PORT = Number(process.env.PORT || 3000);
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'siga-be825';
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './uploads');
const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

const allowedIssues = new Set(['sidewalk', 'ramp', 'obstacle', 'crossing', 'other']);
const allowedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let firebaseCerts = null;
let firebaseCertsExpiresAt = 0;
let moderationModel = null;
let moderationModelError = null;
let activeModerations = 0;

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_MAX_BYTES, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedPhotoTypes.has(file.mimetype)) {
      const error = new Error('Envie uma foto JPG, PNG ou WebP.');
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

async function initializeModerator() {
  try {
    tf.enableProdMode();
    await tf.setBackend('cpu');
    await tf.ready();
    moderationModel = await nsfwjs.load('MobileNetV2');
    console.log('Local photo moderation model ready.');
  } catch (error) {
    moderationModelError = error;
    console.error('Local photo moderation model unavailable:', error.message);
  }
}

async function getFirebaseCertificate(kid) {
  if (!firebaseCerts || Date.now() >= firebaseCertsExpiresAt || !firebaseCerts[kid]) {
    const response = await fetch(FIREBASE_CERTS_URL);
    if (!response.ok) throw new Error('Não foi possível consultar os certificados de autenticação.');
    firebaseCerts = await response.json();
    const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 300);
    firebaseCertsExpiresAt = Date.now() + maxAge * 1000;
  }
  if (!firebaseCerts[kid]) throw new Error('Certificado de autenticação desconhecido.');
  return createPublicKey(firebaseCerts[kid]);
}

async function getUser(req, { optional = false } = {}) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    if (optional) return null;
    const error = new Error('Entre na sua conta para continuar.');
    error.status = 401;
    throw error;
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), (protectedHeader) => getFirebaseCertificate(protectedHeader.kid), {
      algorithms: ['RS256'],
      audience: PROJECT_ID,
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
      throw new Error('Token sem identificador de usuário válido.');
    }
    return { uid: payload.sub };
  } catch {
    const error = new Error('Sua sessão expirou. Entre novamente.');
    error.status = 401;
    throw error;
  }
}

async function requireAuthenticatedUser(req, _res, next) {
  try {
    req.sigaUser = await getUser(req);
    next();
  } catch (error) {
    next(error);
  }
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      issue TEXT NOT NULL CHECK (issue IN ('sidewalk', 'ramp', 'obstacle', 'crossing', 'other')),
      description VARCHAR(400) NOT NULL DEFAULT '',
      lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
      lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
      owner_uid TEXT NOT NULL,
      photo_filename TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE reports ADD COLUMN IF NOT EXISTS photo_filename TEXT;
    CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports (created_at DESC);
  `);
}

async function normalizePhoto(buffer) {
  const source = sharp(buffer, { failOn: 'error', limitInputPixels: 20_000_000 });
  const metadata = await source.metadata();
  if (!allowedPhotoTypes.has(`image/${metadata.format === 'jpg' ? 'jpeg' : metadata.format}`)) {
    const error = new Error('O arquivo não é uma imagem JPG, PNG ou WebP válida.');
    error.status = 400;
    throw error;
  }
  if (!metadata.width || !metadata.height || metadata.width < 80 || metadata.height < 80) {
    const error = new Error('A foto precisa ter pelo menos 80 × 80 pixels.');
    error.status = 400;
    throw error;
  }
  return source.rotate().toColourspace('srgb').flatten({ background: '#fff' }).resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 }).toBuffer();
}

async function isPhotoSafe(buffer) {
  if (!moderationModel) {
    const error = new Error('A verificação de fotos está indisponível. Tente novamente mais tarde.');
    error.status = 503;
    throw error;
  }
  if (activeModerations >= 2) {
    const error = new Error('A análise de fotos está ocupada. Aguarde um instante e tente novamente.');
    error.status = 503;
    throw error;
  }
  activeModerations += 1;
  try {
    const { data, info } = await sharp(buffer).toColourspace('srgb').flatten({ background: '#fff' }).resize(224, 224, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const tensor = tf.tensor3d(pixels, [info.height, info.width, info.channels], 'int32');
    try {
      const predictions = await moderationModel.classify(tensor);
      const scores = Object.fromEntries(predictions.map(({ className, probability }) => [className, probability]));
      return (scores.Porn || 0) < 0.25 && (scores.Hentai || 0) < 0.25 && (scores.Sexy || 0) < 0.8;
    } finally {
      tensor.dispose();
    }
  } finally {
    activeModerations -= 1;
  }
}

function reportColumns(uidParameter = '$1') {
  return `id::text AS id, issue, description, lat, lng,
    created_at AS "createdAt",
    (${uidParameter}::text IS NOT NULL AND owner_uid = ${uidParameter}) AS "canDelete",
    CASE WHEN photo_filename IS NOT NULL THEN '/api/photos/' || photo_filename ELSE NULL END AS "photoUrl"`;
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', photoModeration: moderationModel ? 'ready' : moderationModelError ? 'unavailable' : 'loading' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.get('/reports', async (req, res, next) => {
  try {
    const user = await getUser(req, { optional: true });
    const { rows } = await pool.query(
      `SELECT ${reportColumns()} FROM reports ORDER BY created_at DESC LIMIT 500`,
      [user?.uid || null],
    );
    res.set('Cache-Control', 'no-store').json({ reports: rows });
  } catch (error) { next(error); }
});

app.post('/reports', requireAuthenticatedUser, photoUpload.single('photo'), async (req, res, next) => {
  let photoFilename;
  try {
    const user = req.sigaUser;
    const { issue, description = '', lat, lng } = req.body || {};
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!allowedIssues.has(issue)) return res.status(400).json({ message: 'Selecione um tipo de ocorrência válido.' });
    if (typeof description !== 'string' || description.length > 400) {
      return res.status(400).json({ message: 'A descrição deve ter até 400 caracteres.' });
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: 'Informe uma localização válida no mapa.' });
    }

    if (req.file) {
      const normalizedPhoto = await normalizePhoto(req.file.buffer);
      if (!await isPhotoSafe(normalizedPhoto)) {
        return res.status(422).json({ message: 'A foto não passou na verificação de conteúdo. Escolha outra imagem.' });
      }
      photoFilename = `${randomUUID()}.webp`;
      await writeFile(path.join(UPLOADS_DIR, photoFilename), normalizedPhoto, { flag: 'wx' });
    }

    const { rows } = await pool.query(
      `INSERT INTO reports (issue, description, lat, lng, owner_uid, photo_filename)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${reportColumns('$5')}`,
      [issue, description.trim(), latitude, longitude, user.uid, photoFilename || null],
    );
    res.status(201).json({ report: rows[0] });
  } catch (error) {
    if (photoFilename) await unlink(path.join(UPLOADS_DIR, photoFilename)).catch(() => {});
    next(error);
  }
});

app.get('/photos/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!/^[a-f0-9-]{36}\.webp$/.test(filename)) return res.sendStatus(404);
    const { rowCount } = await pool.query('SELECT 1 FROM reports WHERE photo_filename = $1', [filename]);
    if (!rowCount) return res.sendStatus(404);
    res.set({ 'Cache-Control': 'public, max-age=86400, immutable', 'X-Content-Type-Options': 'nosniff' });
    res.type('image/webp').sendFile(path.join(UPLOADS_DIR, filename), (error) => { if (error) next(error); });
  } catch (error) { next(error); }
});

app.delete('/reports/:id', async (req, res, next) => {
  try {
    const user = await getUser(req);
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ message: 'Ocorrência não encontrada.' });
    const { rows } = await pool.query(
      'DELETE FROM reports WHERE id = $1 AND owner_uid = $2 RETURNING photo_filename',
      [req.params.id, user.uid],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Ocorrência não encontrada.' });
    if (rows[0].photo_filename) await unlink(path.join(UPLOADS_DIR, rows[0].photo_filename)).catch(() => {});
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error('Erro na API SIGA:', error);
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'A foto deve ter no máximo 8 MB.' });
  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ message: 'Envie somente uma foto por ocorrência.' });
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Erro interno ao processar a solicitação.' });
});

await mkdir(UPLOADS_DIR, { recursive: true });
await initializeDatabase();
initializeModerator();
app.listen(PORT, '0.0.0.0', () => console.log(`SIGA API listening on port ${PORT}`));

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
