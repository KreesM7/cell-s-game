// ═══════════════════════════════════════════════════════
//  لعبة الخلية — Full Featured Version
// ═══════════════════════════════════════════════════════

const ALL_LETTERS = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const ROWS = 5, COLS = 5;

// ── State ──────────────────────────────────────────────
let cells = [], selId = null, pendingTeam = null, hovId = null;
let wins = { green: 0, orange: 0 };
let seriesWins = { green: 0, orange: 0 }; // across multiple games (best-of)
let rNum = 1;
let winsToWin = 2;
let roundEnded = false; // prevents duplicate win scoring
let names  = { green: 'الفريق الأول', orange: 'الفريق الثاني' };
let teamFill   = { green: '#4ade80', orange: '#fb923c' };
let teamBorder = { green: '#14532d', orange: '#7c2d12' };
let teamZone   = { green: '#3dba4e', orange: '#f57c22' };
let moveHistory = [];
let moveNum = 0;
let isDark = true;
let sideCollapsed = false;
let isMuted = false;
let revealMode = false;   // letters hidden until claimed
let undoStack  = [];      // [{id, prevOwner}]
let roundHistory = [];    // [{rNum, winner, name}] — match summary
let customRoundNames = []; // set from menu
let zoomedCell = null;    // cell being zoomed

const cv  = document.getElementById('c');
const ctx = cv.getContext('2d');
let R = 60, GX = 0, GY = 0;

// ══════════════════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════════════════
function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--side-bg',      'linear-gradient(180deg,#4a1880 0%,#3d1268 100%)');
  root.style.setProperty('--side-text',    '#ffffff');
  root.style.setProperty('--side-sub',     'rgba(255,255,255,0.55)');
  root.style.setProperty('--score-bg',     'rgba(0,0,0,0.25)');
  root.style.setProperty('--divider',      'rgba(255,255,255,0.12)');
  document.body.style.background = '#2d0a6e';
  applyTeamColors();
  const mb = document.getElementById('menu-theme-btn');
  if (mb) mb.textContent = isMuted ? '🔇' : '🔊';
  // mute btn in game
  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) muteBtn.textContent = isMuted ? '🔇' : '🔊';
}

function toggleTheme() { isDark = !isDark; applyTheme(); draw(); }

function applyTeamColors() {
  const snG = document.getElementById('sn-g');
  const snO = document.getElementById('sn-o');
  if (snG) snG.style.color = teamFill.green;
  if (snO) snO.style.color = teamFill.orange;
  const dotG = document.querySelector('.team-dot-g');
  const dotO = document.querySelector('.team-dot-o');
  if (dotG) { dotG.style.background=teamFill.green; dotG.style.boxShadow=`0 0 6px ${teamFill.green}`; }
  if (dotO) { dotO.style.background=teamFill.orange; dotO.style.boxShadow=`0 0 6px ${teamFill.orange}`; }
  const pg=document.getElementById('preview-color-g');
  const po=document.getElementById('preview-color-o');
  if (pg) pg.style.background=teamFill.green;
  if (po) po.style.background=teamFill.orange;
}

// ══════════════════════════════════════════════════════
//  AUDIO
// ══════════════════════════════════════════════════════
let ac = null;
function unlockAudio() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return Promise.resolve(null);
  if (!ac) ac = new Ctor();
  if (ac.state === 'running') return Promise.resolve(ac);
  return ac.resume().then(() => ac);
}
function snd(fn) { if (!isMuted) fn(); }

function toggleMute() {
  isMuted = !isMuted;
  const b = document.getElementById('mute-btn');
  if (b) b.textContent = isMuted ? '🔇' : '🔊';
}

function playClick(team) {
  snd(()=>unlockAudio().then(a=>{ if(!a) return; try {
    const o=a.createOscillator(),g=a.createGain();
    o.connect(g);g.connect(a.destination);o.type='sine';
    const now=a.currentTime;
    o.frequency.setValueAtTime(team==='green'?520:400,now);
    o.frequency.exponentialRampToValueAtTime(team==='green'?800:620,now+0.1);
    g.gain.setValueAtTime(0.22,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.22);
    o.start(now);o.stop(now+0.22);
  } catch(e){} }));
}
function playWin() {
  snd(()=>unlockAudio().then(a=>{ if(!a) return; try {
    [523,659,784,1047].forEach((freq,i)=>{
      const o=a.createOscillator(),g=a.createGain();
      o.connect(g);g.connect(a.destination);o.type='triangle';o.frequency.value=freq;
      const t=a.currentTime+i*0.14;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.26,t+0.05);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.45);o.start(t);o.stop(t+0.45);
    });
  } catch(e){} }));
}
function playSelectSound() {
  snd(()=>unlockAudio().then(a=>{ if(!a) return; try {
    const o=a.createOscillator(),g=a.createGain();
    o.connect(g);g.connect(a.destination);o.type='sine';
    o.frequency.setValueAtTime(900,a.currentTime);
    o.frequency.exponentialRampToValueAtTime(1100,a.currentTime+0.06);
    g.gain.setValueAtTime(0.1,a.currentTime);g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.1);
    o.start(a.currentTime);o.stop(a.currentTime+0.1);
  } catch(e){} }));
}
function playUnselectSound() {
  snd(()=>unlockAudio().then(a=>{ if(!a) return; try {
    const o=a.createOscillator(),g=a.createGain();
    o.connect(g);g.connect(a.destination);o.type='sine';
    o.frequency.setValueAtTime(500,a.currentTime);
    o.frequency.exponentialRampToValueAtTime(250,a.currentTime+0.12);
    g.gain.setValueAtTime(0.12,a.currentTime);g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.15);
    o.start(a.currentTime);o.stop(a.currentTime+0.15);
  } catch(e){} }));
}

// ══════════════════════════════════════════════════════
//  GEOMETRY
// ══════════════════════════════════════════════════════
function cxy(row,col) {
  const DX=Math.sqrt(3)*R,DY=1.5*R;
  return {x:GX+col*DX+(row%2===1?DX/2:0),y:GY+row*DY};
}
function pointyCorners(cx,cy,r) {
  return Array.from({length:6},(_,i)=>{
    const a=(Math.PI/3)*i+Math.PI/6;
    return [cx+r*Math.cos(a),cy+r*Math.sin(a)];
  });
}
function nbrs(r,c) {
  const odd=r%2===1;
  const nb=odd?[[r-1,c],[r-1,c+1],[r,c-1],[r,c+1],[r+1,c],[r+1,c+1]]
              :[[r-1,c-1],[r-1,c],[r,c-1],[r,c+1],[r+1,c-1],[r+1,c]];
  return nb.filter(([nr,nc])=>nr>=0&&nr<ROWS&&nc>=0&&nc<COLS);
}

