// ══════════════════════════════════════════════
// gopack.now — itinerary.js
// Build itinerary, render days, edit/delete
// activities, PDF export, calendar export
// ══════════════════════════════════════════════

// ── Loading animation ─────────────────────────
gopack.animateLoading = function() {
  const fill    = gopack.$('progress-fill');
  const tagline = gopack.$('loading-tagline');
  const phrases = [
    "Weaving in everyone's wishes...",
    "Searching for hidden gems...",
    "Crafting the perfect route...",
    "Checking what's open...",
    "Almost ready to go...",
  ];
  let i = 0;
  if (fill)    fill.style.width = '0%';
  if (tagline) tagline.textContent = phrases[0];
  const t = setInterval(() => {
    i++;
    if (i < phrases.length) {
      if (tagline) {
        tagline.style.opacity = '0';
        setTimeout(() => { tagline.textContent = phrases[i]; tagline.style.opacity = '1'; }, 300);
      }
      if (fill) fill.style.width = Math.round((i / phrases.length) * 100) + '%';
    } else {
      clearInterval(t);
      if (fill) fill.style.width = '100%';
    }
  }, 1800);
};

// ── Build itinerary (calls AI) ────────────────
gopack.buildItinerary = async function() {
  const s = gopack.state;
  if (gopack.db) {
    try {
      const snap = await gopack.db.ref('trips/' + s.tripId + '/wishes').once('value');
      const data = snap.val() || {};
      s.wishes = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
    } catch (err) {
      console.error('gopack: could not read wishes before building itinerary', err);
      gopack.showError('build-error');
      return;
    }
  }

  // Calculate days from date range
  if (s.startDate && s.endDate) {
    const start = new Date(s.startDate + 'T12:00:00');
    const end   = new Date(s.endDate   + 'T12:00:00');
    const diff  = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) s.days = diff;
  }

  const cities = gopack.selectedCities.length > 0
    ? gopack.selectedCities
    : s.destination.split(',').map(c => c.trim()).filter(Boolean);

  if (cities.length > 1 && !s.startDate) {
    const minDays = cities.length * 2;
    if (s.days < minDays) s.days = minDays;
  }

  if (!s.wishes.length) { gopack.showError('build-error'); return; }
  gopack.showScreen('screen-loading');
  gopack.animateLoading();

  const wishList = s.wishes
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .map((w, i) => `${i + 1}. ${w.text} (suggested by ${w.author}, ${w.votes || 0} votes)`)
    .join('\n');

  const dateContext = s.startDate
    ? `The trip starts on ${new Date(s.startDate + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}.`
    : '';

  const isMultiCity = cities.length > 1;
  let citySchedule  = '';
  if (isMultiCity) {
    const baseDays  = Math.floor(s.days / cities.length);
    const extraDays = s.days % cities.length;
    const schedule  = [];
    let dayNum = 1;
    for (let ci = 0; ci < cities.length; ci++) {
      const daysForCity = baseDays + (ci < extraDays ? 1 : 0);
      for (let d = 0; d < daysForCity; d++) {
        schedule.push('Day ' + dayNum + ': ' + cities[ci]);
        dayNum++;
      }
    }
    citySchedule = 'STRICT CITY SCHEDULE: ' + schedule.join(', ') +
      '. CRITICAL RULES: Never mix cities within one day. Every activity must be a real place in the assigned city.';
  }

  const prompt = `You are a world-class travel planner with access to web search. Before building the itinerary, search the web for real currently OPEN attractions, restaurants and places in each city. CRITICAL: Only recommend places that are confirmed open and operating in 2025-2026 — do not recommend permanently closed, temporarily closed, or rumored places. Create a ${s.days}-day itinerary for ${s.destination}. Travel vibe: ${gopack.vibeLabel(s.vibes)}. Budget level: ${gopack.budgetDesc(s.budget)}. ${dateContext}
CRITICAL VIBE RULE: The selected vibes are "${gopack.vibeLabel(s.vibes)}". ONLY include activities matching these vibes. Do NOT include activities from other categories. For example, if "Culture" is NOT selected, do not include museums, historical sites, or cultural landmarks. Strictly respect the vibe selection.
${citySchedule}
Group wishes sorted by popularity (higher votes = more wanted by the group):
${wishList}

Return ONLY valid JSON (no markdown fences, no explanation) in exactly this structure:
{"title":"evocative short trip title","days":[{"dayNumber":1,"city":"City name for this day","theme":"One evocative theme for the day","activities":[{"time":"9:00 AM","name":"Activity name","description":"One concise, vivid sentence with a local tip.","tag":"Food","fromWish":false,"suggester":"","estimatedCost":0,"labels":[],"nearPrevious":false}]}]}

Rules:
- 3–5 activities per day with realistic spaced-out times
- CRITICAL: Every activity MUST be a real, currently OPEN and operating place in the exact assigned city
- CRITICAL: Never invent restaurant names, mall names, or attraction names
- Prioritize wishes with more votes — highly voted wishes MUST be included
- Weave in group wishes naturally — mark fromWish: true and set suggester to exact person's name
- Descriptions must be exactly ONE concise sentence — specific (neighborhood, landmark, best time, or price tip), never more than one sentence
- Balance morning/afternoon/evening. No duplicate activities across days
- tag must be one of: Food, Culture, Adventure, Relaxation, Nightlife, Shopping, Nature — and must match the selected vibes where possible
- For EVERY activity add an "estimatedCost" field in USD as a number (0 for free)
- For EVERY activity set "labels" to an array of applicable tags from: ["Hidden gem","Iconic","Budget-friendly","Free","Good for rain","Local favorite","Best at sunset","Skip the line","Foodie must","Off the beaten path"]
- Set "nearPrevious": true if the activity is in the same neighborhood or walkable from the previous activity on that day`;

  try {
    const res = await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error('API ' + res.status);
    const data       = await res.json();
    const text       = (data.content || []).map(b => b.text || '').join('');
    const itinerary  = gopack.parseItineraryText(text);
    if (!itinerary || !Array.isArray(itinerary.days) || !itinerary.days.length) {
      throw new Error('Could not parse itinerary response');
    }
    gopack.saveAndShowItinerary(itinerary);
  } catch(err) {
    console.error('gopack: API error', err);
    gopack.saveAndShowItinerary(gopack.getFallbackItinerary());
  }
};

