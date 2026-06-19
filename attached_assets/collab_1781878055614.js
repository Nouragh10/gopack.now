// ══════════════════════════════════════════════
// gopack.now — collab.js
// Collaborate screen: wishlist, members,
// share link, password protect
// ══════════════════════════════════════════════

// ── Populate collab screen from state ─────────
gopack.populateCollabScreen = function() {
  const safe = (id, val) => { const el = gopack.$(id); if (el) el.textContent = val; };
  const s = gopack.state;
  safe('collab-dest-chip', '📍 ' + s.destination);
  const dateStr = s.startDate
    ? ' · Starting ' + new Date(s.startDate + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })
    : '';
  safe('collab-subtitle', s.days + ' days' + dateStr + ' · ' + gopack.vibeLabel(s.vibes) + ' · ' + gopack.budgetLabel(s.budget));
  safe('nav-dest-label',    s.destination);
  safe('nav-days-label',    s.days + ' days');
  safe('share-link-text',   window.location.origin + window.location.pathname + '?t=' + s.tripId);
  safe('step-dest',         s.destination);
  safe('loading-dest-text', 'Crafting your ' + s.destination + ' adventure');
};

// ── Name input ────────────────────────────────
let nameWriteTimer = null;
const yourNameEl = gopack.$('your-name');
if (yourNameEl) yourNameEl.addEventListener('input', function() {
  const name = this.value.trim();
  gopack.state.userName = name;
  const preview = gopack.$('name-preview');
  if (preview) preview.textContent = name ? '🎒 ' + name : '🎒 You';
  const avatar = gopack.$('host-avatar');
  if (avatar) avatar.textContent = name ? name.charAt(0).toUpperCase() : 'Y';
  const label = gopack.$('host-name-label');
  if (label) label.textContent = name
    ? name + (gopack.state.isHost ? ' (host)' : '')
    : (gopack.state.isHost ? 'You (host)' : 'You');
  if (gopack.state.tripId) {
    clearTimeout(nameWriteTimer);
    nameWriteTimer = setTimeout(() => {
      gopack.joinAsMember(gopack.state.tripId, name || (gopack.state.isHost ? 'Host' : 'Guest'));
    }, 500);
  }
});

// ── Wishlist ──────────────────────────────────
gopack.addWish = async function() {
  const input = gopack.$('wish-input');
  const text  = input.value.trim();
  if (!text) return;
  const wish = {
    text, author: gopack.state.userName || 'Anonymous',
    icon: gopack.pickIcon(text), timestamp: Date.now(),
    memberId: gopack.state.memberId, votes: 0, votedBy: {},
  };
  if (gopack.db) {
    await gopack.db.ref('trips/' + gopack.state.tripId + '/wishes').push(wish);
  } else {
    wish.id = Date.now();
    gopack.state.wishes.push(wish);
    gopack.renderWishesLocal();
  }
  input.value = '';
  input.focus();
};

window.voteWish = async function(key) {
  if (!gopack.db || !gopack.state.tripId) return;
  const ref = gopack.db.ref('trips/' + gopack.state.tripId + '/wishes/' + key);
  const voterName = gopack.state.userName || 'Anonymous';
  await ref.transaction(wish => {
    if (!wish) return wish;
    const votedBy   = wish.votedBy   || {};
    const downVoted = wish.downVoted || {};
    // Toggle upvote; remove downvote if switching
    if (votedBy[gopack.state.memberId]) {
      delete votedBy[gopack.state.memberId];
    } else {
      votedBy[gopack.state.memberId] = voterName;
      delete downVoted[gopack.state.memberId];
    }
    wish.votedBy   = votedBy;
    wish.downVoted = downVoted;
    wish.votes     = Object.keys(votedBy).length;
    wish.downVotes = Object.keys(downVoted).length;
    return wish;
  });
};

