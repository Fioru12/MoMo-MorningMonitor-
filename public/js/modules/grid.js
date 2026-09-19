import { state } from '../state.js';

export const LAYOUT_KEY = 'momo-grid-layout-v10';

export function initMomoGrid() {
  const el = document.getElementById('momoGrid');
  if (!el || typeof GridStack === 'undefined') return null;

  ['momo-grid-layout', 'momo-grid-layout-v2', 'momo-grid-layout-v3', 'momo-grid-layout-v4', 'momo-grid-layout-v5', 'momo-grid-layout-v6', 'momo-grid-layout-v7', 'momo-grid-layout-v8', 'momo-grid-layout-v9'].forEach((k) =>
    localStorage.removeItem(k)
  );

  const saved = localStorage.getItem(LAYOUT_KEY);
  let savedLayout = null;
  try {
    savedLayout = saved ? JSON.parse(saved) : null;
  } catch {}

  const momoGrid = GridStack.init(
    {
      column: 12,
      cellHeight: 88,
      margin: 8,
      float: false,
      animate: true,
      draggable: { handle: '.widget-header, .drag-handle', scroll: true },
      resizable: { handles: 'se,e,sw,w' },
      disableDrag: false,
      disableResize: true,
      cellHeightThrottle: 100,
      minRow: 1,
    },
    el
  );
  state.grid = momoGrid;

  if (savedLayout) {
    try {
      momoGrid.load(savedLayout);
    } catch {
      momoGrid.save(true);
    }
  } else {
    momoGrid.save(true);
  }

  function saveLayout() {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(momoGrid.save(false)));
  }
  momoGrid.on('change', saveLayout);
  momoGrid.on('dragstop', saveLayout);
  momoGrid.on('resizestop', saveLayout);

  let editing = false;
  const editBtn = document.getElementById('gridEditBtn');
  const resetBtn = document.getElementById('resetLayoutBtn');
  const floatingBar = document.getElementById('gridEditFloatingBar');
  const floatingDone = document.getElementById('floatingDoneBtn');
  const floatingReset = document.getElementById('floatingResetBtn');
  const floatingText = floatingBar ? floatingBar.querySelector('.grid-edit-bar-text span') : null;

  function setEditing(on) {
    editing = on;
    momoGrid.enableMove(on);
    momoGrid.enableResize(on);
    el.classList.toggle('grid-editing', on);
    if (editBtn) editBtn.classList.toggle('active', on);
    if (floatingBar) floatingBar.classList.toggle('visible', on);
    if (floatingText) {
      floatingText.textContent = on ? 'Modalità Griglia attiva • Trascina e riorganizza' : 'Modalità normale';
    }
  }

  if (editBtn) editBtn.addEventListener('click', () => setEditing(!editing));
  if (floatingDone) floatingDone.addEventListener('click', () => setEditing(false));

  function doReset() {
    if (!confirm('Ripristinare il layout della griglia? La disposizione personalizzata verrà persa.')) return;
    localStorage.removeItem(LAYOUT_KEY);
    location.reload();
  }
  if (resetBtn) resetBtn.addEventListener('click', doReset);
  if (floatingReset) floatingReset.addEventListener('click', doReset);

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key.toLowerCase() === 'g') setEditing(!editing);
    if (e.key === 'Escape' && editing) setEditing(false);
  });

  window.momoSetEditing = setEditing;
  return momoGrid;
}
