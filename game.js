// ═══════════════════════════════════════════════════════
//  لعبة الخلية — Pointy-top hexagons, 5×5
//  Green  team: TOP row → BOTTOM row
//  Orange team: LEFT col → RIGHT col
// ═══════════════════════════════════════════════════════

const ALL_LETTERS = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const ROWS = 5, COLS = 5;

let cells = [], selId = null, pendingTeam = null, hovId = null;
let wins = { green: 0, orange: 0 }, rNum = 1;
let names = { green: 'الفريق الأول', orange: 'الفريق الثاني' };
let moveHistory = [];
let currentTurn = 'green';
let moveNum = 0;
let isDark = true;          // dark mode by default
let sideCollapsed = false;  // side panel state

const cv  = document.getElementById('c');
const ctx = cv.getContext('2d');
let R = 60, GX = 0, GY = 0;

// ── Theme colours ──────────────────────────────────────
function theme() {
  return isDark ? {
    sideBg:        '#5427a0',
    sideText:      '#ffffff',
    sideSubText:   'rgba(255,255,255,0.6)',
    scoreBg:       'rgba(0,0,0,0.2)',
    inputBg:       'rgba(255,255,255,0.1)',
    inputBorder:   'rgba(255,255,255,0.18)',
    inputText:     '#ffffff',
    btnBg:         'rgba(0,0,0,0.18)',
    btnBorder:     'rgba(255,255,255,0.16)',
    btnActiveBg:   'rgba(255,255,255,0.28)',
    ctrlWhiteBg:   'rgba(255,255,255,0.9)',
    ctrlWhiteText: '#333',
    ctrlDarkBg:    'rgba(0,0,0,0.28)',
    ctrlDarkText:  '#ffffff',
    histBg:        'rgba(0,0,0,0.15)',
    histText:      'rgba(255,255,255,0.85)',
    histSub:       'rgba(255,255,255,0.4)',
    divider:       'rgba(255,255,255,0.12)',
    hexEmpty:      '#ffffff',
    hexBorder:     '#4c1d95',
    hexLetter:     '#5b21b6',
    canvasBase:    '#0f0a1e',
  } : {
    sideBg:        '#e8e0f8',
    sideText:      '#1a0a3a',
    sideSubText:   'rgba(0,0,0,0.5)',
    scoreBg:       'rgba(0,0,0,0.07)',
    inputBg:       'rgba(255,255,255,0.7)',
    inputBorder:   'rgba(80,0,180,0.25)',
    inputText:     '#1a0a3a',
    btnBg:         'rgba(255,255,255,0.6)',
    btnBorder:     'rgba(80,0,180,0.2)',
    btnActiveBg:   'rgba(120,60,220,0.18)',
    ctrlWhiteBg:   '#5427a0',
    ctrlWhiteText: '#ffffff',
    ctrlDarkBg:    'rgba(0,0,0,0.1)',
    ctrlDarkText:  '#1a0a3a',
    histBg:        'rgba(255,255,255,0.5)',
    histText:      '#1a0a3a',
    histSub:       'rgba(0,0,0,0.4)',
    divider:       'rgba(0,0,0,0.1)',
    hexEmpty:      '#ffffff',
    hexBorder:     '#6d28d9',
    hexLetter:     '#4c1d95',
    canvasBase:    '#d4c8f0',
  };
}

// ── Audio ──────────────────────────────────────────────
const AC = window.AudioContext || window.webkitAudioContext;
let ac = null;
function getAC() { if (!ac) ac = new AC(); return ac; }

function playClick(team) {
  try {
    const a = getAC();
    const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(team === 'green' ? 520 : 440, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(team === 'green' ? 780 : 660, a.currentTime + 0.08);
    g.gain.setValueAtTime(0.18, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.18);
    o.start(a.currentTime); o.stop(a.currentTime + 0.18);
  } catch(e) {}
}

function playWin() {
  try {
    const a = getAC();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = 'triangle'; o.frequency.value = freq;
      const t = a.currentTime + i * 0.13;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      o.start(t); o.stop(t + 0.38);
    });
  } catch(e) {}
}

