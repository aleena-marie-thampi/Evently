/* Evently — page controllers. Each page reads data from the API and builds its own HTML. */
const P = {};
const A = () => $('#app');

/* ================= PUBLIC ================= */
P.home = async () => {
  const [st, feat, meta] = await Promise.all([api('/stats'), api('/events?sort=popular&limit=3'), api('/events/meta')]);
  const orgLink = S.user?.role === 'organizer' ? '/organizer/create-event.html' : '/register.html';
  const cats = [...new Set([...CATS, ...meta.categories.map((c) => c.name)])];
  A().innerHTML = `
  <section class="hero" id="home"><div class="wrap hero-grid"><div>
    <h1>Discover events.<br>Make every moment count.</h1>
    <p class="lead">Find events you'll love, reserve your spot, and get your digital ticket instantly.</p>
    <div class="row"><a class="btn lg" href="#explore">Explore Events</a><a class="btn lg ghost" href="${orgLink}">Create an Event</a></div></div>
    <div class="ticket" aria-hidden="true"><div class="tp"><div class="k">ADMIT ONE</div><h3>YOUR SEAT IS WAITING</h3><p class="meta">📅 Pick a date</p><p class="meta">📍 Find a venue near you</p></div>
    <div class="stub"><div class="k">TICKET ID</div><p class="tid">EVT-••••••</p><div class="bars"></div></div></div></div></section>
  <section class="band"><div class="wrap stats3">${[[st.events, 'Events'], [st.registrations, 'Registrations'], [st.organizers, 'Organizers']].map(([n, l]) => `<div><b>${fmtN(n)}</b><span>${l}</span></div>`).join('')}</div></section>
  <section class="sec"><div class="wrap"><div class="sechead"><h2>Featured events</h2><a href="#explore">See all events</a></div>
    <div class="grid">${feat.length ? feat.map(card).join('') : emptyBox('No events yet', 'Be the first to publish one.', '<a class="btn" href="' + orgLink + '">Create an event</a>')}</div></div></section>
  <section class="sec" id="explore"><div class="wrap"><div class="sechead"><h2>Explore events</h2></div>${exploreHTML(meta, cats)}</div></section>
  <section class="sec tight" id="categories"><div class="wrap"><h2>Browse by category</h2>
    <div class="cats">${meta.categories.length ? meta.categories.map((c) => `<button type="button" class="catbtn" data-cat="${esc(c.name)}">${esc(c.name)} <small>${c.count}</small></button>`).join('') : '<p class="muted">Categories appear here as soon as events are published.</p>'}</div>
    <div id="catres" class="catres" hidden><div class="sechead"><h3 id="cattitle"></h3><button type="button" class="linkbtn" id="catclear">Clear ✕</button></div><div class="grid" id="catgrid"></div></div></div></section>
  <section class="sec"><div class="wrap"><h2>How it works</h2><div class="steps">
    ${[['01', 'Discover', 'Find an event'], ['02', 'Register', 'Reserve your seat'], ['03', 'Get ticket', 'Receive your digital ticket'], ['04', 'Attend', 'Enjoy the event']].map(([n, t, d]) => `<div class="step"><b>${n}</b><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
  <section class="sec" id="about"><div class="wrap two"><div><h2>About Evently</h2><p class="lead2">One place to find, book and manage events.</p><p>Evently lets attendees discover events, register in seconds and carry a QR ticket on their phone. Organizers get live registration counts, attendee lists, check-in and analytics.</p><p>Seat limits are enforced by the server, so an event can never be overbooked.</p></div>
    <div class="feats">${[['Instant QR tickets', 'Your ticket is ready the moment you register.'], ['No overbooking', 'Seats are reserved atomically, so the last seat goes to one person only.'], ['Built for organizers', 'Track registrations, check people in and view analytics.']].map(([t, d]) => `<div class="card feat"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
  <section class="sec alt" id="contact"><div class="wrap two"><div><h2>Contact us</h2><p class="lead2" style="font-weight:500">Questions about an event or your account? Send us a note and we will reply within two working days.</p><p><b>Email</b> · support@evently.com</p><p><b>Based in</b> · Kochi, Kerala</p></div>
    <form id="cform" class="card pad"><label>Name<input required></label><label>Email<input type="email" required></label><label>Message<textarea required rows="4"></textarea></label><button class="btn block">Send message</button></form></div></section>
  <section class="wrap" style="padding:4rem clamp(1rem,4vw,2rem)"><div class="cta"><div><h2>Have an event to organize?</h2><p>Create and manage your event with Evently.</p></div><a class="btn lg" href="${orgLink}">Start Organizing</a></div></section>`;
  const reload = bindExplore();
  $('#cform').onsubmit = (e) => { e.preventDefault(); e.target.reset(); toast('Message sent. We will reply within two working days.'); };
  const showCat = async (name) => {
    $$('.catbtn').forEach((b) => b.classList.toggle('on', b.dataset.cat === name));
    const box = $('#catres'); if (!name) { box.hidden = true; return; }
    const ev = await api('/events?category=' + encodeURIComponent(name));
    $('#cattitle').textContent = name + ' events';
    $('#catgrid').innerHTML = ev.length ? ev.map(card).join('') : `<div style="grid-column:1/-1">${emptyBox('No events yet', 'Nothing in this category right now.')}</div>`;
    box.hidden = false;
  };
  $$('.catbtn').forEach((b) => (b.onclick = () => (b.classList.contains('on') ? showCat('') : showCat(b.dataset.cat))));
  $('#catclear')?.addEventListener('click', () => showCat(''));
  if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 50);
};

const exploreHTML = (meta, cats) => `<div class="card filters">
    <label class="search">Search<input id="search" type="search" placeholder="🔍 Search events..." value="${esc(qs.get('search') || '')}"></label>
    <label>Category<select id="category"><option value="">All</option>${cats.map((c) => `<option ${qs.get('category') === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <label>Date<select id="date"><option value="">Any Date</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option></select></label>
    <label>Location<select id="location"><option value="">All Locations</option>${meta.locations.map((l) => `<option>${esc(l)}</option>`).join('')}</select></label>
    <label>Availability<select id="availability"><option value="">Any</option><option value="available">Available</option></select></label>
    <label>Sort<select id="sort"><option value="upcoming">Upcoming</option><option value="newest">Newest</option><option value="popular">Most popular</option></select></label>
  </div><p class="muted" id="count" aria-live="polite"></p><div id="grid" class="grid"></div>`;
function bindExplore() {
  let timer, seq = 0;
  const load = async () => {
    const p = new URLSearchParams(), mine = ++seq;
    ['search', 'category', 'date', 'location', 'availability', 'sort'].forEach((k) => { const v = $('#' + k).value.trim(); if (v) p.set(k, v); });
    const ev = await api('/events?' + p);
    if (mine !== seq) return; // ignore stale responses
    $('#count').textContent = ev.length ? `${ev.length} event${ev.length > 1 ? 's' : ''} found` : '';
    $('#grid').innerHTML = ev.length ? ev.map(card).join('') : `<div style="grid-column:1/-1">${emptyBox('No events found', 'Try a different search or clear a filter.')}</div>`;
  };
  $$('.filters input,.filters select').forEach((el) => (el.oninput = () => { clearTimeout(timer); timer = setTimeout(load, el.id === 'search' ? 300 : 0); }));
  load();
  return load;
}
P.events = async () => {
  const meta = await api('/events/meta');
  const cats = [...new Set([...CATS, ...meta.categories.map((c) => c.name)])];
  A().innerHTML = pageHead('Explore Events', "Discover what's happening around you.") + `<div class="wrap pagebody">${exploreHTML(meta, cats)}</div>`;
  bindExplore();
};

P.eventDetails = async () => {
  const id = qs.get('id'); if (!id) throw new Error('No event selected');
  const e = await api('/events/' + id);
  const regs = S.user?.role === 'attendee' ? await api('/registrations/mine') : [];
  const reg = regs.find((r) => r.event._id === id && r.status === 'confirmed');
  const owner = S.user && S.user.id === String(e.organizer);
  const g = [...e.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  let action;
  if (e.phase === 'cancelled') action = '<p class="seatline bad">THIS EVENT HAS BEEN CANCELLED</p>';
  else if (e.phase === 'completed') action = '<p class="seatline">THIS EVENT HAS ENDED</p>';
  else if (e.phase === 'draft') action = '<p class="seatline">DRAFT · NOT VISIBLE TO THE PUBLIC</p>';
  else if (reg) action = `<p class="seatline">✓ You're registered</p><a class="btn block" href="/ticket.html?id=${reg._id}">View Ticket</a>`;
  else if (e.available <= 0) action = '<p class="seatline bad">SOLD OUT</p><button class="btn block" disabled>Sold Out</button>';
  else if (owner) action = `<p class="seatline">${e.available} SEATS AVAILABLE</p><a class="btn block" href="/organizer/manage-event.html?id=${e._id}">Manage Event</a>`;
  else if (!S.user) action = `<p class="seatline ${e.available <= 10 ? 'low' : ''}">${e.available} SEATS AVAILABLE</p><p class="muted" style="text-align:center">Please login to register.</p><a class="btn block" href="/login.html?next=${encodeURIComponent(location.pathname + location.search)}">Login</a>`;
  else if (S.user.role === 'organizer') action = `<p class="seatline">${e.available} SEATS AVAILABLE</p><p class="muted" style="text-align:center">Use an attendee account to register.</p>`;
  else action = `<p class="seatline ${e.available <= 10 ? 'low' : ''}">${e.available <= 10 ? `ONLY ${e.available} SEATS LEFT` : `${e.available} SEATS AVAILABLE`}</p><button class="btn block" id="reg">Register Now</button>`;
  A().innerHTML = `<div class="wrap"><div class="banner g${g}" style="${e.image ? `background-image:url('${esc(e.image)}')` : ''}" role="img" aria-label="${esc(e.title)}"></div>
  <div class="detail"><div>
    <span class="tag">${esc(e.category.toUpperCase())}</span><h1 style="font-size:clamp(2rem,4.5vw,3.2rem)">${esc(e.title)}</h1>
    <div class="facts"><p>📅 ${fmtDate(e.date)}</p><p>⏰ ${fmtTime(e.startTime)} – ${fmtTime(e.endTime)}</p><p>📍 ${esc(e.venue)}, ${esc(e.location)}${e.address ? `<br><small>${esc(e.address)}</small>` : ''}</p></div>
    <hr><h3>About this event</h3><p style="white-space:pre-line;max-width:65ch">${esc(e.description)}</p></div>
  <aside class="card pad sticky"><h3>Event details</h3>
    <dl class="dl"><dt>Organizer</dt><dd>${esc(e.organizerName)}</dd><dt>Capacity</dt><dd>${e.capacity}</dd><dt>Registered</dt><dd>${e.registered}</dd><dt>Available</dt><dd>${e.available}</dd>
    ${e.deadline ? `<dt>Register by</dt><dd>${fmtDate(e.deadline)}</dd>` : ''}</dl><hr style="margin:1.2rem 0 .2rem">${action}</aside></div></div>`;
  const b = $('#reg');
  if (b) b.onclick = async () => {
    b.disabled = true;
    try { const r = await api('/registrations', { method: 'POST', body: { eventId: id } }); toast('Registration successful! Your ticket is ready.'); setTimeout(() => (location.href = '/ticket.html?id=' + r._id), 700); }
    catch (er) { toast(er.message, 'err'); setTimeout(() => location.reload(), 1200); }
  };
};

P.about = () => { location.replace('/#about'); return; A().innerHTML = pageHead('About Evently', 'One place to find, book and manage events.') + `<div class="wrap mid pagebody"><p>Evently lets attendees discover events, register in seconds and carry a QR ticket on their phone. Organizers get live registration counts, attendee lists, check-in and analytics.</p><p>Seat limits are enforced by the server, so an event can never be overbooked, and everything you see on the site comes straight from the database.</p></div>`; };
P.contact = () => {
  location.replace('/#contact'); return;
  A().innerHTML = pageHead('Contact us', 'Questions about an event or your account? Send us a note.') + `<div class="wrap narrow pagebody"><form id="f" class="card pad"><label>Name<input required></label><label>Email<input type="email" required></label><label>Message<textarea required></textarea></label><button class="btn block">Send message</button></form></div>`;
  $('#f').onsubmit = (e) => { e.preventDefault(); e.target.reset(); toast('Message sent. We will reply within two working days.'); };
};

/* ================= AUTH ================= */
P.login = () => {
  if (S.user) return (location.href = home(S.user));
  A().innerHTML = `<div class="wrap narrow pagebody" style="padding-top:3.5rem"><div class="card pad"><h2>Welcome back</h2><p class="muted">Sign in to continue to Evently</p>
  <form id="f" novalidate><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label>
  <div class="row between"><label class="inline"><input type="checkbox" name="remember"> Remember me</label><a href="#" id="forgot" style="font-size:.9rem">Forgot password?</a></div>
  <p class="formerr" id="err" role="alert"></p><button class="btn block">Login</button></form><hr><p class="muted" style="text-align:center">Don't have an account?</p><a class="btn ghost block" href="/register.html">Create Account</a></div></div>`;
  $('#forgot').onclick = (e) => { e.preventDefault(); toast('Password reset by email is not set up yet. Ask an administrator to help.', 'err'); };
  $('#f').onsubmit = async (ev) => {
    ev.preventDefault(); $('#err').textContent = '';
    const fd = new FormData(ev.target);
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email: fd.get('email'), password: fd.get('password') } });
      saveToken(d.token, fd.get('remember') === 'on');
      const next = qs.get('next'); location.href = next && next.startsWith('/') ? next : home(d.user);
    } catch (e) { $('#err').textContent = '❌ ' + (e.message.startsWith('Incorrect') ? 'Invalid email or password' : e.message); }
  };
};

