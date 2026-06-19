// ══════════════════════════════════════════════
// gopack.now — state.js
// Must be loaded FIRST. Sets up the global gopack
// namespace, Firebase, shared state, and helpers.
// ══════════════════════════════════════════════

window.gopack = window.gopack || {};

// ── Firebase config ───────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDtdq065PaOR3xlML_fekm53h2XcPz3NAo',
  authDomain:        'gopacknow-83d54.firebaseapp.com',
  databaseURL:       'https://gopacknow-83d54-default-rtdb.firebaseio.com',
  projectId:         'gopacknow-83d54',
  storageBucket:     'gopacknow-83d54.firebasestorage.app',
  messagingSenderId: '107013969008',
  appId:             '1:107013969008:web:5c6026da49efe7b58510b5',
};

const FIREBASE_READY = FIREBASE_CONFIG.apiKey !== 'YOUR_FIREBASE_API_KEY';
let db   = null;
let auth = null;

if (FIREBASE_READY) {
  firebase.initializeApp(FIREBASE_CONFIG);
  db   = firebase.database();
  auth = firebase.auth();
}

// ── Shared references (readable by all modules) ──
gopack.db   = db;
gopack.auth = auth;
gopack.FIREBASE_READY = FIREBASE_READY;

// ── Current user ──────────────────────────────
gopack.currentUser = null;

// ── App state ─────────────────────────────────
gopack.state = {
  destination: '', days: 3, vibes: ['culture'], budget: 'midrange',
  startDate: '', endDate: '',
  wishes: [], wishEntries: [], userName: '', tripId: '',
  isHost: false,
  memberId: Math.random().toString(36).substr(2, 8),
  wishListener:      null,
  memberListener:    null,
  presenceListener:  null,
  onlineMemberIds:   new Set(),
  lastMembersSnapshot: null,
  itineraryListener: null,
  currentItinerary:  null,
  currentlyEditingActId: null,
  tripPassword: null,
  hostMemberId: null,
  visibility: 'private',
};

// Trips we've already sent a "member joined" notification for this session
gopack.notifiedJoins = new Set();

// ── Multi-city state ──────────────────────────
gopack.selectedCities = [];

gopack.updateDestinationState = function() {
  gopack.state.destination = gopack.selectedCities.join(', ');
};

// ── Vibe / budget maps ────────────────────────
gopack.VIBE_LABELS = {
  culture:'Culture', food:'Foodie', adventure:'Adventure',
  relaxation:'Relaxation', nightlife:'Nightlife', shopping:'Shopping',
};

gopack.vibeLabel = function(v) {
  if (Array.isArray(v)) return v.map(x => gopack.VIBE_LABELS[x] || x).join(' & ');
  return gopack.VIBE_LABELS[v] || v;
};

gopack.budgetLabel = function(b) {
  return { budget:'Budget 🪙', midrange:'Mid-range 💳', luxury:'Luxury 💎' }[b] || 'Mid-range';
};

gopack.budgetDesc = function(b) {
  return {
    budget:   'budget-friendly options, street food, affordable transport, free attractions',
    midrange: 'mid-range restaurants, comfortable transport, popular attractions',
    luxury:   'luxury hotels, fine dining, private transport, exclusive experiences',
  }[b] || 'mid-range';
};

// ── DOM helpers ───────────────────────────────
gopack.$ = function(id) { return document.getElementById(id); };

