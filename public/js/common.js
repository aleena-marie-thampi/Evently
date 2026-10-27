/* Evently — shared helpers: API (Fetch), session, navbar, notifications, cards */
const CATS = ['Technology', 'Workshops', 'Cultural', 'Sports', 'Music', 'Business', 'Education', 'Entertainment'];
const S = { user: null, unread: 0 };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const qs = new URLSearchParams(location.search);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtShort = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
const fmtN = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : n);
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const timeAgo = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const saveToken = (t, remember) => { localStorage.removeItem('token'); sessionStorage.removeItem('token'); (remember ? localStorage : sessionStorage).setItem('token', t); };
const home = (u) => (u.role === 'organizer' ? '/organizer/dashboard.html' : '/dashboard.html');

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'err' ? 'err' : ''); t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), 3800);
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (token()) headers.Authorization = 'Bearer ' + token();
  if (opts.body && !(opts.body instanceof FormData)) { headers['Content-Type'] = 'application/json'; opts = { ...opts, body: JSON.stringify(opts.body) }; }
  const res = await fetch('/api' + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

function logout() { localStorage.removeItem('token'); sessionStorage.removeItem('token'); location.href = '/'; }

function guard(role) {
  if (!S.user) { location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search); return false; }
  if (role && S.user.role !== role) { location.href = home(S.user); return false; }
  return true;
}

/* ---------- navbar (changes with the logged-in role) ---------- */
function renderNav() {
  const u = S.user, p = location.pathname;
  const a = (h, t, c = '') => `<a href="${h}" class="${c} ${p === h || (h === '/' && p === '/index.html') ? 'on' : ''}">${t}</a>`;
  const onHome = p === '/' || p === '/index.html';
  const sec = (id, label) => `<a href="${onHome ? '' : '/'}#${id}" data-sec="${id}" class="${id === 'home' && onHome ? 'on' : ''}">${label}</a>`;
  const bell = `<div class="bellwrap"><button class="bell" id="bell" aria-label="Notifications">🔔${S.unread ? `<b>${S.unread}</b>` : ''}</button><div class="drop" id="drop" hidden></div></div>`;
  const me = `<a class="avatar" href="/profile.html" title="Profile" aria-label="Profile">${esc(u?.name?.[0]?.toUpperCase() || '')}</a><a href="#" id="logout">Logout</a>`;
  let html;
  if (!u) html = sec('home', 'Home') + sec('explore', 'Explore') + sec('categories', 'Categories') + sec('about', 'About') + sec('contact', 'Contact') + '<span class="spacer"></span>' + a('/login.html', 'Login', 'plain') + a('/register.html', 'Get Started', 'btn sm');
  else if (u.role === 'organizer') html = a('/organizer/dashboard.html', 'Dashboard') + a('/organizer/my-events.html', 'My Events') + a('/organizer/create-event.html', 'Create Event') + a('/organizer/analytics.html', 'Analytics') + '<span class="spacer"></span>' + bell + me;
  else html = sec('home', 'Home') + sec('explore', 'Explore') + a('/dashboard.html', 'Dashboard') + a('/my-events.html', 'My Events') + a('/tickets.html', 'My Tickets') + '<span class="spacer"></span>' + bell + me;
  $('#nav').innerHTML = html;
  if (onHome && !u) spy();
  $$('#nav a').forEach((l) => l.addEventListener('click', () => { $('#nav').classList.remove('open'); }));
  $('#burger').onclick = () => { const o = $('#nav').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); };
  const lo = $('#logout'); if (lo) lo.onclick = (e) => { e.preventDefault(); logout(); };
  const b = $('#bell');
  if (b) {
    b.onclick = async (e) => {
      e.stopPropagation(); const d = $('#drop');
      if (!d.hidden) { d.hidden = true; return; }
      const list = await api('/notifications');
      d.innerHTML = '<h4>Notifications</h4>' + (list.length ? list.slice(0, 8).map((n) => `<div class="note ${n.read ? '' : 'unread'}">${esc(n.message)}<small>${timeAgo(n.createdAt)}</small></div>`).join('') : '<p class="muted">Nothing yet. Ticket and event updates show up here.</p>');
      d.hidden = false;
      if (S.unread) { await api('/notifications/read-all', { method: 'POST' }); S.unread = 0; $('#bell b')?.remove(); }
    };
    $('#drop').onclick = (e) => e.stopPropagation();
    document.addEventListener('click', () => { $('#drop').hidden = true; });
  }
}

