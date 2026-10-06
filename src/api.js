const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function normalizeReport(report) {
  return {
    id: report.id,
    issue: report.issue,
    description: report.description || '',
    lat: Number(report.lat),
    lng: Number(report.lng),
    createdAt: report.createdAt || new Date().toISOString(),
    canDelete: report.canDelete === true,
    photoUrl: report.photoUrl || null,
  };
}

async function request(path, { auth, method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (auth?.currentUser) {
    const idToken = await auth.currentUser.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let result = null;
  if (text) {
    try { result = JSON.parse(text); }
    catch { throw new Error('A API do SIGA retornou uma resposta inválida.'); }
  }
  if (!response.ok) {
    const message = result?.message || result?.error;
    throw new Error(message || `A API do SIGA respondeu com erro ${response.status}.`);
  }
  return result;
}

export async function fetchReports(auth) {
  const result = await request('/reports', { auth });
  const reports = Array.isArray(result) ? result : result?.reports;
  if (!Array.isArray(reports)) throw new Error('A API deve retornar uma lista de ocorrências.');
  return reports
    .map(normalizeReport)
    .filter((report) => Number.isFinite(report.lat) && Number.isFinite(report.lng));
}

export async function createReport(auth, report, photo) {
  if (!auth?.currentUser) throw new Error('Entre para registrar uma ocorrência.');
  let body = report;
  if (photo) {
    body = new FormData();
    Object.entries(report).forEach(([key, value]) => body.append(key, String(value)));
    body.append('photo', photo, photo.name);
  }
  const result = await request('/reports', { auth, method: 'POST', body });
  const saved = result?.report || result;
  if (!saved?.id) throw new Error('A API não retornou o identificador da ocorrência criada.');
  return normalizeReport(saved);
}

export async function deleteReport(auth, id) {
  if (!auth?.currentUser) throw new Error('Entre para remover uma ocorrência.');
  return request(`/reports/${encodeURIComponent(id)}`, { auth, method: 'DELETE' });
}