window.downvoteWish = gopack.downvoteWish = async function(key) {
  if (!gopack.db || !gopack.state.tripId) return;
  const ref = gopack.db.ref('trips/' + gopack.state.tripId + '/wishes/' + key);
  const voterName = gopack.state.userName || 'Anonymous';
  await ref.transaction(wish => {
    if (!wish) return wish;
    const votedBy   = wish.votedBy   || {};
    const downVoted = wish.downVoted || {};
    // Toggle downvote; remove upvote if switching
    if (downVoted[gopack.state.memberId]) {
      delete downVoted[gopack.state.memberId];
    } else {
      downVoted[gopack.state.memberId] = voterName;
      delete votedBy[gopack.state.memberId];
    }
    wish.votedBy   = votedBy;
    wish.downVoted = downVoted;
    wish.votes     = Object.keys(votedBy).length;
    wish.downVotes = Object.keys(downVoted).length;
    return wish;
  });
};

window.removeWish = async function(keyOrId) {
  if (gopack.db) {
    await gopack.db.ref('trips/' + gopack.state.tripId + '/wishes/' + keyOrId).remove();
  } else {
    gopack.state.wishes = gopack.state.wishes.filter(w => w.id !== keyOrId);
    gopack.renderWishesLocal();
  }
};

gopack.renderWishesLocal = function() {
  const list = gopack.$('wish-list');
  gopack.$('wish-count').textContent = gopack.state.wishes.length;
  list.innerHTML = gopack.state.wishes.map(w => {
    const voted = (w.votedBy || {})[gopack.state.memberId];
    const votes = w.votes || 0;
    return `
    <div class="wish-item" role="listitem">
      <div class="wish-content">
        <div class="wish-text">${gopack.escHtml(w.text)}</div>
        <div class="wish-meta">Added by ${gopack.escHtml(w.author)}</div>
        ${votes > 0 ? `<div class="wish-voters">👍 ${gopack.escHtml(Object.values(w.votedBy || {}).join(', '))}</div>` : ''}
        ${(w.downVotes || 0) > 0 ? `<div class="wish-downvoters">👎 ${gopack.escHtml(Object.values(w.downVoted || {}).join(', '))}</div>` : ''}
      </div>
      <div class="wish-actions">
        <button class="vote-btn ${voted ? 'voted' : ''}" onclick="voteWish('${w.id}')" title="Upvote">
          ▲ ${votes > 0 ? votes : ''}
        </button>
        <button class="vote-btn downvote-btn ${(w.downVoted || {})[gopack.state.memberId] ? 'downvoted' : ''}" onclick="downvoteWish('${w.id}')" title="Downvote">
          ▼ ${(w.downVotes || 0) > 0 ? w.downVotes : ''}
        </button>
        ${w.memberId === gopack.state.memberId
          ? `<button class="wish-remove" onclick="removeWish('${w.id}')"><svg width="12" height="12" viewBox="0 0 28 28" fill="none"><line x1="8" y1="8" x2="20" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="20" y1="8" x2="8" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`
          : ''}
      </div>
    </div>`;
  }).join('');
};