// ── Save to Firebase, then render ─────────────
gopack.saveAndShowItinerary = async function(data) {
  const copy = JSON.parse(JSON.stringify(data));
  gopack.ensureIds(copy);

  // Fix 14: mark activities as unanimous if every member voted for the source wish
  const memberSnap = gopack.db ? await gopack.db.ref('trips/' + gopack.state.tripId + '/members').once('value') : null;
  const memberCount = memberSnap ? Object.keys(memberSnap.val() || {}).length : 1;
  const wishMap = {};
  gopack.state.wishes.forEach(w => { if (w.text) wishMap[w.text.toLowerCase()] = w; });
  copy.days.forEach(day => {
    (day.activities || []).forEach((act, ai) => {
      if (act.fromWish && act.name) {
        const match = wishMap[act.name.toLowerCase()];
        if (match && match.votes >= memberCount && memberCount > 1) act.unanimous = true;
      }
      // Post-process: enrich labels from estimatedCost and tag
      if (!Array.isArray(act.labels)) act.labels = [];
      if ((act.estimatedCost === 0 || act.estimatedCost === '0') && !act.labels.includes('Free')) {
        act.labels.unshift('Free');
      } else if (act.estimatedCost <= 15 && act.estimatedCost > 0 && !act.labels.includes('Budget-friendly')) {
        act.labels.unshift('Budget-friendly');
      }
      // nearPrevious: if AI didn't set it, check description for proximity hints
      if (!act.nearPrevious && ai > 0) {
        const prev = day.activities[ai - 1];
        if (prev && act.description) {
          const prox = /walking distance|steps away|next door|same street|nearby|adjacent|just around|meters away|short walk/i;
          if (prox.test(act.description)) act.nearPrevious = true;
        }
      }
    });
    day.activities = gopack.sortByTime(day.activities || []);
  });
  gopack.state.currentItinerary = copy;

  const firstActivity = copy.days?.[0]?.activities?.[0]?.name || '';
  const isGeneric = firstActivity === 'Morning exploration' || firstActivity === 'New activity';
  if (isGeneric) {
    console.warn('gopack: looks like fallback data, not saving to Firebase');
    gopack.showScreen('screen-itinerary');
    gopack.renderItineraryFull();
    return;
  }

  if (gopack.db && gopack.state.tripId) {
    gopack.db.ref('trips/' + gopack.state.tripId + '/itinerary').set(copy)
      .then(() => { console.log('gopack: itinerary saved'); gopack.notifyMembersItineraryReady(); })
      .catch(err => console.error('gopack: failed to save itinerary', err));
  }

  gopack.showScreen('screen-itinerary');
  gopack.renderItineraryFull();
};

