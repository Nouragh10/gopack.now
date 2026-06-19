// ══════════════════════════════════════════════
// gopack.now — dashboard.js
// Dashboard, Explore, and Profile screens
// ══════════════════════════════════════════════

// ── Greeting ──────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

gopack.showDashboard = function() {
  const greetEl = document.getElementById('dash-greeting');
  if (greetEl) greetEl.textContent = getGreeting();

  const titleEl = document.getElementById('dash-title');
  if (titleEl && gopack.currentUser) {
    const first = (gopack.currentUser.displayName || gopack.currentUser.email.split('@')[0]).split(' ')[0];
    titleEl.innerHTML = `Hey ${gopack.escHtml(first)}, where's the pack<br><span class="dash-title-accent">headed?</span>`;
  }

  const pbtn = document.getElementById('dash-profile-btn');
  if (pbtn && gopack.currentUser) {
    pbtn.textContent = (gopack.currentUser.displayName || gopack.currentUser.email.split('@')[0]).charAt(0).toUpperCase();
  }

  gopack.loadDashboardTrips();
  gopack.loadUnreadNotifCount();
  gopack.showScreen('screen-dashboard');
};

// ── Trip cards ────────────────────────────────
function isPastTrip(trip) {
  if (!trip.endDate) return false;
  return new Date(trip.endDate + 'T23:59:59') < new Date();
}

gopack.renderDashTripCard = function(trip, role) {
  const dest     = trip.destination || 'Unknown';
  const vibes    = Array.isArray(trip.vibes) ? trip.vibes : (trip.vibe ? [trip.vibe] : []);
  const vibeStr  = vibes.slice(0, 2).map(v => gopack.VIBE_LABELS[v] || v).join(' · ');
  const hasItin  = !!trip.itinerary;
  const past     = isPastTrip(trip);
  const dateStr  = trip.startDate
    ? new Date(trip.startDate + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
    : (trip.days ? `${trip.days} days` : '');
  const icons = { food:'🍜', adventure:'🧗', relaxation:'🌿', nightlife:'🎵', shopping:'🛍️', culture:'🏛️' };
  const icon  = icons[vibes[0]] || '✈️';
  const badge = past
    ? `<span class="dash-trip-badge done">Done</span>`
    : role === 'host'
      ? `<span class="dash-trip-badge host">Host</span>`
      : `<span class="dash-trip-badge joined">Joined</span>`;
  return `
    <button class="dash-trip-card" onclick="openDashTrip('${trip.id}')" style="${past ? 'opacity:0.6' : ''}">
      <div class="dash-trip-icon">${icon}</div>
      <div class="dash-trip-info">
        <div class="dash-trip-dest">${gopack.escHtml(dest)}</div>
        <div class="dash-trip-meta">${gopack.escHtml(dateStr)}${vibeStr ? ' · ' + gopack.escHtml(vibeStr) : ''}${hasItin ? ' · ✓ Itinerary ready' : ''}</div>
      </div>
      ${badge}
      <span class="dash-trip-arrow">›</span>
    </button>`;
};

gopack.loadDashboardTrips = async function() {
  if (!gopack.db || !gopack.currentUser) return;
  const listEl   = document.getElementById('dash-trips-list');
  const countEl  = document.getElementById('dash-trip-count');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;padding:1rem 0">Loading...</div>';
  try {
    const trips  = await gopack.loadUserTrips();
    const hosted = trips.filter(t => t.hostMemberId === gopack.currentUser.uid);
    const joined = trips.filter(t => t.hostMemberId !== gopack.currentUser.uid);

    if (countEl) countEl.textContent = hosted.length;
    listEl.innerHTML = hosted.length
      ? hosted.map(t => gopack.renderDashTripCard(t, 'host')).join('')
      : `<div class="dash-empty"><div class="dash-empty-icon">🗺️</div><div class="dash-empty-text">No trips yet</div><div class="dash-empty-sub">Create your first trip and invite the pack</div></div>`;

    const section      = document.getElementById('dash-joined-section');
    const joinedListEl = document.getElementById('dash-joined-list');
    if (section && joinedListEl) {
      if (joined.length) {
        section.style.display = 'block';
        joinedListEl.innerHTML = joined.map(t => gopack.renderDashTripCard(t, 'joined')).join('');
      } else {
        section.style.display = 'none';
      }
    }
  } catch(e) {
    listEl.innerHTML = '<div class="dash-empty"><div class="dash-empty-text">Could not load trips</div></div>';
  }
};

gopack.openDashTrip = window.openDashTrip = async function(tripId) {
  const ok = await gopack.joinTrip(tripId);
  if (!ok) return;
  if (gopack.state.currentItinerary) {
    gopack.showScreen('screen-itinerary');
    setTimeout(() => gopack.renderItineraryFull(), 100);
  }
};

// ── New trip button ────────────────────────────
(function wireDashNewBtn() {
  const dashNewBtn = document.getElementById('dash-new-trip-btn');
  if (dashNewBtn) dashNewBtn.addEventListener('click', () => {
    // Bug 2 fix: reset to clean state for a new trip
    gopack.selectedCities = [];
    gopack.updateDestinationState();
    gopack.renderCityChips();
    const ci = gopack.$('city-input');
    if (ci) ci.value = '';
    gopack.state.vibes = ['culture'];
    document.querySelectorAll('.vibe-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.vibe === 'culture');
    });
    gopack.showScreen('screen-create');
  });
})();

