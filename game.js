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
let isDark = true;
let sideCollapsed = false;

const cv  = document.getElementById('c');
const ctx = cv.getContext('2d');
let R = 60, GX = 0, GY = 0;

// ═══════════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════════
function theme() {
  return isDark ? {
    sideBg:        '#5427a0',
    sideText:      '#ffffff',
    sideSub:       'rgba(255,255,255,0.6)',
    scoreBg:       'rgba(0,0,0,0.2)',
    inputBg:       'rgba(255,255,255,0.1)',
    inputBorder:   'rgba(255,255,255,0.18)',
    inputText:     '#ffffff',
    btnBg:         'rgba(0,0,0,0.18)',
    btnBorder:     'rgba(255,255,255,0.16)',
    btnActiveBg:   'rgba(255,255,255,0.28)',
    ctrlWBg:       'rgba(255,255,255,0.9)',
    ctrlWText:     '#333333',
    ctrlDBg:       'rgba(0,0,0,0.28)',
    ctrlDText:     '#ffffff',
    histBg:        'rgba(0,0,0,0.18)',
    histText:      'rgba(255,255,255,0.9)',
    histSub:       'rgba(255,255,255,0.4)',
    divider:       'rgba(255,255,255,0.12)',
    hexEmpty:      '#ffffff',
    hexBorder:     '#4c1d95',
    hexLetter:     '#5b21b6',
    hexOutline:    '#ffffff',
    canvasBase:    '#0f0a1e',
    bodyBg:        '#111111',
  } : {
    sideBg:        '#ede7fb',
    sideText:      '#1a0a3a',
    sideSub:       'rgba(0,0,0,0.45)',
    scoreBg:       'rgba(0,0,0,0.07)',
    inputBg:       'rgba(255,255,255,0.8)',
    inputBorder:   'rgba(100,50,200,0.3)',
    inputText:     '#1a0a3a',
    btnBg:         'rgba(255,255,255,0.65)',
    btnBorder:     'rgba(100,50,200,0.25)',
    btnActiveBg:   'rgba(120,60,220,0.2)',
    ctrlWBg:       '#5427a0',
    ctrlWText:     '#ffffff',
    ctrlDBg:       'rgba(0,0,0,0.08)',
    ctrlDText:     '#1a0a3a',
    histBg:        'rgba(255,255,255,0.55)',
    histText:      '#1a0a3a',
    histSub:       'rgba(0,0,0,0.38)',
    divider:       'rgba(0,0,0,0.1)',
    hexEmpty:      '#ffffff',
    hexBorder:     '#6d28d9',
    hexLetter:     '#3b0764',
    hexOutline:    '#ffffff',
    canvasBase:    '#c9baf0',
    bodyBg:        '#f0ebff',
  };
}

function applyTheme() {
  const T = theme();
  const root = document.documentElement;
  root.style.setProperty('--side-bg',       T.sideBg);
  root.style.setProperty('--side-text',     T.sideText);
  root.style.setProperty('--side-sub',      T.sideSub);
  root.style.setProperty('--score-bg',      T.scoreBg);
  root.style.setProperty('--input-bg',      T.inputBg);
  root.style.setProperty('--input-border',  T.inputBorder);
  root.style.setProperty('--input-text',    T.inputText);
  root.style.setProperty('--btn-bg',        T.btnBg);
  root.style.setProperty('--btn-border',    T.btnBorder);
  root.style.setProperty('--btn-active-bg', T.btnActiveBg);
  root.style.setProperty('--ctrl-w-bg',     T.ctrlWBg);
  root.style.setProperty('--ctrl-w-text',   T.ctrlWText);
  root.style.setProperty('--ctrl-d-bg',     T.ctrlDBg);
  root.style.setProperty('--ctrl-d-text',   T.ctrlDText);
  root.style.setProperty('--hist-bg',       T.histBg);
  root.style.setProperty('--hist-text',     T.histText);
  root.style.setProperty('--hist-sub',      T.histSub);
  root.style.setProperty('--divider',       T.divider);
  root.style.setProperty('--body-bg',       T.bodyBg);

  // Update body background
  document.body.style.background = T.bodyBg;

  // Update theme button icon
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

function toggleTheme() {
  isDark = !isDark;
  applyTheme();
  draw();
}

// ═══════════════════════════════════════════════════════
//  AUDIO
//  Rules:
//   1. Create AudioContext lazily on first user gesture
//   2. Always await resume() before scheduling any nodes
//      (browsers suspend the context until a gesture fires)
// ═══════════════════════════════════════════════════════
let ac = null;

// Call this inside every click/touch handler BEFORE playing sound.
// Returns a Promise that resolves once the context is running.
function unlockAudio() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return Promise.resolve(null);
  if (!ac) ac = new Ctor();
  if (ac.state === 'running') return Promise.resolve(ac);
  return ac.resume().then(() => ac);
}

