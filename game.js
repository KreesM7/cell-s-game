// ═══════════════════════════════════════════════════════
//  لعبة الخلية — Pointy-top hexagons, 5×5
//  Team 1 (A): connects TOP row → BOTTOM row
//  Team 2 (B): connects LEFT col → RIGHT col
// ═══════════════════════════════════════════════════════

const ALL_LETTERS = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const ROWS = 5, COLS = 5;

let cells = [], selId = null, pendingTeam = null, hovId = null;
let wins = { green: 0, orange: 0 };
let rNum = 1;
let winsToWin = 2; // configurable — presenter sets this
let names  = { green: 'الفريق الأول', orange: 'الفريق الثاني' };
// Custom team colors — presenter picks these
let teamFill   = { green: '#4ade80', orange: '#fb923c' }; // inner hex fill
let teamBorder = { green: '#14532d', orange: '#7c2d12' }; // outer hex border
let teamZone   = { green: '#3dba4e', orange: '#f57c22' }; // background zone
let moveHistory = [];
let moveNum = 0;
let isDark = true;
let sideCollapsed = false;

const cv  = document.getElementById('c');
const ctx = cv.getContext('2d');
let R = 60, GX = 0, GY = 0;

// ═══════════════════════════════════════════════════════
//  THEME (side panel only — canvas uses teamColors)
// ═══════════════════════════════════════════════════════
function applyTheme() {
  const root = document.documentElement;
  // Side panel always deep purple regardless of light/dark
  root.style.setProperty('--body-bg',      '#5b1fa0');
  root.style.setProperty('--side-bg',      'linear-gradient(180deg,#4a1880 0%,#3d1268 100%)');
  root.style.setProperty('--side-text',    '#ffffff');
  root.style.setProperty('--side-sub',     'rgba(255,255,255,0.55)');
  root.style.setProperty('--score-bg',     'rgba(0,0,0,0.25)');
  root.style.setProperty('--input-bg',     'rgba(255,255,255,0.09)');
  root.style.setProperty('--input-border', 'rgba(255,255,255,0.18)');
  root.style.setProperty('--input-text',   '#ffffff');
  root.style.setProperty('--btn-bg',       'rgba(0,0,0,0.2)');
  root.style.setProperty('--btn-border',   'rgba(255,255,255,0.15)');
  root.style.setProperty('--btn-active-bg','rgba(255,255,255,0.25)');
  root.style.setProperty('--ctrl-w-bg',    'rgba(255,255,255,0.92)');
  root.style.setProperty('--ctrl-w-text',  '#3a0d6e');
  root.style.setProperty('--ctrl-d-bg',    'rgba(0,0,0,0.3)');
  root.style.setProperty('--ctrl-d-text',  '#ffffff');
  root.style.setProperty('--hist-bg',      'rgba(0,0,0,0.22)');
  root.style.setProperty('--hist-text',    'rgba(255,255,255,0.9)');
  root.style.setProperty('--hist-sub',     'rgba(255,255,255,0.38)');
  root.style.setProperty('--divider',      'rgba(255,255,255,0.12)');
  document.body.style.background = '#5b1fa0';
  // sync buttons
  const mb = document.getElementById('menu-theme-btn');
  if (mb) mb.textContent = isDark ? '☀️' : '🌙';
  const tb = document.getElementById('theme-btn');
  if (tb) tb.textContent = isDark ? '☀️' : '🌙';
  // Update team color dots in side panel
  applyTeamColors();
}

function toggleTheme() {
  isDark = !isDark;
  applyTheme();
  draw();
}

// Called whenever teamColors change — update all CSS + canvas tones
function applyTeamColors() {
  // Update score name colors
  const snG = document.getElementById('sn-g');
  const snO = document.getElementById('sn-o');
  if (snG) snG.style.color = teamFill.green;
  if (snO) snO.style.color = teamFill.orange;
  // Update team dots in side panel
  const dotG = document.querySelector('.team-dot-g');
  const dotO = document.querySelector('.team-dot-o');
  if (dotG) { dotG.style.background = teamFill.green;  dotG.style.boxShadow = `0 0 5px ${teamFill.green}99`; }
  if (dotO) { dotO.style.background = teamFill.orange; dotO.style.boxShadow = `0 0 5px ${teamFill.orange}99`; }
  // Menu preview dots
  const pg = document.getElementById('preview-color-g');
  const po = document.getElementById('preview-color-o');
  if (pg) pg.style.background = teamFill.green;
  if (po) po.style.background = teamFill.orange;
}