// ── Explore ───────────────────────────────────
gopack.prefillDestination = window.prefillDestination = function(city) {
  gopack.selectedCities = [city];
  gopack.updateDestinationState();
  gopack.renderCityChips();
  gopack.showScreen('screen-create');
};

gopack.prefillVibe = window.prefillVibe = function(vibe) {
  gopack.state.vibes = [vibe];
  document.querySelectorAll('.vibe-btn').forEach(b => b.classList.toggle('selected', b.dataset.vibe === vibe));
  gopack.showScreen('screen-create');
};

(function wireExploreSearch() {
  function filterTrendItems(container, q) {
    container.querySelectorAll('.explore-trend-item').forEach(item => {
      const city = item.querySelector('.trend-city')?.textContent.toLowerCase() || '';
      item.style.display = (!q || city.includes(q)) ? '' : 'none';
    });
  }

  function filterTripCards(container, q) {
    let visibleCount = 0;
    container.querySelectorAll('.public-trip-card').forEach(card => {
      const dest  = card.querySelector('.ptc-dest')?.textContent.toLowerCase() || '';
      const meta  = card.querySelector('.ptc-meta')?.textContent.toLowerCase() || '';
      const match = !q || dest.includes(q) || meta.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    // Surface a "no results" message without destroying the underlying cards
    // (so clearing the search box restores them without re-fetching).
    let emptyEl = container.querySelector('.explore-search-empty');
    if (visibleCount === 0 && container.querySelector('.public-trip-card')) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.className = 'dash-empty explore-search-empty';
        emptyEl.innerHTML = '<div class="dash-empty-text">No trips match your search</div>';
        container.appendChild(emptyEl);
      }
      emptyEl.style.display = '';
    } else if (emptyEl) {
      emptyEl.style.display = 'none';
    }
  }

  function wireOne(inputId, cardsContainerId, trendContainerSelector) {
    const input = document.getElementById(inputId);
    const cardsContainer = document.getElementById(cardsContainerId);
    if (!input) return;
    input.addEventListener('input', function() {
      const q = this.value.trim().toLowerCase();
      if (cardsContainer) filterTripCards(cardsContainer, q);
      const trendContainer = trendContainerSelector ? document.querySelector(trendContainerSelector) : null;
      if (trendContainer) filterTrendItems(trendContainer, q);
    });
  }

  // Signed-in Explore screen
  wireOne('explore-search', 'explore-public-trips', '#screen-explore');
  // Signed-out Explore screen
  wireOne('explore-public-search', 'public-trips-list', '#screen-explore-public');
})();

// ── Profile ───────────────────────────────────
gopack.loadProfile = async function() {
  if (!gopack.currentUser) return;
  const name = gopack.currentUser.displayName || gopack.currentUser.email.split('@')[0];
  const el   = id => document.getElementById(id);
  if (el('profile-avatar')) el('profile-avatar').textContent = name.charAt(0).toUpperCase();
  if (el('profile-name'))   el('profile-name').textContent   = name;
  if (el('profile-email'))  el('profile-email').textContent  = gopack.currentUser.email;
  if (!gopack.db) return;

  const prof = (await gopack.db.ref('users/' + gopack.currentUser.uid).once('value')).val();
  if (prof?.createdAt && el('profile-joined')) {
    el('profile-joined').textContent = 'Member since ' + new Date(prof.createdAt).toLocaleDateString('en-US', { month:'long', year:'numeric' });
  }

  const trips  = await gopack.loadUserTrips();
  if (el('stat-trips'))  el('stat-trips').textContent  = trips.length;
  const cities = new Set(trips.flatMap(t => (t.destination || '').split(',').map(c => c.trim()).filter(Boolean)));
  if (el('stat-cities')) el('stat-cities').textContent = cities.size;
  let totalWishes = 0;
  trips.forEach(t => { totalWishes += Object.values(t.wishes || {}).filter(w => w.memberId === gopack.currentUser.uid).length; });
  if (el('stat-wishes')) el('stat-wishes').textContent = totalWishes;

  if (el('profile-trips-list')) {
    el('profile-trips-list').innerHTML = trips.slice(0, 5).length
      ? trips.slice(0, 5).map(t => gopack.renderDashTripCard(t, 'host')).join('')
      : `<div class="dash-empty"><div class="dash-empty-icon">✈️</div><div class="dash-empty-text">No trips yet</div></div>`;
  }
};