// ── Geometry ───────────────────────────────────────────
function cxy(row, col) {
  const DX = Math.sqrt(3) * R, DY = 1.5 * R;
  return { x: GX + col * DX + (row % 2 === 1 ? DX / 2 : 0), y: GY + row * DY };
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
    ? [[r-1,c],[r-1,c+1],[r,c-1],[r,c+1],[r+1,c],[r+1,c+1]]
    : [[r-1,c-1],[r-1,c],[r,c-1],[r,c+1],[r+1,c-1],[r+1,c]];
  return nb.filter(([nr,nc]) => nr>=0 && nr<ROWS && nc>=0 && nc<COLS);
}

// ── Win check ──────────────────────────────────────────
function won(team) {
  const owned = new Set(cells.filter(cl => cl.owner === team).map(cl => cl.id));
  if (team === 'green') {
    const st = cells.filter(cl => cl.row === 0      && cl.owner==='green').map(cl=>cl.id);
    const tg = new Set(cells.filter(cl => cl.row===ROWS-1 && cl.owner==='green').map(cl=>cl.id));
    return bfs(st, tg, owned);
  } else {
    const st = cells.filter(cl => cl.col === 0      && cl.owner==='orange').map(cl=>cl.id);
    const tg = new Set(cells.filter(cl => cl.col===COLS-1 && cl.owner==='orange').map(cl=>cl.id));
    return bfs(st, tg, owned);
  }
}

function bfs(starts, targets, owned) {
  if (!starts.length || !targets.size) return false;
  const vis = new Set(), q = [...starts];
  while (q.length) {
    const id = q.shift();
    if (targets.has(id)) return true;
    if (vis.has(id)) continue; vis.add(id);
    const [r,c] = id.split('_').map(Number);
    for (const [nr,nc] of nbrs(r,c)) {
      const nid = `${nr}_${nc}`;
      if (owned.has(nid) && !vis.has(nid)) q.push(nid);
    }
  }
  return false;
}

// ── Hit test ───────────────────────────────────────────
function inPointyHex(px, py, cx, cy, r) {
  const dx = Math.abs(px-cx), dy = Math.abs(py-cy);
  if (dy > r) return false;
  if (dx > (Math.sqrt(3)/2)*r) return false;
  return dx <= Math.sqrt(3)*(r-dy);
}

function cellAt(px, py) {
  for (let i = cells.length-1; i >= 0; i--) {
    const cell = cells[i];
    const {x,y} = cxy(cell.row, cell.col);
    if (inPointyHex(px, py, x, y, R)) return cell;
  }
  return null;
}

// ── Build ──────────────────────────────────────────────
function build() {
  const pool = [...ALL_LETTERS].sort(()=>Math.random()-.5).slice(0, ROWS*COLS);
  pool.sort(()=>Math.random()-.5);
  cells = []; let i = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      cells.push({id:`${r}_${c}`, row:r, col:c, letter:pool[i++], owner:null});
  moveHistory = []; moveNum = 0; currentTurn = 'green';
  renderHistory();
  updateTurnIndicator();
}

