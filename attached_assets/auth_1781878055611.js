// ══════════════════════════════════════════════
// gopack.now — auth.js
// Firebase Auth: sign in, sign up, Google,
// user profile save, and app boot sequence
// ══════════════════════════════════════════════

// ── Stale cross-tab session banner ─────────────
// Shown when this tab's signed-in identity changed underneath it because a
// different account signed in in another tab of the same browser.
gopack.showStaleSessionBanner = function() {
  if (document.getElementById('gopack-stale-session-banner')) return;
  const bar = document.createElement('div');
  bar.id = 'gopack-stale-session-banner';
  bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
    'background:#E85D3A;color:#fff;font-family:inherit;font-size:0.85rem;' +
    'padding:0.75rem 1rem;display:flex;align-items:center;justify-content:center;' +
    'gap:1rem;box-shadow:0 -2px 12px rgba(0,0,0,0.3);';
  bar.innerHTML = `
    <span>You signed in to a different account in another tab. Reload to continue here as that account.</span>
    <button id="gopack-stale-reload-btn" style="background:#fff;color:#E85D3A;border:none;border-radius:8px;padding:0.4rem 0.9rem;font-weight:600;cursor:pointer;">Reload</button>`;
  document.body.appendChild(bar);
  document.getElementById('gopack-stale-reload-btn').onclick = () => window.location.reload();
};

function showAuthScreen() {
  const authEl = document.getElementById('screen-auth');
  const appEl  = document.getElementById('app');
  if (authEl) authEl.style.display = 'flex';
  if (appEl)  appEl.style.display  = 'none';
}

function hideAuthScreen() {
  const authEl = document.getElementById('screen-auth');
  const appEl  = document.getElementById('app');
  if (authEl) authEl.style.display = 'none';
  if (appEl)  appEl.style.display  = 'block';
}

async function saveUserProfile(user, overrideName) {
  if (!gopack.db || !user) return;
  const ref  = gopack.db.ref('users/' + user.uid);
  const snap = await ref.once('value');
  if (!snap.exists()) {
    await ref.set({
      uid:       user.uid,
      name:      overrideName || user.displayName || user.email.split('@')[0],
      email:     user.email,
      photoURL:  user.photoURL || '',
      createdAt: Date.now(),
      tripCount: 0,
    });
  }
}

function updateNavWithUser(user, overrideName) {
  const name      = overrideName || user.displayName || user.email.split('@')[0];
  gopack.state.userName = name;
  const nameInput = document.getElementById('your-name');
  if (nameInput) {
    nameInput.value = name;
    const preview = document.getElementById('name-preview');
    if (preview) preview.textContent = '🎒 ' + name;
  }
}

// ── Auth gating for create/join actions ───────
// pendingAction: 'create' | 'signin' | null
gopack._pendingAction = null;

gopack.showAuthForAction = function(action) {
  if (gopack.currentUser) {
    // Already signed in — no need to show the auth screen again.
    if (action === 'create') {
      if (typeof gopack.resetCreateScreen === 'function') gopack.resetCreateScreen();
      gopack.showScreen('screen-create');
    }
    return;
  }
  gopack._pendingAction = action;
  showAuthScreen();
};

// ── Public home navigation ─────────────────────
gopack.goHome = function() {
  if (gopack.currentUser) {
    gopack.showDashboard();
  } else {
    gopack.showScreen('screen-landing');
  }
};

