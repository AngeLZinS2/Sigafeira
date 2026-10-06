import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { motionTokens } from './motion.js';

function HomeIcon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Reveal({ children, className = '', delay = 0, direction = 'up' }) {
  const reduceMotion = useReducedMotion();
  const offset = reduceMotion ? { x: 0, y: 0 } : direction === 'left' ? { x: motionTokens.distance.medium } : direction === 'right' ? { x: -motionTokens.distance.medium } : { y: motionTokens.distance.medium };
  return <m.div className={className} initial={{ opacity: 0, ...offset }} whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: reduceMotion ? motionTokens.duration.micro : motionTokens.duration.entrance, delay: reduceMotion ? 0 : delay, ease: motionTokens.softEase }}>{children}</m.div>;
}

export default function HomePage({ onReport, reportCount }) {
  const steps = [
    { n: '01', title: 'Explore a cidade', text: 'Navegue pelo mapa de Feira de Santana e encontre o ponto que você quer mostrar.', icon: 'compass' },
    { n: '02', title: 'Marque a barreira', text: 'Escolha o local no mapa ou use a localização do seu dispositivo.', icon: 'pin' },
    { n: '03', title: 'Dê visibilidade', text: 'Registre o tipo de obstáculo e compartilhe o relato no mapa da comunidade.', icon: 'arrow' },
  ];

  return (
    <>
      <section className="home-hero" id="inicio">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <m.p className="home-eyebrow" initial={{ opacity: 0, y: motionTokens.distance.small }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.entrance, ease: motionTokens.ease }}><span /> Feira de Santana <i /> Bahia</m.p>
            <m.h1 initial={{ opacity: 0, y: motionTokens.distance.medium }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.hero, delay: 0.04, ease: motionTokens.softEase }}>Uma cidade para todos começa com <em>um caminho acessível.</em></m.h1>
            <m.p className="home-hero-lede" initial={{ opacity: 0, y: motionTokens.distance.small }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.entrance, delay: 0.1, ease: motionTokens.ease }}>A cidade muda quando a gente consegue enxergar as barreiras. Explore o mapa, marque um ponto e ajude a dar visibilidade ao que precisa melhorar.</m.p>
            <m.div className="home-hero-actions" initial={{ opacity: 0, y: motionTokens.distance.small }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.entrance, delay: 0.17, ease: motionTokens.ease }}>
              <a className="button button-home-primary" href="#mapa">Explorar o mapa <HomeIcon name="arrow" size={16} /></a>
              <button className="button button-home-quiet" onClick={onReport}><HomeIcon name="plus" size={16} /> Registrar uma barreira</button>
            </m.div>
            <m.div className="home-hero-footnote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: motionTokens.duration.entrance, ease: motionTokens.ease }}><HomeIcon name="shield" size={15} /><span>Entre para registrar. Seu e-mail não aparece no mapa.</span></m.div>
          </div>

          <m.div className="home-artwork" aria-hidden="true" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: motionTokens.duration.hero, delay: 0.12, ease: motionTokens.softEase }}>
            <div className="art-sun" />
            <div className="art-coordinate coordinate-one">12°15′ S <span>38°57′ W</span></div>
            <div className="art-coordinate coordinate-two">SIGA <span>01 / BA</span></div>
            <svg className="art-route" viewBox="0 0 560 480" fill="none"><path d="M22 349C120 349 106 228 210 228S279 347 373 282 420 98 535 103" /><path d="M6 126C114 128 140 55 239 83S337 176 430 156 487 48 553 27" /><circle cx="210" cy="228" r="5" /><circle cx="373" cy="282" r="5" /><circle cx="430" cy="156" r="5" /></svg>
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="hero-pin-mark"><span>S</span></div>
            <div className="art-note"><span className="art-note-icon"><HomeIcon name="compass" size={17} /></span><span><strong>Olhar atento.</strong><small>Uma cidade mais acessível.</small></span><i>↗</i></div>
          </m.div>
          <a className="hero-scroll-cue" href="#como-funciona"><span /> Role para explorar <b>↓</b></a>
        </div>
        <div className="hero-edge-label">INFORMAÇÃO QUE ABRE CAMINHOS</div>
      </section>

      <section className="promise-strip" aria-label="Princípios do SIGA">
        <div><span className="promise-index">A</span><span><strong>Mapa aberto</strong><small>Ruas do OpenStreetMap</small></span></div><i />
        <div><span className="promise-index">B</span><span><strong>Relatos reais</strong><small>Sem números inventados</small></span></div><i />
        <div><span className="promise-index">C</span><span><strong>Dados públicos</strong><small>Sem exibir seu e-mail</small></span></div>
      </section>

      <section className="story-section" id="como-funciona">
        <Reveal className="story-heading"><p className="section-kicker"><span /> COMO FUNCIONA</p><h2>Um gesto simples pode<br />mudar <em>o caminho de alguém.</em></h2><p>O SIGA aproxima quem vive a cidade das informações que ajudam a revelar suas barreiras.</p></Reveal>
        <div className="story-steps">{steps.map((step, index) => <Reveal className="story-step-wrap" delay={index * 0.1} key={step.n}><article className="story-step"><div className="story-step-top"><span>{step.n}</span><span className="story-step-icon"><HomeIcon name={step.icon} size={20} /></span></div><h3>{step.title}</h3><p>{step.text}</p><div className="step-rule"><i style={{ transform: `scaleX(${0.32 + index * 0.25})` }} /></div></article></Reveal>)}</div>
      </section>

      <section className="honesty-section">
        <Reveal className="honesty-copy" direction="left"><p className="section-kicker"><span /> TRANSPARÊNCIA</p><h2>Dados verdadeiros<br />começam com <em>clareza.</em></h2><p>O SIGA usa o mapa aberto do OpenStreetMap e não inventa índices de acessibilidade. Cada marcador representa um relato registrado pela comunidade.</p><a href="#mapa" className="text-link">Veja o mapa da cidade <HomeIcon name="arrow" size={15} /></a></Reveal>
        <Reveal className="honesty-card-wrap" direction="right"><div className="honesty-card"><div className="honesty-card-head"><span className="honesty-pulse" /><span>OCORRÊNCIAS DA COMUNIDADE</span><HomeIcon name="shield" size={18} /></div><div className="honesty-card-center"><div className="honesty-empty-icon"><HomeIcon name="pin" size={24} /></div><strong>{reportCount === 0 ? 'O mapa começa com você.' : `${reportCount.toLocaleString('pt-BR')} ${reportCount === 1 ? 'relato' : 'relatos'} no mapa.`}</strong><p>{reportCount === 0 ? 'Registre uma barreira para dar o primeiro passo.' : 'Os relatos registrados ajudam a dar visibilidade às barreiras.'}</p></div><div className="honesty-card-foot"><span><i /> Relatos enviados por usuários</span><span>PÚBLICO</span></div></div></Reveal>
      </section>

      <section className="home-map-intro"><Reveal><span className="section-kicker"><span /> A CIDADE, DE PERTO</span><h2>Todo caminho começa<br />com um <em>ponto no mapa.</em></h2><p>Explore Feira de Santana e marque um local que merece atenção.</p><a className="button button-home-primary" href="#mapa">Ir para o mapa <HomeIcon name="arrow" size={16} /></a></Reveal><Reveal className="map-intro-decoration" delay={0.14}><div className="map-intro-grid">{Array.from({ length: 12 }, (_, i) => <div key={i} />)}<span className="map-intro-pin"><HomeIcon name="pin" size={23} /></span><span className="map-intro-path" /></div><span className="map-intro-caption">FEIRA DE SANTANA <i /> BAHIA</span></Reveal></section>
    </>
  );
}
