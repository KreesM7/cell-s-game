// ═══════════════════════════════════════════════════════
//  لعبة الخلية — Pointy-top hexagons, 5×5, zero gap
//
//  POINTY-TOP geometry:
//    width  = √3 * R
//    height = 2 * R
//    col step (DX) = √3 * R
//    row step (DY) = 1.5 * R
//    odd ROWS shift RIGHT by DX/2
//
//  Green  team: connects TOP row (r=0) → BOTTOM row (r=4)
//  Orange team: connects LEFT col (c=0) → RIGHT col (c=4)
// ═══════════════════════════════════════════════════════

const ALL_LETTERS = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const ROWS = 5, COLS = 5;

let cells = [], selId = null, pendingTeam = null, hovId = null;
let wins = { green: 0, orange: 0 }, rNum = 1;
let names = { green: 'الفريق الأول', orange: 'الفريق الثاني' };

const cv  = document.getElementById('c');
const ctx = cv.getContext('2d');
let R = 60, GX = 0, GY = 0;

function cxy(row, col) {
  const DX = Math.sqrt(3) * R;
  const DY = 1.5 * R;
  return {
    x: GX + col * DX + (row % 2 === 1 ? DX / 2 : 0),
    y: GY + row * DY
  };
}

function pointyCorners(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function nbrs(r, c) {
  const odd = r % 2 === 1;
  const nb = odd
    ? [ [r-1,c], [r-1,c+1], [r,c-1], [r,c+1], [r+1,c], [r+1,c+1] ]
    : [ [r-1,c-1], [r-1,c], [r,c-1], [r,c+1], [r+1,c-1], [r+1,c] ];
  return nb.filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS);
}

function won(team) {
  const owned = new Set(cells.filter(cl => cl.owner === team).map(cl => cl.id));
  if (team === 'green') {
    const st = cells.filter(cl => cl.row === 0        && cl.owner === 'green').map(cl => cl.id);
    const tg = new Set(cells.filter(cl => cl.row === ROWS-1 && cl.owner === 'green').map(cl => cl.id));
    return bfs(st, tg, owned);
  } else {
    const st = cells.filter(cl => cl.col === 0        && cl.owner === 'orange').map(cl => cl.id);
    const tg = new Set(cells.filter(cl => cl.col === COLS-1 && cl.owner === 'orange').map(cl => cl.id));
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

function inPointyHex(px, py, cx, cy, r) {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  if (dy > r) return false;
  if (dx > (Math.sqrt(3) / 2) * r) return false;
  return dx <= Math.sqrt(3) * (r - dy);
}

function cellAt(px, py) {
  for (let i = cells.length - 1; i >= 0; i--) {
    const cell = cells[i];
    const { x, y } = cxy(cell.row, cell.col);
    if (inPointyHex(px, py, x, y, R)) return cell;
  }
  return null;
}

function build() {
  const pool = [...ALL_LETTERS].sort(() => Math.random() - .5).slice(0, ROWS * COLS);
  pool.sort(() => Math.random() - .5);
  cells = [];
  let i = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      cells.push({ id: `${r}_${c}`, row: r, col: c, letter: pool[i++], owner: null });
}

function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);

  cells.forEach(cell => {
    const { x, y } = cxy(cell.row, cell.col);
    const isSel = selId === cell.id;
    const isHov = hovId === cell.id && !cell.owner;

    const BORDER = R * 0.14;
    const outerC = pointyCorners(x, y, R);
    ctx.beginPath();
    ctx.moveTo(...outerC[0]);
    for (let i = 1; i < 6; i++) ctx.lineTo(...outerC[i]);
    ctx.closePath();
    ctx.fillStyle =
        cell.owner === 'green'  ? '#14532d'
      : cell.owner === 'orange' ? '#7c2d12'
      : '#4c1d95';
    ctx.fill();

    const innerC = pointyCorners(x, y, R - BORDER);
    ctx.beginPath();
    ctx.moveTo(...innerC[0]);
    for (let i = 1; i < 6; i++) ctx.lineTo(...innerC[i]);
    ctx.closePath();

    let fill;
    if      (cell.owner === 'green')  fill = '#4ade80';
    else if (cell.owner === 'orange') fill = '#fb923c';
    else if (isSel)                   fill = '#fde047';
    else if (isHov)
      fill = pendingTeam === 'green'  ? '#bbf7d0'
           : pendingTeam === 'orange' ? '#fed7aa'
           : '#f5f3ff';
    else fill = '#ffffff';

    ctx.fillStyle = fill;
    ctx.fill();

    const fs = Math.round(R * 0.52);
    ctx.font = `900 ${fs}px Cairo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (cell.owner) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    } else {
      ctx.fillStyle = '#5b21b6';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.fillText(cell.letter, x, y + fs * 0.04);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  });
}

function resize() {
  const el = document.getElementById('play');
  const W = el.clientWidth, H = el.clientHeight;
  cv.width = W; cv.height = H;

  const pad = 0.09;
  const byW = W * (1 - pad*2) / ((COLS - 0.5) * Math.sqrt(3));
  const byH = H * (1 - pad*2) / (1.5*(ROWS-1) + 2);
  R = Math.min(byW, byH);

  const DX = Math.sqrt(3) * R;
  const DY = 1.5 * R;
  const gridW = (COLS - 0.5) * DX;
  const gridH = (ROWS - 1) * DY + 2 * R;

  GX = (W - gridW) / 2 + DX / 2;
  GY = (H - gridH) / 2 + R;

  draw();
}

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

build();
syncNames();
window.addEventListener('resize', resize);
document.fonts.ready.then(() => resize());
resize();