(function wireProfileSignout() {
  const btn = document.getElementById('profile-signout-btn');
  if (btn) btn.addEventListener('click', () => {
    if (confirm('Sign out of gopack.now?')) gopack.auth.signOut();
  });
})();

// ── Bottom nav trip tabs ──────────────────────
gopack.showTripTab = window.showTripTab = function(tab) {
  if (tab === 'collab') {
    gopack.showScreen('screen-collab');
  } else if (tab === 'itinerary') {
    if (gopack.state.currentItinerary) { gopack.showScreen('screen-itinerary'); gopack.renderItineraryFull(); }
    else gopack.showScreen('screen-collab');
  } else if (tab === 'chat') {
    gopack.initChat(); gopack.showScreen('screen-chat');
  } else if (tab === 'packing') {
    gopack.showScreen('screen-itinerary');
    setTimeout(() => { generatePackingList(); document.getElementById('packing-box')?.scrollIntoView({ behavior:'smooth' }); }, 200);
  }
};
// ── Load public/reviewed trips ─────────────────
gopack.loadPublicTrips = async function() {
  if (!gopack.db) return;
  const targetIds = ['public-trips-list', 'explore-public-trips', 'landing-public-trips'];
  const targets = targetIds.map(id => document.getElementById(id)).filter(Boolean);
  if (!targets.length) return;
  try {
    const snap = await gopack.db.ref('reviews').orderByChild('createdAt').limitToLast(20).once('value');
    const reviews = Object.values(snap.val() || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!reviews.length) {
      const empty = '<div class="dash-empty"><div class="dash-empty-text">No reviewed trips yet</div></div>';
      targets.forEach(el => { el.innerHTML = empty; });
      return;
    }
    const STAR_FILLED = '<svg width="13" height="13" viewBox="0 0 28 28" fill="none"><polygon points="14,3 17,11 25,11 19,16 21,24 14,19 7,24 9,16 3,11 11,11" stroke="currentColor" stroke-width="1.5" fill="currentColor"/></svg>';
    const STAR_EMPTY  = '<svg width="13" height="13" viewBox="0 0 28 28" fill="none"><polygon points="14,3 17,11 25,11 19,16 21,24 14,19 7,24 9,16 3,11 11,11" stroke="currentColor" stroke-width="1.5"/></svg>';
    const starsHtml = (rating) => {
      const r = Math.round(rating || 0);
      return Array.from({length:5}).map((_, i) => i < r ? STAR_FILLED : STAR_EMPTY).join('');
    };
    const html = reviews.slice(0,9).map(r => `
      <div class="public-trip-card">
        <div class="ptc-header">
          <div class="ptc-dest">${gopack.escHtml(r.destination || 'Unknown')}</div>
          <div class="ptc-stars" style="color:var(--orange)">${starsHtml(r.rating)}</div>
        </div>
        <div class="ptc-meta">${gopack.escHtml(r.vibeLabel || '')}${r.days ? ' · ' + r.days + ' days' : ''}</div>
        ${r.review ? `<div class="ptc-review">"${gopack.escHtml(r.review.slice(0,120))}${r.review.length>120?'…':''}"</div>` : ''}
        <div class="ptc-author">— ${gopack.escHtml(r.authorName || 'Anonymous')}</div>
        <button class="ptc-pdf-btn" onclick="gopack.previewPublicPDF('${gopack.escHtml(r.tripId)}')">
          <svg width="13" height="13" viewBox="0 0 28 28" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M15 2v5h5" stroke="currentColor" stroke-width="1.5"/><path d="M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Preview itinerary PDF
        </button>
      </div>`).join('');
    targets.forEach(el => { el.innerHTML = html; });
  } catch(e) { console.error('gopack: loadPublicTrips error', e); }
};

