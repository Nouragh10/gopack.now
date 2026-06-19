// ══════════════════════════════════════════════
// gopack.now — firebase-listeners.js
// Real-time listeners, joinTrip, joinAsMember
// ══════════════════════════════════════════════

// ── Start all listeners for a trip ────────────
gopack.startAllListeners = function(tripId) {
  // Wishes
  if (gopack.state.wishListener) gopack.state.wishListener.off();
  const wishRef = gopack.db.ref('trips/' + tripId + '/wishes');
  gopack.state.wishListener = wishRef;
  wishRef.on('value', snap => {
    const data = snap.val() || {};
    gopack.state.wishEntries = Object.entries(data)
      .sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
    gopack.state.wishes = gopack.state.wishEntries.map(([, w]) => w);
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'screen-collab') gopack.renderWishes();
  });

  // Members
  if (gopack.state.memberListener) gopack.state.memberListener.off();
  const memberRef = gopack.db.ref('trips/' + tripId + '/members');
  gopack.state.memberListener = memberRef;
  memberRef.on('value', snap => {
    gopack.state.lastMembersSnapshot = Object.values(snap.val() || {});
    gopack.renderMembers(gopack.state.lastMembersSnapshot);
  });

  // Presence — drives the live "online now" dot on member avatars
  if (gopack.state.presenceListener) gopack.state.presenceListener.off();
  const presenceListRef = gopack.db.ref('trips/' + tripId + '/presence');
  gopack.state.presenceListener = presenceListRef;
  presenceListRef.on('value', snap => {
    gopack.state.onlineMemberIds = new Set(Object.keys(snap.val() || {}));
    if (gopack.state.lastMembersSnapshot) gopack.renderMembers(gopack.state.lastMembersSnapshot);
  });

  // Packing list
  if (gopack.state.packingListener) gopack.state.packingListener.off();
  const packingRef = gopack.db.ref('trips/' + tripId + '/packingList');
  gopack.state.packingListener = packingRef;
  packingRef.on('value', snap => {
    const list = snap.val();
    const box  = document.getElementById('packing-box');
    if (box && list && typeof list === 'object') {
      box.innerHTML = gopack.renderPackingList(list);
      box.style.display = 'grid';
    }
  });

  // Itinerary — the key listener
  if (gopack.state.itineraryListener) gopack.state.itineraryListener.off();
  const itinRef = gopack.db.ref('trips/' + tripId + '/itinerary');
  gopack.state.itineraryListener = itinRef;
  itinRef.on('value', snap => {
    const data = snap.val();
    if (!data) return;
    gopack.state.currentItinerary = data;
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    if (activeScreen.id === 'screen-itinerary') {
      gopack.renderItineraryDays();
    } else if (activeScreen.id === 'screen-collab' || activeScreen.id === 'screen-loading') {
      gopack.showScreen('screen-itinerary');
      setTimeout(() => gopack.renderItineraryFull(), 100);
    }
  });
};

