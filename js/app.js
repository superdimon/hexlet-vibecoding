import {
  ACTIVITY_LEVELS,
  GOALS,
  calculateProfile,
  portionNutrients,
  totalNutrients,
} from './calories.js';
import { PRODUCTS, findProduct } from './products.js';

const STORAGE_KEY = 'calorie-calculator-state';

const state = {
  target: null,
  entries: [],
};

// --- localStorage ---

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed.target)) state.target = parsed.target;
    if (Array.isArray(parsed.entries)) state.entries = parsed.entries;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// --- заполнение селектов ---

function fillSelect(select, options) {
  for (const [value, { label }] of Object.entries(options)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

fillSelect(document.getElementById('activity-select'), ACTIVITY_LEVELS);
fillSelect(document.getElementById('goal-select'), GOALS);

const productSelect = document.getElementById('product-select');
for (const product of [...PRODUCTS].sort((a, b) => a.name.localeCompare(b.name, 'ru'))) {
  const option = document.createElement('option');
  option.value = product.id;
  option.textContent = `${product.name} (${product.kcal} ккал / 100 г)`;
  productSelect.append(option);
}

// --- форма расчёта нормы ---

const profileForm = document.getElementById('profile-form');
const formError = document.getElementById('form-error');

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  formError.hidden = true;

  const data = new FormData(profileForm);
  try {
    const result = calculateProfile({
      sex: data.get('sex'),
      age: Number(data.get('age')),
      height: Number(data.get('height')),
      weight: Number(data.get('weight')),
      activity: data.get('activity'),
      goal: data.get('goal'),
    });

    document.getElementById('result-bmr').textContent = result.bmr;
    document.getElementById('result-tdee').textContent = result.tdee;
    document.getElementById('result-target').textContent = result.target;
    document.getElementById('result-protein').textContent = result.macros.protein;
    document.getElementById('result-fat').textContent = result.macros.fat;
    document.getElementById('result-carbs').textContent = result.macros.carbs;
    document.getElementById('profile-result').hidden = false;

    state.target = result.target;
    saveState();
    renderDiary();
  } catch (e) {
    formError.textContent = e.message;
    formError.hidden = false;
  }
});

// --- дневник питания ---

const diaryForm = document.getElementById('diary-form');
const gramsInput = document.getElementById('grams-input');

diaryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const product = findProduct(productSelect.value);
  const grams = Number(gramsInput.value);
  if (!product || !Number.isFinite(grams) || grams <= 0) return;

  state.entries.push({
    id: crypto.randomUUID(),
    name: product.name,
    grams,
    ...portionNutrients(product, grams),
  });
  saveState();
  renderDiary();
});

document.getElementById('clear-diary').addEventListener('click', () => {
  state.entries = [];
  saveState();
  renderDiary();
});

function renderDiary() {
  const table = document.getElementById('diary-table');
  const empty = document.getElementById('diary-empty');
  const clearBtn = document.getElementById('clear-diary');
  const body = document.getElementById('diary-body');
  const hasEntries = state.entries.length > 0;

  table.hidden = !hasEntries;
  clearBtn.hidden = !hasEntries;
  empty.hidden = hasEntries;

  body.innerHTML = '';
  for (const entry of state.entries) {
    const row = document.createElement('tr');

    const cells = [
      entry.name,
      `${entry.grams} г`,
      entry.kcal,
      entry.protein,
      entry.fat,
      entry.carbs,
    ];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value;
      row.append(td);
    }

    const removeTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', `Удалить ${entry.name}`);
    removeBtn.addEventListener('click', () => {
      state.entries = state.entries.filter((e) => e.id !== entry.id);
      saveState();
      renderDiary();
    });
    removeTd.append(removeBtn);
    row.append(removeTd);

    body.append(row);
  }

  const totals = totalNutrients(state.entries);
  document.getElementById('total-kcal').textContent = totals.kcal;
  document.getElementById('total-protein').textContent = totals.protein;
  document.getElementById('total-fat').textContent = totals.fat;
  document.getElementById('total-carbs').textContent = totals.carbs;

  renderProgress(totals.kcal);
}

function renderProgress(eatenKcal) {
  const block = document.getElementById('progress-block');
  if (!state.target) {
    block.hidden = true;
    return;
  }

  block.hidden = false;
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const percent = Math.min((eatenKcal / state.target) * 100, 100);
  const remaining = state.target - eatenKcal;

  fill.style.width = `${percent}%`;
  fill.classList.toggle('over', remaining < 0);
  text.textContent = remaining >= 0
    ? `Съедено ${eatenKcal} из ${state.target} ккал — осталось ${remaining} ккал`
    : `Съедено ${eatenKcal} из ${state.target} ккал — превышение на ${-remaining} ккал`;
}

loadState();
renderDiary();