function initAuthUI() {
  const signinBtn  = document.getElementById('auth-signin-btn');
  const signupBtn  = document.getElementById('auth-signup-btn');
  const googleBtn  = document.getElementById('auth-google-btn');
  const googleBtn2 = document.getElementById('auth-google-btn-2');
  const gotoSignup = document.getElementById('goto-signup');
  const gotoSignin = document.getElementById('goto-signin');
  const signInPanel = document.getElementById('auth-sign-in');
  const signUpPanel = document.getElementById('auth-sign-up');

  if (gotoSignup) gotoSignup.onclick = () => { signInPanel.style.display = 'none'; signUpPanel.style.display = 'block'; };
  if (gotoSignin) gotoSignin.onclick = () => { signUpPanel.style.display = 'none'; signInPanel.style.display = 'block'; };

  // Email sign in
  if (signinBtn) signinBtn.onclick = async () => {
    const email = document.getElementById('auth-email').value.trim();
    const pass  = document.getElementById('auth-password').value;
    const errEl = document.getElementById('auth-error');
    if (!email || !pass) return;
    signinBtn.disabled = true; signinBtn.textContent = 'Signing in...';
    try {
      await gopack.auth.signInWithEmailAndPassword(email, pass);
    } catch(e) {
      errEl.style.display = 'block'; errEl.textContent = 'Incorrect email or password.';
      signinBtn.disabled = false; signinBtn.textContent = 'Sign in';
    }
  };

  // Email sign up
  if (signupBtn) signupBtn.onclick = async () => {
    const name  = document.getElementById('auth-name').value.trim();
    const email = document.getElementById('auth-email-2').value.trim();
    const pass  = document.getElementById('auth-password-2').value;
    const errEl = document.getElementById('auth-error-2');
    if (!name || !email || !pass) return;
    if (pass.length < 6) { errEl.style.display = 'block'; errEl.textContent = 'Password must be 6+ characters.'; return; }
    signupBtn.disabled = true; signupBtn.textContent = 'Creating account...';
    try {
      // Stash the chosen name so the auth-state listener can use it even if
      // displayName hasn't propagated to the user object yet (race condition
      // with onAuthStateChanged firing before updateProfile resolves).
      gopack._pendingSignupName = name;
      const cred = await gopack.auth.createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      await cred.user.reload();
    } catch(e) {
      gopack._pendingSignupName = null;
      errEl.style.display = 'block'; errEl.textContent = e.message || 'Something went wrong.';
      signupBtn.disabled = false; signupBtn.textContent = 'Create account';
    }
  };

  // Google sign in
  const googleSignIn = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try { await gopack.auth.signInWithPopup(provider); } catch(e) { console.error('Google sign in error:', e); }
  };
  if (googleBtn)  googleBtn.onclick  = googleSignIn;
  if (googleBtn2) googleBtn2.onclick = googleSignIn;
}