gopack.escHtml = function(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

gopack.generateId = function() {
  return Math.random().toString(36).substr(2, 8);
};

gopack.showScreen = function(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Screen-specific hooks
  if (id === 'screen-profile')       gopack.loadProfile();
  if (id === 'screen-notifications') gopack.loadNotifications();
  if (id === 'screen-dashboard')     { gopack.loadDashboardTrips(); gopack.loadUnreadNotifCount(); }
  if (id === 'screen-explore' || id === 'screen-explore-public') {
    if (typeof gopack.loadPublicTrips === 'function') gopack.loadPublicTrips();
  }
};
// Expose as global so inline onclick handlers in index.html can call it
window.showScreen = (id) => gopack.showScreen(id);

gopack.showError = function(id, ms = 3500) {
  const el = gopack.$(id);
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', ms);
};

// ── Icon picker ───────────────────────────────
gopack.pickIcon = function(text) {
  const t = text.toLowerCase();
  if (/food|eat|restaurant|ramen|sushi|cafe|coffee|drink|bar|izakaya|market/.test(t)) return `<svg width="16" height="16" viewBox="0 0 28 28" fill="none"><path d="M7 20h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M9 20c0-5 2-9 5-9s5 4 5 9" stroke="currentColor" stroke-width="1.5"/></svg>`;
  if (/museum|art|gallery|history|temple|shrine|palace|castle|monument/.test(t)) return `<svg width="16" height="16" viewBox="0 0 28 28" fill="none"><path d="M14 4l2 7h8l-6 5 2 7-6-4-6 4 2-7-6-5h8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  if (/hike|trek|climb|mountain|nature|park|garden/.test(t)) return `<svg width="16" height="16" viewBox="0 0 28 28" fill="none"><path d="M14 24V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 10c0-5 4-7 8-6-1 4-4 6-8 6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  if (/shop|mall|market|souvenir|buy/.test(t)) return `<svg width="16" height="16" viewBox="0 0 28 28" fill="none"><rect x="5" y="10" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M10 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.5"/></svg>`;
  if (/beach|ocean|sea|swim|snorkel/.test(t)) return `<svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M2 26L10 10l5 8 4-5 9 13H2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="22" cy="7" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
  if (/night|club|disco|party|lounge/.test(t)) return `<svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M13 22V11l12-3v11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="22" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="23" cy="19" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;
  if (/spa|massage|relax|hot spring|onsen/.test(t)) return `<svg width="16" height="16" viewBox="0 0 28 28" fill="none"><path d="M14 24V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 10c0-5 4-7 8-6-1 4-4 6-8 6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return `<svg width="14" height="14" viewBox="0 0 28 28" fill="none"><path d="M14 4l2 5h5l-4 3 1.5 5L14 14l-4.5 3 1.5-5-4-3h5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
};

// ── Time / date helpers ───────────────────────
gopack.parseTime = function(t) {
  if (!t) return 9999;
  const m = t.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (m) {
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const pm = m[3].toLowerCase() === 'pm';
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h * 60 + min;
  }
  const m24 = t.match(/(\d{1,2}):(\d{2})/);
  if (m24) return parseInt(m24[1]) * 60 + parseInt(m24[2]);
  return 9999;
};

gopack.localDateStamp = function(d) {
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
};

gopack.sortByTime = function(acts) {
  return [...acts].sort((a, b) => gopack.parseTime(a.time) - gopack.parseTime(b.time));
};

gopack.ensureIds = function(data) {
  (data.days || []).forEach(day => {
    (day.activities || []).forEach(act => {
      if (!act.actId) act.actId = gopack.generateId();
    });
  });
};

gopack.parseItineraryText = function(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch(e) {}
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch(e) {}
  }
  return null;
};

gopack.getItineraryDates = function() {
  if (!gopack.state.startDate) return null;
  const dates = [];
  const start = new Date(gopack.state.startDate + 'T12:00:00');
  let numDays = gopack.state.days;
  if (gopack.state.endDate) {
    const end  = new Date(gopack.state.endDate + 'T12:00:00');
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) numDays = diff;
  }
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

gopack.formatDate = function(d) {
  return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
};

gopack.formatDateShort = function(d) {
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
};