// ══════════════════════════════════════════════════════
//  WIN CHECK
// ══════════════════════════════════════════════════════
function won(team) {
  const owned=new Set(cells.filter(cl=>cl.owner===team).map(cl=>cl.id));
  if (team==='green') {
    const st=cells.filter(cl=>cl.row===0&&cl.owner==='green').map(cl=>cl.id);
    const tg=new Set(cells.filter(cl=>cl.row===ROWS-1&&cl.owner==='green').map(cl=>cl.id));
    return bfs(st,tg,owned);
  } else {
    const st=cells.filter(cl=>cl.col===0&&cl.owner==='orange').map(cl=>cl.id);
    const tg=new Set(cells.filter(cl=>cl.col===COLS-1&&cl.owner==='orange').map(cl=>cl.id));
    return bfs(st,tg,owned);
  }
}
function bfs(starts,targets,owned) {
  if (!starts.length||!targets.size) return false;
  const vis=new Set(),q=[...starts];
  while(q.length){
    const id=q.shift();
    if(targets.has(id)) return true;
    if(vis.has(id)) continue; vis.add(id);
    const [r,c]=id.split('_').map(Number);
    for(const [nr,nc] of nbrs(r,c)){
      const nid=`${nr}_${nc}`;
      if(owned.has(nid)&&!vis.has(nid)) q.push(nid);
    }
  }
  return false;
}

// ══════════════════════════════════════════════════════
//  HIT TEST
// ══════════════════════════════════════════════════════
function inPointyHex(px,py,cx,cy,r) {
  const dx=Math.abs(px-cx),dy=Math.abs(py-cy);
  if(dy>r) return false;
  if(dx>(Math.sqrt(3)/2)*r) return false;
  return dx<=Math.sqrt(3)*(r-dy);
}
function cellAt(px,py) {
  for(let i=cells.length-1;i>=0;i--){
    const cell=cells[i],{x,y}=cxy(cell.row,cell.col);
    if(inPointyHex(px,py,x,y,R)) return cell;
  }
  return null;
}

// ══════════════════════════════════════════════════════
//  BUILD
// ══════════════════════════════════════════════════════
function build() {
  const pool=[...ALL_LETTERS].sort(()=>Math.random()-.5).slice(0,ROWS*COLS);
  pool.sort(()=>Math.random()-.5);
  cells=[];let i=0;
  for(let r=0;r<ROWS;r++)
    for(let c=0;c<COLS;c++)
      cells.push({id:`${r}_${c}`,row:r,col:c,letter:pool[i++],owner:null,revealed:!revealMode});
  moveHistory=[];moveNum=0;undoStack=[];roundEnded=false;
  setTimeout(()=>renderHistory(),0);
}

// ══════════════════════════════════════════════════════
//  BACKGROUND (purple hex grid + team zones)
// ══════════════════════════════════════════════════════
function drawBackground() {
  const W=cv.width,H=cv.height;
  const P=(r,c)=>pointyCorners(cxy(r,c).x,cxy(r,c).y,R);
  const grad=ctx.createRadialGradient(W*.5,H*.45,0,W*.5,H*.45,Math.max(W,H)*.8);
  grad.addColorStop(0,'#7c35c5');grad.addColorStop(.5,'#5b1fa0');grad.addColorStop(1,'#3a0d6e');
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  // hex grid overlay
  const hexR=R*1.05,DX2=1.5*hexR,DY2=Math.sqrt(3)*hexR;
  for(let row2=-1;row2<Math.ceil(H/DY2)+3;row2++)
    for(let col2=-1;col2<Math.ceil(W/DX2)+3;col2++){
      const hx=col2*DX2,hy=row2*DY2+(col2%2===1?DY2/2:0);
      const pts=Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i;return[hx+hexR*Math.cos(a),hy+hexR*Math.sin(a)];});
      ctx.beginPath();ctx.moveTo(...pts[0]);for(let i=1;i<6;i++)ctx.lineTo(...pts[i]);ctx.closePath();
      ctx.strokeStyle='rgba(200,160,255,0.06)';ctx.lineWidth=1.2;ctx.stroke();
    }
  // team zones
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W,0);
  for(let c=COLS-1;c>=0;c--){const p=P(0,c);ctx.lineTo(...p[0]);ctx.lineTo(...p[1]);ctx.lineTo(...p[2]);}
  ctx.closePath();ctx.fillStyle=teamZone.green;ctx.fill();
  ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(W,H);
  for(let c=COLS-1;c>=0;c--){const p=P(ROWS-1,c);ctx.lineTo(...p[5]);ctx.lineTo(...p[4]);ctx.lineTo(...p[3]);}
  ctx.closePath();ctx.fillStyle=teamZone.green;ctx.fill();
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,H);
  for(let r=ROWS-1;r>=0;r--){const p=P(r,0);ctx.lineTo(...p[1]);ctx.lineTo(...p[0]);ctx.lineTo(...p[5]);ctx.lineTo(...p[4]);}
  ctx.closePath();ctx.fillStyle=teamZone.orange;ctx.fill();
  ctx.beginPath();ctx.moveTo(W,0);ctx.lineTo(W,H);
  for(let r=ROWS-1;r>=0;r--){const p=P(r,COLS-1);ctx.lineTo(...p[1]);ctx.lineTo(...p[2]);ctx.lineTo(...p[3]);ctx.lineTo(...p[4]);}
  ctx.closePath();ctx.fillStyle=teamZone.orange;ctx.fill();
}

