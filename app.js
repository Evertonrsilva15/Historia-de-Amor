'use strict';
const iconPaths = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  moon: '<path d="M20.5 13.1A8.6 8.6 0 0 1 10.9 3.5a8.7 8.7 0 1 0 9.6 9.6Z"/>',
  down: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
  up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  diagonal: '<path d="M6 18 18 6M6 6h12v12"/>'
};
function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`; }
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.documentElement;
const themeButton = document.querySelector('#theme');
function setTheme(theme) {
  root.dataset.theme = theme;
  const label = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
  themeButton.setAttribute('aria-label', label);
  themeButton.title = label;
  document.querySelector('#theme-icon').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1b131c' : '#fcf3f0';
}
try { setTheme(localStorage.getItem('julia-editorial-theme') === 'light' ? 'light' : 'dark'); } catch { setTheme('dark'); }
themeButton.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  try { localStorage.setItem('julia-editorial-theme', next); } catch { /* A aparência continua funcionando sem armazenamento. */ }
});
const start = new Date(2026, 6, 3);
function calendarTime(now) {
  if (now < start) return { months: 0, days: 0 };
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  let anchor = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
  if (anchor > now) { months--; anchor = new Date(start.getFullYear(), start.getMonth() + months, start.getDate()); }
  const dateUTC = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return { months, days: Math.round((dateUTC(now) - dateUTC(anchor)) / 86400000) };
}
function updateCounter() {
  const now = new Date();
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const values = { days: Math.floor(seconds / 86400), hours: Math.floor(seconds % 86400 / 3600), minutes: Math.floor(seconds % 3600 / 60), seconds: seconds % 60 };
  for (const [id, value] of Object.entries(values)) {
    const element = document.getElementById(id);
    const text = String(value).padStart(2, '0');
    if (element.textContent !== text) element.textContent = text;
  }
  const calendar = calendarTime(now);
  const phrase = `${calendar.months} ${calendar.months === 1 ? 'mês' : 'meses'}`;
  document.querySelectorAll('[data-month-phrase]').forEach(el => { if (el.textContent !== phrase) el.textContent = phrase; });
  document.querySelector('#remaining-days').textContent = `${calendar.days} ${calendar.days === 1 ? 'dia' : 'dias'}`;
}
updateCounter();
setInterval(updateCounter, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateCounter(); });
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); }
  }), { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  root.classList.add('motion-ready');
  const links = [...document.querySelectorAll('nav a')];
  const navObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) links.forEach(link => link.classList.toggle('active', link.hash === '#' + entry.target.id));
  }), { rootMargin: '-10% 0px -50% 0px' });
  document.querySelectorAll('#tempo,#lembrancas,#carta').forEach(el => navObserver.observe(el));
}
let progressScheduled = false;
function updateProgress() {
  const range = root.scrollHeight - window.innerHeight;
  document.querySelector('#progress').style.width = `${range > 0 ? Math.min(100, scrollY / range * 100) : 0}%`;
  progressScheduled = false;
}
addEventListener('scroll', () => { if (!progressScheduled) { requestAnimationFrame(updateProgress); progressScheduled = true; } }, { passive: true });
addEventListener('resize', updateProgress);
updateProgress();
const moreButton = document.querySelector('#more');
moreButton.addEventListener('click', () => {
  const expanded = moreButton.getAttribute('aria-expanded') !== 'true';
  document.querySelectorAll('.extra').forEach(el => { el.hidden = !expanded; if (expanded) el.classList.add('in-view'); });
  moreButton.setAttribute('aria-expanded', String(expanded));
  moreButton.innerHTML = expanded ? 'Deixar só as primeiras ' + icon('up') : 'Mais um pouco de nós ' + icon('down');
  if (!expanded) document.querySelector('#lembrancas').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  requestAnimationFrame(updateProgress);
});
const lightbox = document.querySelector('#lightbox');
const buttons = [...document.querySelectorAll('[data-photo]')];
const photos = buttons.map(button => ({ src: button.querySelector('img').getAttribute('src'), alt: button.querySelector('img').alt, caption: button.closest('figure').querySelector('figcaption>span:last-child').textContent }));
let current = 0;
let photoRequest = 0;
let closing = false;
async function showPhoto(index, immediate = false) {
  current = (index + photos.length) % photos.length;
  const request = ++photoRequest;
  const photo = photos[current];
  const image = document.querySelector('#full-photo');
  const status = document.querySelector('#photo-status');
  lightbox.classList.add('is-switching');
  status.textContent = '';
  const preload = new Image();
  preload.src = photo.src;
  try {
    await Promise.all([
      preload.decode(),
      new Promise(resolve => setTimeout(resolve, immediate || reducedMotion() ? 0 : 140))
    ]);
    if (request !== photoRequest || closing || !lightbox.open) return;
    const stage = document.querySelector('.viewer-image');
    stage.style.height = `${Math.max(130, Math.min(stage.clientWidth * preload.naturalHeight / preload.naturalWidth, innerHeight * (innerWidth <= 560 ? .62 : .66), 650))}px`;
    image.src = photo.src;
    image.alt = photo.alt;
    document.querySelector('#photo-caption').textContent = photo.caption;
    document.querySelector('#photo-count').textContent = `${String(current + 1).padStart(2, '0')} / ${photos.length}`;
    await image.decode();
    if (request !== photoRequest || closing || !lightbox.open) return;
    requestAnimationFrame(() => { if (request === photoRequest && !closing) lightbox.classList.remove('is-switching'); });
  } catch {
    if (request !== photoRequest || closing || !lightbox.open) return;
    status.textContent = 'Não foi possível abrir esta foto. Tente outra lembrança.';
  }
}
function closePhoto() {
  if (closing || !lightbox.open) return;
  closing = true;
  ++photoRequest;
  lightbox.classList.add('is-closing');
  setTimeout(() => {
    lightbox.close();
    lightbox.classList.remove('is-closing', 'is-switching');
    closing = false;
  }, reducedMotion() ? 0 : 180);
}
buttons.forEach((button, index) => button.addEventListener('click', () => {
  closing = false;
  lightbox.classList.remove('is-closing');
  lightbox.classList.add('is-switching');
  lightbox.showModal();
  showPhoto(index, true);
}));
document.querySelector('#close-photo').addEventListener('click', closePhoto);
document.querySelector('#previous').addEventListener('click', () => showPhoto(current - 1));
document.querySelector('#next').addEventListener('click', () => showPhoto(current + 1));
lightbox.addEventListener('click', event => { if (event.target === lightbox) closePhoto(); });
lightbox.addEventListener('cancel', event => { event.preventDefault(); closePhoto(); });
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(current + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(current - 1); }
});
let touchX = null;
lightbox.addEventListener('touchstart', event => { touchX = event.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', event => {
  if (touchX === null) return;
  const distance = event.changedTouches[0].clientX - touchX;
  if (Math.abs(distance) > 55) showPhoto(current + (distance < 0 ? 1 : -1));
  touchX = null;
}, { passive: true });
document.querySelector('#letter').addEventListener('toggle', event => {
  event.target.querySelector('.letter-action').innerHTML = (event.target.open ? 'Guardar minha carta ' : 'Abrir minha carta ') + icon('diagonal');
  requestAnimationFrame(updateProgress);
});

// A rolagem suave pertence aos links; foco e botões mantêm rolagem imediata.
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  history.replaceState(null, '', link.getAttribute('href'));
}));

addEventListener('resize', () => {
  const image = document.querySelector('#full-photo');
  if (!lightbox.open || !image.naturalWidth) return;
  const stage = document.querySelector('.viewer-image');
  stage.style.height = `${Math.max(130, Math.min(stage.clientWidth * image.naturalHeight / image.naturalWidth, innerHeight * (innerWidth <= 560 ? .62 : .66), 650))}px`;
});