// ── Maps / Calendar URLs ──────────────────────
gopack.calendarUrl = function(actName, actDesc, date, time, dest) {
  if (!date) return null;
  const timeMatch = time ? time.match(/(\d+):(\d+)\s*(am|pm)/i) : null;
  let startDt, endDt;
  if (timeMatch) {
    let h = parseInt(timeMatch[1]), m = parseInt(timeMatch[2]);
    if (timeMatch[3].toLowerCase() === 'pm' && h !== 12) h += 12;
    if (timeMatch[3].toLowerCase() === 'am' && h === 12) h = 0;
    const pad = n => String(n).padStart(2, '0');
    const dateStr = gopack.localDateStamp(date);
    startDt = dateStr + 'T' + pad(h) + pad(m) + '00';
    endDt   = dateStr + 'T' + pad(h + 1) + pad(m) + '00';
  } else {
    const dateStr = gopack.localDateStamp(date);
    startDt = dateStr;
    endDt   = dateStr;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: actName + ' — gopack.now',
    dates: startDt + '/' + endDt,
    details: actDesc,
    location: actName + ', ' + dest,
  });
  return 'https://calendar.google.com/calendar/render?' + params.toString();
};

gopack.getCityForDay = function(dayIndex) {
  const cities = gopack.selectedCities.length > 0
    ? gopack.selectedCities
    : gopack.state.destination.split(',').map(c => c.trim()).filter(Boolean);
  if (cities.length <= 1) return cities[0] || gopack.state.destination;
  const baseDays = Math.floor(gopack.state.days / cities.length);
  const extra    = gopack.state.days % cities.length;
  let dayCount   = 0;
  for (let ci = 0; ci < cities.length; ci++) {
    dayCount += baseDays + (ci < extra ? 1 : 0);
    if (dayIndex < dayCount) return cities[ci];
  }
  return cities[cities.length - 1];
};

gopack.mapsUrlForDay = function(name, dayIndex) {
  const city = gopack.getCityForDay(dayIndex);
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name + ' ' + city);
};

gopack.mapsUrlForActivity = function(name, city) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name + ' ' + (city || gopack.state.destination));
};

// ── Trust stats ───────────────────────────────
gopack.loadTrustStats = function() {
  if (!db) return;
  db.ref('meta/tripCount').once('value', snap => {
    const count = snap.val() || 0;
    const el = document.getElementById('trust-trips');
    if (el) el.textContent = count > 0 ? count + '+' : '—';
  });
};

// ── Global shims for inline onclick handlers in index.html ──
// These functions are defined in later-loaded modules but called
// directly from HTML. The shims delegate at call-time so the
// actual implementation is always resolved after all scripts load.
window.showDashboard         = ()      => gopack.showDashboard();
window.showTripTab           = (tab)   => gopack.showTripTab(tab);
window.prefillDestination    = (city)  => gopack.prefillDestination(city);
window.prefillVibe           = (vibe)  => gopack.prefillVibe(vibe);
window.generatePackingList   = ()      => gopack.generatePackingList();
window.shareItinerary        = ()      => gopack.shareItinerary();
window.exportToPDF           = ()      => gopack.exportToPDF();
window.togglePasswordProtect = ()      => gopack.togglePasswordProtect();
window.togglePwVisibility    = ()      => gopack.togglePwVisibility();
window.openDashTrip          = (id)    => gopack.openDashTrip(id);
window.markNotifRead         = (id, t) => gopack.markNotifRead(id, t);
window.voteWish              = (key)   => gopack.voteWish(key);
window.downvoteWish          = (key)   => gopack.downvoteWish(key);
window.removeWish            = (key)   => gopack.removeWish(key);
window.removeCity            = (i)     => gopack.removeCity(i);
window.startEditActivity     = (id)    => gopack.startEditActivity(id);
window.saveActivity          = (id)    => gopack.saveActivity(id);
window.cancelEdit            = ()      => gopack.cancelEdit();
window.deleteActivity        = (id)    => gopack.deleteActivity(id);
window.addActivity           = (di)    => gopack.addActivity(di);
window.exportToCalendar      = ()      => gopack.exportToCalendar();