// ══════════════════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════════════════
function draw() {
  ctx.clearRect(0,0,cv.width,cv.height);
  drawBackground();
  cells.forEach(cell=>{
    const {x,y}=cxy(cell.row,cell.col);
    const isHov=hovId===cell.id;
    const BORDER=R*0.13;
    // What will next click do — for hover preview
    const nextStep=!pendingTeam&&isHov?(
        !cell.owner?'green'
      :cell.owner==='green'?'orange'
      :cell.owner==='orange'?'clear':null):null;
    // outer border
    const outerC=pointyCorners(x,y,R);
    ctx.beginPath();ctx.moveTo(...outerC[0]);for(let i=1;i<6;i++)ctx.lineTo(...outerC[i]);ctx.closePath();
    ctx.fillStyle=cell.owner==='green'?teamBorder.green:cell.owner==='orange'?teamBorder.orange:'#4c1d95';
    ctx.fill();
    // inner fill
    const innerC=pointyCorners(x,y,R-BORDER);
    ctx.beginPath();ctx.moveTo(...innerC[0]);for(let i=1;i<6;i++)ctx.lineTo(...innerC[i]);ctx.closePath();
    let fill;
    if(cell.owner==='green') fill=teamFill.green;
    else if(cell.owner==='orange') fill=teamFill.orange;
    else if(pendingTeam&&isHov) fill=pendingTeam==='green'?lighten(teamFill.green,.6):lighten(teamFill.orange,.6);
    else if(nextStep==='green') fill=lighten(teamFill.green,.6);
    else if(nextStep==='orange') fill=lighten(teamFill.orange,.6);
    else if(nextStep==='clear') fill='#ffe4e4';
    else fill='#ffffff';
    ctx.fillStyle=fill;ctx.fill();
    // hover ring + dot
    if(nextStep&&!pendingTeam){
      const dc=nextStep==='green'?teamFill.green:nextStep==='orange'?teamFill.orange:'#ef4444';
      ctx.beginPath();ctx.moveTo(...outerC[0]);for(let i=1;i<6;i++)ctx.lineTo(...outerC[i]);ctx.closePath();
      ctx.strokeStyle=dc;ctx.lineWidth=R*.06;ctx.globalAlpha=.55;ctx.stroke();ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(x+R*.5,y-R*.55,R*.13+1.5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
      ctx.beginPath();ctx.arc(x+R*.5,y-R*.55,R*.13,0,Math.PI*2);ctx.fillStyle=dc;ctx.fill();
    }
    // reveal mode — show ? if not revealed and not owned
    const showQuestion = revealMode && !cell.revealed && !cell.owner;
    const letterToShow = showQuestion ? '؟' : cell.letter;
    const letterColor  = showQuestion ? 'rgba(255,255,255,0.35)' : (cell.owner?'#ffffff':'#5b21b6');
    const outlineColor = showQuestion ? 'transparent' : (cell.owner?teamBorder[cell.owner]:'#ffffff');
    // letter
    const fs=Math.round(R*.52);
    ctx.font=`900 ${fs}px Cairo,sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    if(!showQuestion){
      ctx.lineWidth=cell.owner?R*.09:R*.07;
      ctx.strokeStyle=outlineColor;ctx.lineJoin='round';
      ctx.strokeText(letterToShow,x,y+fs*.04);
    }
    ctx.fillStyle=letterColor;ctx.fillText(letterToShow,x,y+fs*.04);
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;

    // zoom overlay hint
    if(zoomedCell&&zoomedCell.id===cell.id){
      ctx.beginPath();ctx.moveTo(...outerC[0]);for(let i=1;i<6;i++)ctx.lineTo(...outerC[i]);ctx.closePath();
      ctx.strokeStyle='#f9e000';ctx.lineWidth=R*.08;ctx.globalAlpha=.85;ctx.stroke();ctx.globalAlpha=1;
    }
  });
}

// ── Color helpers ──
function lighten(hex,amt){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `#${[r,g,b].map(v=>Math.round(v+(255-v)*amt).toString(16).padStart(2,'0')).join('')}`;
}
function darken(hex,amt){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `#${[r,g,b].map(v=>Math.round(v*amt).toString(16).padStart(2,'0')).join('')}`;
}

// ══════════════════════════════════════════════════════
//  RESIZE
// ══════════════════════════════════════════════════════
function resize(){
  const el=document.getElementById('play');
  const W=el.clientWidth,H=el.clientHeight;
  cv.width=W;cv.height=H;
  const pad=.09;
  R=Math.min(W*(1-pad*2)/((COLS-.5)*Math.sqrt(3)),H*(1-pad*2)/(1.5*(ROWS-1)+2));
  const DX=Math.sqrt(3)*R,DY=1.5*R;
  GX=(W-(COLS-.5)*DX)/2+DX/2;
  GY=(H-((ROWS-1)*DY+2*R))/2+R;
  draw();
}

// ══════════════════════════════════════════════════════
//  INPUT BLOCK CHECK
// ══════════════════════════════════════════════════════
function isBlocked(){
  if(document.getElementById('round-transition')) return true;
  if(document.getElementById('winner-transition')) return true;
  if(document.getElementById('zoom-overlay')) return true;
  if(document.getElementById('ov-r')?.classList.contains('show')) return true;
  if(document.getElementById('ov-g')?.classList.contains('show')) return true;
  if(document.getElementById('match-summary')?.classList.contains('show')) return true;
  return false;
}

// ══════════════════════════════════════════════════════
//  INPUT EVENTS
// ══════════════════════════════════════════════════════
function sxy(e){
  const rect=cv.getBoundingClientRect();
  const sx=cv.width/rect.width,sy=cv.height/rect.height;
  const src=e.touches?e.changedTouches[0]:e;
  return {px:(src.clientX-rect.left)*sx,py:(src.clientY-rect.top)*sy};
}
cv.addEventListener('mousemove',e=>{
  if(isBlocked()){cv.style.cursor='default';return;}
  const {px,py}=sxy(e),cell=cellAt(px,py);
  const nh=cell?cell.id:null;
  if(nh!==hovId){hovId=nh;draw();}
  cv.style.cursor=cell?'pointer':'default';
});
cv.addEventListener('mouseleave',()=>{hovId=null;draw();});
cv.addEventListener('click',e=>{
  if(isBlocked()) return;
  unlockAudio();
  const {px,py}=sxy(e),cell=cellAt(px,py);
  if(!cell) return; onCell(cell.id);
});
cv.addEventListener('dblclick',e=>{
  if(isBlocked()) return;
  const {px,py}=sxy(e),cell=cellAt(px,py);
  if(!cell) return; showZoom(cell);
});
cv.addEventListener('touchend',e=>{
  if(isBlocked()){e.preventDefault();return;}
  e.preventDefault();unlockAudio();
  const {px,py}=sxy(e),cell=cellAt(px,py);
  if(!cell) return; onCell(cell.id);
},{passive:false});

// ══════════════════════════════════════════════════════
//  ZOOM OVERLAY
// ══════════════════════════════════════════════════════
function showZoom(cell){
  const old=document.getElementById('zoom-overlay');
  if(old) old.remove();
  zoomedCell=cell;draw();
  const col=cell.owner?teamFill[cell.owner]:'#5b21b6';
  const bg=cell.owner?darken(teamFill[cell.owner],.4):'#1a0a3a';
  const el=document.createElement('div');
  el.id='zoom-overlay';
  el.innerHTML=`
    <div class="zoom-card" style="border-color:${col}40">
      <div class="zoom-letter" style="color:${col};text-shadow:4px 4px 0 ${darken(col,.4)},0 0 40px ${col}88">${cell.letter}</div>
      <div class="zoom-owner" style="color:${col}">${cell.owner?names[cell.owner]:'غير مُعيَّن'}</div>
      <button class="zoom-close" onclick="closeZoom()">✕</button>
    </div>`;
  el.addEventListener('click',e=>{ if(e.target===el) closeZoom(); });
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('zoom-visible'));
}
function closeZoom(){
  const el=document.getElementById('zoom-overlay');
  if(!el) return;
  el.classList.remove('zoom-visible');
  setTimeout(()=>{el.remove();zoomedCell=null;draw();},280);
}

// ══════════════════════════════════════════════════════
//  GAME LOGIC
// ══════════════════════════════════════════════════════
function pickTeam(t){
  if(isBlocked()) return;
  unlockAudio();
  pendingTeam=t;
  document.getElementById('btn-g').classList.toggle('active',t==='green');
  document.getElementById('btn-o').classList.toggle('active',t==='orange');
  document.getElementById('chk-g').className='chk'+(t==='green'?' g':'');
  document.getElementById('chk-o').className='chk'+(t==='orange'?' o':'');
  if(selId){doAssign(selId,t);clearSt();}else draw();
}

function onCell(id){
  if(pendingTeam){doAssign(id,pendingTeam);clearSt();return;}
  const cell=cells.find(c=>c.id===id);
  if(!cell) return;
  // reveal mode: first click reveals
  if(revealMode&&!cell.revealed&&!cell.owner){
    cell.revealed=true;playSelectSound();draw();return;
  }
  if(!cell.owner){
    doAssign(id,'green');
  } else if(cell.owner==='green'){
    doAssign(id,'orange');
  } else if(cell.owner==='orange'){
    undoStack.push({id,prevOwner:cell.owner});
    cell.owner=null;playUnselectSound();
    moveHistory.unshift({team:'clear',letter:cell.letter,num:'—',action:'clear'});
    if(moveHistory.length>8) moveHistory.pop();
    renderHistory();draw();
  }
}

function doAssign(id,team){
  if(roundEnded) return; // round already decided — ignore further clicks
  const cell=cells.find(c=>c.id===id);
  if(!cell){clearSt();draw();return;}
  undoStack.push({id,prevOwner:cell.owner});
  if(undoStack.length>30) undoStack.shift();
  const wasOwned=cell.owner;
  cell.owner=team;
  if(revealMode) cell.revealed=true;
  playClick(team);
  if(!wasOwned){
    moveNum++;
    moveHistory.unshift({team,letter:cell.letter,num:moveNum,action:'claim'});
    if(moveHistory.length>8) moveHistory.pop();
  } else if(wasOwned!==team){
    moveHistory.unshift({team,letter:cell.letter,num:'↺',action:'change',from:wasOwned});
    if(moveHistory.length>8) moveHistory.pop();
  }
  renderHistory();draw();
  if(won(team)){
    roundEnded=true; // lock — no more scoring this round
    wins[team]++;
    updateScore();
    setTimeout(()=>{
      playWin();
      wins[team]>=winsToWin?showGameWin(team):showRoundWin(team);
    },380);
  }
}

function clearSt(){
  pendingTeam=null;selId=null;
  ['btn-g','btn-o'].forEach(id=>document.getElementById(id).classList.remove('active'));
  document.getElementById('chk-g').className='chk';
  document.getElementById('chk-o').className='chk';
  draw();
}

// ── UNDO ──
function undoMove(){
  if(!undoStack.length) return;
  const {id,prevOwner}=undoStack.pop();
  const cell=cells.find(c=>c.id===id);
  if(!cell) return;
  cell.owner=prevOwner;
  if(revealMode&&!prevOwner) cell.revealed=false;
  playUnselectSound();
  moveHistory.unshift({team:'undo',letter:cell.letter,num:'↩',action:'undo'});
  if(moveHistory.length>8) moveHistory.pop();
  renderHistory();draw();
}

// ── SWAP TEAMS ──
function swapTeams(){
  // swap names
  const tmp=names.green; names.green=names.orange; names.orange=tmp;
  // swap colors
  [teamFill.green,teamFill.orange]=[teamFill.orange,teamFill.green];
  [teamBorder.green,teamBorder.orange]=[teamBorder.orange,teamBorder.green];
  [teamZone.green,teamZone.orange]=[teamZone.orange,teamZone.green];
  // swap wins
  [wins.green,wins.orange]=[wins.orange,wins.green];
  // swap cell ownership
  cells.forEach(c=>{
    if(c.owner==='green') c.owner='orange';
    else if(c.owner==='orange') c.owner='green';
  });
  // re-assign undo stack owners
  undoStack.forEach(u=>{
    if(u.prevOwner==='green') u.prevOwner='orange';
    else if(u.prevOwner==='orange') u.prevOwner='green';
  });
  // Update inputs
  document.getElementById('name-g').value=names.green;
  document.getElementById('name-o').value=names.orange;
  syncNames();updateScore();applyTeamColors();draw();
  // Flash swap btn
  const btn=document.getElementById('swap-btn');
  if(btn){btn.style.transform='rotate(180deg)';setTimeout(()=>btn.style.transform='',400);}
}

// ── REVEAL MODE TOGGLE ──
function toggleReveal(){
  revealMode=!revealMode;
  cells.forEach(c=>{ c.revealed=!revealMode||!!c.owner; });
  const btn=document.getElementById('reveal-btn');
  if(btn) btn.classList.toggle('active-tool',revealMode);
  draw();
}

// ── FULLSCREEN ──
function toggleFullscreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{});
  } else {
    document.exitFullscreen().catch(()=>{});
  }
}
document.addEventListener('fullscreenchange',()=>{
  const btn=document.getElementById('fs-btn');
  if(btn) btn.textContent=document.fullscreenElement?'⛶':'⛶';
  resize();
});