gopack.notifyMembersItineraryReady = function() {
  if (!gopack.db || !gopack.state.tripId) return;
  gopack.db.ref('trips/' + gopack.state.tripId + '/members').once('value').then(snap => {
    Object.values(snap.val() || {}).forEach(m => {
      if (m.memberId && m.memberId !== gopack.state.memberId) {
        gopack.pushNotification(m.memberId, {
          type: 'itinerary',
          text: 'Your ' + (gopack.state.destination || 'trip') + ' itinerary is ready!',
          timestamp: Date.now(), read: false, tripId: gopack.state.tripId,
        });
      }
    });
  });
};

// ── Render full itinerary ─────────────────────
gopack.renderItineraryFull = function() {
  if (!gopack.state.currentItinerary) return;
  const destEl = gopack.$('itin-dest-title');
  if (!destEl) return;

  destEl.textContent = gopack.state.destination;
  const dates     = gopack.getItineraryDates();
  const dateRange = dates
    ? gopack.formatDateShort(dates[0]) + ' – ' + gopack.formatDateShort(dates[dates.length - 1])
    : gopack.state.days + ' days';

  gopack.$('itin-meta').innerHTML = `
    <span class="itin-tag">📅 ${dateRange}</span>
    <span class="itin-tag">🎒 ${gopack.state.wishes.length} wishes packed</span>
    <span class="itin-tag">✨ ${gopack.vibeLabel(gopack.state.vibes)}</span>
    <span class="itin-tag">${gopack.budgetLabel(gopack.state.budget)}</span>`;

  const packEl = gopack.$('itin-pack-members');
  if (packEl) {
    const names = [...new Set(gopack.state.wishes.map(w => w.author))];
    if (gopack.state.userName && !names.includes(gopack.state.userName)) names.unshift(gopack.state.userName);
    packEl.innerHTML = names.map(name => `
      <div class="itin-member">
        <div class="itin-member-avatar">${gopack.escHtml(name.charAt(0).toUpperCase())}</div>
        <span class="itin-member-name">${gopack.escHtml(name)}</span>
      </div>`).join('');
  }

  gopack.renderItineraryDays();
  gopack.renderTripTotal();
};