// ── Preview PDF for public trip ───────────────
gopack.previewPublicPDF = window.previewPublicPDF = async function(tripId) {
  if (!tripId || !gopack.db) return;
  const btn = document.querySelector('.ptc-pdf-btn[onclick*="' + tripId + '"]');
  if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }
  try {
    const rSnap = await gopack.db.ref('reviews/' + tripId).once('value');
    const reviewData = rSnap.val() || {};
    let itinerary = reviewData.itinerary;
    if (!itinerary) {
      const iSnap = await gopack.db.ref('trips/' + tripId + '/itinerary').once('value');
      if (iSnap.exists()) {
        itinerary = iSnap.val();
        gopack.db.ref('reviews/' + tripId + '/itinerary').set(itinerary);
      }
    }
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 28 28" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M15 2v5h5" stroke="currentColor" stroke-width="1.5"/><path d="M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Preview itinerary PDF'; }
    if (!itinerary || !itinerary.days) { alert('Itinerary not available for this trip yet.'); return; }
    gopack._demoItinerary = itinerary;
    gopack._demoReview    = reviewData;
    gopack.openDemoPDF();
  } catch(e) {
    console.error('gopack: previewPublicPDF error', e);
    if (btn) { btn.disabled = false; btn.textContent = 'Preview itinerary PDF'; }
    alert('Could not load itinerary. Please try again.');
  }
};

