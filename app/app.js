// Leonida Nights — GTA 6 trophy checklist & guide (vocaine)
// Pass 1: core checklist — load, merge, render, expand, progress, filters.
import { GUIDES, ROADMAP, MISSABLE_NOTES } from './data/guides.js';

const STORE_KEY = 'leonida-nights-vocaine-progress';
const SPOILER_KEY = 'leonida-nights-vocaine-spoiler';

let trophies = [];
let earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'));
let kindFilter = 'all';
let gradeFilter = 'all';
let searchText = '';
let spoilerShield = localStorage.getItem(SPOILER_KEY) === '1';
const expanded = new Set();

const $ = (id) => document.getElementById(id);

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function isHiddenBySpoiler(t) {
  const g = GUIDES[t.id];
  return spoilerShield && g && g.kind === 'story' && !earned.has(t.id);
}

function updateHeader() {
  $('earnedCount').textContent = String(earned.size);
  $('earnedPct').textContent = Math.round((earned.size / 55) * 100) + '%';
  $('progressFill').style.width = (earned.size / 55) * 100 + '%';
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) {
    totals[t.grade]++;
    if (earned.has(t.id)) counts[t.grade]++;
  }
  $('gradeCounts').innerHTML = Object.keys(totals)
    .map((g) => `<span>${g}: ${counts[g]}/${totals[g]}</span>`).join('');
}

function matches(t) {
  const g = GUIDES[t.id] || {};
  if (kindFilter === 'missable' && !g.missable) return false;
  if (kindFilter !== 'all' && kindFilter !== 'missable' && g.kind !== kindFilter) return false;
  if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
  if (searchText) {
    const hay = (t.name + ' ' + t.description + ' ' + (g.guide || '')).toLowerCase();
    if (!hay.includes(searchText)) return false;
  }
  return true;
}

function render() {
  const list = $('list');
  list.innerHTML = '';
  let visible = 0;
  for (const t of trophies) {
    if (!matches(t)) continue;
    visible++;
    const g = GUIDES[t.id] || {};
    const hidden = isHiddenBySpoiler(t);
    const row = document.createElement('div');
    row.className = 'row' + (earned.has(t.id) ? ' earned' : '');
    const name = hidden ? '??? (story trophy — spoiler shield on)' : t.name;
    const desc = hidden ? 'Earn this story trophy to reveal its name and description.' : t.description;
    let detail = '';
    if (expanded.has(t.id)) {
      detail = `<div class="detail">
        ${g.missable ? '<span class="tag">MISSABLE</span>' : ''}
        <span class="tag kind">${g.kind || 'misc'}</span>
        <span class="tag stage-tag">${g.stage || ''}</span>
        <p>${hidden ? 'Guide hidden by the spoiler shield until this trophy is earned.' : (g.guide || '')}</p>
        <p class="sources">Sources: ${(g.sources || []).join(' · ')}</p>
      </div>`;
    }
    row.innerHTML = `<div class="row-head" role="button" tabindex="0">
      <input type="checkbox" ${earned.has(t.id) ? 'checked' : ''} aria-label="Mark earned">
      <div class="row-main"><div class="row-name">#${t.id} ${name}</div><div class="row-desc">${desc}</div></div>
      <span class="badge ${t.grade}">${t.grade}</span>
    </div>${detail}`;
    const head = row.querySelector('.row-head');
    const box = row.querySelector('input[type="checkbox"]');
    box.addEventListener('click', (e) => e.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveProgress(); updateHeader(); render(); renderRoadmap();
    });
    head.addEventListener('click', () => {
      if (expanded.has(t.id)) expanded.delete(t.id); else expanded.add(t.id);
      render();
    });
    list.appendChild(row);
  }
  $('emptyMsg').hidden = visible !== 0;
  updateHeader();
}

function wireControls() {
  $('kindFilters').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-kind]');
    if (!btn) return;
    kindFilter = btn.dataset.kind;
    for (const b of $('kindFilters').querySelectorAll('button')) b.classList.toggle('active', b === btn);
    render();
  });
  $('gradeFilter').addEventListener('change', (e) => { gradeFilter = e.target.value; render(); });
  $('searchBox').addEventListener('input', (e) => { searchText = e.target.value.trim().toLowerCase(); render(); });
  const toggle = $('spoilerToggle');
  toggle.checked = spoilerShield;
  toggle.addEventListener('change', () => {
    spoilerShield = toggle.checked;
    localStorage.setItem(SPOILER_KEY, spoilerShield ? '1' : '0');
    render();
  });
}

// Pass 2: roadmap timeline + export/import.
function renderRoadmap() {
  $('missableNotes').textContent = MISSABLE_NOTES;
  const wrap = $('roadmap');
  wrap.innerHTML = '';
  const byId = new Map(trophies.map((t) => [t.id, t]));
  for (const stage of ROADMAP) {
    const div = document.createElement('div');
    div.className = 'stage';
    const chips = stage.trophyIds.map((id) => {
      const t = byId.get(id);
      const g = GUIDES[id] || {};
      const cls = 'chip' + (g.missable ? ' miss' : '') + (earned.has(id) ? ' done' : '');
      const label = t ? `#${id} ${t.name}` : `#${id}`;
      return `<span class="${cls}">${label}${g.missable ? ' — MISSABLE' : ''}</span>`;
    }).join('');
    div.innerHTML = `<h3>${stage.title}</h3><p>${stage.text}</p><div class="chips">${chips}</div>`;
    wrap.appendChild(div);
  }
}

function exportProgress() {
  const payload = JSON.stringify({ app: 'leonida-nights', account: 'vocaine', earned: [...earned].sort((a, b) => a - b) }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-nights-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      earned = new Set((ids || []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 55));
      saveProgress(); render(); renderRoadmap();
    } catch { alert('That file could not be read as a Leonida Nights progress file.'); }
  };
  reader.readAsText(file);
}

async function init() {
  const res = await fetch('./data/trophies.json');
  const data = await res.json();
  trophies = data.trophies;
  wireControls();
  $('exportBtn').addEventListener('click', exportProgress);
  $('importFile').addEventListener('change', (e) => { if (e.target.files[0]) importProgress(e.target.files[0]); });
  render();
  renderRoadmap();
}

init();