// ══════════════════════════════════════════════════════
//  HISTORY
// ══════════════════════════════════════════════════════
function renderHistory(){
  const el=document.getElementById('history-list');
  if(!el) return;
  if(!moveHistory.length){el.innerHTML='<div class="hist-empty">لا توجد حركات بعد</div>';return;}
  el.innerHTML=moveHistory.map(m=>{
    if(m.action==='clear'||m.action==='undo'){
      const uc=m.action==='undo'?'#a855f7':'#ef4444';
      const ul=m.action==='undo'?'تراجع':'حُذف';
      return `<div class="hist-item hist-clear">
        <span class="hist-dot" style="background:${uc}"></span>
        <span class="hist-letter hist-letter-muted">${m.letter}</span>
        <span class="hist-action-label" style="color:${uc}">${ul}</span></div>`;
    }
    if(m.action==='change'){
      const tc=m.team==='green'?teamFill.green:teamFill.orange;
      const fc=m.from==='green'?teamFill.green:teamFill.orange;
      return `<div class="hist-item">
        <span class="hist-num" style="color:${tc}">${m.num}</span>
        <span class="hist-dot-mini" style="background:${fc}"></span>
        <span class="hist-arrow">→</span>
        <span class="hist-dot-mini" style="background:${tc}"></span>
        <span class="hist-letter">${m.letter}</span></div>`;
    }
    const color=m.team==='green'?teamFill.green:teamFill.orange;
    const tname=m.team==='green'?names.green:names.orange;
    return `<div class="hist-item">
      <span class="hist-num" style="color:${color}">#${m.num}</span>
      <span class="hist-dot" style="background:${color}"></span>
      <span class="hist-letter">${m.letter}</span>
      <span class="hist-team-name" style="color:${color}">${tname}</span></div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════
//  NAMES & SCORE
// ══════════════════════════════════════════════════════
function syncNames(){
  names.green =document.getElementById('name-g').value.trim()||'الفريق الأول';
  names.orange=document.getElementById('name-o').value.trim()||'الفريق الثاني';
  document.getElementById('lbl-g').textContent=names.green;
  document.getElementById('lbl-o').textContent=names.orange;
  document.getElementById('sn-g').textContent=names.green;
  document.getElementById('sn-o').textContent=names.orange;
}

function updateScore(){
  ['green','orange'].forEach(t=>{
    const el=document.getElementById(t==='green'?'sv-g':'sv-o');
    if(!el) return;
    const old=parseInt(el.textContent)||0;
    el.textContent=wins[t];
    if(wins[t]>old){ el.classList.remove('score-bump'); void el.offsetWidth; el.classList.add('score-bump'); }
  });
  const wEl=document.getElementById('wins-needed');
  if(wEl) wEl.textContent=winsToWin;
  // series wins
  const sg=document.getElementById('series-g'),so=document.getElementById('series-o');
  if(sg) sg.textContent=seriesWins.green;
  if(so) so.textContent=seriesWins.orange;
}

// ══════════════════════════════════════════════════════
//  SIDE PANEL
// ══════════════════════════════════════════════════════
function toggleSide(){
  sideCollapsed=!sideCollapsed;
  document.getElementById('side').classList.toggle('collapsed',sideCollapsed);
  document.getElementById('collapse-btn').textContent=sideCollapsed?'◀':'▶';
  setTimeout(resize,320);
}

// ══════════════════════════════════════════════════════
//  OVERLAYS
// ══════════════════════════════════════════════════════
function getRoundName(n){
  if(customRoundNames[n-1]) return customRoundNames[n-1];
  const RN=['','الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة'];
  return RN[n]||String(n);
}

function showRoundWin(team){
  const col=teamFill[team];
  const dot=`<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${col};vertical-align:middle;margin-left:6px;box-shadow:0 0 8px ${col}"></span>`;
  document.getElementById('ov-r-e').innerHTML=dot;
  document.getElementById('ov-r-t').textContent=`فاز ${names[team]}!`;
  document.getElementById('ov-r-t').style.color=col;
  document.getElementById('ov-r-s').textContent=`جولة ${getRoundName(rNum)} — يلزم ${winsToWin} جولات للفوز`;
  document.getElementById('ov-r').classList.add('show');
  roundHistory.push({rNum,winner:team,name:getRoundName(rNum)});
}

function showGameWin(team){
  seriesWins[team]++;
  document.getElementById('gw-nm').textContent=names[team];
  document.getElementById('gw-nm').style.color=teamFill[team];
  document.getElementById('gw-sub').textContent=`فاز بـ ${winsToWin} جولات وحسم البطولة!`;
  roundHistory.push({rNum,winner:team,name:getRoundName(rNum),final:true});
  document.getElementById('ov-g').classList.add('show');
  spawnConfetti();
  updateScore();
}

function nextRound(){
  document.getElementById('ov-r').classList.remove('show');
  rNum++;
  document.getElementById('rname').textContent=getRoundName(rNum);
  showRoundTransition(getRoundName(rNum),()=>{build();clearSt();});
}
function newRound(){
  document.getElementById('ov-r').classList.remove('show');
  rNum++;
  document.getElementById('rname').textContent=getRoundName(rNum);
  showRoundTransition(getRoundName(rNum),()=>{build();clearSt();});
}
function newGame(){
  ['ov-r','ov-g'].forEach(id=>document.getElementById(id).classList.remove('show'));
  const ms=document.getElementById('match-summary');
  if(ms) ms.classList.remove('show');
  rNum=1;wins={green:0,orange:0};roundHistory=[];roundEnded=false;
  document.getElementById('rname').textContent=getRoundName(1);
  updateScore();build();clearSt();
}

// ── Match Summary ──
function showMatchSummary(){
  document.getElementById('ov-g').classList.remove('show');
  const el=document.getElementById('match-summary');
  if(!el) return;
  const rows=roundHistory.map(r=>{
    const wc=teamFill[r.winner];
    const wn=names[r.winner];
    return `<div class="summary-row">
      <span class="summary-rname">جولة ${r.name}</span>
      <span class="summary-winner" style="color:${wc}">${wn}</span>
      <span class="summary-dot" style="background:${wc}"></span>
    </div>`;
  }).join('');
  const gc=teamFill[wins.green>wins.orange?'green':'orange'];
  const gn=names[wins.green>wins.orange?'green':'orange'];
  el.innerHTML=`
    <div class="summary-card">
      <div class="summary-title">ملخص المباراة</div>
      <div class="summary-final" style="color:${gc}">🏆 ${gn}</div>
      <div class="summary-score">${wins.green} — ${wins.orange}</div>
      <div class="summary-rows">${rows||'<div style="opacity:.5;font-size:.8rem;text-align:center">لا توجد بيانات</div>'}</div>
      <div class="summary-btns">
        <button class="gw-b" onclick="newGame()">لعبة جديدة</button>
        <button class="gw-b gw-b-menu" onclick="goToMenu()">القائمة</button>
      </div>
    </div>`;
  el.classList.add('show');
}

// ══════════════════════════════════════════════════════
//  CONFETTI
// ══════════════════════════════════════════════════════
function spawnConfetti(){
  const wrap=document.getElementById('cf');wrap.innerHTML='';
  const cols=[teamFill.green,teamFill.orange,'#f9e000','#fff','#e879f9','#38bdf8','#f43f5e'];
  for(let i=0;i<120;i++){
    const el=document.createElement('div');el.className='cf';
    const sz=5+Math.random()*11;
    el.style.cssText=`left:${Math.random()*100}vw;width:${sz}px;height:${sz}px;
      background:${cols[Math.floor(Math.random()*cols.length)]};
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-duration:${1.6+Math.random()*2.4}s;
      animation-delay:${Math.random()*1.5}s;
      opacity:${.7+Math.random()*.3};`;
    wrap.appendChild(el);
  }
  setTimeout(()=>wrap.innerHTML='',6500);
}

// ══════════════════════════════════════════════════════
//  ROUND TRANSITION — full canvas cinematic
// ══════════════════════════════════════════════════════
function showRoundTransition(roundName,onDone){
  const old=document.getElementById('round-transition');
  if(old) old.remove();

  const el=document.createElement('div');
  el.id='round-transition';
  el.style.cssText='position:fixed;inset:0;z-index:1000;pointer-events:all;cursor:default;overflow:hidden;';
  const canvas=document.createElement('canvas');
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;';
  el.appendChild(canvas);
  document.body.appendChild(el);

  const c=canvas.getContext('2d');
  let W=window.innerWidth,H=window.innerHeight;
  canvas.width=W;canvas.height=H;

  // ── sound ──
  snd(()=>unlockAudio().then(a=>{ if(!a) return; try {
    // whoosh
    const ob=a.createOscillator(),gb=a.createGain();
    ob.connect(gb);gb.connect(a.destination);ob.type='sawtooth';
    ob.frequency.setValueAtTime(120,a.currentTime);ob.frequency.exponentialRampToValueAtTime(480,a.currentTime+.35);
    gb.gain.setValueAtTime(.18,a.currentTime);gb.gain.exponentialRampToValueAtTime(.001,a.currentTime+.55);
    ob.start(a.currentTime);ob.stop(a.currentTime+.55);
    // sparkle trio
    [880,1100,1320].forEach((f,i)=>{
      const o=a.createOscillator(),g=a.createGain();
      o.connect(g);g.connect(a.destination);o.type='sine';o.frequency.value=f;
      const t=a.currentTime+.3+i*.1;
      g.gain.setValueAtTime(.14,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);
      o.start(t);o.stop(t+.3);
    });
    // low thud
    const ot=a.createOscillator(),gt=a.createGain();
    ot.connect(gt);gt.connect(a.destination);ot.type='sine';
    ot.frequency.setValueAtTime(60,a.currentTime);ot.frequency.exponentialRampToValueAtTime(30,a.currentTime+.4);
    gt.gain.setValueAtTime(.45,a.currentTime);gt.gain.exponentialRampToValueAtTime(.001,a.currentTime+.45);
    ot.start(a.currentTime);ot.stop(a.currentTime+.45);
  } catch(e){} }));

  // ── animated hex particles ──
  const hexParts=Array.from({length:28},(_,i)=>({
    x:Math.random()*W, y:Math.random()*H,
    r:20+Math.random()*50,
    rot:Math.random()*Math.PI*2, rotV:(Math.random()-.5)*.04,
    vx:(Math.random()-.5)*3, vy:-2-Math.random()*4,
    alpha:0, life:0,
    delay:Math.random()*.6,
    color:[teamFill.green,teamFill.orange,'#f9e000','rgba(255,255,255,0.6)'][i%4]
  }));

  let startT=null,phase='in'; // phases: in / hold / out
  const PHASE_IN=.55, PHASE_HOLD=1.8, PHASE_OUT=.55;

  function drawHex(cx,cy,r,rot,alpha,col){
    c.save();c.globalAlpha=alpha;c.translate(cx,cy);c.rotate(rot);
    c.beginPath();
    for(let i=0;i<6;i++){
      const a=(Math.PI/3)*i+Math.PI/6;
      i===0?c.moveTo(r*Math.cos(a),r*Math.sin(a)):c.lineTo(r*Math.cos(a),r*Math.sin(a));
    }
    c.closePath();
    c.strokeStyle=col;c.lineWidth=2.5;c.stroke();
    // inner
    const ri=r*.7;c.beginPath();
    for(let i=0;i<6;i++){const a=(Math.PI/3)*i+Math.PI/6;i===0?c.moveTo(ri*Math.cos(a),ri*Math.sin(a)):c.lineTo(ri*Math.cos(a),ri*Math.sin(a));}
    c.closePath();c.strokeStyle=col;c.lineWidth=1;c.globalAlpha=alpha*.4;c.stroke();
    c.restore();
  }

  function frame(ts){
    if(!startT) startT=ts;
    const t=(ts-startT)/1000;
    c.clearRect(0,0,W,H);

    // ── background wipe ──
    let bgAlpha=0;
    if(t<PHASE_IN) bgAlpha=t/PHASE_IN;
    else if(t<PHASE_IN+PHASE_HOLD) bgAlpha=1;
    else bgAlpha=Math.max(0,1-(t-PHASE_IN-PHASE_HOLD)/PHASE_OUT);

    // Purple gradient bg
    const grad=c.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.7);
    grad.addColorStop(0,'#9b4dca');grad.addColorStop(.5,'#6b21a8');grad.addColorStop(1,'#3b0764');
    c.globalAlpha=bgAlpha;
    c.fillStyle=grad;c.fillRect(0,0,W,H);

    // scanlines vibe
    c.globalAlpha=bgAlpha*.04;
    for(let y=0;y<H;y+=4){c.fillStyle='#000';c.fillRect(0,y,W,2);}

    // ── hex particles ──
    hexParts.forEach(p=>{
      if(t<p.delay) return;
      p.life=Math.min(1,(t-p.delay)/.5);
      p.rot+=p.rotV;
      p.x+=p.vx*(t>PHASE_IN+PHASE_HOLD?.5:1);
      p.y+=p.vy*(t>PHASE_IN+PHASE_HOLD?.3:1);
      const a=t<PHASE_IN+PHASE_HOLD?p.life*.6:Math.max(0,p.life*.6-(t-PHASE_IN-PHASE_HOLD)/PHASE_OUT);
      drawHex(p.x,p.y,p.r,p.rot,a,p.color);
    });

    c.globalAlpha=1;

    // ── "الجولة" label ──
    if(t>PHASE_IN*.3){
      const lp=Math.min(1,(t-PHASE_IN*.3)/(PHASE_IN*.5));
      const ease=lp<.5?2*lp*lp:(4-2*lp)*lp-1;
      const lx=W*.5+80*(1-ease);
      const ly=H*.38;
      const la=ease*(t<PHASE_IN+PHASE_HOLD?1:Math.max(0,1-(t-PHASE_IN-PHASE_HOLD)/PHASE_OUT));
      c.save();c.globalAlpha=la;
      const fs1=Math.min(W*.1,80);
      c.font=`900 ${fs1}px Cairo,sans-serif`;
      c.textAlign='center';c.textBaseline='middle';
      // shadow layers
      c.fillStyle='#7a5c00';
      for(let s=6;s>=1;s--) c.fillText('الجولة',lx+s*1.5,ly+s*2);
      // gradient fill
      const gL=c.createLinearGradient(lx-200,ly-40,lx+200,ly+40);
      gL.addColorStop(0,'#ffe566');gL.addColorStop(.5,'#ffffff');gL.addColorStop(1,'#ffd600');
      c.fillStyle=gL;c.fillText('الجولة',lx,ly);
      // outline
      c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=3;c.lineJoin='round';
      c.strokeText('الجولة',lx,ly);
      c.restore();
    }

    // ── Round name ──
    if(t>PHASE_IN*.55){
      const np=Math.min(1,(t-PHASE_IN*.55)/(PHASE_IN*.5));
      const ease=np<.5?4*np*np*np:(np-1)*(2*np-2)*(2*np-2)+1;
      const sc=.4+ease*.6+Math.sin(Math.max(0,t-PHASE_IN*.8)*6)*(.08*(1-ease));
      const na=ease*(t<PHASE_IN+PHASE_HOLD?1:Math.max(0,1-(t-PHASE_IN-PHASE_HOLD)/PHASE_OUT));
      c.save();
      c.globalAlpha=na;
      c.translate(W*.5,H*.62);c.scale(sc,sc);
      const fs2=Math.min(W*.18,130);
      c.font=`900 ${fs2}px Cairo,sans-serif`;
      c.textAlign='center';c.textBaseline='middle';
      // 3D shadow stack
      c.fillStyle='#7c0000';
      for(let s=10;s>=1;s--) c.fillText(roundName,s*1.8,s*2.2);
      // cyan gradient
      const gN=c.createLinearGradient(0,-fs2*.6,0,fs2*.6);
      gN.addColorStop(0,'#7efeff');gN.addColorStop(.45,'#00dfff');gN.addColorStop(1,'#0077b6');
      c.fillStyle=gN;c.fillText(roundName,0,0);
      // white outline
      c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=4;c.lineJoin='round';
      c.strokeText(roundName,0,0);
      // glow
      c.shadowColor='#00dfff';c.shadowBlur=40;c.fillStyle='rgba(0,220,255,.15)';
      c.fillText(roundName,0,0);c.shadowBlur=0;
      c.restore();
    }

    // ── 3 bouncing dots ──
    if(t>PHASE_IN+.2 && t<PHASE_IN+PHASE_HOLD-.1){
      [teamFill.green,'#f9e000',teamFill.orange].forEach((col,i)=>{
        const bx=W*.5+(i-1)*28, by=H*.82;
        const bp=Math.sin((t-PHASE_IN-.2)*6+i*1.2)*.5+.5;
        c.globalAlpha=.85;
        c.beginPath();c.arc(bx,by-bp*12,7,0,Math.PI*2);
        c.fillStyle=col;c.fill();
        c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=1.5;c.stroke();
      });
      c.globalAlpha=1;
    }

    const total=PHASE_IN+PHASE_HOLD+PHASE_OUT;
    if(t<total){
      requestAnimationFrame(frame);
    } else {
      el.remove();onDone();
    }
  }
  requestAnimationFrame(frame);
}

// ══════════════════════════════════════════════════════
//  WINNER CINEMATIC
// ══════════════════════════════════════════════════════
function showWinnerTransition(team,onDone){
  const old=document.getElementById('winner-transition');
  if(old) old.remove();
  const tc=teamFill[team],ts=teamBorder[team];
  const bgGrad=`linear-gradient(145deg,${darken(tc,.25)},${darken(tc,.4)},${darken(tc,.3)})`;
  const el=document.createElement('div');el.id='winner-transition';
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
  const syms=['⭐','✨','⬡','💫','⬢'];
  for(let i=0;i<24;i++){
    const p=document.createElement('span');p.className='wt-particle';p.textContent=syms[i%syms.length];
    p.style.cssText=`left:${Math.random()*100}vw;top:${80+Math.random()*30}vh;
      font-size:${1+Math.random()*2.5}rem;animation-delay:${.2+Math.random()*.8}s;
      animation-duration:${1.2+Math.random()*1.2}s;color:${[tc,'#f9e000','#fff'][i%3]};`;
    pw.appendChild(p);
  }
  snd(()=>unlockAudio().then(a=>{ if(!a) return; try {
    const ob=a.createOscillator(),gb=a.createGain();
    ob.connect(gb);gb.connect(a.destination);ob.type='sine';
    ob.frequency.setValueAtTime(60,a.currentTime);ob.frequency.exponentialRampToValueAtTime(120,a.currentTime+.2);
    gb.gain.setValueAtTime(.5,a.currentTime);gb.gain.exponentialRampToValueAtTime(.001,a.currentTime+.6);
    ob.start(a.currentTime);ob.stop(a.currentTime+.6);
    [392,523,659,784,1047,1319].forEach((freq,i)=>{ const o=a.createOscillator(),g=a.createGain();
      o.connect(g);g.connect(a.destination);o.type=i<3?'triangle':'sine';o.frequency.value=freq;
      const t=a.currentTime+.1+i*.11;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.28,t+.05);
      g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.5); });
  } catch(e){} }));
  spawnConfetti();
  setTimeout(()=>{
    el.classList.add('wt-exit');
    setTimeout(()=>{ el.remove();if(onDone) onDone(); },700);
  },4000);
}