// ═══════════════════════════════════════════════════════
//  AUDIO
// ═══════════════════════════════════════════════════════
let ac = null;
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
      o.connect(g); g.connect(a.destination); o.type = 'sine';
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
      [523,659,784,1047].forEach((freq,i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.connect(g); g.connect(a.destination);
        o.type = 'triangle'; o.frequency.value = freq;
        const t = a.currentTime + i * 0.14;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.26, t+0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t+0.45);
        o.start(t); o.stop(t+0.45);
      });
    } catch(e) {}
  });
}
function playSelectSound() {
  unlockAudio().then(a => {
    if (!a) return;
    try {
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination); o.type = 'sine';
      o.frequency.setValueAtTime(900, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(1100, a.currentTime+0.06);
      g.gain.setValueAtTime(0.1, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+0.1);
      o.start(a.currentTime); o.stop(a.currentTime+0.1);
    } catch(e) {}
  });
}
function playUnselectSound() {
  unlockAudio().then(a => {
    if (!a) return;
    try {
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination); o.type = 'sine';
      o.frequency.setValueAtTime(500, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(250, a.currentTime+0.12);
      g.gain.setValueAtTime(0.12, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+0.15);
      o.start(a.currentTime); o.stop(a.currentTime+0.15);
    } catch(e) {}
  });
}

// ═══════════════════════════════════════════════════════
//  GEOMETRY
// ═══════════════════════════════════════════════════════
function cxy(row, col) {
  const DX = Math.sqrt(3)*R, DY = 1.5*R;
  return { x: GX + col*DX + (row%2===1 ? DX/2 : 0), y: GY + row*DY };
}
function pointyCorners(cx, cy, r) {
  return Array.from({length:6}, (_,i) => {
    const a = (Math.PI/3)*i + Math.PI/6;
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  });
}
function nbrs(r, c) {
  const odd = r%2===1;
  const nb = odd
    ? [[r-1,c],[r-1,c+1],[r,c-1],[r,c+1],[r+1,c],[r+1,c+1]]
    : [[r-1,c-1],[r-1,c],[r,c-1],[r,c+1],[r+1,c-1],[r+1,c]];
  return nb.filter(([nr,nc]) => nr>=0 && nr<ROWS && nc>=0 && nc<COLS);
}

// ═══════════════════════════════════════════════════════
//  WIN CHECK
// ═══════════════════════════════════════════════════════
function won(team) {
  const owned = new Set(cells.filter(cl=>cl.owner===team).map(cl=>cl.id));
  if (team==='green') {
    const st = cells.filter(cl=>cl.row===0      && cl.owner==='green').map(cl=>cl.id);
    const tg = new Set(cells.filter(cl=>cl.row===ROWS-1 && cl.owner==='green').map(cl=>cl.id));
    return bfs(st, tg, owned);
  } else {
    const st = cells.filter(cl=>cl.col===0      && cl.owner==='orange').map(cl=>cl.id);
    const tg = new Set(cells.filter(cl=>cl.col===COLS-1 && cl.owner==='orange').map(cl=>cl.id));
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
function inPointyHex(px,py,cx,cy,r) {
  const dx=Math.abs(px-cx), dy=Math.abs(py-cy);
  if (dy>r) return false;
  if (dx>(Math.sqrt(3)/2)*r) return false;
  return dx<=Math.sqrt(3)*(r-dy);
}
function cellAt(px,py) {
  for (let i=cells.length-1; i>=0; i--) {
    const cell=cells[i], {x,y}=cxy(cell.row,cell.col);
    if (inPointyHex(px,py,x,y,R)) return cell;
  }
  return null;
}

// ═══════════════════════════════════════════════════════
//  BUILD
// ═══════════════════════════════════════════════════════
function build() {
  const pool = [...ALL_LETTERS].sort(()=>Math.random()-.5).slice(0,ROWS*COLS);
  pool.sort(()=>Math.random()-.5);
  cells=[]; let i=0;
  for (let r=0;r<ROWS;r++)
    for (let c=0;c<COLS;c++)
      cells.push({id:`${r}_${c}`,row:r,col:c,letter:pool[i++],owner:null});
  moveHistory=[]; moveNum=0;
  setTimeout(()=>{ renderHistory(); }, 0);
}

// ═══════════════════════════════════════════════════════
//  BACKGROUND — purple hex grid like the menu, with
//  colored team zones hugging the actual hex edges
// ═══════════════════════════════════════════════════════
function drawBackground() {
  const W=cv.width, H=cv.height;
  const P=(r,c)=>pointyCorners(cxy(r,c).x, cxy(r,c).y, R);

  // 1. Rich purple radial base (same vibe as menu)
  const grad = ctx.createRadialGradient(W*0.5,H*0.45,0, W*0.5,H*0.45,Math.max(W,H)*0.8);
  grad.addColorStop(0,   '#7c35c5');
  grad.addColorStop(0.5, '#5b1fa0');
  grad.addColorStop(1,   '#3a0d6e');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  // 2. Subtle hex grid overlay (like menu background)
  const hexR = R * 1.05;
  const DX2  = 1.5 * hexR;
  const DY2  = Math.sqrt(3) * hexR;
  const cols2 = Math.ceil(W / DX2) + 3;
  const rows2 = Math.ceil(H / DY2) + 3;
  for (let row2=-1; row2<rows2; row2++) {
    for (let col2=-1; col2<cols2; col2++) {
      const hx = col2 * DX2;
      const hy = row2 * DY2 + (col2%2===1 ? DY2/2 : 0);
      const pts = Array.from({length:6}, (_,i) => {
        const a = (Math.PI/3)*i;
        return [hx + hexR*Math.cos(a), hy + hexR*Math.sin(a)];
      });
      ctx.beginPath(); ctx.moveTo(...pts[0]);
      for (let i=1;i<6;i++) ctx.lineTo(...pts[i]);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(200,160,255,0.07)';
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }
  }

  // 3. Team zone fills (hug the hex grid exactly)
  // Team A (green) = top + bottom
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0);
  for (let c=COLS-1; c>=0; c--) {
    const p=P(0,c); ctx.lineTo(...p[0]); ctx.lineTo(...p[1]); ctx.lineTo(...p[2]);
  }
  ctx.closePath(); ctx.fillStyle=teamZone.green; ctx.fill();

  ctx.beginPath(); ctx.moveTo(0,H); ctx.lineTo(W,H);
  for (let c=COLS-1; c>=0; c--) {
    const p=P(ROWS-1,c); ctx.lineTo(...p[5]); ctx.lineTo(...p[4]); ctx.lineTo(...p[3]);
  }
  ctx.closePath(); ctx.fillStyle=teamZone.green; ctx.fill();

  // Team B (orange) = left + right
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,H);
  for (let r=ROWS-1; r>=0; r--) {
    const p=P(r,0); ctx.lineTo(...p[1]); ctx.lineTo(...p[0]); ctx.lineTo(...p[5]); ctx.lineTo(...p[4]);
  }
  ctx.closePath(); ctx.fillStyle=teamZone.orange; ctx.fill();

  ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(W,H);
  for (let r=ROWS-1; r>=0; r--) {
    const p=P(r,COLS-1); ctx.lineTo(...p[1]); ctx.lineTo(...p[2]); ctx.lineTo(...p[3]); ctx.lineTo(...p[4]);
  }
  ctx.closePath(); ctx.fillStyle=teamZone.orange; ctx.fill();
}