// ── Boot ───────────────────────────────────────
(async function boot() {
  gopack.loadTrustStats();
  initAuthUI();

  if (!gopack.auth) {
    // No Firebase — show create screen directly
    hideAuthScreen();
    if (typeof gopack.resetCreateScreen === 'function') gopack.resetCreateScreen();
    gopack.showScreen('screen-create');
    const tripId = new URLSearchParams(window.location.search).get('t');
    if (tripId) await gopack.joinTrip(tripId);
    return;
  }

  gopack.auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Force the ID token to be ready before doing any database reads.
      // There's a known race where onAuthStateChanged fires slightly before
      // the Database SDK has the auth token attached to outgoing requests,
      // which surfaces as permission_denied even though the user is
      // genuinely signed in. Awaiting getIdToken() here closes that gap.
      try { await user.getIdToken(); } catch (e) { console.warn('gopack: getIdToken failed', e); }

      const isNewUserForThisTab = !gopack.currentUser || gopack.currentUser.uid !== user.uid;
      gopack.currentUser        = user;
      const pendingName         = gopack._pendingSignupName;
      gopack._pendingSignupName = null;
      gopack.state.userName     = pendingName || user.displayName || user.email.split('@')[0];

      // Only adopt the new UID as memberId if this tab hasn't already joined a
      // trip under a previous identity. Firebase Auth state is shared across
      // all tabs of the same browser, so signing in to a different account in
      // another tab would otherwise silently reassign this tab's memberId
      // mid-session — orphaning its presence entry and breaking "who's online"
      // for the trip this tab already joined.
      if (isNewUserForThisTab && gopack.state.tripId) {
        // Firebase Auth only supports one signed-in identity per browser at a
        // time — signing in to a different account in another tab silently
        // swaps the identity everywhere, including tabs already in a trip.
        // We can't keep this tab "as" the old user (writes would be
        // authenticated as the new user regardless), so make the conflict
        // visible instead of silently mixing identities.
        console.warn('gopack: signed in as a different account in another tab. This tab\'s session for the current trip is now stale — reload to continue as the new account.');
        gopack.showStaleSessionBanner?.();
      }
      gopack.state.memberId = user.uid;

      await saveUserProfile(user, pendingName);
      hideAuthScreen();
      updateNavWithUser(user, pendingName);

      // Check post-trip rating notifications
      if (typeof gopack.checkPostTripRatings === 'function') gopack.checkPostTripRatings();

      const action = gopack._pendingAction;
      gopack._pendingAction = null;

      const tripId = new URLSearchParams(window.location.search).get('t');
      if (tripId) {
        await gopack.joinTrip(tripId);
      } else if (action === 'create') {
        if (typeof gopack.resetCreateScreen === 'function') gopack.resetCreateScreen();
        gopack.showScreen('screen-create');
      } else {
        if (typeof gopack.showDashboard === 'function') {
          gopack.showDashboard();
        } else {
          window.addEventListener('load', () => gopack.showDashboard());
        }
      }
    } else {
      // If this tab already has an active trip session, a sign-out detected
      // here is most likely a cross-tab cascade (another tab signed out or
      // switched accounts) rather than a deliberate sign-out in THIS tab.
      // Blindly re-running joinTrip while now unauthenticated would fail
      // permission checks on a private trip and disrupt a tab that was
      // working fine a moment ago. Surface it instead of acting on it.
      if (gopack.state.tripId && gopack.currentUser) {
        console.warn('gopack: detected a sign-out from another tab while this tab has an active trip session — ignoring to avoid disrupting it.');
        gopack.currentUser = null;
        gopack.showStaleSessionBanner?.();
        return;
      }

      gopack.currentUser = null;
      hideAuthScreen();
      const tripId = new URLSearchParams(window.location.search).get('t');
      if (tripId) {
        await gopack.joinTrip(tripId);
      } else {
        gopack.showScreen('screen-landing');
        if (typeof gopack.loadPublicTrips === 'function') gopack.loadPublicTrips();
      }
    }
  });
})();

// ── Logo → home ────────────────────────────────
document.querySelectorAll('.logo').forEach(el => {
  el.addEventListener('click', () => {
    window.history.replaceState({}, '', window.location.pathname);
    gopack.goHome();
  });
});

window.addEventListener('popstate', e => e.preventDefault());

// ── Group finder + ambassador submissions ──────
gopack.submitGroupFinderProfile = function() {
  const dest  = document.getElementById('gf-destination')?.value.trim();
  const bio   = document.getElementById('gf-bio')?.value.trim();
  if (!dest) { alert('Please enter a destination.'); return; }
  if (!gopack.currentUser) { gopack.showAuthForAction('signin'); return; }
  if (gopack.db) {
    gopack.db.ref('groupFinder/' + gopack.currentUser.uid).set({
      uid: gopack.currentUser.uid,
      name: gopack.state.userName || 'Anonymous',
      destination: dest,
      startDate: document.getElementById('gf-start')?.value || '',
      endDate: document.getElementById('gf-end')?.value || '',
      bio: bio || '',
      createdAt: Date.now(),
    });
  }
  alert('You\'re on the waitlist! We\'ll notify you when group finder launches.');
};

gopack.submitAmbassadorApplication = function() {
  const city = document.getElementById('amb-city')?.value.trim();
  const name = document.getElementById('amb-name')?.value.trim();
  const bio  = document.getElementById('amb-bio')?.value.trim();
  const id   = document.getElementById('amb-id')?.value.trim();
  if (!city || !name || !id) { alert('Please fill in all required fields.'); return; }
  if (gopack.db) {
    gopack.db.ref('ambassadorApplications/' + (gopack.currentUser?.uid || Date.now())).set({
      city, name, bio: bio || '',
      // Never store the actual ID — just flag that it was provided
      idProvided: !!id,
      status: 'pending',
      createdAt: Date.now(),
    });
  }
  alert('Application received! We\'ll review it and reach out within 5 business days.');
};