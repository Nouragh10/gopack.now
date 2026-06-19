// ══════════════════════════════════════════════
// gopack.now — create.js
// Create trip screen: city input, vibes, dates,
// budget, visibility, join-via-code
// ══════════════════════════════════════════════

// ── Reset create screen to a blank slate ──────
// Called whenever the user starts a genuinely NEW trip, so leftover
// destination/vibes/budget/wishes from a previously created or joined
// trip don't bleed into the next one.
gopack.resetCreateScreen = function() {
  gopack.selectedCities = [];
  gopack.updateDestinationState();
  gopack.renderCityChips();

  gopack.state.vibes = ['culture'];
  document.querySelectorAll('.vibe-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.vibe === 'culture');
  });

  gopack.state.budget = 'midrange';
  document.querySelectorAll('#budget-row .pill').forEach(p => {
    p.classList.toggle('selected', p.dataset.budget === 'midrange');
  });

  gopack.state.visibility = 'private';
  document.querySelectorAll('#visibility-row .pill').forEach(p => {
    p.classList.toggle('selected', p.dataset.visibility === 'private');
  });

  const cityInput = gopack.$('city-input');
  if (cityInput) cityInput.value = '';

  const wishInput = gopack.$('wish-input');
  if (wishInput) wishInput.value = '';

  gopack.state.tripId       = '';
  gopack.state.tripPassword = null;
  gopack.state.hostMemberId = null;
};

// ── City chips ────────────────────────────────
gopack.addCity = function(cityName) {
  if (!cityName || gopack.selectedCities.includes(cityName)) return;
  gopack.selectedCities.push(cityName);
  gopack.updateDestinationState();
  gopack.renderCityChips();
  const ci = gopack.$('city-input');
  if (ci) ci.value = '';
  const cs = gopack.$('city-suggestions');
  if (cs) { cs.innerHTML = ''; cs.style.display = 'none'; }
};

gopack.removeCity = function(index) {
  gopack.selectedCities.splice(index, 1);
  gopack.updateDestinationState();
  gopack.renderCityChips();
};
window.removeCity = gopack.removeCity;

gopack.renderCityChips = function() {
  const chips = gopack.$('city-chips');
  if (!chips) return;
  chips.innerHTML = gopack.selectedCities.map((city, i) => `
    <div class="city-chip">
      <span>${gopack.escHtml(city)}</span>
      <button onclick="removeCity(${i})" class="city-chip-remove">×</button>
    </div>`).join('');
};

// ── Google Places Autocomplete ─────────────────
gopack.initPlacesAutocomplete = function() {
  const input = gopack.$('city-input');
  if (!input) return;

  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['(cities)'],
      fields: ['name'],
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.name) gopack.addCity(place.name);
    });
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const val = input.value.trim();
      if (val) gopack.addCity(val);
    }
  });
};

// Called by Google Maps script onload callback
window.initPlacesAutocomplete = function() {
  setTimeout(gopack.initPlacesAutocomplete, 100);
};
window.addEventListener('load', () => {
  setTimeout(gopack.initPlacesAutocomplete, 500);
});

// ── Vibe buttons ──────────────────────────────
document.querySelectorAll('.vibe-btn').forEach(b => {
  b.addEventListener('click', () => {
    const vibe = b.dataset.vibe;
    if (b.classList.contains('selected')) {
      if (gopack.state.vibes.length > 1) {
        b.classList.remove('selected');
        gopack.state.vibes = gopack.state.vibes.filter(v => v !== vibe);
      }
    } else {
      b.classList.add('selected');
      if (!gopack.state.vibes.includes(vibe)) gopack.state.vibes.push(vibe);
    }
  });
});

// ── Budget pills ──────────────────────────────
document.querySelectorAll('#budget-row .pill').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('#budget-row .pill').forEach(x => x.classList.remove('selected'));
    p.classList.add('selected');
    gopack.state.budget = p.dataset.budget;
  });
});

// ── Visibility pills ──────────────────────────
document.querySelectorAll('#visibility-row .pill').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('#visibility-row .pill').forEach(x => x.classList.remove('selected'));
    p.classList.add('selected');
    gopack.state.visibility = p.dataset.visibility;
  });
});