// ── Background ─────────────────────────────────────────
function drawBackground() {
  const W = cv.width, H = cv.height;
  const P = (r,c) => pointyCorners(cxy(r,c).x, cxy(r,c).y, R);
  const T = theme();

  ctx.fillStyle = T.canvasBase;
  ctx.fillRect(0, 0, W, H);

  // GREEN TOP
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0);
  for (let c = COLS-1; c >= 0; c--) {
    const p = P(0,c);
    ctx.lineTo(...p[0]); ctx.lineTo(...p[1]); ctx.lineTo(...p[2]);
  }
  ctx.closePath(); ctx.fillStyle = '#3dba4e'; ctx.fill();

  // GREEN BOTTOM
  ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(W,H);
  for (let c = COLS-1; c >= 0; c--) {
    const p = P(ROWS-1,c);
    ctx.lineTo(...p[5]); ctx.lineTo(...p[4]); ctx.lineTo(...p[3]);
  }
  ctx.closePath(); ctx.fillStyle = '#3dba4e'; ctx.fill();

  // ORANGE LEFT
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,H);
  for (let r = ROWS-1; r >= 0; r--) {
    const p = P(r,0);
    ctx.lineTo(...p[1]); ctx.lineTo(...p[0]); ctx.lineTo(...p[5]); ctx.lineTo(...p[4]);
  }
  ctx.closePath(); ctx.fillStyle = '#f57c22'; ctx.fill();

  // ORANGE RIGHT
  ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(W,H);
  for (let r = ROWS-1; r >= 0; r--) {
    const p = P(r,COLS-1);
    ctx.lineTo(...p[1]); ctx.lineTo(...p[2]); ctx.lineTo(...p[3]); ctx.lineTo(...p[4]);
  }
  ctx.closePath(); ctx.fillStyle = '#f57c22'; ctx.fill();
}