gopack.renderWishes = function() {
  if (!gopack.db) { gopack.renderWishesLocal(); return; }
  const list = gopack.$('wish-list');
  if (!list) return;
  gopack.$('wish-count').textContent = gopack.state.wishEntries.length;
  if (!gopack.state.wishEntries.length) { list.innerHTML = ''; gopack.renderVoteInline(); return; }
  list.innerHTML = gopack.state.wishEntries.map(([key, w]) => {
    const voted     = (w.votedBy   || {})[gopack.state.memberId];
    const downvoted = (w.downVoted || {})[gopack.state.memberId];
    const votes     = w.votes     || 0;
    const downVotes = w.downVotes || 0;
    return `
    <div class="wish-item" role="listitem">
      <div class="wish-content">
        <div class="wish-text">${gopack.escHtml(w.text)}</div>
        <div class="wish-meta">Added by ${gopack.escHtml(w.author)}</div>
        ${votes > 0 ? `<div class="wish-voters">👍 ${gopack.escHtml(Object.values(w.votedBy || {}).join(', '))}</div>` : ''}
        ${downVotes > 0 ? `<div class="wish-downvoters">👎 ${gopack.escHtml(Object.values(w.downVoted || {}).join(', '))}</div>` : ''}
      </div>
      <div class="wish-actions">
        <button class="vote-btn ${voted ? 'voted' : ''}" onclick="voteWish('${key}')" title="Upvote">
          ▲ ${votes > 0 ? votes : ''}
        </button>
        <button class="vote-btn downvote-btn ${downvoted ? 'downvoted' : ''}" onclick="downvoteWish('${key}')" title="Downvote">
          ▼ ${downVotes > 0 ? downVotes : ''}
        </button>
        ${w.memberId === gopack.state.memberId
          ? `<button class="wish-remove" onclick="removeWish('${key}')">×</button>`
          : ''}
      </div>
    </div>`;
  }).join('');
  gopack.renderVoteInline();
};

gopack.renderVoteInline = function() {
  const el = document.getElementById('vote-inline-list');
  if (!el) return;
  const entries = gopack.state.wishEntries || [];
  if (!entries.length) {
    el.innerHTML = '<div class="vote-inline-empty">Add wishes on the left to start voting</div>';
    return;
  }
  const sorted = [...entries].sort((a, b) => ((b[1].votes || 0) - (a[1].votes || 0)));
  const maxVotes = sorted[0][1].votes || 0;
  el.innerHTML = sorted.map(([key, w]) => {
    const voted     = !!(w.votedBy || {})[gopack.state.memberId];
    const downvoted = !!(w.downVoted || {})[gopack.state.memberId];
    const votes     = w.votes || 0;
    const pct       = maxVotes > 0 ? Math.round((votes / maxVotes) * 100) : 0;
    return `
    <div class="vote-inline-item ${voted ? 'voted' : ''}">
      <div class="vote-inline-body">
        <div class="vote-inline-text">${gopack.escHtml(w.text)}</div>
        <div class="vote-inline-bar"><div class="vote-inline-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="vote-inline-btns">
        <button class="vote-inline-up ${voted ? 'active' : ''}" onclick="voteWish('${key}')">▲ ${votes || ''}</button>
        <button class="vote-inline-dn ${downvoted ? 'active' : ''}" onclick="downvoteWish('${key}')">▼</button>
      </div>
    </div>`;
  }).join('');
};

// ── Members strip ─────────────────────────────
gopack.renderMembers = function(members) {
  const strip = gopack.$('friends-strip');
  if (!strip) return;
  if (!members.length) {
    strip.innerHTML = '<div class="pack-chip waiting">Waiting for friends...</div>';
    return;
  }
  const sorted = [...members].sort((a, b) => {
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    return (a.joinedAt || 0) - (b.joinedAt || 0);
  });
  const online = gopack.state.onlineMemberIds || new Set();
  strip.innerHTML = sorted.map(m => {
    const isOnline   = online.has(m.memberId);
    const initials   = gopack.escHtml((m.name || '?').charAt(0).toUpperCase());
    const avatarHtml = m.photoURL
      ? `<img class="chip-avatar chip-avatar-photo" src="${gopack.escHtml(m.photoURL)}" alt="${gopack.escHtml(m.name || '')}" onerror="this.outerHTML='<div class=&quot;chip-avatar&quot;>${initials}</div>'" />`
      : `<div class="chip-avatar">${initials}</div>`;
    return `
    <div class="pack-chip ${m.isHost ? 'host' : ''}">
      <div class="chip-avatar-wrap">
        ${avatarHtml}
        <span class="chip-online-dot ${isOnline ? 'online' : ''}" title="${isOnline ? 'Online now' : 'Offline'}"></span>
      </div>
      <span>${gopack.escHtml(m.name)}${m.isHost ? ' (host)' : ''}</span>
    </div>`;
  }).join('');
  gopack.updateItineraryPack(sorted);
  gopack.updateLivePresence(members.length);
};