// ═══════════════════════════════════════════════════════
//  DRAW CELLS
// ═══════════════════════════════════════════════════════
function draw() {
  ctx.clearRect(0,0,cv.width,cv.height);
  drawBackground();

  cells.forEach(cell => {
    const {x,y} = cxy(cell.row, cell.col);
    const isSel  = selId === cell.id;
    const isHov  = hovId === cell.id;
    const BORDER = R * 0.13;

    const nextStep = !pendingTeam && isHov ? (
        (!cell.owner && !isSel) ? 'select'
      : (isSel && !cell.owner) ? 'green'
      : cell.owner==='green'   ? 'orange'
      : cell.owner==='orange'  ? 'clear'
      : null
    ) : null;

    // Outer border
    const outerC = pointyCorners(x,y,R);
    ctx.beginPath(); ctx.moveTo(...outerC[0]);
    for (let i=1;i<6;i++) ctx.lineTo(...outerC[i]);
    ctx.closePath();
    ctx.fillStyle = cell.owner==='green'  ? teamBorder.green
                  : cell.owner==='orange' ? teamBorder.orange
                  : '#4c1d95';
    ctx.fill();

    // Inner fill
    const innerC = pointyCorners(x,y,R-BORDER);
    ctx.beginPath(); ctx.moveTo(...innerC[0]);
    for (let i=1;i<6;i++) ctx.lineTo(...innerC[i]);
    ctx.closePath();
    let fill;
    if      (cell.owner==='green')  fill = teamFill.green;
    else if (cell.owner==='orange') fill = teamFill.orange;
    else if (isSel)                 fill = '#fde047';
    else if (pendingTeam && isHov)
      fill = pendingTeam==='green'  ? lighten(teamFill.green,0.6)
           : pendingTeam==='orange' ? lighten(teamFill.orange,0.6) : '#f5f3ff';
    else if (nextStep==='select')  fill = '#fffde7';
    else if (nextStep==='green')   fill = lighten(teamFill.green,0.6);
    else if (nextStep==='orange')  fill = lighten(teamFill.orange,0.6);
    else if (nextStep==='clear')   fill = '#ffe4e4';
    else fill = '#ffffff';
    ctx.fillStyle=fill; ctx.fill();

    // Hover indicator ring + dot
    if (nextStep && !pendingTeam) {
      const dotColor = nextStep==='select' ? '#fde047'
                     : nextStep==='green'  ? teamFill.green
                     : nextStep==='orange' ? teamFill.orange
                     : '#ef4444';
      ctx.beginPath(); ctx.moveTo(...outerC[0]);
      for (let i=1;i<6;i++) ctx.lineTo(...outerC[i]);
      ctx.closePath();
      ctx.strokeStyle=dotColor; ctx.lineWidth=R*0.06; ctx.globalAlpha=0.55; ctx.stroke();
      ctx.globalAlpha=1;
      const bx=x+R*0.5, by=y-R*0.55, br=R*0.13;
      ctx.beginPath(); ctx.arc(bx,by,br+1.5,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fillStyle=dotColor; ctx.fill();
    }

    // Letter with outline
    const fs = Math.round(R*0.52);
    ctx.font=`900 ${fs}px Cairo, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    const tx=x, ty=y+fs*0.04;
    if (cell.owner) {
      ctx.lineWidth=R*0.09; ctx.strokeStyle=teamBorder[cell.owner]; ctx.lineJoin='round';
      ctx.strokeText(cell.letter,tx,ty);
      ctx.fillStyle='#ffffff'; ctx.fillText(cell.letter,tx,ty);
    } else {
      ctx.lineWidth=R*0.07; ctx.strokeStyle='#ffffff'; ctx.lineJoin='round';
      ctx.strokeText(cell.letter,tx,ty);
      ctx.fillStyle='#5b21b6'; ctx.fillText(cell.letter,tx,ty);
    }
    ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;
  });
}

// Lighten a hex color by blending with white
function lighten(hex, amount) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const lr=Math.round(r+(255-r)*amount), lg=Math.round(g+(255-g)*amount), lb=Math.round(b+(255-b)*amount);
  return `#${lr.toString(16).padStart(2,'0')}${lg.toString(16).padStart(2,'0')}${lb.toString(16).padStart(2,'0')}`;
}
// Darken a hex color
function darken(hex, amount) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const dr=Math.round(r*amount), dg=Math.round(g*amount), db=Math.round(b*amount);
  return `#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════════════
//  RESIZE
// ═══════════════════════════════════════════════════════
function resize() {
  const el=document.getElementById('play');
  const W=el.clientWidth, H=el.clientHeight;
  cv.width=W; cv.height=H;
  const pad=0.09;
  const byW=W*(1-pad*2)/((COLS-0.5)*Math.sqrt(3));
  const byH=H*(1-pad*2)/(1.5*(ROWS-1)+2);
  R=Math.min(byW,byH);
  const DX=Math.sqrt(3)*R, DY=1.5*R;
  GX=(W-(COLS-0.5)*DX)/2+DX/2;
  GY=(H-((ROWS-1)*DY+2*R))/2+R;
  draw();
}

// ═══════════════════════════════════════════════════════
//  INPUT EVENTS
// ═══════════════════════════════════════════════════════
function sxy(e) {
  const rect=cv.getBoundingClientRect();
  const sx=cv.width/rect.width, sy=cv.height/rect.height;
  const src=e.touches?e.changedTouches[0]:e;
  return { px:(src.clientX-rect.left)*sx, py:(src.clientY-rect.top)*sy };
}
// Returns true if any overlay or cinematic is currently showing — block input then
function isBlocked() {
  if (document.getElementById('round-transition'))  return true;
  if (document.getElementById('winner-transition')) return true;
  if (document.getElementById('ov-r')?.classList.contains('show')) return true;
  if (document.getElementById('ov-g')?.classList.contains('show')) return true;
  return false;
}

cv.addEventListener('mousemove', e => {
  if (isBlocked()) { cv.style.cursor='default'; return; }
  const {px,py}=sxy(e), cell=cellAt(px,py);
  const nh=cell?cell.id:null;
  if (nh!==hovId) { hovId=nh; draw(); }
  cv.style.cursor=cell?'pointer':'default';
  cv.title='';
});
cv.addEventListener('mouseleave', ()=>{ hovId=null; draw(); });
cv.addEventListener('click', e => {
  if (isBlocked()) return;
  unlockAudio();
  const {px,py}=sxy(e), cell=cellAt(px,py);
  if (!cell) return; onCell(cell.id);
});
cv.addEventListener('touchend', e => {
  if (isBlocked()) { e.preventDefault(); return; }
  e.preventDefault(); unlockAudio();
  const {px,py}=sxy(e), cell=cellAt(px,py);
  if (!cell) return; onCell(cell.id);
}, {passive:false});

// ═══════════════════════════════════════════════════════
//  GAME LOGIC — click cycle
// ═══════════════════════════════════════════════════════
function pickTeam(t) {
  if (isBlocked()) return;
  unlockAudio();
  pendingTeam=t;
  document.getElementById('btn-g').classList.toggle('active', t==='green');
  document.getElementById('btn-o').classList.toggle('active', t==='orange');
  document.getElementById('chk-g').className='chk'+(t==='green'?' g':'');
  document.getElementById('chk-o').className='chk'+(t==='orange'?' o':'');
  if (selId) { doAssign(selId,t); clearSt(); } else draw();
}

function onCell(id) {
  if (pendingTeam) { doAssign(id,pendingTeam); clearSt(); return; }
  const cell=cells.find(c=>c.id===id);
  if (!cell) return;
  if (!cell.owner && selId!==id) {
    selId=id; playSelectSound(); draw();
  } else if (selId===id && !cell.owner) {
    selId=null; doAssign(id,'green');
  } else if (cell.owner==='green') {
    doAssign(id,'orange');
  } else if (cell.owner==='orange') {
    const letter=cell.letter;
    cell.owner=null; playUnselectSound();
    moveHistory.unshift({team:'clear',letter,num:'—',action:'clear'});
    if (moveHistory.length>6) moveHistory.pop();
    renderHistory(); draw();
  }
}

function doAssign(id, team) {
  const cell=cells.find(c=>c.id===id);
  if (!cell) { clearSt(); draw(); return; }
  const wasOwned=cell.owner;
  cell.owner=team;
  playClick(team);
  if (!wasOwned) {
    moveNum++;
    moveHistory.unshift({team,letter:cell.letter,num:moveNum,action:'claim'});
    if (moveHistory.length>6) moveHistory.pop();
  } else if (wasOwned!==team) {
    moveHistory.unshift({team,letter:cell.letter,num:'↺',action:'change',from:wasOwned});
    if (moveHistory.length>6) moveHistory.pop();
  }
  renderHistory(); draw();
  if (won(team)) {
    wins[team]++;
    updateScore();
    setTimeout(()=>{
      playWin();
      wins[team]>=winsToWin ? showGameWin(team) : showRoundWin(team);
    }, 380);
  }
}

function clearSt() {
  pendingTeam=null; selId=null;
  ['btn-g','btn-o'].forEach(id=>document.getElementById(id).classList.remove('active'));
  document.getElementById('chk-g').className='chk';
  document.getElementById('chk-o').className='chk';
  draw();
}

// ═══════════════════════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════════════════════
function renderHistory() {
  const el=document.getElementById('history-list');
  if (!el) return;
  if (!moveHistory.length) { el.innerHTML='<div class="hist-empty">لا توجد حركات بعد</div>'; return; }
  el.innerHTML=moveHistory.map(m=>{
    if (m.action==='clear') return `<div class="hist-item hist-clear">
      <span class="hist-dot" style="background:#ef4444"></span>
      <span class="hist-letter hist-letter-muted">${m.letter}</span>
      <span class="hist-action-label" style="color:#ef4444">حُذف</span>
    </div>`;
    if (m.action==='change') {
      const tc=m.team==='green'?teamFill.green:teamFill.orange;
      const fc=m.from==='green'?teamFill.green:teamFill.orange;
      return `<div class="hist-item">
        <span class="hist-num" style="color:${tc}">${m.num}</span>
        <span class="hist-dot-mini" style="background:${fc}"></span>
        <span class="hist-arrow">→</span>
        <span class="hist-dot-mini" style="background:${tc}"></span>
        <span class="hist-letter">${m.letter}</span>
      </div>`;
    }
    const color=m.team==='green'?teamFill.green:teamFill.orange;
    const tname=m.team==='green'?names.green:names.orange;
    return `<div class="hist-item">
      <span class="hist-num" style="color:${color}">#${m.num}</span>
      <span class="hist-dot" style="background:${color}"></span>
      <span class="hist-letter">${m.letter}</span>
      <span class="hist-team-name" style="color:${color}">${tname}</span>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
//  NAMES & SCORE
// ═══════════════════════════════════════════════════════
function syncNames() {
  names.green  = document.getElementById('name-g').value.trim()||'الفريق الأول';
  names.orange = document.getElementById('name-o').value.trim()||'الفريق الثاني';
  document.getElementById('lbl-g').textContent=names.green;
  document.getElementById('lbl-o').textContent=names.orange;
  document.getElementById('sn-g').textContent=names.green;
  document.getElementById('sn-o').textContent=names.orange;
}
function updateScore() {
  const svG=document.getElementById('sv-g');
  const svO=document.getElementById('sv-o');
  if (svG) svG.textContent=wins.green;
  if (svO) svO.textContent=wins.orange;
  // Update wins-to-win display
  const wEl=document.getElementById('wins-needed');
  if (wEl) wEl.textContent=winsToWin;
}

// ═══════════════════════════════════════════════════════
//  SIDE PANEL COLLAPSE
// ═══════════════════════════════════════════════════════
function toggleSide() {
  sideCollapsed=!sideCollapsed;
  document.getElementById('side').classList.toggle('collapsed',sideCollapsed);
  document.getElementById('collapse-btn').textContent=sideCollapsed?'◀':'▶';
  setTimeout(resize,320);
}

// ═══════════════════════════════════════════════════════
//  OVERLAYS
// ═══════════════════════════════════════════════════════
const RN=['','الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة'];

function showRoundWin(team) {
  const col=team==='green'?teamFill.green:teamFill.orange;
  const dot=`<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${col};vertical-align:middle;margin-left:6px"></span>`;
  document.getElementById('ov-r-e').innerHTML=dot;
  document.getElementById('ov-r-t').textContent=`فاز ${names[team]}!`;
  document.getElementById('ov-r-t').style.color=col;
  document.getElementById('ov-r-s').textContent=`جولة ${RN[rNum]||rNum} — للفوز بالبطولة: ${winsToWin} جولات`;
  document.getElementById('ov-r').classList.add('show');
}
function showGameWin(team) {
  document.getElementById('gw-nm').textContent=names[team];
  document.getElementById('gw-nm').style.color=teamFill[team];
  document.getElementById('gw-sub').textContent=`فاز بـ ${winsToWin} جولات وحسم البطولة!`;
  document.getElementById('ov-g').classList.add('show');
  spawnConfetti();
}
function nextRound() {
  document.getElementById('ov-r').classList.remove('show');
  rNum++;
  document.getElementById('rname').textContent=RN[rNum]||rNum;
  showRoundTransition(RN[rNum]||String(rNum), ()=>{ build(); clearSt(); });
}
function newRound() {
  document.getElementById('ov-r').classList.remove('show');
  rNum++;
  document.getElementById('rname').textContent=RN[rNum]||rNum;
  showRoundTransition(RN[rNum]||String(rNum), ()=>{ build(); clearSt(); });
}
function newGame() {
  ['ov-r','ov-g'].forEach(id=>document.getElementById(id).classList.remove('show'));
  rNum=1; wins={green:0,orange:0};
  document.getElementById('rname').textContent='الأولى';
  updateScore(); build(); clearSt();
}

// ═══════════════════════════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════════════════════════
function spawnConfetti() {
  const wrap=document.getElementById('cf'); wrap.innerHTML='';
  const cols=[teamFill.green,teamFill.orange,'#f9e000','#fff','#e879f9','#38bdf8','#f43f5e'];
  for (let i=0;i<110;i++) {
    const el=document.createElement('div'); el.className='cf';
    const sz=5+Math.random()*11;
    el.style.cssText=`left:${Math.random()*100}vw;width:${sz}px;height:${sz}px;
      background:${cols[Math.floor(Math.random()*cols.length)]};
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-duration:${1.6+Math.random()*2.4}s;
      animation-delay:${Math.random()*1.5}s;
      opacity:${.7+Math.random()*.3};`;
    wrap.appendChild(el);
  }
  setTimeout(()=>wrap.innerHTML='', 6500);
}

// ═══════════════════════════════════════════════════════
//  ROUND TRANSITION
// ═══════════════════════════════════════════════════════
function showRoundTransition(roundName, onDone) {
  const old=document.getElementById('round-transition');
  if (old) old.remove();
  const el=document.createElement('div');
  el.id='round-transition';
  el.innerHTML=`
    <div class="rt-bg"></div>
    <div class="rt-hexes" id="rt-hexes"></div>
    <div class="rt-content">
      <div class="rt-label">الجولة</div>
      <div class="rt-number">${roundName}</div>
      <div class="rt-dots"><span class="rt-dot"></span><span class="rt-dot"></span><span class="rt-dot"></span></div>
    </div>`;
  document.body.appendChild(el);
  const hexWrap=el.querySelector('#rt-hexes');
  for (let i=0;i<18;i++) {
    const h=document.createElement('span'); h.className='rt-hex-deco'; h.textContent='⬡';
    h.style.cssText=`left:${Math.random()*100}vw;top:${Math.random()*100}vh;
      font-size:${1.5+Math.random()*4}rem;
      animation-delay:${Math.random()*.4}s;animation-duration:${.6+Math.random()*.5}s;opacity:0;
      color:${[teamFill.green,teamFill.orange,'#f9e000','rgba(255,255,255,0.2)'][i%4]};`;
    hexWrap.appendChild(h);
  }
  unlockAudio().then(a=>{ if(!a) return; try {
    const ob=a.createOscillator(),gb=a.createGain();
    ob.connect(gb);gb.connect(a.destination);ob.type='sine';
    ob.frequency.setValueAtTime(80,a.currentTime);ob.frequency.exponentialRampToValueAtTime(200,a.currentTime+0.3);
    gb.gain.setValueAtTime(0.35,a.currentTime);gb.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.5);
    ob.start(a.currentTime);ob.stop(a.currentTime+0.5);
    [1200,1500,1800].forEach((f,i)=>{ const o=a.createOscillator(),g=a.createGain();
      o.connect(g);g.connect(a.destination);o.type='sine';o.frequency.value=f;
      const t=a.currentTime+0.3+i*0.08;
      g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
      o.start(t);o.stop(t+0.25); });
  } catch(e){} });
  setTimeout(()=>{
    el.classList.add('rt-exit');
    setTimeout(()=>{ el.remove(); onDone(); },600);
  },2200);
}

// ═══════════════════════════════════════════════════════
//  WINNER CINEMATIC
// ═══════════════════════════════════════════════════════
function showWinnerTransition(team, onDone) {
  const old=document.getElementById('winner-transition');
  if (old) old.remove();
  const tc=teamFill[team], ts=teamBorder[team];
  const bgGrad=team==='green'
    ? `linear-gradient(145deg,${darken(tc,0.25)},${darken(tc,0.4)},${darken(tc,0.3)})`
    : `linear-gradient(145deg,${darken(tc,0.25)},${darken(tc,0.4)},${darken(tc,0.3)})`;
  const el=document.createElement('div'); el.id='winner-transition';
  el.innerHTML=`
    <div class="wt-bg" style="background:${bgGrad}"></div>
    <div class="wt-rays"></div>
    <div class="wt-particles" id="wt-particles"></div>
    <div class="wt-content">
      <div class="wt-trophy">🏆</div>
      <div class="wt-congrats">مبروك الفوز</div>
      <div class="wt-team-name" style="color:${tc};text-shadow:4px 4px 0 ${ts},0 0 50px ${tc}99">${names[team]}</div>
      <div class="wt-sub">حسم البطولة بـ ${winsToWin} جولات!</div>
      <div class="wt-stars">
        <span class="wt-star" style="animation-delay:.6s">⭐</span>
        <span class="wt-star" style="animation-delay:.75s;font-size:2.8rem">⭐</span>
        <span class="wt-star" style="animation-delay:.9s">⭐</span>
      </div>
    </div>`;
  document.body.appendChild(el);
  const pw=el.querySelector('#wt-particles');
  const symbols=['⭐','✨','⬡','💫','⬢'];
  for (let i=0;i<24;i++) {
    const p=document.createElement('span'); p.className='wt-particle'; p.textContent=symbols[i%symbols.length];
    p.style.cssText=`left:${Math.random()*100}vw;top:${80+Math.random()*30}vh;
      font-size:${1+Math.random()*2.5}rem;
      animation-delay:${.2+Math.random()*.8}s;animation-duration:${1.2+Math.random()*1.2}s;
      color:${[tc,'#f9e000','#ffffff'][i%3]};`;
    pw.appendChild(p);
  }
  unlockAudio().then(a=>{ if(!a) return; try {
    const ob=a.createOscillator(),gb=a.createGain();
    ob.connect(gb);gb.connect(a.destination);ob.type='sine';
    ob.frequency.setValueAtTime(60,a.currentTime);ob.frequency.exponentialRampToValueAtTime(120,a.currentTime+0.2);
    gb.gain.setValueAtTime(0.5,a.currentTime);gb.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.6);
    ob.start(a.currentTime);ob.stop(a.currentTime+0.6);
    [392,523,659,784,1047,1319].forEach((freq,i)=>{ const o=a.createOscillator(),g=a.createGain();
      o.connect(g);g.connect(a.destination);o.type=i<3?'triangle':'sine';o.frequency.value=freq;
      const t=a.currentTime+0.1+i*0.11;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.28,t+0.05);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.5);o.start(t);o.stop(t+0.5); });
  } catch(e){} });
  spawnConfetti();
  setTimeout(()=>{
    el.classList.add('wt-exit');
    setTimeout(()=>{ el.remove(); if(onDone) onDone(); },700);
  },4000);
}

