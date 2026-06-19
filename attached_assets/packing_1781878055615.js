// ══════════════════════════════════════════════
// gopack.now — packing.js
// AI packing list generation and rendering
// ══════════════════════════════════════════════

gopack.renderPackingList = function(list) {
  const icons  = { essentials:'🧳', clothing:'👕', toiletries:'🪥', tech:'🔌', activities:'🎒', tips:'💡' };
  const labels = { essentials:'Essentials', clothing:'Clothing', toiletries:'Toiletries', tech:'Tech & Gadgets', activities:'Activity Gear', tips:'Local Tips' };
  let idCounter = 0;
  return Object.entries(list).map(([key, items]) => {
    const arr = Array.isArray(items) ? items : [];
    const checkItems = arr.map(item => {
      const id = 'pack-' + key + '-' + (idCounter++);
      return `
        <li class="pack-check-item">
          <input type="checkbox" id="${id}" class="pack-checkbox" onchange="this.closest('li').classList.toggle('checked', this.checked)"/>
          <label for="${id}">${gopack.escHtml(item)}</label>
        </li>`;
    }).join('');
    return `
      <div class="packing-cat">
        <div class="packing-cat-title">${icons[key] || '•'} ${gopack.escHtml(labels[key] || key)}</div>
        <ul class="packing-items packing-checklist">${checkItems}</ul>
      </div>`;
  }).join('');
};

gopack.generatePackingList = window.generatePackingList = async function() {
  const btn = document.getElementById('packing-btn');
  const box = document.getElementById('packing-box');
  if (!box) return;

  if (btn) { btn.textContent = '🎒 Generating...'; btn.disabled = true; }
  box.style.display = 'block';
  box.innerHTML = '<div class="packing-loading">AI is packing your bags...</div>';

  const cities = gopack.selectedCities.length > 0
    ? gopack.selectedCities
    : gopack.state.destination.split(',').map(c => c.trim());

  const prompt = `Create a smart packing list for a ${gopack.state.days}-day trip to ${cities.join(', ')}. Travel vibe: ${gopack.vibeLabel(gopack.state.vibes)}. Budget: ${gopack.budgetLabel(gopack.state.budget)}.

Return ONLY a JSON object with these categories:
{"essentials":["item1","item2"],"clothing":["item1"],"toiletries":["item1"],"tech":["item1"],"activities":["item1"],"tips":["tip1","tip2"]}

Each list should have 4-8 relevant items. Tips should be 2-3 destination-specific travel tips.`;

  try {
    const res  = await fetch('/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });
    const data      = await res.json();
    const text      = data.content.map(b => b.text || '').join('');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const listObj   = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    box.innerHTML = gopack.renderPackingList(listObj);

    if (gopack.db && gopack.state.tripId) {
      gopack.db.ref('trips/' + gopack.state.tripId + '/packingList').set(listObj);
    }
    if (btn) { btn.textContent = '🎒 Packing list'; btn.disabled = false; }
  } catch(err) {
    box.innerHTML = '<div class="packing-loading">Could not generate packing list. Try again.</div>';
    if (btn) { btn.textContent = '🎒 Packing list'; btn.disabled = false; }
  }
};