const _origShowGameWin=showGameWin;
showGameWin=function(team){ showWinnerTransition(team,()=>_origShowGameWin(team)); };

// ══════════════════════════════════════════════════════
//  MENU BACKGROUND
// ══════════════════════════════════════════════════════
let menuAnimId=null,howtoOpen=false;

function initMenuCanvas(){
  const mc=document.getElementById('menu-canvas');
  if(!mc) return;
  const mctx=mc.getContext('2d');
  let W,H,hexes=[];
  function resizeMenu(){W=mc.width=window.innerWidth;H=mc.height=window.innerHeight;buildMenuHexes();}
  function buildMenuHexes(){
    hexes=[];
    const r=Math.max(40,Math.min(W,H)*.08);
    const DX=1.5*r,DY=Math.sqrt(3)*r;
    for(let row=-1;row<Math.ceil(H/DY)+3;row++)
      for(let col=-1;col<Math.ceil(W/DX)+3;col++)
        hexes.push({x:col*DX,y:row*DY+(col%2===1?DY/2:0),r,
          phase:Math.random()*Math.PI*2,speed:.3+Math.random()*.5,
          letter:Math.random()>.45?ALL_LETTERS[Math.floor(Math.random()*ALL_LETTERS.length)]:null,
          scale:.85+Math.random()*.3});
  }
  function frame(){
    mctx.clearRect(0,0,W,H);
    const grad=mctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.4,Math.max(W,H)*.75);
    grad.addColorStop(0,'#7c35c5');grad.addColorStop(.5,'#5b1fa0');grad.addColorStop(1,'#3a0d6e');
    mctx.fillStyle=grad;mctx.fillRect(0,0,W,H);
    const now=performance.now()*.001;
    hexes.forEach(h=>{
      const pulse=.5+.5*Math.sin(now*h.speed+h.phase);
      const alpha=.06+pulse*.12;
      const pts=Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i;return[h.x+h.r*Math.cos(a),h.y+h.r*Math.sin(a)];});
      mctx.beginPath();mctx.moveTo(...pts[0]);for(let i=1;i<6;i++)mctx.lineTo(...pts[i]);mctx.closePath();
      mctx.fillStyle=`rgba(180,140,255,${alpha*.6})`;mctx.fill();
      mctx.strokeStyle=`rgba(200,160,255,${alpha*1.8})`;mctx.lineWidth=1.5;mctx.stroke();
      const ri=h.r*.78;
      mctx.beginPath();Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i;const px=h.x+ri*Math.cos(a),py=h.y+ri*Math.sin(a);i===0?mctx.moveTo(px,py):mctx.lineTo(px,py);});mctx.closePath();
      mctx.strokeStyle=`rgba(220,180,255,${alpha*.9})`;mctx.lineWidth=.6;mctx.stroke();
      if(h.letter){const fs=Math.round(h.r*.52*h.scale);mctx.font=`700 ${fs}px Cairo,sans-serif`;
        mctx.textAlign='center';mctx.textBaseline='middle';
        mctx.fillStyle=`rgba(220,190,255,${alpha*1.4})`;mctx.fillText(h.letter,h.x,h.y);}
    });
    menuAnimId=requestAnimationFrame(frame);
  }
  window.addEventListener('resize',resizeMenu);
  resizeMenu();frame();
}