function playClick(team) {
  unlockAudio().then(a => {
    if (!a) return;
    try {
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = 'sine';
      const now = a.currentTime;
      o.frequency.setValueAtTime(team === 'green' ? 520 : 400, now);
      o.frequency.exponentialRampToValueAtTime(team === 'green' ? 800 : 620, now + 0.1);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      o.start(now); o.stop(now + 0.22);
    } catch(e) {}
  });
}

function playWin() {
  unlockAudio().then(a => {
    if (!a) return;
    try {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.connect(g); g.connect(a.destination);
        o.type = 'triangle'; o.frequency.value = freq;
        const t = a.currentTime + i * 0.14;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.26, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        o.start(t); o.stop(t + 0.45);
      });
    } catch(e) {}
  });
}

// Soft "tick" when a cell is highlighted yellow
function playSelectSound() {
  unlockAudio().then(a => {
    if (!a) return;
    try {
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(900, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(1100, a.currentTime + 0.06);
      g.gain.setValueAtTime(0.1, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.1);
      o.start(a.currentTime); o.stop(a.currentTime + 0.1);
    } catch(e) {}
  });
}

// Soft "pop" when a cell is cleared back to unowned
function playUnselectSound() {
  unlockAudio().then(a => {
    if (!a) return;
    try {
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(500, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(250, a.currentTime + 0.12);
      g.gain.setValueAtTime(0.12, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.15);
      o.start(a.currentTime); o.stop(a.currentTime + 0.15);
    } catch(e) {}
  });
}

// ═══════════════════════════════════════════════════════
//  GEOMETRY
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
//  WIN CHECK
// ═══════════════════════════════════════════════════════
function won(team) {
  const owned = new Set(cells.filter(cl => cl.owner === team).map(cl => cl.id));
  if (team === 'green') {
    const st = cells.filter(cl => cl.row===0      && cl.owner==='green').map(cl=>cl.id);
    const tg = new Set(cells.filter(cl => cl.row===ROWS-1 && cl.owner==='green').map(cl=>cl.id));
    return bfs(st, tg, owned);
  } else {
    const st = cells.filter(cl => cl.col===0      && cl.owner==='orange').map(cl=>cl.id);
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

// ═══════════════════════════════════════════════════════
//  HIT TEST
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
//  BUILD
// ═══════════════════════════════════════════════════════
function build() {
  const pool = [...ALL_LETTERS].sort(()=>Math.random()-.5).slice(0, ROWS*COLS);
  pool.sort(()=>Math.random()-.5);
  cells = []; let i = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      cells.push({id:`${r}_${c}`, row:r, col:c, letter:pool[i++], owner:null});
  moveHistory = []; moveNum = 0; currentTurn = 'green';
  // Defer DOM updates — called after DOMContentLoaded
  setTimeout(() => { renderHistory(); updateTurnIndicator(); }, 0);
}

// ═══════════════════════════════════════════════════════
//  BACKGROUND
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
//  DRAW
// ═══════════════════════════════════════════════════════
function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  drawBackground();
  const T = theme();

  cells.forEach(cell => {
    const {x,y} = cxy(cell.row, cell.col);
    const isSel  = selId === cell.id;
    // isHov: hovering over this cell
    const isHov  = hovId === cell.id;
    const BORDER = R * 0.13;

    // What will the next click do? (used for fill preview)
    const nextStep = !pendingTeam && isHov ? (
        (!cell.owner && !isSel)            ? 'select'
      : (isSel && !cell.owner)             ? 'green'
      : cell.owner === 'green'             ? 'orange'
      : cell.owner === 'orange'            ? 'clear'
      : null
    ) : null;

    // ── Outer border ring ──
    const outerC = pointyCorners(x, y, R);
    ctx.beginPath(); ctx.moveTo(...outerC[0]);
    for (let i = 1; i < 6; i++) ctx.lineTo(...outerC[i]);
    ctx.closePath();
    ctx.fillStyle = cell.owner==='green'  ? '#14532d'
                  : cell.owner==='orange' ? '#7c2d12'
                  : T.hexBorder;
    ctx.fill();

    // ── Inner fill ──
    const innerC = pointyCorners(x, y, R - BORDER);
    ctx.beginPath(); ctx.moveTo(...innerC[0]);
    for (let i = 1; i < 6; i++) ctx.lineTo(...innerC[i]);
    ctx.closePath();
    let fill;
    if      (cell.owner==='green')  fill = '#4ade80';
    else if (cell.owner==='orange') fill = '#fb923c';
    else if (isSel)                 fill = '#fde047';
    else if (pendingTeam && isHov)
      fill = pendingTeam==='green'  ? '#bbf7d0'
           : pendingTeam==='orange' ? '#fed7aa' : '#f5f3ff';
    // Cycle hover previews
    else if (nextStep === 'select')  fill = '#fffde7'; // soft yellow tint
    else if (nextStep === 'green')   fill = '#bbf7d0'; // green tint on selected
    else if (nextStep === 'orange')  fill = '#fed7aa'; // orange tint on green
    else if (nextStep === 'clear')   fill = '#ffe4e4'; // red tint on orange
    else fill = T.hexEmpty;
    ctx.fillStyle = fill; ctx.fill();

    // ── Small colored indicator dot (top-right corner of hovered cell) ──
    if (nextStep && !pendingTeam) {
      const dotColor =
          nextStep === 'select'  ? '#fde047'
        : nextStep === 'green'   ? '#22c55e'
        : nextStep === 'orange'  ? '#f97316'
        : '#ef4444'; // clear = red
      // Subtle animated ring around the whole hex
      ctx.beginPath(); ctx.moveTo(...outerC[0]);
      for (let i = 1; i < 6; i++) ctx.lineTo(...outerC[i]);
      ctx.closePath();
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = R * 0.06;
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Small filled circle in the upper-right corner
      const bx = x + R * 0.5;
      const by = y - R * 0.55;
      const br = R * 0.13;
      ctx.beginPath();
      ctx.arc(bx, by, br + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }

    // ── Letter with outline ──
    const fs = Math.round(R * 0.52);
    ctx.font = `900 ${fs}px Cairo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    const tx = x, ty = y + fs * 0.04;

    if (cell.owner) {
      // Owned cell: white letter with dark outline
      ctx.lineWidth = R * 0.09;
      ctx.strokeStyle = cell.owner==='green' ? '#14532d' : '#7c2d12';
      ctx.lineJoin = 'round';
      ctx.strokeText(cell.letter, tx, ty);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(cell.letter, tx, ty);
    } else {
      // Unowned: dark purple letter with white/light outline
      ctx.lineWidth = R * 0.07;
      ctx.strokeStyle = T.hexOutline;
      ctx.lineJoin = 'round';
      ctx.strokeText(cell.letter, tx, ty);
      ctx.fillStyle = T.hexLetter;
      ctx.fillText(cell.letter, tx, ty);
    }
  });
}

// ═══════════════════════════════════════════════════════
//  RESIZE
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
//  INPUT EVENTS
// ═══════════════════════════════════════════════════════
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
  cv.title = '';
});
cv.addEventListener('mouseleave', () => { hovId = null; draw(); });
cv.addEventListener('click', e => {
  unlockAudio(); // pre-warm on first click
  const {px,py} = sxy(e), cell = cellAt(px,py);
  if (!cell) return; onCell(cell.id);
});
cv.addEventListener('touchend', e => {
  e.preventDefault();
  unlockAudio();
  const {px,py} = sxy(e), cell = cellAt(px,py);
  if (!cell) return; onCell(cell.id);
}, { passive:false });

// ═══════════════════════════════════════════════════════
//  GAME LOGIC
// ═══════════════════════════════════════════════════════
function pickTeam(t) {
  unlockAudio();
  pendingTeam = t;
  document.getElementById('btn-g').classList.toggle('active', t==='green');
  document.getElementById('btn-o').classList.toggle('active', t==='orange');
  document.getElementById('chk-g').className = 'chk' + (t==='green'  ? ' g' : '');
  document.getElementById('chk-o').className = 'chk' + (t==='orange' ? ' o' : '');
  if (selId) { doAssign(selId, t); clearSt(); } else draw();
}

function onCell(id) {
  // If a team is already pending from the side buttons, honour that first
  if (pendingTeam) { doAssign(id, pendingTeam); clearSt(); return; }

  const cell = cells.find(c => c.id === id);
  if (!cell) return;

  // ── Click-cycle ──────────────────────────────────────
  //  unowned & unselected  → select (yellow highlight)
  //  selected (yellow)     → assign GREEN
  //  green                 → assign ORANGE
  //  orange                → clear back to unowned
  // ────────────────────────────────────────────────────
  if (!cell.owner && selId !== id) {
    // Step 1: select / highlight yellow
    selId = id;
    playSelectSound();
    draw();
  } else if (selId === id && !cell.owner) {
    // Step 2: assign GREEN
    selId = null;
    doAssign(id, 'green');
  } else if (cell.owner === 'green') {
    // Step 3: assign ORANGE
    doAssign(id, 'orange');
  } else if (cell.owner === 'orange') {
    // Step 4: clear back to unowned — log it
    const letter = cell.letter;
    cell.owner = null;
    playUnselectSound();
    // Log the clear to history
    moveHistory.unshift({ team: 'clear', letter, num: '—', action: 'clear' });
    if (moveHistory.length > 6) moveHistory.pop();
    renderHistory();
    draw();
  }
}

function doAssign(id, team) {
  const cell = cells.find(c => c.id === id);
  if (!cell) { clearSt(); draw(); return; }
  const wasOwned = cell.owner;
  cell.owner = team;

  playClick(team);

  if (!wasOwned) {
    // Fresh claim — advance turn
    moveNum++;
    moveHistory.unshift({ team, letter: cell.letter, num: moveNum, action: 'claim' });
    if (moveHistory.length > 6) moveHistory.pop();
    currentTurn = team === 'green' ? 'orange' : 'green';
    updateTurnIndicator();
  } else if (wasOwned !== team) {
    // Reassignment — same move number, just changed owner
    moveHistory.unshift({ team, letter: cell.letter, num: '↺', action: 'change', from: wasOwned });
    if (moveHistory.length > 6) moveHistory.pop();
  }
  renderHistory();
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

// ═══════════════════════════════════════════════════════
//  TURN INDICATOR
// ═══════════════════════════════════════════════════════
function updateTurnIndicator() {
  const el = document.getElementById('turn-indicator');
  if (!el) return;
  const label = names[currentTurn];
  const color = currentTurn === 'green' ? '#22c55e' : '#f97316';
  el.innerHTML = `<span class="turn-dot" style="background:${color};box-shadow:0 0 7px 2px ${color}88"></span><span>دور: ${label}</span>`;
  document.getElementById('btn-g').classList.toggle('turn-pulse', currentTurn==='green');
  document.getElementById('btn-o').classList.toggle('turn-pulse', currentTurn==='orange');
}

// ═══════════════════════════════════════════════════════
//  MOVE HISTORY
// ═══════════════════════════════════════════════════════
function renderHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;
  if (!moveHistory.length) {
    el.innerHTML = '<div class="hist-empty">لا توجد حركات بعد</div>';
    return;
  }
  el.innerHTML = moveHistory.map(m => {
    if (m.action === 'clear') {
      return `<div class="hist-item hist-clear">
        <span class="hist-dot" style="background:#ef4444"></span>
        <span class="hist-letter hist-letter-muted">${m.letter}</span>
        <span class="hist-action-label" style="color:#ef4444">حُذف</span>
      </div>`;
    }
    if (m.action === 'change') {
      const toColor = m.team === 'green' ? '#22c55e' : '#f97316';
      const frColor = m.from  === 'green' ? '#22c55e' : '#f97316';
      return `<div class="hist-item">
        <span class="hist-num" style="color:${toColor}">${m.num}</span>
        <span class="hist-dot-mini" style="background:${frColor}"></span>
        <span class="hist-arrow">→</span>
        <span class="hist-dot-mini" style="background:${toColor}"></span>
        <span class="hist-letter">${m.letter}</span>
      </div>`;
    }
    // Normal claim
    const color = m.team === 'green' ? '#22c55e' : '#f97316';
    const teamShort = m.team === 'green' ? names.green : names.orange;
    return `<div class="hist-item">
      <span class="hist-num" style="color:${color}">#${m.num}</span>
      <span class="hist-dot" style="background:${color}"></span>
      <span class="hist-letter">${m.letter}</span>
      <span class="hist-team-name" style="color:${color}">${teamShort}</span>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
//  NAMES & SCORE
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
//  SIDE PANEL COLLAPSE
// ═══════════════════════════════════════════════════════
function toggleSide() {
  sideCollapsed = !sideCollapsed;
  const side = document.getElementById('side');
  const btn  = document.getElementById('collapse-btn');
  side.classList.toggle('collapsed', sideCollapsed);
  if (btn) btn.textContent = sideCollapsed ? '◀' : '▶';
  setTimeout(resize, 320);
}

// ═══════════════════════════════════════════════════════
//  OVERLAYS
// ═══════════════════════════════════════════════════════
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
  const label = RN[rNum] || rNum;
  document.getElementById('rname').textContent = label;
  showRoundTransition(label, () => { build(); clearSt(); });
}

function newRound() {
  document.getElementById('ov-r').classList.remove('show');
  rNum++;
  const label = RN[rNum] || rNum;
  document.getElementById('rname').textContent = label;
  showRoundTransition(label, () => { build(); clearSt(); });
}

function newGame() {
  ['ov-r','ov-g'].forEach(id => document.getElementById(id).classList.remove('show'));
  rNum = 1; wins = { green:0, orange:0 };
  document.getElementById('rname').textContent = 'الأولى';
  updateScore(); build(); clearSt();
}

// ═══════════════════════════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════════════════════════
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

// INIT is handled by the menu's DOMContentLoaded below

// ═══════════════════════════════════════════════════════
//  LOGO CANVAS — draws animated 3D-style Arabic title
// ═══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════
//  CSS LOGO — updates the animated HTML logo elements
// ══════════════════════════════════════════════════
function onGameNameInput(val) {
  const v = val.trim();
  const w2 = document.getElementById('logo-w2');
  const w3 = document.getElementById('logo-w3');
  const ver = document.getElementById('menu-version');

  if (!v) {
    // Default: "لعبة" + "الخلية"
    if (w2) w2.textContent = 'الخلية';
    if (w3) { w3.textContent = ''; w3.classList.remove('visible'); }
    if (ver) ver.textContent = 'v2.0 — لعبة الخلية';
  } else {
    // Custom: "لعبة" + "خلية" + name
    if (w2) w2.textContent = 'خلية';
    if (w3) { w3.textContent = v; w3.classList.add('visible'); }
    if (ver) ver.textContent = `v2.0 — لعبة خلية ${v}`;
  }

  // Also update sidebar mini-logo when in game
  const sl = document.getElementById('side-logo-w2');
  if (sl) sl.textContent = v ? `خلية ${v}` : 'الخلية';
}

// ═══════════════════════════════════════════════════════
//  MENU BACKGROUND CANVAS — rich purple hex grid
// ═══════════════════════════════════════════════════════
let menuAnimId = null;
let howtoOpen  = false;

function initMenuCanvas() {
  const mc = document.getElementById('menu-canvas');
  if (!mc) return;
  const mctx = mc.getContext('2d');
  let W, H, hexes = [];

  function resizeMenu() {
    W = mc.width  = window.innerWidth;
    H = mc.height = window.innerHeight;
    buildMenuHexes();
  }

  function buildMenuHexes() {
    hexes = [];
    // Large flat-top hexes matching the reference image
    const r  = Math.max(40, Math.min(W, H) * 0.08);
    const DX = 1.5 * r;
    const DY = Math.sqrt(3) * r;
    const cols = Math.ceil(W / DX) + 3;
    const rows = Math.ceil(H / DY) + 3;
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        hexes.push({
          x:     col * DX,
          y:     row * DY + (col % 2 === 1 ? DY / 2 : 0),
          r,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.5,
          // Each hex optionally shows a random Arabic letter
          letter: Math.random() > 0.45
            ? ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)]
            : null,
          scale: 0.85 + Math.random() * 0.3,
        });
      }
    }
  }

  function drawMenuFrame() {
    mctx.clearRect(0, 0, W, H);

    // Rich purple gradient base — matches reference
    const grad = mctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.4, Math.max(W,H)*0.75);
    grad.addColorStop(0,   '#7c35c5');
    grad.addColorStop(0.5, '#5b1fa0');
    grad.addColorStop(1,   '#3a0d6e');
    mctx.fillStyle = grad;
    mctx.fillRect(0, 0, W, H);

    const now = performance.now() * 0.001;

    hexes.forEach(h => {
      const pulse = 0.5 + 0.5 * Math.sin(now * h.speed + h.phase);
      const alpha = 0.06 + pulse * 0.12;

      // Flat-top corners
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return [h.x + h.r * Math.cos(a), h.y + h.r * Math.sin(a)];
      });

      // Hex fill — subtle light purple like reference
      mctx.beginPath();
      mctx.moveTo(...pts[0]);
      for (let i = 1; i < 6; i++) mctx.lineTo(...pts[i]);
      mctx.closePath();
      mctx.fillStyle   = `rgba(180,140,255,${alpha * 0.6})`;
      mctx.fill();

      // Hex border — more visible
      mctx.strokeStyle = `rgba(200,160,255,${alpha * 1.8})`;
      mctx.lineWidth   = 1.5;
      mctx.stroke();

      // Inner hex (smaller, for depth)
      const rInner = h.r * 0.78;
      mctx.beginPath();
      Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        const px = h.x + rInner * Math.cos(a);
        const py = h.y + rInner * Math.sin(a);
        i === 0 ? mctx.moveTo(px, py) : mctx.lineTo(px, py);
      });
      mctx.closePath();
      mctx.strokeStyle = `rgba(220,180,255,${alpha * 0.9})`;
      mctx.lineWidth   = 0.6;
      mctx.stroke();

      // Arabic letter inside hex
      if (h.letter) {
        const fs = Math.round(h.r * 0.52 * h.scale);
        mctx.font = `700 ${fs}px Cairo, sans-serif`;
        mctx.textAlign = 'center';
        mctx.textBaseline = 'middle';
        mctx.fillStyle = `rgba(220,190,255,${alpha * 1.4})`;
        mctx.fillText(h.letter, h.x, h.y);
      }
    });

    menuAnimId = requestAnimationFrame(drawMenuFrame);
  }

  window.addEventListener('resize', resizeMenu);
  resizeMenu();
  drawMenuFrame();
}