const _origShowGameWin=showGameWin;
showGameWin=function(team){ showWinnerTransition(team,()=>_origShowGameWin(team)); };


// ═══════════════════════════════════════════════════════
//  LOGO — pure CSS animations, JS only swaps text
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
//  MENU BACKGROUND
// ═══════════════════════════════════════════════════════
let menuAnimId=null, howtoOpen=false;

function initMenuCanvas() {
  const mc=document.getElementById('menu-canvas');
  if (!mc) return;
  const mctx=mc.getContext('2d');
  let W,H,hexes=[];
  function resizeMenu() { W=mc.width=window.innerWidth; H=mc.height=window.innerHeight; buildMenuHexes(); }
  function buildMenuHexes() {
    hexes=[];
    const r=Math.max(40,Math.min(W,H)*0.08);
    const DX=1.5*r, DY=Math.sqrt(3)*r;
    const cols=Math.ceil(W/DX)+3, rows=Math.ceil(H/DY)+3;
    for (let row=-1;row<rows;row++) for (let col=-1;col<cols;col++)
      hexes.push({ x:col*DX, y:row*DY+(col%2===1?DY/2:0), r,
        phase:Math.random()*Math.PI*2, speed:0.3+Math.random()*0.5,
        letter:Math.random()>0.45?ALL_LETTERS[Math.floor(Math.random()*ALL_LETTERS.length)]:null,
        scale:0.85+Math.random()*0.3 });
  }
  function drawMenuFrame() {
    mctx.clearRect(0,0,W,H);
    const grad=mctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.4,Math.max(W,H)*.75);
    grad.addColorStop(0,'#7c35c5'); grad.addColorStop(.5,'#5b1fa0'); grad.addColorStop(1,'#3a0d6e');
    mctx.fillStyle=grad; mctx.fillRect(0,0,W,H);
    const now=performance.now()*.001;
    hexes.forEach(h=>{
      const pulse=0.5+0.5*Math.sin(now*h.speed+h.phase);
      const alpha=0.06+pulse*0.12;
      const pts=Array.from({length:6},(_,i)=>{ const a=(Math.PI/3)*i; return [h.x+h.r*Math.cos(a),h.y+h.r*Math.sin(a)]; });
      mctx.beginPath(); mctx.moveTo(...pts[0]); for(let i=1;i<6;i++) mctx.lineTo(...pts[i]); mctx.closePath();
      mctx.fillStyle=`rgba(180,140,255,${alpha*.6})`; mctx.fill();
      mctx.strokeStyle=`rgba(200,160,255,${alpha*1.8})`; mctx.lineWidth=1.5; mctx.stroke();
      const ri=h.r*.78;
      mctx.beginPath(); Array.from({length:6},(_,i)=>{ const a=(Math.PI/3)*i; const px=h.x+ri*Math.cos(a),py=h.y+ri*Math.sin(a); i===0?mctx.moveTo(px,py):mctx.lineTo(px,py); }); mctx.closePath();
      mctx.strokeStyle=`rgba(220,180,255,${alpha*.9})`; mctx.lineWidth=0.6; mctx.stroke();
      if (h.letter) { const fs=Math.round(h.r*.52*h.scale); mctx.font=`700 ${fs}px Cairo, sans-serif`;
        mctx.textAlign='center'; mctx.textBaseline='middle'; mctx.fillStyle=`rgba(220,190,255,${alpha*1.4})`; mctx.fillText(h.letter,h.x,h.y); }
    });
    menuAnimId=requestAnimationFrame(drawMenuFrame);
  }
  window.addEventListener('resize',resizeMenu);
  resizeMenu(); drawMenuFrame();
}