function stopMenuCanvas(){if(menuAnimId){cancelAnimationFrame(menuAnimId);menuAnimId=null;}}

function toggleHowto(){
  howtoOpen=!howtoOpen;
  document.getElementById('howto-body').classList.toggle('open',howtoOpen);
  document.getElementById('howto-arrow').textContent=howtoOpen?'▲':'▼';
}

// ══════════════════════════════════════════════════════
//  LOGO TEXT SWAP
// ══════════════════════════════════════════════════════
function onGameNameInput(val){
  const v=val.trim();
  const w1=document.getElementById('logo-w1');
  const w2=document.getElementById('logo-w2');
  const w3=document.getElementById('logo-w3');
  if(!v){
    if(w1) w1.textContent='لعبة';
    if(w2) w2.textContent='الخلية';
    if(w3){w3.textContent='';w3.classList.remove('visible');}
  } else {
    if(w1) w1.textContent='لعبة';
    if(w2) w2.textContent='خلية';
    if(w3){w3.textContent=v;w3.classList.add('visible');}
  }
  const ver=document.getElementById('menu-version');
  if(ver) ver.textContent=`v3.0 — ${v||'لعبة الخلية'}`;
}

// ══════════════════════════════════════════════════════
//  COLOR PICKERS
// ══════════════════════════════════════════════════════
function onColorChange(team,hex){
  teamFill[team]=hex;
  teamBorder[team]=darken(hex,.35);
  teamZone[team]=darken(hex,.75);
  applyTeamColors();
  if(cv&&cv.width) draw();
}