P.register = () => {
  if (S.user) return (location.href = home(S.user));
  A().innerHTML = `<div class="wrap narrow pagebody" style="padding-top:3.5rem"><div class="card pad"><h2>Create your Evently account</h2>
  <form id="f" novalidate><label>Full Name<input name="name" required autocomplete="name"></label><span class="fielderr" data-for="name"></span>
  <label>Email<input name="email" type="email" required autocomplete="email"></label><span class="fielderr" data-for="email"></span>
  <label>Password<input name="password" type="password" required autocomplete="new-password"></label><span class="fielderr" data-for="password"></span>
  <label>Confirm Password<input name="confirm" type="password" required autocomplete="new-password"></label><span class="fielderr" data-for="confirm"></span>
  <fieldset style="border:0;padding:0;margin:0 0 1rem"><legend style="font-weight:600;font-size:.88rem;color:var(--brown);margin-bottom:.4rem">Account Type</legend>
  <label class="inline"><input type="radio" name="role" value="attendee" checked> Attendee</label><label class="inline"><input type="radio" name="role" value="organizer"> Organizer</label></fieldset>
  <p class="formerr" id="err" role="alert"></p><button class="btn block">Create Account</button></form><hr><p class="muted" style="text-align:center">Already have an account? <a href="/login.html">Login</a></p></div></div>`;
  const f = $('#f'), show = (k, m) => ($(`[data-for="${k}"]`).textContent = m || '');
  const check = () => {
    const v = Object.fromEntries(new FormData(f)); let ok = true;
    const bad = (k, m, touched) => { if (touched) show(k, m); ok = false; };
    show('name'); show('email'); show('password'); show('confirm');
    if (!v.name.trim()) bad('name', 'Enter your name', false);
    if (!/^\S+@\S+\.\S+$/.test(v.email)) bad('email', 'Enter a valid email address', v.email.length > 0);
    if (v.password.length < 6) bad('password', 'Password too short (min 6 characters)', v.password.length > 0);
    if (v.confirm !== v.password) bad('confirm', "Passwords don't match", v.confirm.length > 0);
    return ok;
  };
  f.oninput = check;
  f.onsubmit = async (ev) => {
    ev.preventDefault(); $('#err').textContent = '';
    if (!check()) { $('#err').textContent = 'Please fix the highlighted fields.'; return; }
    const v = Object.fromEntries(new FormData(f));
    try { const d = await api('/auth/register', { method: 'POST', body: { name: v.name, email: v.email, password: v.password, role: v.role } }); saveToken(d.token, false); location.href = home(d.user); }
    catch (e) { if (/exists/.test(e.message)) show('email', 'Email already exists'); else $('#err').textContent = e.message; }
  };
};

