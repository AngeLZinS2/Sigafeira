import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, MotionConfig, useScroll, useSpring } from 'motion/react';
import * as m from 'motion/react-m';
import HomePage from './HomePage.jsx';
import AuthDialog from './AuthDialog.jsx';
import { auth, firebaseReady } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { createReport as createApiReport, deleteReport as deleteApiReport, fetchReports } from './api.js';
import { motionTokens, revealUp } from './motion.js';
import { useDialogA11y } from './useDialogA11y.js';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const CITY_CENTER = [-12.2577, -38.9598];
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const issueTypes = [
  { id: 'sidewalk', label: 'Calçada danificada', symbol: '↗' },
  { id: 'ramp', label: 'Falta de rampa', symbol: '⌁' },
  { id: 'obstacle', label: 'Obstáculo na passagem', symbol: '!' },
  { id: 'crossing', label: 'Travessia ou semáforo', symbol: '◉' },
  { id: 'other', label: 'Outro problema', symbol: '＋' },
];
const learningResources = [
  { title: 'Guia de acessibilidade urbana', category: 'Guia prático', description: 'Material introdutório sobre acessibilidade nos espaços urbanos.', file: '01-guia-de-acessibilidade-urbana.pdf' },
  { title: 'Calçada acessível', category: 'Calçadas', description: 'Orientações sobre acessibilidade e circulação pelas calçadas.', file: '02-calcada-acessivel.pdf' },
  { title: 'Rampas e acessibilidade', category: 'Rotas acessíveis', description: 'Material sobre rampas e acessibilidade nos percursos urbanos.', file: '03-rampas-e-acessibilidade.pdf' },
  { title: 'Acessibilidade e deficiência visual', category: 'Acessibilidade', description: 'Conteúdo dedicado à acessibilidade de pessoas com deficiência visual.', file: '04-acessibilidade-e-deficiencia-visual.pdf' },
  { title: 'Acessibilidade para todos', category: 'Inclusão', description: 'Material de conscientização sobre acessibilidade e inclusão.', file: '05-acessibilidade-para-todos.pdf' },
  { title: 'Como identificar barreiras', category: 'Guia prático', description: 'Aprenda a reconhecer problemas de acessibilidade no caminho.', file: '06-como-identificar-barreiras.pdf' },
  { title: 'Como denunciar pelo SIGA', category: 'Use o SIGA', description: 'Orientações para registrar uma ocorrência de acessibilidade no sistema.', file: '07-como-denunciar-pelo-siga.pdf' },
  { title: 'Direitos e acessibilidade', category: 'Direitos', description: 'Material informativo sobre direitos e acessibilidade.', file: '08-direitos-e-acessibilidade.pdf' },
  { title: 'Acessibilidade em Feira de Santana', category: 'Nossa cidade', description: 'Conteúdo sobre acessibilidade com foco em Feira de Santana.', file: '09-acessibilidade-em-feira-de-santana.pdf' },
  { title: 'Manual de conscientização', category: 'Conscientização', description: 'Material para apoiar conversas sobre acessibilidade e inclusão.', file: '10-manual-de-conscientizacao.pdf' },
];
const navigationItems = [
  { id: 'inicio', label: 'Início' },
  { id: 'como-funciona', label: 'Como funciona' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'materiais', label: 'Materiais' },
];
const reportIcon = L.divIcon({
  className: 'siga-pin-wrap',
  html: '<span class="siga-pin"><span>S</span></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 32],
  popupAnchor: [0, -30],
});
const selectedIcon = L.divIcon({
  className: 'siga-pin-wrap siga-pin-selected',
  html: '<span class="siga-pin"><span>S</span></span>',
  iconSize: [32, 40],
  iconAnchor: [16, 35],
});

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.3 4.3" /></>,
    locate: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" /><path d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20M8 7h7" /></>,
    camera: <><path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><circle cx="11" cy="13" r="3" /><path d="m14 5 1.5-2H19l1.5 2" /><path d="M18 2v6m-3-3h6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function MapCamera({ destination }) {
  const map = useMap();
  useEffect(() => {
    if (destination) map.flyTo([destination.lat, destination.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [destination, map]);
  return null;
}

function MapClickCapture({ active, onSelect }) {
  useMapEvents({
    click(event) {
      if (active) onSelect({ lat: Number(event.latlng.lat.toFixed(6)), lng: Number(event.latlng.lng.toFixed(6)) });
    },
  });
  return null;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function App() {
  const { scrollYProgress } = useScroll();
  const pageProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [reportAfterLogin, setReportAfterLogin] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsAvailable, setReportsAvailable] = useState(false);
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const [tileUnavailable, setTileUnavailable] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');
  const reportDialogRef = useRef(null);
  useDialogA11y(reportDialogRef, formOpen, () => setFormOpen(false));

  useEffect(() => {
    if (!firebaseReady) {
      setReportsLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
  }, []);

  useEffect(() => {
    let active = true;
    setReportsLoading(true);
    fetchReports(auth).then((items) => {
      if (active) {
        setReports(items);
        setReportsAvailable(true);
      }
    }).catch((error) => {
      console.error('Erro ao carregar ocorrências da API:', error);
      if (active) {
        setReports([]);
        setReportsAvailable(false);
        setToast('Não foi possível carregar as ocorrências. Verifique a API do SIGA.');
      }
    }).finally(() => {
      if (active) setReportsLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const sections = navigationItems.map(({ id }) => document.getElementById(id)).filter(Boolean);
    if (!('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length) {
        visible.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        setActiveSection(visible[0].target.id);
      }
    }, { rootMargin: '-20% 0px -62% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const visibleReports = useMemo(() => reports.filter((report) => {
    const category = issueTypes.find((item) => item.id === report.issue)?.label || report.issue;
    const matchesFilter = filter === 'Todos' || category === filter;
    const matchesQuery = `${category} ${report.description || ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
    return matchesFilter && matchesQuery;
  }), [reports, filter, query]);

  const openReportForm = () => {
    if (!user) {
      setReportAfterLogin(true);
      setAuthOpen(true);
      return;
    }
    setIssue('');
    setDescription('');
    setPhotoFile(null);
    setSelectedPoint(null);
    setFormOpen(true);
  };

  const chooseOnMap = () => {
    setFormOpen(false);
    setIsPicking(true);
    setToast('Toque no mapa para marcar o local da ocorrência.');
    document.getElementById('mapa')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  const handleMapPoint = (point) => {
    setSelectedPoint(point);
    setCameraTarget(point);
    setIsPicking(false);
    setFormOpen(true);
  };

  const handlePhotoChange = (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.has(file.type)) {
      setToast('Escolha uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setToast('A foto deve ter no máximo 8 MB.');
      return;
    }
    setPhotoFile(file);
  };

  const locateUser = (forReport = true) => {
    if (!navigator.geolocation) {
      setToast('Este navegador não oferece acesso à localização.');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const point = { lat: Number(position.coords.latitude.toFixed(6)), lng: Number(position.coords.longitude.toFixed(6)) };
      if (forReport) setSelectedPoint(point);
      setCameraTarget(point);
      setGeoBusy(false);
      setToast(forReport ? 'Localização adicionada. Confirme o ponto e registre o relato.' : 'Mapa centralizado na sua localização.');
    }, () => {
      setGeoBusy(false);
      setToast('Não foi possível obter sua localização. Você pode marcar o ponto no mapa.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  };

  const saveReport = async (event) => {
    event.preventDefault();
    if (!user) {
      setFormOpen(false);
      openReportForm();
      return;
    }
    if (!firebaseReady) { setToast('O Firebase ainda não está configurado neste ambiente.'); return; }
    if (!issue) { setToast('Escolha o tipo de problema.'); return; }
    if (!selectedPoint) { setToast('Marque o local no mapa ou use sua localização.'); return; }
    try {
      const report = {
        issue,
        description: description.trim(),
        lat: selectedPoint.lat,
        lng: selectedPoint.lng,
      };
      const savedReport = await createApiReport(auth, report, photoFile);
      setReports((items) => [savedReport, ...items.filter((item) => item.id !== savedReport.id)]);
      setFormOpen(false);
      setSelectedPoint(null);
      setPhotoFile(null);
      setCameraTarget(savedReport);
      setToast('Ocorrência enviada e publicada no mapa.');
    } catch (error) {
      console.error('Erro ao salvar ocorrência:', error);
      setToast(error.message || 'Não foi possível enviar a ocorrência. Tente novamente.');
    }
  };

  const removeReport = async (id) => {
    if (!user) return;
    try {
      await deleteApiReport(auth, id);
      setReports((items) => items.filter((item) => item.id !== id));
      setToast('Sua ocorrência foi removida.');
    } catch (error) {
      console.error('Erro ao remover ocorrência:', error);
      setToast('Não foi possível remover esta ocorrência.');
    }
  };

  const focusReport = (report) => setCameraTarget(report);

  return (
    <MotionConfig reducedMotion="user"><LazyMotion features={domAnimation} strict>
      <div className="app-shell">
        <m.div className="scroll-progress" style={{ scaleX: pageProgress }} aria-hidden="true" />
        <header className="topbar">
          <a className="brand" href="#inicio" aria-label="SIGA, início">
            <img className="brand-logo" src="/assets/siga-logo.jpeg" alt="SIGA" />
            <span className="brand-tagline">ACESSIBILIDADE<br />URBANA</span>
          </a>
          <nav className="main-nav" aria-label="Navegação principal">
            {navigationItems.map((item) => <a key={item.id} className={activeSection === item.id ? 'nav-active' : ''} href={`#${item.id}`} onClick={() => setActiveSection(item.id)}>{item.label}</a>)}
          </nav>
          <div className="top-actions">
            <span className="service-status"><i /> {reportsLoading ? 'Conectando…' : reportsAvailable ? 'Ocorrências públicas' : 'API indisponível'}</span>
            {user
              ? <div className="user-menu"><span className="user-greeting">{user.displayName || user.email}</span><button className="button button-outline button-small" onClick={() => signOut(auth)}>Sair</button></div>
              : <button className="button button-outline button-small" onClick={() => { setReportAfterLogin(false); setAuthOpen(true); }}>Entrar</button>}
            <button className="button button-primary button-small" onClick={openReportForm} aria-label="Nova ocorrência"><Icon name="plus" size={16} /><span className="button-label">Nova ocorrência</span></button>
          </div>
        </header>

        <main id="conteudo">
          <HomePage onReport={openReportForm} reportCount={reports.length} />
          <section className="workspace" id="mapa">
            <div className="workspace-heading">
              <div><span className="section-kicker">EXPLORAR A CIDADE</span><h2>Mapa de acessibilidade</h2></div>
              <div className="map-data-badge"><Icon name="layers" size={14} /> OpenStreetMap · ruas e quadras</div>
            </div>

            <div className={`map-workspace ${isPicking ? 'map-picking' : ''}`}>
              <div className="map-stage">
                <MapContainer center={CITY_CENTER} zoom={13} minZoom={11} maxZoom={19} zoomControl={false} scrollWheelZoom className="city-map" aria-label="Mapa de Feira de Santana">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                    url={MAP_TILE_URL}
                    maxZoom={19}
                    eventHandlers={{ tileerror: () => setTileUnavailable(true), tileload: () => setTileUnavailable(false) }}
                  />
                  <ZoomControl position="bottomright" />
                  <MapClickCapture active={isPicking} onSelect={handleMapPoint} />
                  <MapCamera destination={cameraTarget} />
                  {visibleReports.map((report) => (
                    <Marker key={report.id} position={[report.lat, report.lng]} icon={reportIcon} eventHandlers={{ click: () => focusReport(report) }}>
                      <Popup className="siga-popup">
                        <div className="popup-content"><span className="popup-type">{issueTypes.find((item) => item.id === report.issue)?.label || report.issue}</span><p>{report.description || 'Sem descrição adicional.'}</p>{report.photoUrl && <img className="popup-photo" src={report.photoUrl} alt="Foto da ocorrência" loading="lazy" />}<small>{formatDate(report.createdAt)} · relato da comunidade</small></div>
                      </Popup>
                    </Marker>
                  ))}
                  {selectedPoint && <Marker position={[selectedPoint.lat, selectedPoint.lng]} icon={selectedIcon} zIndexOffset={1000} />}
                </MapContainer>

                <div className="map-top-controls">
                  <div className="map-live-label"><span className="map-live-pulse" /> MAPA INTERATIVO</div>
                  <button className="map-control-button" onClick={() => locateUser(false)} disabled={geoBusy} aria-label="Centralizar na minha localização" title="Centralizar na minha localização"><Icon name="locate" size={17} /></button>
                </div>
                <div className="map-bottom-note"><Icon name="layers" size={15} /><span>Mapa base atualizado pela comunidade OpenStreetMap</span></div>
                <AnimatePresence>{tileUnavailable && <m.div className="tile-warning" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: motionTokens.duration.interaction, ease: motionTokens.ease }} role="status">Não foi possível carregar parte do mapa. Verifique a conexão.</m.div>}</AnimatePresence>
                <AnimatePresence>
                  {isPicking && <m.div className="map-pick-banner" initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }} transition={{ duration: motionTokens.duration.interaction, ease: motionTokens.ease }}>
                    <span><Icon name="pin" size={17} /> Toque no mapa para marcar o local</span>
                    <button onClick={() => setIsPicking(false)}>Cancelar</button>
                  </m.div>}
                </AnimatePresence>
              </div>

              <aside className="reports-panel" id="ocorrencias">
                <div className="panel-heading">
                  <div><span className="section-kicker">PARTICIPAÇÃO LOCAL</span><h3>Ocorrências</h3></div>
                  <span className="panel-count">{visibleReports.length}</span>
                </div>
                <p className="panel-subtitle">{reportsLoading ? 'Carregando ocorrências…' : 'Relatos enviados pela comunidade.'}</p>
                <button className="button button-outline report-cta" onClick={openReportForm}><Icon name="plus" size={16} /> {user ? 'Registrar ocorrência' : 'Entre para registrar'}</button>
                <label className="search-box"><Icon name="search" size={17} /><span className="visually-hidden">Buscar ocorrências</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nos seus relatos" /></label>
                <div className="filter-row" role="group" aria-label="Filtrar ocorrências">
                  {['Todos', ...issueTypes.map((item) => item.label)].map((option) => <button key={option} className={filter === option ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter(option)}>{option === 'Todos' ? 'Todos' : option.split(' ')[0]}</button>)}
                </div>
                <div className="report-list" aria-live="polite" aria-busy={reportsLoading}>
                  {reportsLoading ? <div className="report-skeleton-list" role="status" aria-label="Carregando ocorrências">
                    {Array.from({ length: 4 }, (_, index) => <div className="report-skeleton" key={index} aria-hidden="true"><span /><i><b /><b /></i></div>)}
                  </div> : <AnimatePresence initial={false}>
                    {visibleReports.map((report, index) => {
                      const ReportCard = index < 6 ? m.article : 'article';
                      const entrance = index < 6 ? {
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        exit: { opacity: 0, y: -4 },
                        transition: { duration: motionTokens.duration.interaction, delay: Math.min(index * 0.025, 0.125), ease: motionTokens.ease },
                      } : {};
                      return <ReportCard className="report-card" key={report.id} {...entrance}>
                        <button className="report-main" onClick={() => focusReport(report)} aria-label={`Ver no mapa: ${issueTypes.find((item) => item.id === report.issue)?.label || report.issue}`}>
                          <span className="report-dot"><Icon name="pin" size={15} /></span>
                          <span className="report-copy"><strong>{issueTypes.find((item) => item.id === report.issue)?.label || report.issue}</strong><small>{formatDate(report.createdAt)}</small>{report.description && <span className="report-description">{report.description}</span>}</span>
                          <Icon name="arrow" size={15} />
                        </button>
                        {report.canDelete && <button className="remove-report" onClick={() => removeReport(report.id)} aria-label="Remover esta ocorrência">Remover</button>}
                      </ReportCard>;
                    })}
                  </AnimatePresence>}
                  {!reportsLoading && visibleReports.length === 0 && <m.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span className="empty-illustration"><Icon name="pin" size={22} /></span>
                    <strong>{reports.length === 0 ? 'Sua cidade começa no mapa.' : 'Nenhuma ocorrência encontrada.'}</strong>
                    <p>{reports.length === 0 ? 'Os relatos aparecerão aqui depois que forem registrados.' : 'Experimente mudar o filtro ou a busca.'}</p>
                    {reports.length === 0 && <button onClick={openReportForm}>Adicionar primeiro relato <span>↗</span></button>}
                  </m.div>}
                </div>
                <div className="privacy-callout"><Icon name="shield" size={17} /><p><strong>Relatos visíveis no mapa público.</strong><br />Seu e-mail não é exibido. As informações da ocorrência e o ponto marcado ficam disponíveis para a comunidade.</p></div>
                <a className="resources-callout-link" href="#materiais"><Icon name="layers" size={15} /> Consultar guias de acessibilidade</a>
              </aside>
            </div>
          </section>

          <section className="about-strip" id="sobre">
            <div className="about-icon"><Icon name="compass" size={22} /></div>
            <div><span className="section-kicker">DADOS DO MAPA</span><h3>Uma base aberta, atualizada pela comunidade</h3><p>O mapa de ruas vem do OpenStreetMap. A cobertura e a data de atualização variam por região, conforme as contribuições locais.</p></div>
            <a href="https://www.openstreetmap.org/#map=13/-12.2577/-38.9598" target="_blank" rel="noreferrer">Abrir no OpenStreetMap <Icon name="arrow" size={15} /></a>
            <a className="map-fix-link" href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Sugerir correção do mapa</a>
          </section>

          <section className="resource-library" id="materiais" aria-labelledby="materials-title">
            <div className="resource-heading">
              <div>
                <span className="section-kicker">INFORMAÇÃO TAMBÉM MUDA A CIDADE</span>
                <h2 id="materials-title">Materiais sobre acessibilidade</h2>
                <p>Guias para reconhecer barreiras, conhecer direitos e participar de uma cidade mais acessível.</p>
              </div>
              <span className="resource-total"><Icon name="layers" size={16} /> {learningResources.length} materiais</span>
            </div>
            <div className="resource-grid">
              {learningResources.map((resource, index) => (
                <m.article className="resource-card" key={resource.file} initial="hidden" whileInView="visible" variants={revealUp} viewport={{ once: true, amount: 0.15 }} transition={{ delay: Math.min(index % 4, 3) * 0.055 }}>
                  <div className="resource-card-top"><span className="resource-number">{String(index + 1).padStart(2, '0')}</span><span className="resource-category">{resource.category}</span></div>
                  <h3>{resource.title}</h3>
                  <p>{resource.description}</p>
                  <a className="resource-link" href={`/materiais/${resource.file}`} target="_blank" rel="noreferrer" aria-label={`Abrir PDF: ${resource.title}`}>
                    <span>ABRIR PDF</span><Icon name="arrow" size={16} />
                  </a>
                </m.article>
              ))}
            </div>
            <p className="resource-note">Os materiais abrem em uma nova aba. No leitor de PDF, você pode ler ou baixar o arquivo.</p>
          </section>
        </main>

        <nav className="mobile-bottom-nav" aria-label="Navegação principal móvel">
          <a className={`mobile-bottom-item ${activeSection === 'inicio' ? 'nav-active' : ''}`} href="#inicio" aria-current={activeSection === 'inicio' ? 'location' : undefined} onClick={() => setActiveSection('inicio')}>
            <Icon name="home" size={18} /><span>Início</span>
          </a>
          <a className={`mobile-bottom-item ${activeSection === 'como-funciona' ? 'nav-active' : ''}`} href="#como-funciona" aria-current={activeSection === 'como-funciona' ? 'location' : undefined} onClick={() => setActiveSection('como-funciona')}>
            <Icon name="info" size={18} /><span>Como</span>
          </a>
          <span className="mobile-bottom-spacer" aria-hidden="true" />
          <a className={`mobile-bottom-item ${activeSection === 'mapa' ? 'nav-active' : ''}`} href="#mapa" aria-current={activeSection === 'mapa' ? 'location' : undefined} onClick={() => setActiveSection('mapa')}>
            <Icon name="pin" size={18} /><span>Mapa</span>
          </a>
          <a className={`mobile-bottom-item ${activeSection === 'materiais' ? 'nav-active' : ''}`} href="#materiais" aria-current={activeSection === 'materiais' ? 'location' : undefined} onClick={() => setActiveSection('materiais')}>
            <Icon name="book" size={18} /><span>Guias</span>
          </a>
          <button className="mobile-bottom-fab" type="button" onClick={openReportForm} aria-label="Nova ocorrência">
            <Icon name="plus" size={23} />
          </button>
        </nav>

        <footer className="footer"><a className="brand footer-brand" href="#inicio" aria-label="SIGA, início"><img className="brand-logo" src="/assets/siga-logo.jpeg" alt="SIGA" /></a><a className="footer-resource-link" href="#materiais">Materiais educativos</a><span>Projeto de participação por uma cidade acessível.</span><a className="footer-creator" href="https://github.com/AngeLZinS2" target="_blank" rel="noreferrer" aria-label="GitHub do criador Angelo">Criado por Angelo · @AngeLZinS2</a><span>Feira de Santana · BA</span></footer>

        <AnimatePresence>
          {formOpen && <m.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
            <m.section ref={reportDialogRef} className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title" tabIndex={-1} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.99 }} transition={{ type: 'spring', damping: 30, stiffness: 360 }}>
              <div className="dialog-top"><div><span className="section-kicker">NOVO RELATO</span><h2 id="report-title">Marcar uma ocorrência</h2><p>Ajude a identificar uma barreira de acessibilidade.</p></div><button className="icon-button" onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><Icon name="close" /></button></div>
              <form onSubmit={saveReport}>
                <fieldset className="issue-fieldset"><legend>O que está dificultando a passagem?</legend><div className="issue-grid">
                  {issueTypes.map((item) => <label className={`issue-choice ${issue === item.id ? 'selected' : ''}`} key={item.id}><input type="radio" name="issue" value={item.id} checked={issue === item.id} onChange={() => setIssue(item.id)} /><span className="issue-symbol">{item.symbol}</span><span>{item.label}</span></label>)}
                </div></fieldset>
                <label className="form-label" htmlFor="report-description">Descrição <span>opcional</span></label>
                <textarea id="report-description" value={description} onChange={(event) => setDescription(event.target.value.slice(0, 400))} rows="3" placeholder="Ex.: A calçada está quebrada e dificulta a passagem." />
                <div className="photo-field">
                  <input className="visually-hidden" id="report-photo" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={handlePhotoChange} />
                  <div className="photo-field-heading"><strong>Foto <span>opcional</span></strong><small>JPG, PNG ou WebP · até 8 MB</small></div>
                  {photoFile ? <div className="photo-preview"><img src={photoPreview} alt="Pré-visualização da foto do relato" /><span><strong>{photoFile.name}</strong><small>Será analisada antes de aparecer no mapa.</small></span><button type="button" onClick={() => setPhotoFile(null)} aria-label="Remover foto"><Icon name="close" size={17} /></button></div> : <label className="photo-upload-button" htmlFor="report-photo"><Icon name="camera" size={18} /><span>Adicionar uma foto</span></label>}
                  <p className="photo-moderation-note">As fotos passam por uma verificação automática de conteúdo antes da publicação.</p>
                </div>
                <div className="location-heading"><strong>Onde fica o problema?</strong><span>{selectedPoint ? 'Local escolhido. Você pode marcar outro ponto se precisar.' : 'Marque um ponto no mapa ou use sua localização atual.'}</span></div>
                <div className="location-actions"><button type="button" className="button button-outline" onClick={chooseOnMap}><Icon name="pin" size={17} /> Marcar no mapa</button><button type="button" className="button button-outline" disabled={geoBusy} onClick={locateUser}><Icon name="locate" size={17} /> {geoBusy ? 'Localizando…' : 'Usar minha localização'}</button></div>
                {selectedPoint && <div className="location-confirmation" role="status"><Icon name="pin" size={15} /><span><strong>Ponto marcado no mapa</strong><small>{selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}</small></span><button type="button" onClick={() => setSelectedPoint(null)} aria-label="Limpar ponto escolhido"><Icon name="close" size={15} /></button></div>}
                <p className="form-privacy"><Icon name="shield" size={14} /> O relato e o ponto marcado ficam visíveis no mapa público; seu e-mail não será exibido.</p>
                <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="button button-primary" disabled={!issue || !selectedPoint}>Salvar ocorrência <span>↗</span></button></div>
              </form>
            </m.section>
          </m.div>}
        </AnimatePresence>
        <AnimatePresence>
          {authOpen && <AuthDialog key="auth-dialog" onClose={() => { setAuthOpen(false); setReportAfterLogin(false); }} onAuthenticated={(signedInUser) => {
            setUser(signedInUser);
            setToast(`Bem-vindo${signedInUser.displayName ? ', ' + signedInUser.displayName.split(' ')[0] : ''}!`);
            if (reportAfterLogin) {
              setReportAfterLogin(false);
              setIssue('');
              setDescription('');
              setPhotoFile(null);
              setSelectedPoint(null);
              setFormOpen(true);
            }
          }} />}
        </AnimatePresence>
        <AnimatePresence>{toast && <m.div className="toast-message" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: motionTokens.duration.interaction, ease: motionTokens.ease }}><span className="toast-mark">i</span>{toast}</m.div>}</AnimatePresence>
      </div>
    </LazyMotion></MotionConfig>
  );
}

export default App;









