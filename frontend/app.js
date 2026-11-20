/* Les Veilleuses — logique du site
 * Aucune dépendance : HTML + SVG + JavaScript.
 *
 * CONFIGURATION ------------------------------------------------------------
 * Tout se règle dans config.js (window.VEILLEUSES) :
 *   apiUrl   : adresse du backend Spring Boot, ex. "https://api.lesveilleuses.fr".
 *              null = mode démo (données inventées, rien n'est enregistré).
 *              ""   = backend sur le même domaine que le site.
 *   videoSrc : fichier vidéo (mp4/webm). Vide = animation de démonstration de 3 s.
 */
const CONFIG = { apiUrl: null, videoSrc: '', ...(window.VEILLEUSES || {}) };
const API = (CONFIG.apiUrl || '').replace(/\/$/, '');
const DEMO = CONFIG.apiUrl === null || CONFIG.apiUrl === undefined;
const SVGNS = 'http://www.w3.org/2000/svg';
const F = window.FRANCE;
const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? Math.min(ms, 150) : ms));
const STORAGE_KEY = 'veilleuse-point';

/* ---------- Codes postaux ---------- */
const OUTRE_MER = ['971', '972', '973', '974', '975', '976', '977', '978', '984', '986', '987', '988'];

/** Renvoie { dept, outreMer } ou null si le code est invalide. */
function departementDepuisCodePostal(raw) {
  const v = String(raw).trim().toUpperCase();
  if (/^2[AB]\d{3}$/.test(v)) return { dept: v.slice(0, 2), outreMer: false };
  if (!/^\d{5}$/.test(v)) return null;
  const d3 = v.slice(0, 3);
  if (v.startsWith('97') || v.startsWith('98')) return OUTRE_MER.includes(d3) ? { dept: d3, outreMer: true } : null;
  if (v.startsWith('20')) return { dept: Number(v[2]) <= 1 ? '2A' : '2B', outreMer: false };
  const d = v.slice(0, 2);
  return F.deps[d] ? { dept: d, outreMer: false } : null;
}

/* ---------- Données (API ou démo) ---------- */
function rng(seed) { // mulberry32 : aléatoire reproductible
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

const api = {
  async stats() {
    if (DEMO) {
      const r = rng(42), departements = {};
      for (const code of Object.keys(F.deps)) departements[code] = Math.floor(r() * (code === '75' ? 14 : 5));
      return { departements, outreMer: 9 };
    }
    const res = await fetch(API + '/api/points');
    if (!res.ok) throw new Error('stats');
    return res.json();
  },
  async allumer(codePostal, email) {
    if (DEMO) { await wait(300); return { ok: true }; }
    const res = await fetch(API + '/api/points', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codePostal, email: email || null }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, erreur: body.erreur || (res.status === 429 ? 'Trop de tentatives, réessayez plus tard.' : 'Une erreur est survenue, réessayez.') };
  },
};

/* ---------- Carte ---------- */
const map = { svg: $('map'), zoom: null, dots: null, hl: null, me: null, meHalo: null, counts: {}, outreMer: 0 };

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}
function rings(d) {
  return d.split('M').slice(1).map((p) => p.replace('Z', '').split('L').map((xy) => xy.split(',').map(Number)));
}
function inside([x, y], rs) {
  let c = false;
  for (const r of rs) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const deptRings = {};
for (const [code, d] of Object.entries(F.deps)) {
  const rs = rings(d.d), xs = rs.flat().map((p) => p[0]), ys = rs.flat().map((p) => p[1]);
  deptRings[code] = { rs, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}
/** Point aléatoire (mais stable) à l'intérieur d'un département. */
function pointDans(code, i) {
  const { rs, box } = deptRings[code], r = rng(hash(code + ':' + i));
  for (let k = 0; k < 40; k++) {
    const p = [box[0] + r() * (box[2] - box[0]), box[1] + r() * (box[3] - box[1])];
    if (inside(p, rs)) return p;
  }
  return F.deps[code].c;
}

function dessinerCarte() {
  const s = map.svg;
  s.setAttribute('viewBox', `-10 -10 ${F.w + 20} ${F.h + 20}`);
  map.zoom = el('g', { class: 'zoom' }, s);
  const relief = el('g', { filter: 'url(#rough)' }, map.zoom);
  F.regions.forEach((r, i) => { const p = el('path', { d: r.d, class: `reg r${i % 5}` }, relief); el('title', {}, p).textContent = r.nom; });
  map.hl = el('path', { class: 'hl', d: 'M0 0' }, relief);
  el('path', { class: 'deps', d: Object.values(F.deps).map((d) => d.d).join('') }, relief);
  map.dots = el('g', { class: 'dots' }, map.zoom);
  map.meHalo = el('circle', { class: 'me-halo', r: 6, opacity: 0 }, map.zoom);
  map.me = el('circle', { class: 'me', r: 6, opacity: 0 }, map.zoom);
}

function dessinerPoints() {
  map.dots.replaceChildren();
  const frag = document.createDocumentFragment();
  for (const [code, n] of Object.entries(map.counts)) {
    if (!F.deps[code]) continue;
    for (let i = 0; i < Math.min(n, 400); i++) { // 400 points max dessinés par département
      const [x, y] = pointDans(code, i);
      frag.appendChild(el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 2.8 }));
    }
  }
  map.dots.appendChild(frag);
}

