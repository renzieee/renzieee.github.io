// Handwritten Digit Recognizer — runs the Python-trained model in the browser.
// Author: Renzie Gacot

const M = window.DIGIT_MODEL;
const pad = document.getElementById('pad');
const ctx = pad.getContext('2d');
const SIZE = pad.width;

// ---------- drawing ----------
function resetPad() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = SIZE * 0.075;
  ctx.strokeStyle = '#000';
}
resetPad();

let drawing = false, last = null, hasInk = false;
const pos = e => {
  const r = pad.getBoundingClientRect();
  return { x: (e.clientX - r.left) * SIZE / r.width, y: (e.clientY - r.top) * SIZE / r.height };
};
pad.addEventListener('pointerdown', e => { drawing = true; last = pos(e); pad.setPointerCapture(e.pointerId); dot(last); });
pad.addEventListener('pointermove', e => {
  if (!drawing) return;
  const p = pos(e);
  ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
  last = p; hasInk = true; schedule();
});
['pointerup', 'pointercancel'].forEach(t => pad.addEventListener(t, () => { drawing = false; schedule(); }));
function dot(p) { ctx.beginPath(); ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); hasInk = true; schedule(); }

document.getElementById('clear').addEventListener('click', () => { resetPad(); hasInk = false; render(null, null); });

let pending = false;
function schedule() { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; predict(); }); } }

// ---------- preprocessing: match the 8x8 format of the training data ----------
// The training digits were scaled so the digit fills the full height of a
// 32x32 box (centred), then each 4x4 block was counted -> a value from 0 to 16.
const work = document.createElement('canvas'); work.width = work.height = 32;
const wctx = work.getContext('2d', { willReadFrequently: true });

function toInput() {
  const img = ctx.getImageData(0, 0, SIZE, SIZE).data;
  let x0 = SIZE, y0 = SIZE, x1 = -1, y1 = -1;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (img[(y * SIZE + x) * 4] < 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const scale = 32 / Math.max(w, h);
  const dw = w * scale, dh = h * scale;
  wctx.fillStyle = '#fff'; wctx.fillRect(0, 0, 32, 32);
  wctx.imageSmoothingQuality = 'high';
  wctx.drawImage(pad, x0, y0, w, h, (32 - dw) / 2, (32 - dh) / 2, dw, dh);
  const d = wctx.getImageData(0, 0, 32, 32).data;
  const input = new Array(64).fill(0);
  for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {
    let ink = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ink += 1 - d[((by * 4 + y) * 32 + bx * 4 + x) * 4] / 255;
    }
    input[by * 8 + bx] = Math.min(1, ink / 16 * 1.6); // 0..1, like train.py (value/16)
  }
  return input;
}

// ---------- the neural network (same maths as scikit-learn's MLPClassifier) ----------
function forward(x) {
  const h = M.b1.map((b, j) => { let s = b; for (let i = 0; i < 64; i++) s += x[i] * M.W1[i][j]; return Math.max(0, s); });
  const z = M.b2.map((b, k) => { let s = b; for (let j = 0; j < h.length; j++) s += h[j] * M.W2[j][k]; return s; });
  const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), t = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / t);
}
window.forward = forward;

// ---------- UI ----------
const bars = document.getElementById('bars');
for (let d = 0; d < 10; d++) {
  bars.insertAdjacentHTML('beforeend', `<li><span>${d}</span><div class="bar"><i style="width:0"></i></div><em>0%</em></li>`);
}
const grid = document.getElementById('grid');
for (let i = 0; i < 64; i++) grid.insertAdjacentHTML('beforeend', '<b></b>');
const cells = grid.querySelectorAll('b');
const guessEl = document.getElementById('guess');
const confEl = document.getElementById('conf');

function render(input, probs) {
  cells.forEach((c, i) => { c.style.opacity = input ? input[i] : 0; });
  bars.querySelectorAll('li').forEach((li, d) => {
    const p = probs ? probs[d] : 0;
    li.querySelector('i').style.width = (p * 100).toFixed(1) + '%';
    li.querySelector('em').textContent = Math.round(p * 100) + '%';
    li.classList.toggle('best', !!probs && p === Math.max(...probs));
  });
  if (!probs) { guessEl.textContent = '?'; confEl.textContent = 'Draw a digit from 0 to 9'; return; }
  const best = probs.indexOf(Math.max(...probs));
  guessEl.textContent = best;
  confEl.textContent = `${Math.round(probs[best] * 100)}% confident`;
}

function predict() {
  if (!hasInk) return render(null, null);
  const input = toInput();
  if (!input) return render(null, null);
  render(input, forward(input));
}
window.predictNow = () => { const i = toInput(); return i ? forward(i) : null; };

document.getElementById('acc').textContent = (M.test_accuracy * 100).toFixed(1) + '%';
render(null, null);