// ── Date inputs ───────────────────────────────
(function initDates() {
function recomputeDays() {
    if (gopack.state.startDate && gopack.state.endDate) {
      const start = new Date(gopack.state.startDate + 'T12:00:00');
      const end   = new Date(gopack.state.endDate   + 'T12:00:00');
      const diff  = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) gopack.state.days = diff;
    }
  }

  const startInput = gopack.$('start-date');
  if (startInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    startInput.value = tomorrow.toISOString().split('T')[0];
    gopack.state.startDate = startInput.value;

    // Default end date
    const defaultEnd = new Date(startInput.value + 'T12:00:00');
    defaultEnd.setDate(defaultEnd.getDate() + gopack.state.days - 1);
    gopack.state.endDate = defaultEnd.toISOString().split('T')[0];

    startInput.addEventListener('change', function() {
      gopack.state.startDate = this.value;
      const endInput = gopack.$('end-date');
      if (endInput && !gopack.state.endDate) {
        const end = new Date(this.value + 'T12:00:00');
        end.setDate(end.getDate() + gopack.state.days - 1);
        endInput.value = end.toISOString().split('T')[0];
        gopack.state.endDate = endInput.value;
      }
      recomputeDays();
    });
  }

  const endInput = gopack.$('end-date');
  if (endInput) {
    if (gopack.state.endDate) endInput.value = gopack.state.endDate;
    endInput.addEventListener('change', function() { gopack.state.endDate = this.value; recomputeDays(); });
  }
})();

// ── Create trip ───────────────────────────────
gopack.createTrip = async function() {
  const cityInputVal = gopack.$('city-input') ? gopack.$('city-input').value.trim() : '';
  if (cityInputVal && !gopack.selectedCities.includes(cityInputVal)) {
    gopack.addCity(cityInputVal);
  }
  let dest = gopack.state.destination || cityInputVal;
  if (!dest) { gopack.showError('create-error'); return; }

  gopack.state.destination  = dest;
  gopack.state.wishes       = [];
  gopack.state.tripId       = gopack.generateId();
  gopack.state.isHost       = true;
  gopack.state.hostMemberId = gopack.state.memberId;
  gopack.state.tripPassword = null;

  // Bug 2 fix: read vibes from DOM — never inherit from previous trip
  gopack.state.vibes = [];
  document.querySelectorAll('.vibe-btn').forEach(b => {
    if (b.classList.contains('selected')) gopack.state.vibes.push(b.dataset.vibe);
  });
  if (!gopack.state.vibes.length) {
    gopack.state.vibes = ['culture'];
    const first = document.querySelector('.vibe-btn[data-vibe="culture"]');
    if (first) first.classList.add('selected');
  }

  if (gopack.db) {
    try {
      await gopack.db.ref('trips/' + gopack.state.tripId).set({
        destination:  gopack.state.destination,
        days:         gopack.state.days,
        vibes:        gopack.state.vibes,
        budget:       gopack.state.budget,
        startDate:    gopack.state.startDate,
        endDate:      gopack.state.endDate,
        visibility:   gopack.state.visibility || 'private',
        createdAt:    Date.now(),
        hostMemberId: gopack.state.memberId,
      });
      gopack.addTripToUserIndex(gopack.state.tripId, 'host');
      gopack.db.ref('meta/tripCount').transaction(n => (n || 0) + 1);
      window.history.replaceState({}, '', '?t=' + gopack.state.tripId);
    } catch (err) {
      console.error('gopack: trip creation failed', err);
      gopack.showError('create-error');
      return;
    }
  }

  gopack.populateCollabScreen();
  gopack.startAllListeners(gopack.state.tripId);
  gopack.joinAsMember(gopack.state.tripId, gopack.state.userName || 'Host');
  gopack.showScreen('screen-collab');
};

// ── Join via code / link ───────────────────────
gopack.joinViaCode = async function() {
  let code = gopack.$('join-code-input').value.trim();
  if (!code) return;
  try {
    const url   = new URL(code);
    const param = url.searchParams.get('t');
    if (param) code = param;
  } catch(e) {}
  const found = await gopack.joinTrip(code);
  if (!found) gopack.showError('join-error');
};

// ── Wire up create screen events ──────────────
(function wireCreateScreen() {
  const createBtn = gopack.$('create-btn');
  if (createBtn) createBtn.addEventListener('click', gopack.createTrip);

  const joinCodeInput = gopack.$('join-code-input');
  if (joinCodeInput) joinCodeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') gopack.joinViaCode();
  });

  const joinCodeBtn = gopack.$('join-code-btn');
  if (joinCodeBtn) joinCodeBtn.addEventListener('click', gopack.joinViaCode);
})();