function stopMenuCanvas() {
  if (menuAnimId) { cancelAnimationFrame(menuAnimId); menuAnimId = null; }
}

// ── Toggle how-to-play ─────────────────────────────────
function toggleHowto() {
  howtoOpen = !howtoOpen;
  document.getElementById('howto-body').classList.toggle('open', howtoOpen);
  document.getElementById('howto-arrow').textContent = howtoOpen ? '▲' : '▼';
}

// ── Start game from menu ───────────────────────────────
function startGame() {
  unlockAudio();
  const gName    = document.getElementById('menu-name-g').value.trim() || 'الفريق الأول';
  const oName    = document.getElementById('menu-name-o').value.trim() || 'الفريق الثاني';
  const rawInput = document.getElementById('game-name-input').value.trim();
  const gameName = rawInput ? `لعبة خلية ${rawInput}` : 'لعبة الخلية';

  document.getElementById('name-g').value = gName;
  document.getElementById('name-o').value = oName;
  document.title = gameName;

  // Update sidebar mini-logo
  const sl = document.getElementById('side-logo-w2');
  if (sl) sl.textContent = rawInput ? `خلية ${rawInput}` : 'الخلية';

  const menuEl = document.getElementById('main-menu');
  const gameEl = document.getElementById('game-screen');
  gameEl.classList.remove('hidden');
  gameEl.offsetHeight;
  gameEl.classList.add('visible');
  menuEl.classList.add('fade-out');

  setTimeout(() => { menuEl.style.display = 'none'; stopMenuCanvas(); }, 500);

  syncNames(); build(); applyTheme(); updateTurnIndicator(); renderHistory();
  window.addEventListener('resize', resize);
  document.fonts.ready.then(() => resize());
  resize();
}