// ── Draw ───────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawBackground();
  const T = theme();

  cells.forEach(cell => {
    const {x,y} = cxy(cell.row, cell.col);
    const isSel = selId === cell.id;
    const isHov = hovId === cell.id && pendingTeam;
    const BORDER = R * 0.14;

    // Border ring
    const outerC = pointyCorners(x, y, R);
    ctx.beginPath(); ctx.moveTo(...outerC[0]);
    for (let i = 1; i < 6; i++) ctx.lineTo(...outerC[i]);
    ctx.closePath();
    ctx.fillStyle = cell.owner==='green' ? '#14532d'
                  : cell.owner==='orange' ? '#7c2d12'
                  : T.hexBorder;
    ctx.fill();

    // Inner fill
    const innerC = pointyCorners(x, y, R-BORDER);
    ctx.beginPath(); ctx.moveTo(...innerC[0]);
    for (let i = 1; i < 6; i++) ctx.lineTo(...innerC[i]);
    ctx.closePath();

    let fill;
    if      (cell.owner==='green')  fill = '#4ade80';
    else if (cell.owner==='orange') fill = '#fb923c';
    else if (isSel)                 fill = '#fde047';
    else if (isHov)
      fill = pendingTeam==='green'  ? '#bbf7d0'
           : pendingTeam==='orange' ? '#fed7aa' : '#f5f3ff';
    else fill = T.hexEmpty;
    ctx.fillStyle = fill; ctx.fill();

    // Letter
    const fs = Math.round(R * 0.52);
    ctx.font = `900 ${fs}px Cairo, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (cell.owner) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    } else {
      ctx.fillStyle = T.hexLetter;
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    }
    ctx.fillText(cell.letter, x, y + fs*0.04);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  });
}

// ── Resize ─────────────────────────────────────────────
function resize() {
  const el = document.getElementById('play');
  const W = el.clientWidth, H = el.clientHeight;
  cv.width = W; cv.height = H;
  const pad = 0.09;
  const byW = W*(1-pad*2) / ((COLS-0.5)*Math.sqrt(3));
  const byH = H*(1-pad*2) / (1.5*(ROWS-1)+2);
  R = Math.min(byW, byH);
  const DX = Math.sqrt(3)*R, DY = 1.5*R;
  GX = (W - (COLS-0.5)*DX) / 2 + DX/2;
  GY = (H - ((ROWS-1)*DY + 2*R)) / 2 + R;
  draw();
}

// ── Input ──────────────────────────────────────────────
function sxy(e) {
  const rect = cv.getBoundingClientRect();
  const sx = cv.width/rect.width, sy = cv.height/rect.height;
  const src = e.touches ? e.changedTouches[0] : e;
  return { px:(src.clientX-rect.left)*sx, py:(src.clientY-rect.top)*sy };
}
cv.addEventListener('mousemove', e => {
  const {px,py} = sxy(e), cell = cellAt(px,py);
  const nh = cell ? cell.id : null;
  if (nh !== hovId) { hovId = nh; draw(); }
  cv.style.cursor = cell ? 'pointer' : 'default';
});
cv.addEventListener('mouseleave', () => { hovId = null; draw(); });
cv.addEventListener('click', e => {
  const {px,py} = sxy(e), cell = cellAt(px,py);
  if (!cell) return; onCell(cell.id);
});
cv.addEventListener('touchend', e => {
  e.preventDefault();
  const {px,py} = sxy(e), cell = cellAt(px,py);
  if (!cell) return; onCell(cell.id);
}, { passive:false });

// ── Game logic ─────────────────────────────────────────
function pickTeam(t) {
  pendingTeam = t;
  document.getElementById('btn-g').classList.toggle('active', t==='green');
  document.getElementById('btn-o').classList.toggle('active', t==='orange');
  document.getElementById('chk-g').className = 'chk' + (t==='green'  ? ' g' : '');
  document.getElementById('chk-o').className = 'chk' + (t==='orange' ? ' o' : '');
  if (selId) { doAssign(selId, t); clearSt(); } else draw();
}

function onCell(id) {
  if (pendingTeam) { doAssign(id, pendingTeam); clearSt(); }
  else { selId = id; draw(); }
}

function doAssign(id, team) {
  const cell = cells.find(c => c.id === id);
  if (!cell) { clearSt(); draw(); return; }
  const wasOwned = cell.owner;
  cell.owner = team;
  playClick(team);

  // Log to history only if it's a new claim (not a reassignment)
  if (!wasOwned) {
    moveNum++;
    moveHistory.unshift({ team, letter: cell.letter, num: moveNum });
    if (moveHistory.length > 6) moveHistory.pop();
    currentTurn = team === 'green' ? 'orange' : 'green';
    updateTurnIndicator();
    renderHistory();
  }

  draw();
  if (won(team)) {
    wins[team]++;
    updateScore();
    setTimeout(() => {
      playWin();
      wins[team] >= 2 ? showGameWin(team) : showRoundWin(team);
    }, 380);
  }
}

function clearSt() {
  pendingTeam = null; selId = null;
  ['btn-g','btn-o'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('chk-g').className = 'chk';
  document.getElementById('chk-o').className = 'chk';
  draw();
}

// ── Turn indicator ─────────────────────────────────────
function updateTurnIndicator() {
  const indEl = document.getElementById('turn-indicator');
  if (!indEl) return;
  const label = names[currentTurn] || (currentTurn === 'green' ? 'الفريق الأول' : 'الفريق الثاني');
  const color = currentTurn === 'green' ? '#22c55e' : '#f97316';
  indEl.innerHTML = `<span class="turn-dot" style="background:${color}"></span><span>دور: ${label}</span>`;
  // Pulse the active team button
  document.getElementById('btn-g').classList.toggle('turn-pulse', currentTurn === 'green');
  document.getElementById('btn-o').classList.toggle('turn-pulse', currentTurn === 'orange');
}

// ── Move history ───────────────────────────────────────
function renderHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;
  if (!moveHistory.length) {
    el.innerHTML = '<div class="hist-empty">لا توجد حركات بعد</div>';
    return;
  }
  el.innerHTML = moveHistory.map(m => {
    const col  = m.team === 'green' ? '#22c55e' : '#f97316';
    const icon = m.team === 'green' ? '🟢' : '🟠';
    return `<div class="hist-item">
      <span class="hist-num" style="color:${col}">#${m.num}</span>
      <span class="hist-icon">${icon}</span>
      <span class="hist-letter">${m.letter}</span>
    </div>`;
  }).join('');
}

// ── Names & score ──────────────────────────────────────
function syncNames() {
  names.green  = document.getElementById('name-g').value.trim() || 'الفريق الأول';
  names.orange = document.getElementById('name-o').value.trim() || 'الفريق الثاني';
  document.getElementById('lbl-g').textContent = names.green;
  document.getElementById('lbl-o').textContent = names.orange;
  document.getElementById('sn-g').textContent  = names.green;
  document.getElementById('sn-o').textContent  = names.orange;
  updateTurnIndicator();
}

function updateScore() {
  document.getElementById('sv-g').textContent = wins.green;
  document.getElementById('sv-o').textContent = wins.orange;
}

// ── Dark / Light mode ──────────────────────────────────
function toggleTheme() {
  isDark = !isDark;
  applyTheme();
  draw();
}

function applyTheme() {
  const T = theme();
  const side = document.getElementById('side');
  const root = document.documentElement;

  // CSS variables that drive the side panel
  root.style.setProperty('--side-bg',          T.sideBg);
  root.style.setProperty('--side-text',        T.sideText);
  root.style.setProperty('--side-sub',         T.sideSubText);
  root.style.setProperty('--score-bg',         T.scoreBg);
  root.style.setProperty('--input-bg',         T.inputBg);
  root.style.setProperty('--input-border',     T.inputBorder);
  root.style.setProperty('--input-text',       T.inputText);
  root.style.setProperty('--btn-bg',           T.btnBg);
  root.style.setProperty('--btn-border',       T.btnBorder);
  root.style.setProperty('--btn-active-bg',    T.btnActiveBg);
  root.style.setProperty('--ctrl-w-bg',        T.ctrlWhiteBg);
  root.style.setProperty('--ctrl-w-text',      T.ctrlWhiteText);
  root.style.setProperty('--ctrl-d-bg',        T.ctrlDarkBg);
  root.style.setProperty('--ctrl-d-text',      T.ctrlDarkText);
  root.style.setProperty('--hist-bg',          T.histBg);
  root.style.setProperty('--hist-text',        T.histText);
  root.style.setProperty('--hist-sub',         T.histSub);
  root.style.setProperty('--divider',          T.divider);

  // Theme toggle button label
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// ── Collapse side panel ────────────────────────────────
function toggleSide() {
  sideCollapsed = !sideCollapsed;
  const side = document.getElementById('side');
  const btn  = document.getElementById('collapse-btn');
  side.classList.toggle('collapsed', sideCollapsed);
  if (btn) btn.textContent = sideCollapsed ? '◀' : '▶';
  // give layout time to settle then redraw
  setTimeout(resize, 320);
}

// ── Overlays ───────────────────────────────────────────
const RN = ['','الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة'];

function showRoundWin(team) {
  const col = team==='green' ? '#22c55e' : '#f97316';
  document.getElementById('ov-r-e').textContent = team==='green' ? '🟢' : '🟠';
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
  document.getElementById('rname').textContent = RN[rNum]||rNum;
  build(); clearSt();
}

function newRound() {
  document.getElementById('ov-r').classList.remove('show');
  rNum++;
  document.getElementById('rname').textContent = RN[rNum]||rNum;
  build(); clearSt();
}

function newGame() {
  ['ov-r','ov-g'].forEach(id => document.getElementById(id).classList.remove('show'));
  rNum = 1; wins = { green:0, orange:0 };
  document.getElementById('rname').textContent = 'الأولى';
  updateScore(); build(); clearSt();
}

// ── Confetti ───────────────────────────────────────────
function spawnConfetti() {
  const wrap = document.getElementById('cf'); wrap.innerHTML = '';
  const cols = ['#f9e000','#22c55e','#f97316','#fff','#e879f9','#38bdf8','#f43f5e'];
  for (let i = 0; i < 110; i++) {
    const el = document.createElement('div'); el.className = 'cf';
    const sz = 5 + Math.random()*11;
    el.style.cssText = `left:${Math.random()*100}vw;width:${sz}px;height:${sz}px;
      background:${cols[Math.floor(Math.random()*cols.length)]};
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-duration:${1.6+Math.random()*2.4}s;
      animation-delay:${Math.random()*1.5}s;
      opacity:${.7+Math.random()*.3};`;
    wrap.appendChild(el);
  }
  setTimeout(() => wrap.innerHTML='', 6500);
}

// ── Init ───────────────────────────────────────────────
build();
syncNames();
applyTheme();
window.addEventListener('resize', resize);
document.fonts.ready.then(() => resize());
resize();