// ══════════════════════════════════════════════════════
//  REVEAL MODE toggle (from sidebar button)
//  ALREADY defined above — no duplicate
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
//  START / NAVIGATION
// ══════════════════════════════════════════════════════
function startGame(){
  unlockAudio();
  const gName=document.getElementById('menu-name-g').value.trim()||'الفريق الأول';
  const oName=document.getElementById('menu-name-o').value.trim()||'الفريق الثاني';
  const rawInput=document.getElementById('game-name-input').value.trim();
  const gameName=rawInput?`لعبة خلية ${rawInput}`:'لعبة الخلية';
  const wEl=document.getElementById('wins-needed');
  if(wEl) wEl.textContent=winsToWin;
  // Custom round names from menu
  customRoundNames=[];
  for(let i=1;i<=10;i++){
    const inp=document.getElementById(`custom-round-${i}`);
    customRoundNames.push(inp?inp.value.trim():'');
  }
  document.getElementById('name-g').value=gName;
  document.getElementById('name-o').value=oName;
  document.getElementById('game-title-bar').textContent=gameName;
  document.title=gameName;
  const menuEl=document.getElementById('main-menu');
  const gameEl=document.getElementById('game-screen');
  gameEl.classList.remove('hidden');gameEl.offsetHeight;gameEl.classList.add('visible');
  menuEl.classList.add('fade-out');
  setTimeout(()=>{menuEl.style.display='none';stopMenuCanvas();},500);
  syncNames();build();applyTheme();renderHistory();
  window.addEventListener('resize',resize);
  document.fonts.ready.then(()=>resize());
  resize();updateScore();
  setTimeout(()=>showRoundTransition(getRoundName(1),()=>{}),600);
}

function goToMenu(){
  ['ov-r','ov-g'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('show');});
  const ms=document.getElementById('match-summary');if(ms)ms.classList.remove('show');
  const wt=document.getElementById('winner-transition');if(wt)wt.remove();
  const rt=document.getElementById('round-transition');if(rt)rt.remove();
  const zo=document.getElementById('zoom-overlay');if(zo)zo.remove();
  const menuEl=document.getElementById('main-menu');
  const gameEl=document.getElementById('game-screen');
  menuEl.style.display='';menuEl.classList.remove('fade-out');
  gameEl.classList.remove('visible');
  setTimeout(()=>gameEl.classList.add('hidden'),500);
  setTimeout(()=>initMenuCanvas(),100);
}

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  applyTheme();
  setTimeout(()=>initMenuCanvas(),50);
});