function stopMenuCanvas() {
  if (menuAnimId) { cancelAnimationFrame(menuAnimId); menuAnimId = null; }
}

function toggleHowto() {
  howtoOpen=!howtoOpen;
  document.getElementById('howto-body').classList.toggle('open',howtoOpen);
  document.getElementById('howto-arrow').textContent=howtoOpen?'▲':'▼';
}

// ═══════════════════════════════════════════════════════
//  COLOR PICKERS — called from menu
// ═══════════════════════════════════════════════════════
function onColorChange(team, hex) {
  teamFill[team]   = hex;
  teamBorder[team] = darken(hex, 0.35);
  teamZone[team]   = darken(hex, 0.75);  // slightly lighter than border but darker than fill
  // Update chk color in side panel
  if (team==='green') {
    document.querySelectorAll('.chk.g').forEach(el=>{ el.style.background=hex; el.style.borderColor=hex; });
  } else {
    document.querySelectorAll('.chk.o').forEach(el=>{ el.style.background=hex; el.style.borderColor=hex; });
  }
  applyTeamColors();
  if (cv && cv.width) draw();
}

// ═══════════════════════════════════════════════════════
//  START / MENU NAVIGATION
// ═══════════════════════════════════════════════════════
function startGame() {
  unlockAudio();
  const gName   = document.getElementById('menu-name-g').value.trim()||'الفريق الأول';
  const oName   = document.getElementById('menu-name-o').value.trim()||'الفريق الثاني';
  const rawInput= document.getElementById('game-name-input').value.trim();
  const gameName= rawInput?`لعبة خلية ${rawInput}`:'لعبة الخلية';
  // winsToWin is already set correctly by changeRounds() in the inline script
  // Just make sure wins-needed badge reflects it
  const wEl = document.getElementById('wins-needed');
  if (wEl) wEl.textContent = winsToWin;

  document.getElementById('name-g').value=gName;
  document.getElementById('name-o').value=oName;
  document.getElementById('game-title-bar').textContent=gameName;
  document.title=gameName;

  const menuEl=document.getElementById('main-menu');
  const gameEl=document.getElementById('game-screen');
  gameEl.classList.remove('hidden'); gameEl.offsetHeight; gameEl.classList.add('visible');
  menuEl.classList.add('fade-out');
  setTimeout(()=>{ menuEl.style.display='none'; stopMenuCanvas(); },500);

  syncNames(); build(); applyTheme(); renderHistory();
  window.addEventListener('resize',resize);
  document.fonts.ready.then(()=>resize());
  resize();
  updateScore();
  setTimeout(()=>showRoundTransition('الأولى',()=>{}),600);
}

function goToMenu() {
  // Close every overlay and cinematic first
  ['ov-r','ov-g'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  const wt = document.getElementById('winner-transition');
  if (wt) wt.remove();
  const rt = document.getElementById('round-transition');
  if (rt) rt.remove();

  const menuEl=document.getElementById('main-menu');
  const gameEl=document.getElementById('game-screen');
  menuEl.style.display=''; menuEl.classList.remove('fade-out');
  gameEl.classList.remove('visible');
  setTimeout(()=>gameEl.classList.add('hidden'),500);
  // Restart menu + logo canvas after layout settles
  setTimeout(()=>initMenuCanvas(), 100);
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  applyTheme();
  // Defer so the browser has painted and clientWidth values are real
  setTimeout(()=>initMenuCanvas(), 50);
});

const _baseApplyTheme=applyTheme;
applyTheme=function(){
  _baseApplyTheme();
  const mb=document.getElementById('menu-theme-btn');
  if(mb) mb.textContent=isDark?'☀️':'🌙';
  const tb=document.getElementById('theme-btn');
  if(tb) tb.textContent=isDark?'☀️':'🌙';
};