// ── Open demo PDF in new tab ──────────────────
gopack.openDemoPDF = function() {
  const itin   = gopack._demoItinerary;
  const review = gopack._demoReview || {};
  if (!itin) return;
  const dest = review.destination || 'Sample Trip';
  const days = itin.days || [];
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>gopack.now — ${dest}</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:Georgia,serif; background:#FAF8F5; color:#1A1412; }
.cover { background:#1A1412; color:white; padding:60px 50px 50px; }
.cover-eyebrow { font-family:Arial,sans-serif; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#E85D3A; margin-bottom:16px; }
.cover-dest { font-size:56px; font-weight:700; letter-spacing:-2px; margin-bottom:12px; }
.cover-meta { font-family:Arial,sans-serif; font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:16px; }
.cover-review { font-family:Arial,sans-serif; font-size:13px; color:rgba(255,255,255,0.6); font-style:italic; border-left:3px solid #E85D3A; padding-left:14px; margin-top:12px; }
.content { padding:40px 50px; }
.day-block { margin-bottom:48px; }
.day-header { border-bottom:2px solid #E85D3A; padding-bottom:10px; margin-bottom:20px; }
.day-num { font-family:Arial,sans-serif; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:#E85D3A; font-weight:bold; }
.day-theme { font-size:22px; font-weight:700; margin-top:4px; }
.activity { display:flex; gap:20px; margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid rgba(0,0,0,0.08); }
.activity:last-child { border-bottom:none; }
.act-time { font-family:Arial,sans-serif; font-size:11px; color:#8A7F78; min-width:70px; padding-top:3px; font-weight:bold; flex-shrink:0; }
.act-body { flex:1; }
.act-name { font-size:15px; font-weight:700; margin-bottom:4px; }
.act-desc { font-size:13px; color:#5A5550; line-height:1.6; }
.act-tag { font-family:Arial,sans-serif; font-size:10px; background:#FFF0EC; color:#E85D3A; padding:3px 10px; border-radius:100px; font-weight:bold; display:inline-block; margin-top:6px; }
.footer { text-align:center; padding:30px; font-family:Arial,sans-serif; font-size:11px; color:#8A7F78; border-top:1px solid rgba(0,0,0,0.1); margin-top:20px; }
.gopack-badge { display:inline-block; background:#E85D3A; color:white; font-family:Arial,sans-serif; font-size:11px; font-weight:bold; padding:4px 12px; border-radius:100px; margin-bottom:8px; }
@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
<div class="cover">
  <div class="cover-eyebrow">gopack.now · itinerary</div>
  <div class="cover-dest">${dest}</div>
  <div class="cover-meta">${days.length} days${review.vibeLabel ? ' · ' + review.vibeLabel : ''}</div>
  ${review.review ? `<div class="cover-review">"${review.review}" — ${review.authorName || 'A traveler'}</div>` : ''}
</div>
<div class="content">
${days.map((day, di) => `
<div class="day-block">
  <div class="day-header">
    <div class="day-num">Day ${day.dayNumber || di+1}${day.city ? ' · ' + day.city : ''}</div>
    <div class="day-theme">${day.theme || ''}</div>
  </div>
  ${(day.activities||[]).map(act => `
  <div class="activity">
    <div class="act-time">${act.time||''}</div>
    <div class="act-body">
      <div class="act-name">${act.fromWish ? '★ ' : ''}${act.name||''}</div>
      <div class="act-desc">${act.description||''}</div>
      <span class="act-tag">${act.tag||''}</span>
      ${act.fromWish && act.suggester ? `<span style="font-family:Arial;font-size:11px;color:#E85D3A;margin-left:8px;font-style:italic">by ${act.suggester}</span>` : ''}
    </div>
  </div>`).join('')}
</div>`).join('')}
</div>
<div class="footer">
  <div class="gopack-badge">gopack.now</div><br>
  Pack your bags. Pack your friends.<br>
  Plan your own group trip at <strong style="color:#E85D3A">gopack.now</strong>
</div>
</body></html>`;
  const blob = new Blob([html], {type:'text/html'});
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) win.onload = () => setTimeout(() => URL.revokeObjectURL(url), 5000);
};

// ── Trust stats ───────────────────────────────
gopack.loadTrustStats = function() {
  if (!gopack.db) return;
  gopack.db.ref('trips').once('value').then(snap => {
    const count = snap.numChildren() || 0;
    const el = document.getElementById('trust-trips');
    if (el) el.textContent = count > 0 ? count + '+' : '—';
  }).catch(() => {});
};

// ── Global bottom nav ─────────────────────────
const GBN_SCREENS = new Set(['screen-dashboard','screen-explore','screen-notifications','screen-profile']);
const GBN_PUBLIC_SCREENS = new Set(['screen-landing','screen-explore-public']);
const GBN_TAB_MAP = {
  'screen-dashboard':'gbn-home','screen-explore':'gbn-explore',
  'screen-notifications':'gbn-alerts','screen-profile':'gbn-profile',
  'screen-landing':'gbn-home','screen-explore-public':'gbn-explore',
};

const TRIP_SCREENS = new Set(['screen-itinerary','screen-chat','screen-collab','screen-loading','screen-create']);

const _gbnOrigShow = gopack.showScreen.bind(gopack);
gopack.showScreen = function(id) {
  _gbnOrigShow(id);
  const nav = document.getElementById('global-bottom-nav');
  if (!nav) return;
  const isAuth   = GBN_SCREENS.has(id) && gopack.currentUser;
  const isPublic = GBN_PUBLIC_SCREENS.has(id);
  if (TRIP_SCREENS.has(id)) {
    // Always hide global nav on trip screens — they have their own nav/FAB
    nav.style.display = 'none';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('has-global-nav'));
  } else if (isAuth || isPublic) {
    nav.style.display = 'flex';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('has-global-nav'));
    document.getElementById(id)?.classList.add('has-global-nav');
    document.querySelectorAll('.gbn-item').forEach(b => b.classList.remove('active'));
    const activeId = GBN_TAB_MAP[id];
    if (activeId) document.getElementById(activeId)?.classList.add('active');
  } else {
    nav.style.display = 'none';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('has-global-nav'));
  }
};
window.showScreen = (id) => gopack.showScreen(id);

gopack.gbnNav = window.gbnNav = function(tab) {
  const authed = !!gopack.currentUser;
  switch(tab) {
    case 'home':    authed ? gopack.showDashboard() : gopack.showScreen('screen-landing'); break;
    case 'explore': authed ? gopack.showScreen('screen-explore') : gopack.showScreen('screen-explore-public'); break;
    case 'new':     authed ? gopack.showScreen('screen-create') : gopack.showAuthForAction('create'); break;
    case 'alerts':  authed ? gopack.showScreen('screen-notifications') : gopack.showAuthForAction('signin'); break;
    case 'profile': authed ? gopack.showScreen('screen-profile') : gopack.showAuthForAction('signin'); break;
  }
};

// Sync notif dot to global nav
const _gbnOrigDot = gopack.updateNotifDot?.bind(gopack);
gopack.updateNotifDot = function(show) {
  if (_gbnOrigDot) _gbnOrigDot(show);
  const dot = document.getElementById('gbn-notif-dot');
  if (dot) dot.style.display = show ? 'block' : 'none';
};

// Show nav when landing loads
const _gbnLandingShow = gopack.showScreen.bind(gopack);