function majCompteur() {
  const total = Object.values(map.counts).reduce((a, b) => a + b, 0);
  $('count').textContent = total.toLocaleString('fr-FR');
  $('domLine').textContent = `+ ${map.outreMer.toLocaleString('fr-FR')} en Outre-mer` + (DEMO ? ' · données de démonstration' : '');
}

function zoomSur(regionIndex) {
  const [x0, y0, x1, y1] = F.regions[regionIndex].box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const sc = Math.min(3.6, F.w / ((x1 - x0) * 1.5), F.h / ((y1 - y0) * 1.5));
  map.zoom.style.transform = `translate(${(F.w / 2 - sc * cx).toFixed(1)}px, ${(F.h / 2 - sc * cy).toFixed(1)}px) scale(${sc.toFixed(3)})`;
  return sc;
}
function dezoom() { map.zoom.style.transform = 'translate(0px, 0px) scale(1)'; }

/* ---------- Mode nuit (la veilleuse) ---------- */
function setNuit(on) {
  document.body.classList.toggle('night', on);
  document.body.classList.toggle('day', !on);
  const b = $('lampBtn');
  b.setAttribute('aria-pressed', String(on));
  b.textContent = on ? 'éteindre ✕' : 'click me ↙';
  $('caption').textContent = on ? 'la veilleuse est allumée. la France brille.' : 'allume la veilleuse pour voir la carte la nuit';
}
$('lampBtn').addEventListener('click', () => setNuit(!document.body.classList.contains('night')));
(() => { // petites étoiles du mode nuit
  const g = $('stars');
  for (const [x, y] of [[90, 60], [210, 30], [640, 50], [700, 150], [40, 190], [560, 24], [330, 40]])
    el('path', { d: `M${x} ${y - 7}L${x + 2} ${y - 2}L${x + 7} ${y}L${x + 2} ${y + 2}L${x} ${y + 7}L${x - 2} ${y + 2}L${x - 7} ${y}L${x - 2} ${y - 2}Z` }, g);
})();