// ── Render days only (Firebase update path) ───
gopack.renderItineraryDays = function() {
  const el = gopack.$('itinerary-days');
  if (!el || !gopack.state.currentItinerary) return;
  const editingId = gopack.state.currentlyEditingActId || null;
  const days      = Array.isArray(gopack.state.currentItinerary.days) ? gopack.state.currentItinerary.days : [];
  const dates     = gopack.getItineraryDates();

  el.innerHTML = days.map((day, di) => {
    const date      = dates ? dates[di] : null;
    const dateLabel = date ? `<span class="day-date">${gopack.formatDate(date)}</span>` : '';
    const dayTotal  = (day.activities || []).reduce((s, a) => s + (a.estimatedCost || 0), 0);
    return `
    <div class="day-block" style="animation-delay:${di * 0.07}s">
      <div class="day-header">
        <div>
          <span class="day-num-label">Day ${day.dayNumber || di + 1}</span>
          ${dateLabel}
          <span class="day-theme">${gopack.escHtml(day.theme || '')}</span>
        </div>
      </div>
      <div class="activities">
        ${(day.activities || []).map((act, ai) =>
          (editingId && act.actId === editingId)
            ? gopack.renderEditCard(act, di, ai, day.city)
            : gopack.renderActivityCard(act, di, ai, day.city)
        ).join('')}
      </div>
      <div class="day-total">${dayTotal > 0 ? `<span class="day-total-label">Est. day total: ~$${dayTotal}</span>` : ''}</div>
      <button class="add-activity-btn" onclick="addActivity(${di})">+ Add activity</button>
    </div>`;
  }).join('');
};