/* ================= ATTENDEE ================= */
const regRow = (r) => {
  const e = r.event, st = regState(r);
  return `<div class="item"><div><h3>${esc(e.title)}</h3><p class="muted">${fmtDate(e.date)} · ${fmtTime(e.startTime)} · ${esc(e.venue)}</p>
  <p>${st === 'upcoming' ? '<span class="badge good">✓ Registered</span>' : st === 'completed' ? '<span class="badge sand">Completed</span>' : `<span class="badge bad">${r.status === 'cancelled' ? 'Registration cancelled' : 'Event cancelled'}</span>`} <small>${esc(r.ticketId)}</small></p></div>
  <div class="row"><a class="btn sm ghost" href="/event-details.html?id=${e._id}">View Event</a>${r.status === 'confirmed' && st !== 'cancelled' ? `<a class="btn sm" href="/ticket.html?id=${r._id}">View Ticket</a>` : ''}${st === 'upcoming' ? `<button class="btn sm ghost" data-cancel="${r._id}">Cancel</button>` : ''}</div></div>`;
};
const bindCancel = (reload) => $$('[data-cancel]').forEach((b) => (b.onclick = async () => {
  if (!confirm('Cancel this registration? Your ticket will stop working.')) return;
  try { await api('/registrations/' + b.dataset.cancel, { method: 'DELETE' }); toast('Registration cancelled'); reload(); } catch (e) { toast(e.message, 'err'); }
}));

