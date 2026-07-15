const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const GROCERY_FILE = path.join(DATA_DIR, 'grocery.json');
const MEALS_FILE   = path.join(DATA_DIR, 'meals.json');
const PACKING_FILE = path.join(DATA_DIR, 'packing.json');

// Default meal structure — slots only, no pre-filled names
const DEFAULT_MEALS = {
  days: [
    { id: 'jul18', name: 'Saturday', date: 'Jul 18', slots: [ { tag: 'Dinner', meal: '' } ] },
    { id: 'jul19', name: 'Sunday',   date: 'Jul 19', slots: [ { tag: 'Breakfast', meal: '' }, { tag: 'Lunch', meal: '' }, { tag: 'Dinner', meal: '' } ] },
    { id: 'jul20', name: 'Monday',   date: 'Jul 20', slots: [ { tag: 'Breakfast', meal: '' }, { tag: 'Lunch', meal: '' }, { tag: 'Dinner', meal: '' } ] },
    { id: 'jul21', name: 'Tuesday',  date: 'Jul 21', slots: [ { tag: 'Breakfast', meal: '' }, { tag: 'Lunch', meal: '' }, { tag: 'Dinner', meal: '' } ] },
    { id: 'jul22', name: 'Wednesday',date: 'Jul 22', slots: [ { tag: 'Breakfast', meal: '' }, { tag: 'Lunch', meal: '' }, { tag: 'Dinner', meal: '' } ] },
    { id: 'jul23', name: 'Thursday', date: 'Jul 23', slots: [ { tag: 'Breakfast', meal: '' }, { tag: 'Lunch', meal: '' }, { tag: 'Dinner', meal: '' } ] },
    { id: 'jul24', name: 'Friday',   date: 'Jul 24', slots: [ { tag: 'Breakfast', meal: '' }, { tag: 'Lunch', meal: '' }, { tag: 'Dinner', meal: '' } ] },
    { id: 'jul25', name: 'Saturday', date: 'Jul 25', slots: [ { tag: 'Breakfast', meal: '' } ] },
  ]
};

function loadGrocery() {
  try { return JSON.parse(fs.readFileSync(GROCERY_FILE, 'utf8')); } catch { return { items: [] }; }
}
function saveGrocery(data) { fs.writeFileSync(GROCERY_FILE, JSON.stringify(data, null, 2)); }

function loadPacking() {
  try { return JSON.parse(fs.readFileSync(PACKING_FILE, 'utf8')); } catch { return { items: [] }; }
}
function savePacking(data) { fs.writeFileSync(PACKING_FILE, JSON.stringify(data, null, 2)); }

function loadMeals() {
  try { return JSON.parse(fs.readFileSync(MEALS_FILE, 'utf8')); } catch { return DEFAULT_MEALS; }
}
function saveMeals(data) { fs.writeFileSync(MEALS_FILE, JSON.stringify(data, null, 2)); }

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ---- Grocery endpoints ---- */
app.get('/api/grocery', (req, res) => res.json(loadGrocery()));

app.post('/api/grocery', (req, res) => {
  const { text, category } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
  const data = loadGrocery();
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: text.trim(),
    category: category || 'Other',
    qty: req.body.qty || null,
    addedBy: req.body.addedBy || '',
    checked: false,
    createdAt: new Date().toISOString()
  };
  data.items.push(item);
  saveGrocery(data);
  res.json(item);
});

app.patch('/api/grocery/:id', (req, res) => {
  const data = loadGrocery();
  const item = data.items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (typeof req.body.checked === 'boolean') item.checked = req.body.checked;
  if (typeof req.body.text === 'string') item.text = req.body.text;
  if (req.body.qty !== undefined) item.qty = req.body.qty;
  if (req.body.addedBy !== undefined) item.addedBy = req.body.addedBy;
  saveGrocery(data);
  res.json(item);
});

app.delete('/api/grocery/:id', (req, res) => {
  const data = loadGrocery();
  data.items = data.items.filter(i => i.id !== req.params.id);
  saveGrocery(data);
  res.json({ ok: true });
});

app.post('/api/grocery/clear-checked', (req, res) => {
  const data = loadGrocery();
  data.items = data.items.filter(i => !i.checked);
  saveGrocery(data);
  res.json({ ok: true });
});

/* ---- Meals endpoints ---- */
app.get('/api/meals', (req, res) => res.json(loadMeals()));

// Save a single meal slot: PATCH /api/meals/:dayId/:slotIndex  { meal: "Tacos" }
app.patch('/api/meals/:dayId/:slotIndex', (req, res) => {
  const data = loadMeals();
  const day = data.days.find(d => d.id === req.params.dayId);
  if (!day) return res.status(404).json({ error: 'day not found' });
  const slot = day.slots[parseInt(req.params.slotIndex)];
  if (!slot) return res.status(404).json({ error: 'slot not found' });
  slot.meal = (req.body.meal || '').trim();
  saveMeals(data);
  res.json({ ok: true, slot });
});

/* ---- Packing list endpoints ---- */
app.get('/api/packing', (req, res) => res.json(loadPacking()));

app.post('/api/packing', (req, res) => {
  const { text, who } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
  const data = loadPacking();
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: text.trim(),
    who: who || 'All',
    checked: false,
    createdAt: new Date().toISOString()
  };
  data.items.push(item);
  savePacking(data);
  res.json(item);
});

app.patch('/api/packing/:id', (req, res) => {
  const data = loadPacking();
  const item = data.items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (typeof req.body.checked === 'boolean') item.checked = req.body.checked;
  if (typeof req.body.text === 'string') item.text = req.body.text;
  if (typeof req.body.who === 'string') item.who = req.body.who;
  savePacking(data);
  res.json(item);
});

app.delete('/api/packing/:id', (req, res) => {
  const data = loadPacking();
  data.items = data.items.filter(i => i.id !== req.params.id);
  savePacking(data);
  res.json({ ok: true });
});

/* ---- Grocery merge endpoint ---- */
// POST /api/grocery/merge  { ids: [...], mergedText: 'Eggs', contributions: [{addedBy,qty,note}] }
app.post('/api/grocery/merge', (req, res) => {
  const { ids, mergedText, qty, contributions } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'ids required' });
  const data = loadGrocery();
  // Remove all items being merged
  data.items = data.items.filter(i => !ids.includes(i.id));
  // Add the merged item
  const merged = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: mergedText || 'Merged item',
    category: req.body.category || 'Other',
    qty: qty || null,
    contributions: contributions || [],
    checked: false,
    merged: true,
    createdAt: new Date().toISOString()
  };
  data.items.push(merged);
  saveGrocery(data);
  res.json(merged);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Flaming Gorge 2026 app running on port ${PORT}`);
});