gopack.updateItineraryPack = function(members) {
  const packEl = gopack.$('itin-pack-members');
  if (!packEl || !members || !members.length) return;
  packEl.innerHTML = members.map(m => `
    <div class="itin-member">
      <div class="itin-member-avatar">${gopack.escHtml((m.name || '?').charAt(0).toUpperCase())}</div>
      <span class="itin-member-name">${gopack.escHtml(m.name || '?')}${m.isHost ? ' 👑' : ''}</span>
    </div>`).join('');
};

// ── Password protect ──────────────────────────
window.togglePasswordProtect = function() {
  if (gopack.state.tripPassword) {
    gopack.state.tripPassword = null;
    if (gopack.db) gopack.db.ref('trips/' + gopack.state.tripId + '/password').remove();
    const ppStatus = gopack.$('pp-status');
    const ppBtn    = gopack.$('pp-btn');
    if (ppStatus) ppStatus.textContent = 'Not set — anyone with the link can join';
    if (ppBtn)    ppBtn.textContent    = 'Set password';
  } else {
    gopack.showPasswordModal({
      title: 'Protect your trip',
      sub:   'Friends will need this password to join',
      icon:  '🔒',
      confirmText: 'Set password →',
      onConfirm: (pw) => {
        gopack.state.tripPassword = pw;
        if (gopack.db) gopack.db.ref('trips/' + gopack.state.tripId + '/password').set(pw);
        const ppStatus = gopack.$('pp-status');
        const ppBtn    = gopack.$('pp-btn');
        if (ppStatus) ppStatus.textContent = 'Password set ✓ — share it with your friends';
        if (ppBtn)    ppBtn.textContent    = 'Remove';
      },
      onCancel: () => {},
    });
  }
};

// ── Copy link ─────────────────────────────────
(function wireCopyBtn() {
  const copyBtn = gopack.$('copy-btn');
  if (copyBtn) copyBtn.addEventListener('click', () => {
    const url = window.location.origin + window.location.pathname + '?t=' + gopack.state.tripId;
    navigator.clipboard.writeText(url).catch(() => {});
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy', 2200);
  });
})();

// ── Build button ──────────────────────────────
(function wireBuildBtn() {
  // build button is handled by inline onclick="gopack.buildItinerary()"
})();

// ── Wish input ────────────────────────────────
(function wireWishInput() {
  const wishInput = gopack.$('wish-input');
  if (wishInput) wishInput.addEventListener('keydown', e => { if (e.key === 'Enter') gopack.addWish(); });
  const wishAddBtn = gopack.$('wish-add-btn');
  if (wishAddBtn) wishAddBtn.addEventListener('click', gopack.addWish);
})();
// expose downvoteWish globally
// downvoteWish is assigned to both window and gopack.downvoteWish above
// ── Wish→Vote→Go rail & Vote screen ──────────

gopack.showTripStage = window.showTripStage = function(stage) {
  if (stage === 'wish') {
    gopack.showScreen('screen-collab');
    document.getElementById('rail-wish')?.classList.add('active');
    document.getElementById('rail-vote')?.classList.remove('active', 'done');
    document.getElementById('rail-go')?.classList.remove('active', 'done');
  } else if (stage === 'vote') {
    gopack.renderVoteScreen();
    gopack.showScreen('screen-vote');
  } else if (stage === 'go') {
    if (gopack.state.currentItinerary) {
      gopack.showScreen('screen-itinerary');
      gopack.renderItineraryFull();
    } else {
      gopack.buildItinerary();
    }
  }
};

