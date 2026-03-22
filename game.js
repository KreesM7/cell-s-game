// ═══════════════════════════════════════════════════════
//  لعبة الخلية — Flat-top hexagons, 5×5, zero gap
//
//  FLAT-TOP geometry:
//    width  = 2 * R
//    height = √3 * R
//    col step (DX) = 1.5 * R        (horizontal, center-to-center)
//    row step (DY) = √3 * R         (vertical,   center-to-center)
//    odd COLS shift DOWN by DY/2
//
//  Green  team: connects LEFT col (c=0) → RIGHT col (c=4)
//  Orange team: connects TOP row (r=0)  → BOTTOM row (r=4)
//  (matches image: green sides = left/right background)
// ═══════════════════════════════════════════════════════

const ALL_LETTERS = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي']; // 28 unique
const ROWS = 5, COLS = 5;

let cells = [], selId = null, pendingTeam = null, hovId = null;
let wins = { green: 0, orange: 0 }, rNum = 1;
let names = { green: 'الفريق الأول', orange: 'الفريق الثاني' };

const cv  = document.getElementById('c');
const ctx = cv.getContext('2d');
let R = 60, GX = 0, GY = 0;

// ──────────────────────────────────
//  FLAT-TOP HEX POSITION
//  col step = 1.5*R  (every col moves right 1.5*R)
//  row step = √3*R   (every row moves down √3*R)
//  odd columns are shifted DOWN by (√3*R)/2
// ──────────────────────────────────
function cxy(row, col) {
  const DX = 1.5 * R;
  const DY = Math.sqrt(3) * R;
  return {
    x: GX + col * DX,
    y: GY + row * DY + (col % 2 === 1 ? DY / 2 : 0)
  };
}

// Flat-top hex corners: angles 0°,60°,120°,180°,240°,300°
function flatCorners(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i; // 0, 60, 120, 180, 240, 300 degrees
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

// ──────────────────────────────────
//  NEIGHBORS (flat-top, odd-col down)
// ──────────────────────────────────
function nbrs(r, c) {
  const odd = c % 2 === 1;
  // Flat-top col-offset neighbors
  const dirs = odd
    ? [[0,-1],[0,1],[-1,-1],[-1,0],[-1,1],[1,0]]   // wrong - use correct below
    : [[0,-1],[0,1],[-1,0],[1,-1],[1,0],[1,1]];

  // Correct flat-top offset neighbors (odd-col shifted down):
  const nb = odd
    ? [ [r-1,c], [r+1,c], [r,c-1], [r,c+1], [r-1,c-1], [r-1,c+1] ]
    : [ [r-1,c], [r+1,c], [r,c-1], [r,c+1], [r+1,c-1], [r+1,c+1] ];

  return nb.filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS);
}

// ──────────────────────────────────
//  WIN CHECK
//  Green:  left col (c=0) → right col (c=COLS-1)
//  Orange: top row (r=0)  → bottom row (r=ROWS-1)
// ──────────────────────────────────
function won(team) {
  const owned = new Set(cells.filter(cl => cl.owner === team).map(cl => cl.id));
  if (team === 'green') {
    const st = cells.filter(cl => cl.col === 0      && cl.owner === 'green').map(cl => cl.id);
    const tg = new Set(cells.filter(cl => cl.col === COLS-1 && cl.owner === 'green').map(cl => cl.id));
    return bfs(st, tg, owned);
  } else {
    const st = cells.filter(cl => cl.row === 0      && cl.owner === 'orange').map(cl => cl.id);
    const tg = new Set(cells.filter(cl => cl.row === ROWS-1 && cl.owner === 'orange').map(cl => cl.id));
    return bfs(st, tg, owned);
  }
}

function bfs(starts, targets, owned) {
  if (!starts.length || !targets.size) return false;
  const vis = new Set(); const q = [...starts];
  while (q.length) {
    const id = q.shift();
    if (targets.has(id)) return true;
    if (vis.has(id)) continue; vis.add(id);
    const [r, c] = id.split('_').map(Number);
    for (const [nr, nc] of nbrs(r, c)) {
      const nid = `${nr}_${nc}`;
      if (owned.has(nid) && !vis.has(nid)) q.push(nid);
    }
  }
  return false;
}

// ──────────────────────────────────
//  HIT TEST (flat-top hex)
// ──────────────────────────────────
function inFlatHex(px, py, cx, cy, r) {
  // Transform to hex-local coords
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  // Flat-top: width=2r, half-height=√3/2*r
  if (dx > r) return false;
  if (dy > (Math.sqrt(3) / 2) * r) return false;
  // Corner cut: the angled edge
  return dy <= Math.sqrt(3) * (r - dx);
}

function cellAt(px, py) {
  // Check in reverse so topmost drawn cells get priority
  for (let i = cells.length - 1; i >= 0; i--) {
    const cell = cells[i];
    const { x, y } = cxy(cell.row, cell.col);
    if (inFlatHex(px, py, x, y, R)) return cell;
  }
  return null;
}

