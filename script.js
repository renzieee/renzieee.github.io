// Sticky nav border + mobile menu
const nav = document.querySelector('.nav');
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 8), { passive: true });
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  links.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
}));

// Highlight current section in nav
const sectionLinks = [...links.querySelectorAll('a[href^="#"]')];
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) sectionLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach(s => spy.observe(s));

// Fade-in on scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal, .contact').forEach(el => io.observe(el));

// Dubai local time
const clock = document.getElementById('clock');
const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' }); };
tick(); setInterval(tick, 30000);

// Project filters
const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project');
projects.forEach(p => { if (p.classList.contains('project--wide')) p.dataset.wide = '1'; });
filters.forEach(btn => btn.addEventListener('click', () => {
  const f = btn.dataset.filter;
  filters.forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', b === btn); });
  projects.forEach(p => {
    const show = f === 'all' || p.dataset.cat === f;
    p.classList.toggle('is-hidden', !show);
    if (p.dataset.wide) p.classList.toggle('project--wide', f === 'all');
    if (show) p.classList.add('is-in');
  });
}));

// Poster lightbox
const lb = document.getElementById('lightbox');
const lbImg = lb.querySelector('img');
document.querySelectorAll('[data-lightbox]').forEach(el => el.addEventListener('click', () => {
  const poster = document.getElementById('posterImg');
  lbImg.src = poster.dataset.full || poster.currentSrc;
  lb.hidden = false;
  lb.querySelector('button').focus();
}));
lb.addEventListener('click', e => { if (e.target !== lbImg) lb.hidden = true; });
addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });

document.getElementById('year').textContent = new Date().getFullYear();