gopack.renderVoteScreen = function() {
  const list = document.getElementById('vote-list');
  if (!list) return;

  const entries = gopack.state.wishEntries || [];
  if (!entries.length) {
    list.innerHTML = '<div class="dash-empty"><div class="dash-empty-text">No wishes yet</div><div class="dash-empty-sub">Go back and add what the pack wants to do</div></div>';
    return;
  }

  // Sort by votes descending
  const sorted = [...entries].sort((a, b) => ((b[1].votes || 0) - (a[1].votes || 0)));

  list.innerHTML = sorted.map(([key, w], i) => {
    const voted     = (w.votedBy || {})[gopack.state.memberId];
    const downvoted = (w.downVoted || {})[gopack.state.memberId];
    const votes     = w.votes || 0;
    const pct       = sorted[0][1].votes > 0 ? Math.round((votes / sorted[0][1].votes) * 100) : 0;
    return `
    <div class="vote-card ${voted ? 'vote-card-voted' : ''}">
      <div class="vote-card-rank">${i + 1}</div>
      <div class="vote-card-body">
        <div class="vote-card-text">${gopack.escHtml(w.text)}</div>
        <div class="vote-card-meta">by ${gopack.escHtml(w.author || 'Anonymous')}</div>
        <div class="vote-bar-wrap">
          <div class="vote-bar-fill" style="width:${pct}%"></div>
        </div>
        ${votes > 0 ? `<div class="vote-card-voters">${gopack.escHtml(Object.values(w.votedBy || {}).join(', '))}</div>` : ''}
      </div>
      <div class="vote-card-actions">
        <button class="vote-card-up ${voted ? 'active' : ''}" onclick="voteWish('${key}')">
          <svg width="16" height="16" viewBox="0 0 28 28" fill="none"><path d="M5 16V12a2 2 0 0 1 2-2h5l2-5a2 2 0 0 1 4 0l-1 5h5a2 2 0 0 1 2 2l-2 6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
          <span>${votes || ''}</span>
        </button>
        <button class="vote-card-down ${downvoted ? 'active' : ''}" onclick="downvoteWish('${key}')">
          <svg width="16" height="16" viewBox="0 0 28 28" fill="none"><path d="M5 12v4a2 2 0 0 0 2 2h5l2 5a2 2 0 0 0 4 0l-1-5h5a2 2 0 0 0 2-2l-2-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  // Who hasn't voted nudge
  const nudge = document.getElementById('vote-who-nudge');
  if (nudge && gopack.state.wishEntries.length > 0) {
    const allVoters = new Set();
    gopack.state.wishEntries.forEach(([, w]) => {
      Object.keys(w.votedBy || {}).forEach(uid => allVoters.add(uid));
    });
    nudge.textContent = `${allVoters.size} of the pack have voted`;
  }
};

// Re-render vote screen when wishes update
const _origRenderWishes = gopack.renderWishes?.bind(gopack);
gopack.renderWishes = function() {
  if (_origRenderWishes) _origRenderWishes();
  const active = document.querySelector('.screen.active');
  if (active?.id === 'screen-vote') gopack.renderVoteScreen();
};

// ── Itinerary ⋯ menu ──────────────────────────
gopack.toggleItinMenu = window.toggleItinMenu = function() {
  const menu = document.getElementById('itin-menu');
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  menu.style.display = isOpen ? 'none' : 'block';
};

// Close menu when clicking outside
document.addEventListener('click', function(e) {
  const menu = document.getElementById('itin-menu');
  const btn  = document.getElementById('itin-actions-btn');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.style.display = 'none';
  }
});

// ── Live presence ─────────────────────────────
gopack.updateLivePresence = function(memberCount) {
  const el = document.getElementById('live-text');
  if (!el) return;
  if (memberCount <= 1) {
    el.textContent = 'Just you here';
  } else {
    el.textContent = `${memberCount} of the pack packing now`;
  }
};