// ──────────────────────────────────
//  BUILD — 25 unique letters
// ──────────────────────────────────
function build() {
  const pool = [...ALL_LETTERS].sort(() => Math.random() - .5).slice(0, ROWS * COLS);
  pool.sort(() => Math.random() - .5);
  cells = [];
  let i = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      cells.push({ id: `${r}_${c}`, row: r, col: c, letter: pool[i++], owner: null });
}

// ──────────────────────────────────
//  DRAW — matching screenshot exactly
//  White fill, thick purple border, dark purple letters
// ──────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);

  cells.forEach(cell => {
    const { x, y } = cxy(cell.row, cell.col);
    const isSel = selId === cell.id;
    const isHov = hovId === cell.id && !cell.owner;

    // ── Outer (border) — full R ──
    const BORDER = R * 0.14;
    const outerC = flatCorners(x, y, R);
    ctx.beginPath();
    ctx.moveTo(...outerC[0]);
    for (let i = 1; i < 6; i++) ctx.lineTo(...outerC[i]);
    ctx.closePath();

    // Border color matches image: rich purple/indigo
    ctx.fillStyle =
        cell.owner === 'green'  ? '#14532d'
      : cell.owner === 'orange' ? '#7c2d12'
      : '#4c1d95'; // deep purple — exactly like screenshot
    ctx.fill();

    // ── Inner (fill) — inset by BORDER ──
    const innerC = flatCorners(x, y, R - BORDER);
    ctx.beginPath();
    ctx.moveTo(...innerC[0]);
    for (let i = 1; i < 6; i++) ctx.lineTo(...innerC[i]);
    ctx.closePath();

    let fill;
    if      (cell.owner === 'green')  fill = '#4ade80';
    else if (cell.owner === 'orange') fill = '#fb923c';
    else if (isSel)                   fill = '#fde047'; // yellow selected
    else if (isHov)
      fill = pendingTeam === 'green'  ? '#bbf7d0'
           : pendingTeam === 'orange' ? '#fed7aa'
           : '#f5f3ff'; // near-white with hint of purple
    else fill = '#ffffff'; // pure white — matching screenshot

    ctx.fillStyle = fill;
    ctx.fill();

    // ── Letter ──
    const fs = Math.round(R * 0.58);
    ctx.font = `900 ${fs}px Cairo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (cell.owner) {
      // White letters on colored cells
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    } else {
      // Deep purple letters — matching screenshot exactly
      ctx.fillStyle = '#5b21b6';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.fillText(cell.letter, x, y + fs * 0.04);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  });
}

// ──────────────────────────────────
//  RESIZE — maximize hex to fill play area
//  Flat-top 5×5 grid dimensions:
//    gridW = (COLS-1)*1.5*R + 2*R = (1.5*COLS + 0.5)*R
//    gridH = (ROWS-1)*√3*R + √3*R + DY/2 = (ROWS - 0.5)*√3*R
//           (odd cols shift down by DY/2)
// ──────────────────────────────────
function resize() {
  const el = document.getElementById('play');
  const W = el.clientWidth, H = el.clientHeight;
  cv.width = W; cv.height = H;

  const pad = 0.09; // 9% padding
  // gridW = (1.5*(COLS-1) + 2) * R
  // gridH = (ROWS - 0.5) * √3 * R
  const byW = W * (1 - pad*2) / (1.5*(COLS-1) + 2);
  const byH = H * (1 - pad*2) / ((ROWS - 0.5) * Math.sqrt(3));
  R = Math.min(byW, byH);

  const DX = 1.5 * R;
  const DY = Math.sqrt(3) * R;
  const gridW = (COLS - 1) * DX + 2 * R;
  const gridH = (ROWS - 0.5) * DY;

  GX = (W - gridW) / 2 + R;
  GY = (H - gridH) / 2 + DY / 2;

  draw();
}

// ──────────────────────────────────
//  MOUSE & TOUCH
// ──────────────────────────────────
function sxy(e) {
  const rect = cv.getBoundingClientRect();
  const sx = cv.width / rect.width, sy = cv.height / rect.height;
  const src = e.touches ? e.changedTouches[0] : e;
  return { px: (src.clientX - rect.left) * sx, py: (src.clientY - rect.top) * sy };
}

cv.addEventListener('mousemove', e => {
  const { px, py } = sxy(e);
  const cell = cellAt(px, py);
  const nh = (cell && !cell.owner) ? cell.id : null;
  if (nh !== hovId) { hovId = nh; draw(); }
  cv.style.cursor = (cell && !cell.owner) ? 'pointer' : 'default';
});
cv.addEventListener('mouseleave', () => { hovId = null; draw(); });
cv.addEventListener('click', e => {
  const { px, py } = sxy(e);
  const cell = cellAt(px, py);
  if (!cell || cell.owner) return;
  onCell(cell.id);
});
cv.addEventListener('touchend', e => {
  e.preventDefault();
  const { px, py } = sxy(e);
  const cell = cellAt(px, py);
  if (!cell || cell.owner) return;
  onCell(cell.id);
}, { passive: false });

// ──────────────────────────────────
//  INTERACTION
// ──────────────────────────────────
function pickTeam(t) {
  pendingTeam = t;
  document.getElementById('btn-g').classList.toggle('active', t === 'green');
  document.getElementById('btn-o').classList.toggle('active', t === 'orange');
  document.getElementById('chk-g').className = 'chk' + (t === 'green'  ? ' g' : '');
  document.getElementById('chk-o').className = 'chk' + (t === 'orange' ? ' o' : '');
  if (selId) { doAssign(selId, t); clearSt(); } else draw();
}

function onCell(id) {
  if (pendingTeam) { doAssign(id, pendingTeam); clearSt(); }
  else { selId = id; draw(); }
}

function doAssign(id, team) {
  const cell = cells.find(c => c.id === id);
  if (!cell || cell.owner) { clearSt(); draw(); return; }
  cell.owner = team; draw();
  if (won(team)) {
    wins[team]++;
    updateScore();
    setTimeout(() => wins[team] >= 2 ? showGameWin(team) : showRoundWin(team), 380);
  }
}

function clearSt() {
  pendingTeam = null; selId = null;
  ['btn-g','btn-o'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('chk-g').className = 'chk';
  document.getElementById('chk-o').className = 'chk';
  draw();
}

// ──────────────────────────────────
//  NAME SYNC & SCORE
// ──────────────────────────────────
function syncNames() {
  names.green  = document.getElementById('name-g').value.trim() || 'الفريق الأول';
  names.orange = document.getElementById('name-o').value.trim() || 'الفريق الثاني';
  document.getElementById('lbl-g').textContent = names.green;
  document.getElementById('lbl-o').textContent = names.orange;
  document.getElementById('sn-g').textContent  = names.green;
  document.getElementById('sn-o').textContent  = names.orange;
}

function updateScore() {
  document.getElementById('sv-g').textContent = wins.green;
  document.getElementById('sv-o').textContent = wins.orange;
}

// ──────────────────────────────────
//  OVERLAYS
// ──────────────────────────────────
const RN = ['','الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة'];

function showRoundWin(team) {
  const col = team === 'green' ? '#22c55e' : '#f97316';
  document.getElementById('ov-r-e').textContent = team === 'green' ? '🟢' : '🟠';
  document.getElementById('ov-r-t').textContent = `فاز ${names[team]}!`;
  document.getElementById('ov-r-t').style.color = col;
  document.getElementById('ov-r-s').textContent = `جولة ${RN[rNum]||rNum} — أول من يفوز بجولتين يحسم اللعبة`;
  document.getElementById('ov-r').classList.add('show');
}

function showGameWin(team) {
  document.getElementById('gw-nm').textContent  = names[team];
  document.getElementById('gw-sub').textContent = 'فاز بجولتين وحسم البطولة! 🎉';
  document.getElementById('ov-g').classList.add('show');
  spawnConfetti();
}

function nextRound() {
  document.getElementById('ov-r').classList.remove('show');
  rNum++;
  document.getElementById('rname').textContent = RN[rNum] || rNum;
  build(); clearSt();
}

function newRound() {
  document.getElementById('ov-r').classList.remove('show');
  rNum++;
  document.getElementById('rname').textContent = RN[rNum] || rNum;
  build(); clearSt();
}

function newGame() {
  ['ov-r','ov-g'].forEach(id => document.getElementById(id).classList.remove('show'));
  rNum = 1; wins = { green: 0, orange: 0 };
  document.getElementById('rname').textContent = 'الأولى';
  updateScore(); build(); clearSt();
}

// ──────────────────────────────────
//  CONFETTI
// ──────────────────────────────────
function spawnConfetti() {
  const wrap = document.getElementById('cf'); wrap.innerHTML = '';
  const cols = ['#f9e000','#22c55e','#f97316','#fff','#e879f9','#38bdf8','#f43f5e'];
  for (let i = 0; i < 110; i++) {
    const el = document.createElement('div'); el.className = 'cf';
    const sz = 5 + Math.random() * 11;
    el.style.cssText = `left:${Math.random()*100}vw;width:${sz}px;height:${sz}px;
      background:${cols[Math.floor(Math.random()*cols.length)]};
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-duration:${1.6+Math.random()*2.4}s;
      animation-delay:${Math.random()*1.5}s;
      opacity:${.7+Math.random()*.3};`;
    wrap.appendChild(el);
  }
  setTimeout(() => wrap.innerHTML = '', 6500);
}

// ──────────────────────────────────
//  INIT
// ──────────────────────────────────
build();
syncNames();
window.addEventListener('resize', resize);
document.fonts.ready.then(() => resize());
resize();