P.dashboard = async () => {
  if (!guard()) return;
  if (S.user.role === 'organizer') return (location.href = '/organizer/dashboard.html');
  const [regs, all] = await Promise.all([api('/registrations/mine'), api('/events?limit=24')]);
  const ok = regs.filter((r) => r.status === 'confirmed'), up = ok.filter((r) => regState(r) === 'upcoming');
  const mine = new Set(ok.map((r) => r.event._id));
  const rec = all.filter((e) => !mine.has(e._id) && e.available > 0).slice(0, 3);
  A().innerHTML = pageHead(`${greet()}, ${esc(S.user.name.split(' ')[0])} 👋`, "Here's what's happening with your events.") + `<div class="wrap pagebody">
  <div class="stats"><div class="stat"><span>Registered</span><b>${ok.length}</b></div><div class="stat"><span>Upcoming</span><b>${up.length}</b></div><div class="stat"><span>Completed</span><b>${ok.filter((r) => regState(r) === 'completed').length}</b></div><div class="stat"><span>Tickets</span><b>${up.length}</b></div></div>
  <div class="sechead"><h2>Your upcoming events</h2></div><div class="card">${up.length ? up.map(regRow).join('') : `<div style="padding:1.4rem">${emptyBox('Nothing booked yet', 'Find something worth going to.', '<a class="btn" href="/events.html">Explore events</a>')}</div>`}</div>
  ${rec.length ? `<div class="sechead" style="margin-top:3rem"><h2>Recommended for you</h2></div><div class="grid">${rec.map(card).join('')}</div>` : ''}</div>`;
  bindCancel(P.dashboard);
};