// ── Return to menu ─────────────────────────────────────
function goToMenu() {
  const menuEl = document.getElementById('main-menu');
  const gameEl = document.getElementById('game-screen');
  menuEl.style.display = '';
  menuEl.classList.remove('fade-out');
  gameEl.classList.remove('visible');
  setTimeout(() => { gameEl.classList.add('hidden'); }, 500);
  initMenuCanvas();
  const mb = document.getElementById('menu-theme-btn');
  if (mb) mb.textContent = isDark ? '☀️' : '🌙';
}

// ── Single init — show menu, don't boot game yet ──────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  initMenuCanvas();
  // Sync menu theme button
  const mb = document.getElementById('menu-theme-btn');
  if (mb) mb.textContent = isDark ? '☀️' : '🌙';
});

// Patch applyTheme to also sync both theme buttons
const _baseApplyTheme = applyTheme;
applyTheme = function() {
  _baseApplyTheme();
  const mb = document.getElementById('menu-theme-btn');
  if (mb) mb.textContent = isDark ? '☀️' : '🌙';
  const tb = document.getElementById('theme-btn');
  if (tb) tb.textContent = isDark ? '☀️' : '🌙';
};

// ═══════════════════════════════════════════════════════
//  ROUND TRANSITION ANIMATION
//  Full-screen cinematic that plays between rounds
// ═══════════════════════════════════════════════════════