gopack.renderActivityCard = function(act, di, ai, dayCity) {
  const suggester = act.fromWish && act.suggester ? act.suggester : null;
  const dates     = gopack.getItineraryDates();
  const date      = dates ? dates[di] : null;
  const city      = dayCity || gopack.getCityForDay(di);
  const cUrl      = date ? gopack.calendarUrl(act.name, act.description, date, act.time, city) : null;

  // Build label chips
  const chips = [];
  if (act.unanimous) chips.push({ label: 'Unanimous pick', color: '#E85D3A', bg: 'rgba(232,93,58,0.15)' });
  else if (act.fromWish) chips.push({ label: 'Wish-sourced', color: '#E85D3A', bg: 'rgba(232,93,58,0.10)' });
  if (act.nearPrevious) chips.push({ label: 'Near previous stop', color: 'rgba(245,241,235,0.5)', bg: 'rgba(255,255,255,0.06)' });
  if (act.labels && Array.isArray(act.labels)) {
    const labelMap = {
      'Budget-friendly':      { color:'#1D9E75', bg:'rgba(29,158,117,0.12)' },
      'Free':                 { color:'#1D9E75', bg:'rgba(29,158,117,0.15)' },
      'Hidden gem':           { color:'#7F77DD', bg:'rgba(127,119,221,0.12)' },
      'Off the beaten path':  { color:'#7F77DD', bg:'rgba(127,119,221,0.10)' },
      'Iconic':               { color:'#BA7517', bg:'rgba(186,117,23,0.12)' },
      'Best at sunset':       { color:'#BA7517', bg:'rgba(186,117,23,0.10)' },
      'Good for rain':        { color:'#378ADD', bg:'rgba(55,138,221,0.12)' },
      'Local favorite':       { color:'#E85D3A', bg:'rgba(232,93,58,0.10)' },
      'Foodie must':          { color:'#E85D3A', bg:'rgba(232,93,58,0.10)' },
      'Skip the line':        { color:'#BA7517', bg:'rgba(186,117,23,0.10)' },
    };
    act.labels.forEach(l => {
      if (!chips.find(c => c.label === l) && labelMap[l]) chips.push({ label: l, ...labelMap[l] });
    });
  }
  const chipsHtml = chips.map(c =>
    '<span class="act-label-chip" style="color:' + c.color + ';background:' + c.bg + '">' + gopack.escHtml(c.label) + '</span>'
  ).join('');

  return `
  <div class="activity-card" id="act-${act.actId}">
    <div class="act-time">${gopack.escHtml(act.time || '')}</div>
    <div class="act-body">
      <div class="act-name">${gopack.escHtml(act.name || '')}</div>
      ${chipsHtml ? '<div class="act-labels">' + chipsHtml + '</div>' : ''}
      <div class="act-desc">${gopack.escHtml(act.description || '')}</div>
      <div class="act-footer">
        <div class="act-footer-left">
          <span class="act-tag">${gopack.escHtml(act.tag || 'Activity')}</span>
          ${suggester ? `<span class="act-suggester">by ${gopack.escHtml(suggester)}</span>` : ''}
          ${act.lastEditedBy ? `<span class="act-meta-label">edited by <strong>${gopack.escHtml(act.lastEditedBy)}</strong></span>` : ''}
        </div>
        <div class="act-footer-right">
          <a class="act-pill-btn maps-pill" href="${gopack.mapsUrlForActivity ? gopack.mapsUrlForActivity(act.name, city) : gopack.mapsUrlForDay(act.name, di)}" target="_blank" rel="noopener" title="Open in Google Maps">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            Maps
          </a>
          ${cUrl ? `<a class="act-pill-btn cal-pill" href="${cUrl}" target="_blank" rel="noopener" title="Add to Google Calendar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Calendar</a>` : ''}
          <button class="act-pill-btn edit-pill" onclick="startEditActivity('${act.actId}')" title="Edit activity">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="act-icon-btn act-delete-btn" onclick="deleteActivity('${act.actId}')" title="Delete">✕</button>
        </div>
      </div>
    </div>
  </div>`;
};

gopack.renderEditCard = function(act, di, ai) {
  const tags = ['Food','Culture','Adventure','Relaxation','Nightlife','Shopping','Nature'];
  return `
  <div class="activity-card editing" id="act-${act.actId}">
    <div class="edit-form">
      <div class="edit-row">
        <input class="edit-input edit-time" value="${gopack.escHtml(act.time || '')}" placeholder="9:00 AM"/>
        <select class="edit-select">${tags.map(t => `<option ${act.tag === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      <input class="edit-input edit-name" value="${gopack.escHtml(act.name || '')}" placeholder="Activity name"/>
      <textarea class="edit-textarea" rows="3" placeholder="Description...">${gopack.escHtml(act.description || '')}</textarea>
      <div class="edit-actions">
        <button class="edit-save-btn" onclick="saveActivity('${act.actId}')">Save</button>
        <button class="edit-cancel-btn" onclick="cancelEdit()">Cancel</button>
        <button class="edit-delete-btn" onclick="deleteActivity('${act.actId}')">Delete</button>
      </div>
    </div>
  </div>`;
};

// ── Find activity by actId ─────────────────────
gopack.findActivity = function(actId) {
  for (let di = 0; di < gopack.state.currentItinerary.days.length; di++) {
    const acts = gopack.state.currentItinerary.days[di].activities || [];
    for (let ai = 0; ai < acts.length; ai++) {
      if (acts[ai].actId === actId) return { di, ai, act: acts[ai] };
    }
  }
  return null;
};

gopack.pushItinerary = function() {
  if (gopack.db && gopack.state.tripId) {
    gopack.db.ref('trips/' + gopack.state.tripId + '/itinerary').set(gopack.state.currentItinerary);
  }
};

// ── Edit handlers (window-exposed) ───────────
window.startEditActivity = function(actId) {
  gopack.state.currentlyEditingActId = actId;
  gopack.renderItineraryDays();
};

window.saveActivity = function(actId) {
  const card = gopack.$('act-' + actId);
  if (!card) return;
  const time = card.querySelector('.edit-time').value.trim();
  const name = card.querySelector('.edit-name').value.trim();
  const desc = card.querySelector('.edit-textarea').value.trim();
  const tag  = card.querySelector('.edit-select').value;
  if (!name) return;
  const found = gopack.findActivity(actId);
  if (!found) return;
  const act = found.act;
  act.time = time; act.name = name; act.description = desc; act.tag = tag;
  act.lastEditedBy = gopack.state.userName || 'Anonymous';
  gopack.state.currentItinerary.days[found.di].activities =
    gopack.sortByTime(gopack.state.currentItinerary.days[found.di].activities);
  gopack.state.currentlyEditingActId = null;
  gopack.pushItinerary();
  gopack.renderItineraryDays();
};

window.cancelEdit = function() {
  gopack.state.currentlyEditingActId = null;
  gopack.renderItineraryDays();
};

window.deleteActivity = function(actId) {
  gopack.state.currentlyEditingActId = null;
  for (let di = 0; di < gopack.state.currentItinerary.days.length; di++) {
    const acts = gopack.state.currentItinerary.days[di].activities || [];
    const idx  = acts.findIndex(a => a.actId === actId);
    if (idx !== -1) { acts.splice(idx, 1); break; }
  }
  gopack.pushItinerary();
  gopack.renderItineraryDays();
};

window.addActivity = function(di) {
  const newAct = {
    actId: gopack.generateId(), time: '', name: 'New activity', description: '',
    tag: 'Culture', fromWish: false, suggester: '',
    addedBy: gopack.state.userName || 'Anonymous', lastEditedBy: '',
  };
  gopack.state.currentItinerary.days[di].activities.push(newAct);
  gopack.state.currentlyEditingActId = newAct.actId;
  gopack.pushItinerary();
  gopack.renderItineraryDays();
};

// ── Trip total ────────────────────────────────
gopack.renderTripTotal = function() {
  const days  = gopack.state.currentItinerary?.days || [];
  const total = days.flatMap(d => d.activities || []).reduce((s, a) => s + (a.estimatedCost || 0), 0);
  const el    = document.getElementById('trip-total-wrap');
  if (!el) return;
  el.innerHTML = total > 0
    ? `<div class="trip-total-box"><span class="trip-total-label">Estimated trip total</span><span class="trip-total-num">~$${total} <span class="trip-total-sub">per person</span></span></div>`
    : '';
};

// ── Share itinerary ───────────────────────────
gopack.shareItinerary = window.shareItinerary = function() {
  const url = window.location.origin + window.location.pathname + '?t=' + gopack.state.tripId;
  if (navigator.share) {
    navigator.share({
      title: 'gopack.now — ' + gopack.state.destination + ' itinerary',
      text:  'Check out our ' + gopack.state.destination + ' trip itinerary on gopack.now!',
      url,
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => {
      const btn = gopack.$('share-itin-btn');
      if (btn) {
        btn.textContent = '✓ Link copied!';
        setTimeout(() => btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share itinerary link', 2500);
      }
    }).catch(() => alert('Share this link: ' + url));
  }
};

// ── PDF export ────────────────────────────────
gopack.exportToPDF = window.exportToPDF = function() {
  const itin = gopack.state.currentItinerary;
  if (!itin) return;
  const dates = gopack.getItineraryDates();
  const days  = itin.days || [];

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>gopack.now — ${gopack.escHtml(gopack.state.destination)} Itinerary</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; background: #FAF8F5; color: #1A1412; padding: 0; }
  .cover { background: #1A1412; color: white; padding: 60px 50px 50px; min-height: 220px; }
  .cover-eyebrow { font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #E85D3A; margin-bottom: 16px; }
  .cover-dest { font-size: 56px; font-weight: 700; letter-spacing: -2px; margin-bottom: 12px; }
  .cover-meta { font-family: Arial, sans-serif; font-size: 13px; color: rgba(255,255,255,0.5); display: flex; gap: 20px; flex-wrap: wrap; }
  .pack-row { background: #E85D3A; padding: 14px 50px; display: flex; align-items: center; gap: 10px; }
  .pack-label { font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.7); }
  .pack-names { font-family: Arial, sans-serif; font-size: 13px; color: white; font-weight: bold; }
  .content { padding: 40px 50px; }
  .day-block { margin-bottom: 48px; page-break-inside: avoid; }
  .day-header { border-bottom: 2px solid #E85D3A; padding-bottom: 10px; margin-bottom: 20px; display: flex; align-items: baseline; gap: 16px; }
  .day-num { font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #E85D3A; font-weight: bold; }
  .day-date { font-family: Arial, sans-serif; font-size: 11px; color: #8A7F78; }
  .day-theme { font-size: 22px; font-weight: 700; color: #1A1412; }
  .activity { display: flex; gap: 20px; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid rgba(0,0,0,0.08); }
  .activity:last-child { border-bottom: none; }
  .act-time { font-family: Arial, sans-serif; font-size: 11px; color: #8A7F78; min-width: 70px; padding-top: 3px; font-weight: bold; }
  .act-body { flex: 1; }
  .act-name { font-size: 15px; font-weight: 700; margin-bottom: 5px; color: #1A1412; }
  .act-name.wish::before { content: ""; }
  .act-desc { font-size: 13px; color: #5A5550; line-height: 1.6; margin-bottom: 6px; }
  .act-tag { font-family: Arial, sans-serif; font-size: 10px; background: #FFF0EC; color: #E85D3A; padding: 3px 10px; border-radius: 100px; font-weight: bold; }
  .act-suggester { font-family: Arial, sans-serif; font-size: 11px; color: #E85D3A; font-style: italic; }
  .footer { text-align: center; padding: 30px; font-family: Arial, sans-serif; font-size: 11px; color: #8A7F78; border-top: 1px solid rgba(0,0,0,0.1); margin-top: 20px; }
  .footer strong { color: #E85D3A; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .day-block { page-break-inside: avoid; } }
</style>
</head>
<body>
<div class="cover">
  <div class="cover-eyebrow">✦ Your gopack itinerary</div>
  <div class="cover-dest">${gopack.escHtml(gopack.state.destination)}</div>
  <div class="cover-meta">
    <span>📅 ${dates ? gopack.formatDateShort(dates[0]) + ' – ' + gopack.formatDateShort(dates[dates.length-1]) : gopack.state.days + ' days'}</span>
    <span>✨ ${gopack.escHtml(gopack.vibeLabel(gopack.state.vibes))}</span>
    <span>${gopack.escHtml(gopack.budgetLabel(gopack.state.budget))}</span>
    <span>🎒 ${gopack.state.wishes.length} wishes packed</span>
  </div>
</div>
${(() => {
  const names = [...new Set(gopack.state.wishes.map(w => w.author))];
  if (gopack.state.userName && !names.includes(gopack.state.userName)) names.unshift(gopack.state.userName);
  return names.length ? `<div class="pack-row"><span class="pack-label">The pack</span><span class="pack-names">${gopack.escHtml(names.join('  ·  '))}</span></div>` : '';
})()}
<div class="content">
${days.map((day, di) => {
  const date = dates ? dates[di] : null;
  return `
  <div class="day-block">
    <div class="day-header">
      <span class="day-num">Day ${day.dayNumber || di+1}</span>
      ${date ? `<span class="day-date">${gopack.formatDate(date)}</span>` : ''}
      <span class="day-theme">${gopack.escHtml(day.theme || '')}</span>
    </div>
    ${(day.activities || []).map(act => `
    <div class="activity">
      <div class="act-time">${gopack.escHtml(act.time || '')}</div>
      <div class="act-body">
        <div class="act-name ${act.fromWish ? 'wish' : ''}">${gopack.escHtml(act.name || '')}</div>
        <div class="act-desc">${gopack.escHtml(act.description || '')}</div>
        <div style="display:flex;gap:10px;align-items:center">
          <span class="act-tag">${gopack.escHtml(act.tag || '')}</span>
          ${act.fromWish && act.suggester ? `<span class="act-suggester">suggested by ${gopack.escHtml(act.suggester)}</span>` : ''}
        </div>
      </div>
    </div>`).join('')}
  </div>`;
}).join('')}
</div>
<div class="footer">Created with <strong>gopack.now</strong> — Pack your bags. Pack your friends.</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gopack-' + gopack.state.destination.toLowerCase().replace(/\s+/g, '-') + '-itinerary.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    alert('Itinerary downloaded! Open the file in your browser, then use Share → Print → Save as PDF.');
  } else {
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 500); };
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gopack-' + gopack.state.destination.toLowerCase().replace(/\s+/g, '-') + '-itinerary.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
  }
};

// ── Calendar export (.ics) ────────────────────
gopack.exportToCalendar = window.exportToCalendar = function() {
  const days  = gopack.state.currentItinerary?.days || [];
  const dates = gopack.getItineraryDates();
  if (!dates) { alert('Add a start date to your trip to export to calendar.'); return; }

  const esc  = s => String(s || '').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
  const pad  = n => String(n).padStart(2, '0');
  const stamp = (date, h, m) => gopack.localDateStamp(date) + 'T' + pad(h) + pad(m) + '00';

  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//gopack.now//Itinerary//EN','CALSCALE:GREGORIAN'];
  let uidSeq  = 0;
  days.forEach((day, di) => {
    const date = dates[di];
    if (!date) return;
    const city = gopack.getCityForDay(di);
    (day.activities || []).forEach(act => {
      const tm = act.time ? act.time.match(/(\d+):(\d+)\s*(am|pm)/i) : null;
      let start, end;
      if (tm) {
        let h = parseInt(tm[1]), m = parseInt(tm[2]);
        if (tm[3].toLowerCase() === 'pm' && h !== 12) h += 12;
        if (tm[3].toLowerCase() === 'am' && h === 12) h = 0;
        start = 'DTSTART:' + stamp(date, h, m);
        end   = 'DTEND:'   + stamp(date, (h + 1) % 24, m);
      } else {
        start = 'DTSTART;VALUE=DATE:' + gopack.localDateStamp(date);
        end   = 'DTEND;VALUE=DATE:'   + gopack.localDateStamp(date);
      }
      lines.push(
        'BEGIN:VEVENT',
        'UID:' + Date.now() + '-' + (uidSeq++) + '@gopack.now',
        start, end,
        'SUMMARY:'     + esc(act.name),
        'DESCRIPTION:' + esc(act.description),
        'LOCATION:'    + esc((act.name || '') + (city ? ', ' + city : '')),
        'END:VEVENT'
      );
    });
  });
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'gopack-' + String(gopack.state.destination || 'trip').toLowerCase().replace(/\s+/g, '-') + '.ics';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};

// ── Fallback itinerary ────────────────────────
gopack.getFallbackItinerary = function() {
  const s      = gopack.state;
  const themes = ['Arrivals & First Impressions','Hidden Gems','Deep Local Life','Off the Beaten Path','Farewell & Favourites'];
  return { days: Array.from({ length: s.days }, (_, i) => ({
    dayNumber: i + 1, theme: themes[i % themes.length],
    activities: [
      { time:'9:00 AM',  name:'Morning exploration', description:`Begin in the heart of ${s.destination}.`, tag:'Culture',  fromWish:false, suggester:'' },
      { time:'12:00 PM', name:'Local lunch',          description:'Sample regional cuisine at a spot beloved by locals.',  tag:'Food',     fromWish:false, suggester:'' },
      { time:'3:00 PM',  name: s.wishes[i % s.wishes.length]?.text || 'Afternoon adventure', description:`One of the pack's most-wanted experiences.`, tag:'Adventure', fromWish:!!s.wishes[i % s.wishes.length], suggester:s.wishes[i % s.wishes.length]?.author || '' },
      { time:'7:00 PM',  name:'Evening wind-down',    description:"Dinner at a neighbourhood favourite.", tag:'Relaxation', fromWish:false, suggester:'' },
    ],
  }))};
};

// ── Nav button wiring ─────────────────────────
(function wireItineraryNav() {
  const editBtn = gopack.$('edit-wishes-btn');
  if (editBtn) editBtn.addEventListener('click', () => gopack.showScreen('screen-collab'));
  const regenBtn = gopack.$('regenerate-btn');
  if (regenBtn) regenBtn.addEventListener('click', gopack.buildItinerary);
})();