P.myEvents = async () => {
  if (!guard('attendee')) return;
  const regs = await api('/registrations/mine'); let tab = 'upcoming';
  const draw = () => {
    const list = regs.filter((r) => regState(r) === tab);
    $('#list').innerHTML = list.length ? list.map(regRow).join('') : `<div style="padding:1.4rem">${emptyBox(`No ${tab} events`, tab === 'upcoming' ? 'Register for an event and it will show up here.' : 'Nothing to show here.')}</div>`;
    $$('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    bindCancel(() => { api('/registrations/mine').then((r) => { regs.length = 0; regs.push(...r); draw(); }); });
  };
  A().innerHTML = pageHead('My Events', 'Everything you have registered for.') + `<div class="wrap pagebody"><div class="tabs">${['upcoming', 'completed', 'cancelled'].map((t) => `<button data-t="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><div class="card" id="list"></div></div>`;
  $$('.tabs button').forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
  draw();
};

P.tickets = async () => {
  if (!guard('attendee')) return;
  const regs = (await api('/registrations/mine')).filter((r) => r.status === 'confirmed' && r.event.phase !== 'cancelled');
  const tk = (r) => `<div class="card pad"><h3>${esc(r.event.title)}</h3><p class="line muted">${fmtDate(r.event.date)}<br>${fmtTime(r.event.startTime)}<br>${esc(r.event.venue)}</p><p>Ticket ID: <b>${esc(r.ticketId)}</b></p><a class="btn sm" href="/ticket.html?id=${r._id}">View Ticket</a></div>`;
  const up = regs.filter((r) => regState(r) === 'upcoming'), past = regs.filter((r) => regState(r) === 'completed');
  A().innerHTML = pageHead('My Tickets', 'Your digital tickets, ready to scan.') + `<div class="wrap pagebody"><h2>Upcoming tickets</h2><div class="grid">${up.length ? up.map(tk).join('') : `<div style="grid-column:1/-1">${emptyBox('No tickets yet', 'Your tickets appear here after you register.', '<a class="btn" href="/events.html">Explore events</a>')}</div>`}</div>
  ${past.length ? `<h2 style="margin-top:3rem">Past tickets</h2><div class="grid">${past.map(tk).join('')}</div>` : ''}</div>`;
};

P.ticket = async () => {
  if (!guard()) return;
  const id = qs.get('id'); if (!id) throw new Error('No ticket selected');
  const t = await api(`/registrations/${id}/ticket`);
  A().innerHTML = `<div class="wrap ticketpage">${ticketHTML(t)}<div class="row noprint" style="justify-content:center;margin-top:2rem"><button class="btn" onclick="window.print()">Print Ticket</button><a class="btn ghost" href="${S.user.role === 'organizer' ? '/organizer/my-events.html' : '/tickets.html'}">Back</a></div></div>`;
};

P.profile = () => {
  if (!guard()) return;
  const u = S.user;
  A().innerHTML = pageHead('My Profile', 'Manage your personal information and security.') + `<div class="wrap mid pagebody">
  <div class="profilehead"><div class="bigav">${esc(u.name[0].toUpperCase())}</div><div><h2 style="margin:0">${esc(u.name)}</h2><p class="muted" style="margin:0">${esc(u.email)}</p><p style="margin:.3rem 0 0"><span class="badge">${u.role[0].toUpperCase() + u.role.slice(1)}</span> <small>Member since ${new Date(u.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</small></p></div></div>
  <form id="info" class="card pad" style="margin-bottom:1.4rem"><h3>Personal information</h3><div class="cols"><label>Name<input name="name" value="${esc(u.name)}" required></label><label>Email<input value="${esc(u.email)}" disabled></label></div><label>Phone<input name="phone" value="${esc(u.phone)}"></label><button class="btn">Save Changes</button></form>
  <form id="pw" class="card pad"><h3>Change password</h3><label>Current Password<input type="password" name="current" required autocomplete="current-password"></label><div class="cols"><label>New Password<input type="password" name="password" minlength="6" required autocomplete="new-password"></label><label>Confirm Password<input type="password" name="confirm" required autocomplete="new-password"></label></div><button class="btn">Update Password</button></form></div>`;
  $('#info').onsubmit = async (e) => { e.preventDefault(); try { S.user = { ...u, ...(await api('/auth/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) })) }; renderNav(); toast('Profile saved'); } catch (er) { toast(er.message, 'err'); } };
  $('#pw').onsubmit = async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    if (v.password !== v.confirm) return toast("Passwords don't match", 'err');
    try { await api('/auth/password', { method: 'PUT', body: { current: v.current, password: v.password } }); e.target.reset(); toast('Password updated'); } catch (er) { toast(er.message, 'err'); }
  };
};

/* ================= ORGANIZER ================= */
const COLORS = { brown: '#664930', taupe: '#997E67', sand: '#CCBEB1', peach: '#FFDBBB' };
const dayLabel = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
const lineChart = (el, daily, title) => new Chart(el, { type: 'line', data: { labels: daily.map((d) => dayLabel(d.date)), datasets: [{ label: 'Registrations', data: daily.map((d) => d.count), borderColor: COLORS.brown, backgroundColor: 'rgba(255,219,187,.6)', fill: true, tension: .35, pointBackgroundColor: COLORS.brown }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: title } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });

P.orgDashboard = async () => {
  if (!guard('organizer')) return;
  const s = await api('/events/stats/organizer');
  const up = s.events.filter((e) => e.phase === 'published').slice(0, 5);
  A().innerHTML = pageHead(`${greet()}, ${esc(S.user.name.split(' ')[0])} 👋`, "Here's your event overview.") + `<div class="wrap pagebody">
  <div class="stats"><div class="stat"><span>Total Events</span><b>${s.totalEvents}</b></div><div class="stat"><span>Active Events</span><b>${s.activeEvents}</b></div><div class="stat"><span>Total Registrations</span><b>${s.registrations}</b></div><div class="stat"><span>Tickets Sold</span><b>${s.ticketsSold}</b></div></div>
  <div class="chartbox" style="margin-bottom:2rem"><canvas id="c"></canvas></div>
  <div class="sechead"><h2>Upcoming events</h2><a class="btn sm" href="/organizer/create-event.html">+ Create Event</a></div>
  <div class="card">${up.length ? up.map((e) => { const pct = Math.round((e.registered / e.capacity) * 100); return `<div class="item"><div><h3>${esc(e.title)}</h3><p class="muted">${fmtDate(e.date)} · ${e.registered} / ${e.capacity} registered · ${pct}% occupancy</p><div class="bar"><i style="width:${pct}%"></i></div></div><a class="btn sm" href="/organizer/manage-event.html?id=${e._id}">Manage</a></div>`; }).join('') : `<div style="padding:1.4rem">${emptyBox('No upcoming events', 'Create an event to start taking registrations.', '<a class="btn" href="/organizer/create-event.html">Create event</a>')}</div>`}</div></div>`;
  lineChart($('#c'), s.activity, 'Registrations — last 7 days');
};

P.createEvent = async () => {
  if (!guard('organizer')) return;
  const id = qs.get('id'), e = id ? await api('/events/' + id) : {}, v = (k) => esc(e[k] ?? '');
  const published = e.status === 'published';
  A().innerHTML = pageHead(id ? 'Edit Event' : 'Create New Event', id ? 'Update your event details.' : 'Fill in the details, then save a draft or publish.') + `<div class="wrap mid pagebody"><form id="f">
  <section class="card pad formsec"><h3>Basic information</h3><label>Event Title<input name="title" value="${v('title')}" required></label>
  <label>Category<select name="category" required>${CATS.map((c) => `<option ${e.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
  <label>Description<textarea name="description" required>${v('description')}</textarea></label></section>
  <section class="card pad formsec"><h3>Event cover</h3><div class="drop-img" id="drop" style="${e.image ? `background-image:url('${esc(e.image)}')` : ''}"><span id="dtxt" ${e.image ? 'hidden' : ''}>+ Upload Image<br><small>JPG, PNG or WEBP, up to 3 MB</small></span><input type="file" name="image" accept="image/*" aria-label="Upload cover image"></div></section>
  <section class="card pad formsec"><h3>Schedule</h3><div class="cols"><label>Date<input type="date" name="date" value="${e.date ? isoDay(e.date) : ''}" ${id ? '' : `min="${isoDay(new Date())}"`} required></label><label>Start Time<input type="time" name="startTime" value="${v('startTime')}" required></label><label>End Time<input type="time" name="endTime" value="${v('endTime')}" required></label></div></section>
  <section class="card pad formsec"><h3>Location</h3><div class="cols"><label>Venue<input name="venue" value="${v('venue')}" required></label><label>City<input name="location" value="${v('location')}" required></label></div><label>Address<input name="address" value="${v('address')}"></label></section>
  <section class="card pad formsec"><h3>Registration</h3><div class="cols"><label>Maximum Capacity<input type="number" name="capacity" min="${Math.max(1, e.registered || 1)}" value="${v('capacity')}" required></label><label>Registration Deadline<input type="date" name="deadline" value="${e.deadline ? isoDay(e.deadline) : ''}"></label></div></section>
  <div class="row" style="justify-content:flex-end">${published ? '' : '<button class="btn ghost" value="draft">Save Draft</button>'}<button class="btn" value="published">${published ? 'Save Changes' : 'Publish Event'}</button></div></form></div>`;
  const inp = $('input[type=file]');
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; $('#drop').style.backgroundImage = `url('${URL.createObjectURL(f)}')`; $('#dtxt').hidden = true; };
  $('#f').onsubmit = async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target); fd.set('status', ev.submitter?.value || 'published');
    if (!fd.get('image').size) fd.delete('image');
    try { const r = await api(id ? '/events/' + id : '/events', { method: id ? 'PUT' : 'POST', body: fd }); toast(fd.get('status') === 'draft' ? 'Draft saved' : id ? 'Changes saved' : 'Event published'); setTimeout(() => (location.href = '/organizer/manage-event.html?id=' + r._id), 600); }
    catch (er) { toast(er.message, 'err'); }
  };
};

P.orgMyEvents = async () => {
  if (!guard('organizer')) return;
  const evs = await api('/events/mine');
  A().innerHTML = pageHead('My Events', 'Events you have created.') + `<div class="wrap pagebody"><div class="toolbar"><input id="s" type="search" placeholder="Search my events..." aria-label="Search my events"><a class="btn" href="/organizer/create-event.html">+ Create Event</a></div><div class="card" id="list"></div></div>`;
  const draw = () => {
    const t = $('#s').value.toLowerCase(), l = evs.filter((e) => e.title.toLowerCase().includes(t));
    $('#list').innerHTML = l.length ? l.map((e) => { const pct = Math.round((e.registered / e.capacity) * 100); return `<div class="item"><div><h3>${esc(e.title)} ${statusBadge(e)}</h3><p class="muted">${fmtDate(e.date)} · ${e.registered} / ${e.capacity} registered</p><div class="bar"><i style="width:${pct}%"></i></div></div><a class="btn sm" href="/organizer/manage-event.html?id=${e._id}">Manage</a></div>`; }).join('') : `<div style="padding:1.4rem">${emptyBox(evs.length ? 'No matches' : 'No events yet', evs.length ? 'Try another search.' : 'Create your first event to get started.', evs.length ? '' : '<a class="btn" href="/organizer/create-event.html">Create event</a>')}</div>`;
  };
  $('#s').oninput = draw; draw();
};

/* shared: attendee table + analytics, used by manage-event tabs and standalone pages */
async function renderAttendees(box, id) {
  const { event: e, attendees: list } = await api(`/events/${id}/attendees`);
  box.innerHTML = `<p class="muted"><b>${list.length}</b> registered · ${list.filter((a) => a.checkedIn).length} checked in</p>
  <div class="toolbar"><input id="as" type="search" placeholder="Search attendees..." aria-label="Search attendees"><select id="af" aria-label="Filter"><option value="">All</option><option value="confirmed">Confirmed</option><option value="in">Checked In</option><option value="out">Not Checked In</option></select><button class="btn ghost" id="csv">Export CSV</button></div>
  <div class="card tablewrap"><table><thead><tr><th>Name</th><th>Email</th><th>Ticket ID</th><th>Status</th><th>Check-in</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const draw = () => {
    const t = $('#as').value.toLowerCase(), f = $('#af').value;
    const l = list.filter((a) => (a.user.name + a.user.email + a.ticketId).toLowerCase().includes(t) && (!f || (f === 'in' ? a.checkedIn : f === 'out' ? !a.checkedIn : !a.checkedIn)));
    $('#tb').innerHTML = l.length ? l.map((a) => `<tr><td>${esc(a.user.name)}</td><td>${esc(a.user.email)}</td><td>${esc(a.ticketId)}</td><td>${a.checkedIn ? '<span class="badge good">Checked In</span>' : '<span class="badge">Confirmed</span>'}</td><td><button class="btn sm ${a.checkedIn ? '' : 'ghost'}" data-ci="${a._id}">${a.checkedIn ? '✓ Checked in' : '○ Check in'}</button></td></tr>`).join('') : '<tr><td colspan="5" class="muted">No attendees match.</td></tr>';
    $$('[data-ci]', box).forEach((b) => (b.onclick = async () => { try { const r = await api(`/events/${id}/attendees/${b.dataset.ci}/checkin`, { method: 'PATCH' }); list.find((a) => a._id === r._id).checkedIn = r.checkedIn; renderAttendeesKeep(); } catch (er) { toast(er.message, 'err'); } }));
  };
  const renderAttendeesKeep = () => { const s = $('#as').value, f = $('#af').value; draw(); $('#as').value = s; $('#af').value = f; box.querySelector('p.muted').innerHTML = `<b>${list.length}</b> registered · ${list.filter((a) => a.checkedIn).length} checked in`; };
  $('#as').oninput = draw; $('#af').onchange = draw;
  $('#csv').onclick = () => {
    const rows = [['Name', 'Email', 'Ticket ID', 'Status'], ...list.map((a) => [a.user.name, a.user.email, a.ticketId, a.checkedIn ? 'Checked In' : 'Confirmed'])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = e.title.replace(/\W+/g, '-') + '-attendees.csv'; a.click();
  };
  draw();
}

async function renderAnalytics(box, id) {
  const { event: e, checkedIn, daily } = await api(`/events/${id}/analytics`);
  const left = e.capacity - e.registered, pct = Math.round((e.registered / e.capacity) * 100);
  box.innerHTML = `<div class="stats"><div class="stat"><span>Capacity</span><b>${e.capacity}</b></div><div class="stat"><span>Registered</span><b>${e.registered}</b></div><div class="stat"><span>Remaining</span><b>${left}</b></div><div class="stat"><span>Occupancy</span><b>${pct}%</b></div></div>
  <div class="charts"><div class="chartbox"><canvas id="c1"></canvas></div><div class="chartbox"><canvas id="c2"></canvas></div></div>`;
  new Chart($('#c1'), { type: 'doughnut', data: { labels: ['Tickets sold', 'Available seats', 'Checked in'].slice(0, 2), datasets: [{ data: [e.registered, left], backgroundColor: [COLORS.brown, COLORS.peach], borderColor: '#FFFDFA' }] }, options: { maintainAspectRatio: false, plugins: { title: { display: true, text: `Seats (${checkedIn} checked in)` }, legend: { position: 'bottom' } } } });
  lineChart($('#c2'), daily, 'Registrations — last 14 days');
}

async function eventScoped(pageTitle, sub, render) {
  if (!guard('organizer')) return;
  const evs = await api('/events/mine'), id = qs.get('id');
  const picker = `<select id="pick" aria-label="Choose event" style="max-width:340px;margin:0"><option value="">Select an event…</option>${evs.filter((e) => e.phase !== 'draft').map((e) => `<option value="${e._id}" ${e._id === id ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select>`;
  A().innerHTML = pageHead(pageTitle, sub) + `<div class="wrap pagebody"><div class="toolbar">${picker}</div><div id="out">${id ? '' : emptyBox('Choose an event', 'Pick one above to see its details.')}</div></div>`;
  $('#pick').onchange = (e) => { if (e.target.value) location.search = '?id=' + e.target.value; };
  if (id) await render($('#out'), id);
}
P.orgAttendees = () => eventScoped('Attendees', 'Everyone registered for an event.', renderAttendees);
P.orgAnalytics = () => eventScoped('Analytics', 'Registration statistics for an event.', renderAnalytics);

P.manageEvent = async () => {
  if (!guard('organizer')) return;
  const id = qs.get('id'); if (!id) return (location.href = '/organizer/my-events.html');
  const e = await api('/events/' + id), pct = Math.round((e.registered / e.capacity) * 100);
  A().innerHTML = `<section class="pagehead"><div class="wrap"><p style="margin:0 0 .6rem"><a href="/organizer/my-events.html">← My Events</a></p><h1>${esc(e.title)}</h1><p>${statusBadge(e)} &nbsp; ${fmtDate(e.date)} · ${esc(e.venue)}, ${esc(e.location)}</p></div></section>
  <div class="wrap pagebody"><div class="stats"><div class="stat"><span>Registered</span><b>${e.registered} / ${e.capacity}</b></div><div class="stat"><span>Seats Available</span><b>${e.available}</b></div><div class="stat"><span>Occupancy</span><b>${pct}%</b></div></div>
  <div class="tabs" role="tablist">${['Overview', 'Attendees', 'Analytics', 'Settings'].map((t) => `<button role="tab" data-t="${t}">${t}</button>`).join('')}</div><div id="tab"></div></div>`;
  const views = {
    Overview: (b) => { b.innerHTML = `<div class="card pad"><dl class="dl"><dt>Category</dt><dd>${esc(e.category)}</dd><dt>Date</dt><dd>${fmtDate(e.date)}</dd><dt>Time</dt><dd>${fmtTime(e.startTime)} – ${fmtTime(e.endTime)}</dd><dt>Venue</dt><dd>${esc(e.venue)}</dd><dt>City</dt><dd>${esc(e.location)}</dd><dt>Registration deadline</dt><dd>${e.deadline ? fmtDate(e.deadline) : 'None'}</dd></dl><hr><h3>Description</h3><p style="white-space:pre-line">${esc(e.description)}</p></div>`; },
    Attendees: (b) => renderAttendees(b, id),
    Analytics: (b) => renderAnalytics(b, id),
    Settings: (b) => {
      b.innerHTML = `<div class="card pad"><h3>Event settings</h3><div class="row"><a class="btn" href="/organizer/create-event.html?id=${id}">Edit event details</a><a class="btn ghost" href="/event-details.html?id=${id}">View public page</a>${e.status !== 'cancelled' ? '<button class="btn danger" id="cx">Cancel event</button>' : ''}</div><p class="muted" style="margin-top:1rem">Cancelling notifies every registered attendee and cannot be undone.</p></div>`;
      const c = $('#cx'); if (c) c.onclick = async () => { if (!confirm('Cancel this event? All attendees will be notified.')) return; try { await api('/events/' + id, { method: 'DELETE' }); toast('Event cancelled'); setTimeout(() => location.reload(), 700); } catch (er) { toast(er.message, 'err'); } };
    }
  };
  const open = async (t) => { $$('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); try { await views[t]($('#tab')); } catch (er) { $('#tab').innerHTML = `<p class="formerr">${esc(er.message)}</p>`; } };
  $$('.tabs button').forEach((b) => (b.onclick = () => open(b.dataset.t)));
  open(['Attendees', 'Analytics', 'Settings'].includes(qs.get('tab')) ? qs.get('tab') : 'Overview');
};

/* ================= BOOT ================= */
(async () => {
  if (token()) {
    try { S.user = await api('/auth/me'); S.unread = (await api('/notifications/unread-count')).count; }
    catch { localStorage.removeItem('token'); sessionStorage.removeItem('token'); S.user = null; }
  }
  renderNav();
  try { await P[document.body.dataset.page]?.(); }
  catch (e) { A().innerHTML = `<div class="wrap pagebody">${emptyBox('Something went wrong', esc(e.message), '<a class="btn" href="/">Back to home</a>')}</div>`; }
})();
