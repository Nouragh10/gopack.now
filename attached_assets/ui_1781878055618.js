// ══════════════════════════════════════════════
// gopack.now — ui.js
// Shared UI components: password modal
// ══════════════════════════════════════════════

// ── Password Modal ────────────────────────────
gopack.showPasswordModal = function({ title, sub, icon, confirmText, onConfirm, onCancel }) {
  const $ = gopack.$;
  const modal      = $('pw-modal');
  const titleEl    = $('pw-title');
  const subEl      = $('pw-sub');
  const iconEl     = $('pw-icon');
  const inputEl    = $('pw-input');
  const confirmBtn = $('pw-confirm');
  const cancelBtn  = $('pw-cancel');
  const errEl      = $('pw-error');

  if (!modal || !confirmBtn) { console.error('gopack: modal elements missing'); return; }

  titleEl.textContent    = title;
  subEl.textContent      = sub;
  iconEl.textContent     = icon || '🔒';
  confirmBtn.textContent = confirmText || 'Confirm →';
  inputEl.value          = '';
  inputEl.type           = 'password';
  errEl.style.display    = 'none';
  cancelBtn.style.display = '';
  modal.classList.add('visible');
  setTimeout(() => inputEl.focus(), 100);

  const doConfirm = () => {
    const val = inputEl.value.trim();
    if (!val) { errEl.style.display = 'block'; return; }
    modal.classList.remove('visible');
    cleanup();
    onConfirm(val);
  };
  const doCancel = () => {
    modal.classList.remove('visible');
    cleanup();
    if (onCancel) onCancel();
  };

  confirmBtn.onclick = doConfirm;
  cancelBtn.onclick  = doCancel;
  inputEl.onkeydown  = e => { if (e.key === 'Enter') doConfirm(); if (e.key === 'Escape') doCancel(); };

  function cleanup() {
    confirmBtn.onclick = null;
    cancelBtn.onclick  = null;
    inputEl.onkeydown  = null;
  }
};

window.togglePwVisibility = function() {
  const input = gopack.$('pw-input');
  input.type = input.type === 'password' ? 'text' : 'password';
};