/* highlight the nav link of the section currently in view */
function spy() {
  const ids = ['home', 'explore', 'categories', 'about', 'contact'];
  const set = (id) => $$('#nav a[data-sec]').forEach((l) => l.classList.toggle('on', l.dataset.sec === id));
  const tick = () => {
    let cur = 'home';
    ids.forEach((id) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= 120) cur = id; });
    if (innerHeight + scrollY >= document.body.scrollHeight - 4) cur = 'contact';
    set(cur);
  };
  addEventListener('scroll', tick, { passive: true }); setTimeout(tick, 400);
}

/* ---------- shared UI pieces ---------- */
function seatInfo(e) {
  if (e.phase === 'cancelled') return { cls: 'bad', text: 'Event cancelled', btn: 'View Details' };
  if (e.phase === 'completed') return { cls: '', text: 'Event ended', btn: 'View Details' };
  if (e.available <= 0) return { cls: 'out', text: '🔴 SOLD OUT', btn: 'Sold Out', muted: true };
  if (e.available <= 10) return { cls: 'low', text: `⚠ Only ${e.available} seats left`, btn: 'View Details' };
  return { cls: '', text: `${e.available} seats left`, btn: 'View Details' };
}
function statusBadge(e) {
  if (e.phase === 'cancelled') return '<span class="badge bad">Cancelled</span>';
  if (e.phase === 'draft') return '<span class="badge sand">Draft</span>';
  if (e.phase === 'completed') return '<span class="badge sand">Completed</span>';
  if (e.available <= 0) return '<span class="badge bad">Sold Out</span>';
  return '<span class="badge good">Published</span>';
}
function card(e) {
  const s = seatInfo(e), g = [...e.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  return `<article class="card ev"><a class="ev-img g${g}" href="/event-details.html?id=${e._id}" tabindex="-1" aria-hidden="true" style="${e.image ? `background-image:url('${esc(e.image)}')` : ''}"><span class="tag">${esc(e.category.toUpperCase())}</span></a>
  <div class="body"><h3>${esc(e.title)}</h3><p class="line">📅 ${fmtShort(e.date)}, ${new Date(e.date).getUTCFullYear()}</p><p class="line">⏰ ${fmtTime(e.startTime)}</p><p class="line">📍 ${esc(e.venue)}, ${esc(e.location)}</p>
  <p class="seats ${s.cls}">${s.text}</p><a class="btn sm ${s.muted ? 'muted-btn' : ''}" href="/event-details.html?id=${e._id}">${s.btn}</a></div></article>`;
}
function ticketHTML(t) {
  const r = t.registration, e = r.event, ok = r.status === 'confirmed' && e.phase !== 'cancelled';
  return `<div class="ticket"><div class="tp"><div class="k">EVENTLY · EVENT TICKET</div><h3>${esc(e.title.toUpperCase())}</h3>
  <p class="meta">👤 ${esc(r.user.name)}</p><p class="meta">📅 ${fmtDate(e.date)}</p><p class="meta">⏰ ${fmtTime(e.startTime)}</p><p class="meta">📍 ${esc(e.venue)}, ${esc(e.location)}</p></div>
  <div class="stub"><div class="k">TICKET ID</div><p class="tid">${esc(r.ticketId)}</p><div class="qr"><img src="${t.qr}" alt="QR code for ticket ${esc(r.ticketId)}"></div><br>
  <span class="stamp ${ok ? '' : 'bad'}">${ok ? '✓ CONFIRMED' : r.status === 'cancelled' ? 'CANCELLED' : 'EVENT CANCELLED'}</span></div></div>`;
}
const regState = (r) => (r.status === 'cancelled' || r.event.phase === 'cancelled' ? 'cancelled' : r.event.phase === 'completed' ? 'completed' : 'upcoming');
const pageHead = (t, s) => `<section class="pagehead"><div class="wrap"><h1>${t}</h1><p>${s}</p></div></section>`;
const emptyBox = (t, m, a = '') => `<div class="empty"><h3>${t}</h3><p class="muted">${m}</p>${a}</div>`;
