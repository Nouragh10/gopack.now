// ══════════════════════════════════════════════
// gopack.now — chat.js
// Real-time trip group chat
// ══════════════════════════════════════════════

let chatListener = null;

gopack.initChat = function() {
  if (!gopack.state.tripId) return;

  const nameEl = document.getElementById('chat-trip-name');
  if (nameEl) nameEl.textContent = gopack.state.destination || 'Pack chat';

  const avatarsEl = document.getElementById('chat-avatars');
  if (avatarsEl && gopack.db) {
    gopack.db.ref('trips/' + gopack.state.tripId + '/members').once('value').then(snap => {
      const members  = Object.values(snap.val() || {});
      const countEl  = document.getElementById('chat-members-count');
      if (countEl) countEl.textContent = members.length + ' member' + (members.length !== 1 ? 's' : '');
      avatarsEl.innerHTML = members.slice(0, 3).map(m =>
        `<div class="chat-nav-av">${gopack.escHtml((m.name || '?').charAt(0).toUpperCase())}</div>`
      ).join('');
    });
  }

  if (chatListener) chatListener.off();
  if (!gopack.db) return;

  const ref = gopack.db.ref('trips/' + gopack.state.tripId + '/chat');
  chatListener = ref;
  ref.on('value', snap => {
    const msgs = Object.values(snap.val() || {}).sort((a, b) => a.timestamp - b.timestamp);
    renderChatMessages(msgs);
  });
};

function renderChatMessages(msgs) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  if (!msgs.length) {
    container.innerHTML = `<div class="chat-date-divider">Today</div><div style="text-align:center;color:var(--muted-2);font-size:0.85rem;padding:2rem 0">Say hello to the pack! 👋</div>`;
    return;
  }
  let html = '<div class="chat-date-divider">Today</div>';
  msgs.forEach(msg => {
    const isMe = msg.uid === (gopack.currentUser?.uid || gopack.state.memberId);
    const cls  = isMe ? 'mine' : 'theirs';
    if (msg.type === 'wish') {
      html += `<div class="chat-msg-wrap ${cls}"><div class="chat-wish-card"><div class="chat-wish-label">📌 ${gopack.escHtml(msg.author)} added to wishlist</div><div class="chat-wish-text">${gopack.escHtml(msg.text)}</div></div></div>`;
    } else {
      html += `<div class="chat-msg-wrap ${cls}">
        ${!isMe ? `<div class="chat-author">${gopack.escHtml(msg.author || '')}</div>` : ''}
        <div class="chat-bubble ${cls}">${gopack.escHtml(msg.text)}</div>
        <div class="chat-time">${new Date(msg.timestamp || 0).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}</div>
      </div>`;
    }
  });
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !gopack.db || !gopack.state.tripId) return;
  input.value = '';
  await gopack.db.ref('trips/' + gopack.state.tripId + '/chat').push({
    text, uid: gopack.currentUser?.uid || gopack.state.memberId,
    author: gopack.state.userName || 'Anonymous',
    timestamp: Date.now(), type: 'text',
  });
}

(function wireChatEvents() {
  const sendBtn  = document.getElementById('chat-send-btn');
  if (sendBtn)   sendBtn.addEventListener('click', sendChatMessage);
  const inputEl  = document.getElementById('chat-input');
  if (inputEl)   inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); });
})();