// ── Join a trip by ID ─────────────────────────
gopack.joinTrip = async function(tripId) {
  if (!tripId || !gopack.db) return false;
  tripId = tripId.toLowerCase().trim();
  try {
    const snap = await gopack.db.ref('trips/' + tripId).once('value');
    const trip = snap.val();
    if (!trip) return false;

    // Password check
    if (trip.password) {
      const entered = await new Promise(resolve => {
        gopack.showPasswordModal({
          title: 'Password required',
          sub:   'This trip is protected. Ask the host for the password.',
          icon:  '🔐',
          confirmText: 'Join trip →',
          onConfirm: val => resolve(val),
          onCancel:  ()  => resolve(null),
        });
      });
      if (!entered) return false;
      if (entered.trim() !== trip.password) {
        gopack.showPasswordModal({
          title: 'Wrong password',
          sub:   'That password is incorrect. Ask the trip host for the right one.',
          icon:  '❌',
          confirmText: 'Try again',
          onConfirm: () => gopack.joinTrip(tripId),
          onCancel:  () => {},
        });
        return false;
      }
    }

    const s = gopack.state;
    s.tripId       = tripId;
    s.destination  = trip.destination;
    s.days         = trip.days;
    s.vibes        = trip.vibes || (trip.vibe ? [trip.vibe] : ['culture']);
    s.budget       = trip.budget || 'midrange';
    s.startDate    = trip.startDate || '';
    s.endDate      = trip.endDate   || '';

    // Recompute days from actual dates if both are present
    if (s.startDate && s.endDate) {
      const start = new Date(s.startDate + 'T12:00:00');
      const end   = new Date(s.endDate   + 'T12:00:00');
      const diff  = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) s.days = diff;
    }

    // Bug 1 fix: repopulate selectedCities for correct Maps links
    gopack.selectedCities = (trip.destination || '').split(',').map(c => c.trim()).filter(Boolean);
    gopack.renderCityChips();

    // Restore vibe & budget buttons
    document.querySelectorAll('.vibe-btn').forEach(b => {
      b.classList.toggle('selected', s.vibes.includes(b.dataset.vibe));
    });
    document.querySelectorAll('#budget-row .pill').forEach(p => {
      p.classList.toggle('selected', p.dataset.budget === s.budget);
    });

    s.hostMemberId = trip.hostMemberId || null;
    s.isHost       = !!s.hostMemberId && s.hostMemberId === s.memberId;

    gopack.populateCollabScreen();
    gopack.startAllListeners(tripId);
    gopack.joinAsMember(tripId, s.userName || 'Guest');
    gopack.addTripToUserIndex(tripId, s.isHost ? 'host' : 'member');

    // Notify host once per session
    if (gopack.currentUser && s.hostMemberId && s.hostMemberId !== s.memberId && !gopack.notifiedJoins.has(tripId)) {
      gopack.notifiedJoins.add(tripId);
      gopack.pushNotification(s.hostMemberId, {
        type: 'member',
        text: (s.userName || 'Someone') + ' joined your ' + (s.destination || 'trip') + ' trip',
        timestamp: Date.now(),
        read: false,
        tripId,
      });
    }

    gopack.showScreen('screen-collab');
    if (trip.itinerary) s.currentItinerary = trip.itinerary;
    return true;
  } catch(err) {
    console.error('gopack: join error', err);
    return false;
  }
};

// ── Register / update membership ──────────────
gopack.joinAsMember = function(tripId, name) {
  if (!gopack.db) return;
  gopack.db.ref('trips/' + tripId + '/members/' + gopack.state.memberId).update({
    name:     name || 'Anonymous',
    joinedAt: Date.now(),
    memberId: gopack.state.memberId,
    isHost:   gopack.state.isHost || false,
    photoURL: gopack.currentUser?.photoURL || '',
  });
  const presenceRef = gopack.db.ref('trips/' + tripId + '/presence/' + gopack.state.memberId);
  presenceRef.set(true);
  presenceRef.onDisconnect().remove();
};

// ── Per-user trip index ───────────────────────
gopack.addTripToUserIndex = function(tripId, role) {
  if (!gopack.db || !gopack.currentUser) return;
  gopack.db.ref('users/' + gopack.currentUser.uid + '/trips/' + tripId)
    .update({ role, at: Date.now() });
};

gopack.loadUserTrips = async function() {
  if (!gopack.db || !gopack.currentUser) return [];
  const idxSnap = await gopack.db.ref('users/' + gopack.currentUser.uid + '/trips').once('value');
  const ids     = Object.keys(idxSnap.val() || {});
  const snaps   = await Promise.all(ids.map(id => gopack.db.ref('trips/' + id).once('value')));
  return snaps
    .map((s, i) => { const v = s.val(); return v ? { id: ids[i], ...v } : null; })
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
};