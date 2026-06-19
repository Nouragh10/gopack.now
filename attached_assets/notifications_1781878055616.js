// ══════════════════════════════════════════════
// gopack.now — notifications.js
// Push, load, mark-read, and unread dot
// ══════════════════════════════════════════════

gopack.pushNotification = function(uid, notif) {
  if (!gopack.db || !uid) return;
  gopack.db.ref('notifications/' + uid).push(notif);
};

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return 'Just now';
  if (s < 3600)  return Math.floor(s / 60)   + 'm ago';
  if (s < 86400) return Math.floor(s / 3600)  + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

gopack.loadNotifications = async function() {
  if (!gopack.db || !gopack.currentUser) return;
  const snap   = await gopack.db.ref('notifications/' + gopack.currentUser.uid)
    .orderByChild('timestamp').once('value');
  const notifs = Object.entries(snap.val() || {})
    .map(([id, n]) => ({ id, ...n }))
    .sort((a, b) => b.timestamp - a.timestamp);

  const newList       = document.getElementById('notif-new-list');
  const earlierList   = document.getElementById('notif-earlier-list');
  const earlierSection= document.getElementById('notif-earlier-section');
  const emptyEl       = document.getElementById('notif-empty');
  const newSection    = document.getElementById('notif-new-section');
  if (!newList) return;

  if (!notifs.length) {
    if (newSection) newSection.style.display = 'none';
    if (emptyEl)    emptyEl.style.display    = 'flex';
    return;
  }
  if (emptyEl)    emptyEl.style.display    = 'none';
  if (newSection) newSection.style.display = 'block';

  const cutoff  = Date.now() - 24 * 60 * 60 * 1000;
  const fresh   = notifs.filter(n => n.timestamp > cutoff);
  const earlier = notifs.filter(n => n.timestamp <= cutoff);

  const icons = { chat:`<svg width="14" height="14" viewBox="0 0 28 28" fill="none"><path d="M5 7h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-6 4V9a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`, member:`<svg width="14" height="14" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="9" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M6 24c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, vote:`<svg width="14" height="14" viewBox="0 0 28 28" fill="none"><path d="M5 16V12a2 2 0 0 1 2-2h5l2-5a2 2 0 0 1 4 0l-1 5h5a2 2 0 0 1 2 2l-2 6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 10v10" stroke="currentColor" stroke-width="0.75"/></svg>`, itinerary:`<svg width="14" height="14" viewBox="0 0 28 28" fill="none"><rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4 11h20" stroke="currentColor" stroke-width="0.75"/><path d="M8 15h4M8 18h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, like:`<svg width="14" height="14" viewBox="0 0 28 28" fill="none"><path d="M14 22s-9-5.5-9-11a6 6 0 0 1 12 0 6 6 0 0 1 6 6c0 5.5-9 11-9 5.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`, template:`<svg width="14" height="14" viewBox="0 0 28 28" fill="none"><rect x="4" y="6" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4 11h20" stroke="currentColor" stroke-width="0.75"/><path d="M8 15h4M8 18h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, rate:`<svg width="14" height="14" viewBox="0 0 28 28" fill="none"><polygon points="14,3 17,11 25,11 19,16 21,24 14,19 7,24 9,16 3,11 11,11" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor"/></svg>` };
  const renderNotif = n => `
    <div class="notif-item ${n.read ? 'read' : ''}" onclick="markNotifRead('${n.id}','${n.tripId || ''}','${n.type || ''}')">
      <div class="notif-icon">${icons[n.type] || `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`}</div>
      <div class="notif-body">
        <div class="notif-text">${gopack.escHtml(n.text || '')}</div>
        <div class="notif-time">${timeAgo(n.timestamp)}</div>
      </div>
      ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
    </div>`;

  newList.innerHTML = fresh.map(renderNotif).join('')
    || '<div style="color:var(--muted-2);font-size:0.85rem;padding:0.5rem 0">Nothing new in the last 24 hours</div>';

  if (earlier.length && earlierList && earlierSection) {
    earlierSection.style.display = 'block';
    earlierList.innerHTML = earlier.map(renderNotif).join('');
  }
  gopack.updateNotifDot(fresh.some(n => !n.read));
};

gopack.markNotifRead = window.markNotifRead = async function(notifId, tripId, notifType) {
  if (!gopack.db || !gopack.currentUser) return;
  await gopack.db.ref('notifications/' + gopack.currentUser.uid + '/' + notifId + '/read').set(true);
  if (notifType === 'rate' && tripId) {
    // Load trip destination then show rating modal
    try {
      const snap = await gopack.db.ref('trips/' + tripId).once('value');
      const trip  = snap.val();
      if (trip && typeof gopack.showRatingModal === 'function') {
        gopack.showRatingModal(tripId, trip.destination);
      } else {
        gopack.loadNotifications();
      }
    } catch(e) { gopack.loadNotifications(); }
  } else if (tripId) {
    openDashTrip(tripId);
  } else {
    gopack.loadNotifications();
  }
};

(function wireMarkAllRead() {
  const markAllBtn = document.getElementById('notif-mark-read');
  if (markAllBtn) markAllBtn.addEventListener('click', async () => {
    if (!gopack.db || !gopack.currentUser) return;
    const snap = await gopack.db.ref('notifications/' + gopack.currentUser.uid).once('value');
    const updates = {};
    Object.keys(snap.val() || {}).forEach(k => { updates[k + '/read'] = true; });
    await gopack.db.ref('notifications/' + gopack.currentUser.uid).update(updates);
    gopack.loadNotifications();
    gopack.updateNotifDot(false);
  });
})();

gopack.loadUnreadNotifCount = async function() {
  if (!gopack.db || !gopack.currentUser) return;
  const snap = await gopack.db.ref('notifications/' + gopack.currentUser.uid)
    .orderByChild('read').equalTo(false).once('value');
  gopack.updateNotifDot(snap.numChildren() > 0);
};

gopack.updateNotifDot = function(show) {
  const dot = document.getElementById('dash-notif-dot');
  if (dot) dot.style.display = show ? 'block' : 'none';
};