function showRoundTransition(roundName, onDone) {
  // Remove any existing transition
  const old = document.getElementById('round-transition');
  if (old) old.remove();

  const el = document.createElement('div');
  el.id = 'round-transition';
  el.innerHTML = `
    <div class="rt-bg"></div>
    <div class="rt-hexes" id="rt-hexes"></div>
    <div class="rt-content">
      <div class="rt-label" id="rt-label">الجولة</div>
      <div class="rt-number" id="rt-number">${roundName}</div>
      <div class="rt-dots">
        <span class="rt-dot"></span>
        <span class="rt-dot"></span>
        <span class="rt-dot"></span>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  // Spawn floating hex decorations
  const hexWrap = el.querySelector('#rt-hexes');
  const hexChars = ['⬡','⬢','⬡','⬢','⬡'];
  for (let i = 0; i < 18; i++) {
    const h = document.createElement('span');
    h.className = 'rt-hex-deco';
    h.textContent = hexChars[i % hexChars.length];
    h.style.cssText = `
      left:${Math.random()*100}vw;
      top:${Math.random()*100}vh;
      font-size:${1.5 + Math.random()*4}rem;
      animation-delay:${Math.random()*0.4}s;
      animation-duration:${0.6 + Math.random()*0.5}s;
      opacity:0;
      color:${['#f9e000','#a855f7','rgba(255,255,255,0.18)','#fb923c'][i%4]};
    `;
    hexWrap.appendChild(h);
  }

  // Play a rising "whoosh" sound
  unlockAudio().then(a => {
    if (!a) return;
    try {
      // Deep boom
      const o1 = a.createOscillator(), g1 = a.createGain();
      o1.connect(g1); g1.connect(a.destination);
      o1.type = 'sine';
      o1.frequency.setValueAtTime(80, a.currentTime);
      o1.frequency.exponentialRampToValueAtTime(200, a.currentTime + 0.3);
      g1.gain.setValueAtTime(0.35, a.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.5);
      o1.start(a.currentTime); o1.stop(a.currentTime + 0.5);

      // Rising whoosh
      const o2 = a.createOscillator(), g2 = a.createGain();
      o2.connect(g2); g2.connect(a.destination);
      o2.type = 'sawtooth';
      o2.frequency.setValueAtTime(200, a.currentTime + 0.1);
      o2.frequency.exponentialRampToValueAtTime(900, a.currentTime + 0.55);
      g2.gain.setValueAtTime(0.08, a.currentTime + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.55);
      o2.start(a.currentTime + 0.1); o2.stop(a.currentTime + 0.55);

      // Sparkle ting
      [1200, 1500, 1800].forEach((f, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.connect(g); g.connect(a.destination);
        o.type = 'sine'; o.frequency.value = f;
        const t = a.currentTime + 0.3 + i * 0.08;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.start(t); o.stop(t + 0.25);
      });
    } catch(e) {}
  });

  // Auto-dismiss after 2.4s then call onDone
  setTimeout(() => {
    el.classList.add('rt-exit');
    setTimeout(() => { el.remove(); onDone(); }, 600);
  }, 2200);
}

// ═══════════════════════════════════════════════════════
//  WINNER CINEMATIC ANIMATION
// ═══════════════════════════════════════════════════════

function showWinnerTransition(team, onDone) {
  const old = document.getElementById('winner-transition');
  if (old) old.remove();

  const isGreen   = team === 'green';
  const teamName  = names[team];
  const teamColor = isGreen ? '#22c55e' : '#f97316';
  const teamShadow= isGreen ? '#064e1e' : '#7c2d00';
  const bgGrad    = isGreen
    ? 'linear-gradient(145deg,#052e16,#14532d,#166534,#052e16)'
    : 'linear-gradient(145deg,#431407,#7c2d12,#9a3412,#431407)';
  const emoji     = isGreen ? '🟢' : '🟠';

  const el = document.createElement('div');
  el.id = 'winner-transition';
  el.innerHTML = `
    <div class="wt-bg" style="background:${bgGrad}"></div>
    <div class="wt-rays"></div>
    <div class="wt-particles" id="wt-particles"></div>
    <div class="wt-content">
      <div class="wt-trophy">🏆</div>
      <div class="wt-congrats">مبروك الفوز</div>
      <div class="wt-team-name" style="color:${teamColor};text-shadow:4px 4px 0 ${teamShadow},0 0 50px ${teamColor}99">
        ${emoji} ${teamName} ${emoji}
      </div>
      <div class="wt-sub">حسم البطولة بجولتين!</div>
      <div class="wt-stars">
        <span class="wt-star" style="animation-delay:0.6s">⭐</span>
        <span class="wt-star" style="animation-delay:0.75s;font-size:2.8rem">⭐</span>
        <span class="wt-star" style="animation-delay:0.9s">⭐</span>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  // Spawn flying star/hex particles
  const pw = el.querySelector('#wt-particles');
  const symbols = ['⭐','✨','⬡','🏅','💫','⬢'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('span');
    p.className = 'wt-particle';
    p.textContent = symbols[i % symbols.length];
    p.style.cssText = `
      left:${Math.random()*100}vw;
      top:${80 + Math.random()*30}vh;
      font-size:${1 + Math.random()*2.5}rem;
      animation-delay:${0.2 + Math.random()*0.8}s;
      animation-duration:${1.2 + Math.random()*1.2}s;
      color:${[teamColor,'#f9e000','#ffffff','#e879f9'][i%4]};
    `;
    pw.appendChild(p);
  }

  // Epic win fanfare
  unlockAudio().then(a => {
    if (!a) return;
    try {
      // Big bass impact
      const ob = a.createOscillator(), gb = a.createGain();
      ob.connect(gb); gb.connect(a.destination);
      ob.type = 'sine';
      ob.frequency.setValueAtTime(60, a.currentTime);
      ob.frequency.exponentialRampToValueAtTime(120, a.currentTime + 0.2);
      gb.gain.setValueAtTime(0.5, a.currentTime);
      gb.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.6);
      ob.start(a.currentTime); ob.stop(a.currentTime + 0.6);

      // Victory fanfare — rising arpeggio
      const fanfare = isGreen
        ? [392, 523, 659, 784, 1047, 1319]
        : [349, 440, 587, 698, 932, 1175];
      fanfare.forEach((freq, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.connect(g); g.connect(a.destination);
        o.type = i < 3 ? 'triangle' : 'sine';
        o.frequency.value = freq;
        const t = a.currentTime + 0.1 + i * 0.11;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.28, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.start(t); o.stop(t + 0.5);
      });

      // Final sustain chord
      [523, 659, 784].forEach((freq, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.connect(g); g.connect(a.destination);
        o.type = 'sine'; o.frequency.value = freq;
        const t = a.currentTime + 0.85;
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        o.start(t); o.stop(t + 1.2);
      });
    } catch(e) {}
  });

  // Spawn confetti on top
  spawnConfetti();

  // Auto-dismiss after 4s, then show normal win overlay
  setTimeout(() => {
    el.classList.add('wt-exit');
    setTimeout(() => {
      el.remove();
      if (onDone) onDone();
    }, 700);
  }, 4000);
}

// ═══════════════════════════════════════════════════════
//  PATCH showGameWin to use the cinematic first
// ═══════════════════════════════════════════════════════
const _origShowGameWin = showGameWin;
showGameWin = function(team) {
  showWinnerTransition(team, () => {
    _origShowGameWin(team);
  });
};

// ═══════════════════════════════════════════════════════
//  PATCH startGame to show "الجولة الأولى" intro first
// ═══════════════════════════════════════════════════════
const _origStartGame = startGame;
startGame = function() {
  _origStartGame();
  // Show round-1 intro after the screen transition settles
  setTimeout(() => {
    showRoundTransition('الأولى', () => { /* board already built */ });
  }, 600);
};