/* ---------- Vidéo ---------- */
const video = $('realVideo');
function montrer(id, on) { $(id).hidden = !on; }
function finDeVideo() {
  montrer('playingOverlay', false); montrer('bar', false); montrer('playBtn', false);
  montrer('endScreen', true);
  setTimeout(() => $('cp').focus(), 50);
}
function formatTemps(s) { if (!isFinite(s)) return '–:–'; return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

if (CONFIG.videoSrc) {
  video.src = CONFIG.videoSrc;
  video.addEventListener('loadedmetadata', () => { $('duration').textContent = formatTemps(video.duration); });
  video.addEventListener('timeupdate', () => {
    $('barFill').style.width = `${(video.currentTime / video.duration) * 100}%`;
    $('timeLabel').textContent = formatTemps(video.currentTime);
  });
  video.addEventListener('ended', finDeVideo);
}

$('playBtn').addEventListener('click', async () => {
  montrer('playBtn', false);
  if (CONFIG.videoSrc) {
    $('screen').querySelector('.poster').hidden = true;
    video.hidden = false; video.controls = true; video.play();
    return;
  }
  // Démo : animation de 3 secondes
  montrer('playingOverlay', true);
  $('timeLabel').textContent = '▶';
  const fill = $('barFill');
  fill.style.transition = 'none'; fill.style.width = '0';
  requestAnimationFrame(() => { fill.style.transition = 'width 3s linear'; fill.style.width = '100%'; });
  await wait(3000);
  finDeVideo();
});

/* ---------- Formulaire et animation de la carte ---------- */
function erreur(msg) {
  $('cpErr').textContent = msg;
  $('cp').setAttribute('aria-invalid', msg ? 'true' : 'false');
}
$('cp').addEventListener('input', () => erreur(''));

function panneau(nom) {
  for (const p of ['panelLocked', 'panelLighting', 'panelDone']) montrer(p, p === nom);
}

let monPoint = null; // { dept, outreMer, x, y, region }

async function animerMonPoint() {
  const p = monPoint;
  map.svg.closest('.map-card').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  map.dots.classList.remove('twinkle');
  if (p.outreMer) {
    await wait(600);
  } else {
    const reg = F.regions[p.region];
    panneau('panelLighting');
    $('lightingText').textContent = `Zoom sur ${reg.nom}…`;
    map.me.setAttribute('opacity', 0); map.meHalo.setAttribute('opacity', 0);
    map.me.classList.remove('pop'); map.meHalo.classList.remove('pulse');
    await wait(700);
    // 1. zoom sur la région, colorée en pêche
    const sc = zoomSur(p.region);
    map.hl.setAttribute('d', reg.d); map.hl.classList.add('on');
    $('regionLabel').textContent = reg.nom; $('regionLabel').classList.add('on');
    await wait(1500);
    // 2. le point apparaît avec un rebond puis pulse
    for (const c of [map.me, map.meHalo]) { c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', (14 / sc).toFixed(2)); }
    map.me.setAttribute('opacity', 1); map.me.classList.add('pop');
    await wait(700);
    map.meHalo.setAttribute('opacity', 0.45); map.meHalo.classList.add('pulse');
    await wait(1500);
    // 3. retour à la vue d'ensemble : la France s'allume
    dezoom();
    map.hl.classList.remove('on'); $('regionLabel').classList.remove('on');
    for (const c of [map.me, map.meHalo]) c.setAttribute('r', 6);
  }
  setNuit(true);
  map.dots.classList.add('twinkle');
  await wait(1400);
  // 4. confirmation
  $('doneText').textContent = p.outreMer
    ? 'Un nouveau point brille désormais en Outre-mer : il rejoint le compteur dédié.'
    : `Un nouveau point brille désormais en ${F.regions[p.region].nom}.`;
  montrer('emailText', !!p.email);
  panneau('panelDone');
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cp = $('cp').value, email = $('email').value.trim();
  const res = departementDepuisCodePostal(cp);
  if (!res) {
    erreur(/^\d{5}$/.test(cp.trim()) ? 'Ce code postal n’est pas reconnu.' : 'Le code postal doit contenir 5 chiffres.');
    $('cp').focus(); return;
  }
  if (email && !$('email').checkValidity()) { erreur('L’adresse e-mail ne semble pas valide.'); $('email').focus(); return; }
  const btn = $('submitBtn'); btn.disabled = true;
  const r = await api.allumer(cp.trim(), email);
  btn.disabled = false;
  if (!r.ok) { erreur(r.erreur); return; }

  if (res.outreMer) {
    map.outreMer += 1;
    monPoint = { ...res, email: !!email };
  } else {
    const n = map.counts[res.dept] || 0;
    const [x, y] = pointDans(res.dept, n); // même place que celle qu'il aura au prochain chargement
    map.counts[res.dept] = n + 1;
    monPoint = { ...res, x, y, region: F.deps[res.dept].r, email: !!email };
  }
  if (!DEMO) try { localStorage.setItem(STORAGE_KEY, JSON.stringify(monPoint)); } catch (_) {}
  majCompteur();
  montrer('endScreen', false); montrer('afterScreen', true);
  await animerMonPoint();
});

$('restartBtn').addEventListener('click', async () => {
  if (DEMO) { // démo : on remet tout à zéro
    location.hash = ''; location.reload(); return;
  }
  setNuit(false); await wait(400); animerMonPoint(); // site réel : on rejoue seulement l'animation
});

/* ---------- Démarrage ---------- */
$('year').textContent = new Date().getFullYear();
if (!DEMO) $('restartBtn').textContent = 'revoir l’animation';
else $('restartBtn').textContent = 'recommencer la démo';
dessinerCarte();
// Retour depuis Genially (bouton « J’ai terminé » de la dernière diapo → …/#fin)
if (location.hash === '#fin') { finDeVideo(); $('video').scrollIntoView(); }
api.stats().then((s) => {
  map.counts = s.departements || {};
  map.outreMer = s.outreMer || 0;
  dessinerPoints(); majCompteur();
  // déjà veilleuse sur cet appareil ? On affiche son point directement
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) {}
  if (saved && !DEMO) {
    monPoint = saved;
    if (!saved.outreMer) for (const c of [map.me, map.meHalo]) { c.setAttribute('cx', saved.x); c.setAttribute('cy', saved.y); c.setAttribute('opacity', c === map.me ? 1 : 0.45); }
    map.meHalo.classList.add('pulse');
    $('doneText').textContent = saved.outreMer ? 'Votre point brille en Outre-mer.' : `Votre point brille en ${F.regions[saved.region].nom}.`;
    panneau('panelDone');
  }
}).catch(() => {
  $('count').textContent = '–';
  $('domLine').textContent = 'La carte n’a pas pu être chargée.';
});
