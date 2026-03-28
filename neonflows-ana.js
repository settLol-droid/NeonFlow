// ── ROOT RESIZE ───────────────────────────────────────────
function setRootH(){
  const r=document.getElementById('root');
  r.style.height=window.innerHeight+'px';
}
setRootH();
window.addEventListener('resize',setRootH);

// ── AUDIO ─────────────────────────────────────────────────
let AC=null;
function getAC(){
  if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}
  return AC;
}
function playTink(){
  const ac=getAC();if(!ac)return;
  const o=ac.createOscillator(),g=ac.createGain();
  o.connect(g);g.connect(ac.destination);
  o.frequency.value=1400;o.type='sine';
  g.gain.setValueAtTime(0.35,ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.18);
  o.start();o.stop(ac.currentTime+0.18);
}
function playFlap(){
  const ac=getAC();if(!ac)return;
  const o=ac.createOscillator(),g=ac.createGain();
  o.connect(g);g.connect(ac.destination);
  o.type='square';
  o.frequency.setValueAtTime(380,ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(180,ac.currentTime+0.1);
  g.gain.setValueAtTime(0.12,ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.1);
  o.start();o.stop(ac.currentTime+0.1);
}
function playLineClear(){
  const ac=getAC();if(!ac)return;
  [440,550,700].forEach((f,i)=>{
    const o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);
    o.frequency.value=f;o.type='square';
    const t=ac.currentTime+i*0.07;
    g.gain.setValueAtTime(0,t);g.gain.setValueAtTime(0.18,t+0.005);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.13);
    o.start(t);o.stop(t+0.13);
  });
}

// ── GAME DATA — shuffled each load ────────────────────────
const GAMES_BASE = [
  {id:'snake',      name:'YILAN',        dev:'@klasik',   emoji:'🐍', color:'#00f0ff'},
  {id:'tetris',     name:'BLOK DÜŞÜŞ',   dev:'@bloklar',  emoji:'🧩', color:'#ff00ff'},
  {id:'flappy',     name:'KANAT ÇIRP',   dev:'@klasik',   emoji:'🐦', color:'#ffdd00'},
  {id:'blockblast', name:'BLOK KIRMA',   dev:'@bloklar',  emoji:'💥', color:'#ff9500'},
  {id:'candy',      name:'ŞEKER PATLA',  dev:'@tatli',    emoji:'🍬', color:'#ff2d55'},
  {id:'space',      name:'UZAY SAVAŞI',  dev:'@galaksi',  emoji:'🚀', color:'#7b2fff'},
  {id:'dino',       name:'DİNOZOR KOŞU', dev:'@chrome',   emoji:'🦕', color:'#888888'},
];
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const GAMES = shuffle([...GAMES_BASE]);

let currentIndex=0,swipeLocked=false,touchStartY=0,touchStartX=0;
const SWIPE_THRESHOLD=95;
const likes=GAMES.map(()=>0);
const liked=GAMES.map(()=>false);

// ── BUILD UI ───────────────────────────────────────────────
function buildSlides(){
  const feed=document.getElementById('feed');
  const rootH=parseInt(document.getElementById('root').style.height)||window.innerHeight;
  const CARD_H=Math.min(Math.floor((rootH-52-64)*0.9),470);
  const CARD_W=Math.min(Math.floor(window.innerWidth*0.88),360);

  GAMES.forEach((game,i)=>{
    const slide=document.createElement('div');
    slide.className='slide';slide.id='slide-'+i;
    slide.style.transform=i===0?'translateY(0)':'translateY(100%)';
    slide.innerHTML=`
      <div class="game-header">
        <div class="game-avatar" style="border-color:${game.color}">${game.emoji}</div>
        <div><div class="game-name">${game.name}</div><div class="game-dev">${game.dev}</div></div>
      </div>
      <div style="position:relative;width:${CARD_W+62}px;">
        <div class="game-card" style="height:${CARD_H}px;width:${CARD_W}px" id="card-${game.id}">
          <div class="score-overlay" id="score-${game.id}">0</div>
          <canvas id="canvas-${game.id}" width="${CARD_W}" height="${CARD_H}"></canvas>
          <div class="gameover-overlay hidden" id="over-${game.id}">
            <div class="gameover-score" id="final-${game.id}">SKOR: 0</div>
            <button class="restart-btn" onclick="playTink();restartGame('${game.id}')">TEKRAR OYNA</button>
          </div>
          <div class="start-overlay" id="start-${game.id}" onclick="playTink();dismissStart('${game.id}')">
            <div class="start-emoji">${game.emoji}</div>
            <div class="start-title">${game.name}</div>
            <button class="restart-btn">BAŞLAT</button>
          </div>
        </div>
        <div class="action-bar">
          <div class="action-btn ${liked[i]?'liked':''}" id="like-btn-${i}" onclick="toggleLike(${i})">
            <div class="icon">${liked[i]?'❤️':'🤍'}</div>
            <div class="count" id="like-count-${i}">${fmtCount(likes[i])}</div>
          </div>
          <div class="action-btn" onclick="showLeaderboard('${game.id}')">
            <div class="icon">🏆</div><div class="count">TOP</div>
          </div>
          <div class="action-btn" onclick="shareGame('${game.id}','${game.name}','${game.emoji}')">
            <div class="icon">↗️</div><div class="count">PAYLAŞ</div>
          </div>
          <div class="action-btn" onclick="showComments('${game.id}','${game.name}')">
            <div class="icon">💬</div><div class="count" id="ccount-${game.id}">0</div>
          </div>
        </div>
      </div>`;
    feed.appendChild(slide);
  });
  buildDots();
}
function buildDots(){
  const dots=document.getElementById('dots');dots.innerHTML='';
  GAMES.forEach((_,i)=>{
    const d=document.createElement('div');
    d.className='dot'+(i===currentIndex?' active':'');d.id='dot-'+i;dots.appendChild(d);
  });
}
function updateDots(){GAMES.forEach((_,i)=>document.getElementById('dot-'+i).className='dot'+(i===currentIndex?' active':''));}
function fmtCount(n){return n>=1000?(n/1000).toFixed(1)+'K':n;}

// ── SWIPE — Instagram tarzı gerçek zamanlı sürükleme ──────
let _swipeDragging=false,_swipeActive=false;
const SWIPE_COMMIT=72;
const FLING_PXMS=0.32;
const T_MS=520;
const T_EASE=`transform ${T_MS}ms cubic-bezier(0.16,1,0.3,1)`;

let _touchLastY=0,_touchLastT=0,_flingVy=0;

function _rubberAtEdge(dy){
  const atFirst=currentIndex===0&&dy>0;
  const atLast=currentIndex===GAMES.length-1&&dy<0;
  if(!atFirst&&!atLast)return dy;
  const a=Math.abs(dy);
  const damp=a<48?0.26:0.2+(0.06*Math.exp(-(a-48)/120));
  return Math.sign(dy)*Math.min(a*damp,a*0.32+8);
}

function _preAdjacentSlides(){
  const p=currentIndex>0?document.getElementById('slide-'+(currentIndex-1)):null;
  const n=currentIndex<GAMES.length-1?document.getElementById('slide-'+(currentIndex+1)):null;
  if(p){p.style.transition='none';p.style.transform='translateY(-100%)';}
  if(n){n.style.transition='none';n.style.transform='translateY(100%)';}
}

document.addEventListener('touchstart',e=>{
  touchStartY=e.touches[0].clientY;
  touchStartX=e.touches[0].clientX;
  _swipeDragging=false;
  _swipeActive=true;
  _touchLastY=touchStartY;
  _touchLastT=performance.now();
  _flingVy=0;
  if(!swipeLocked)_preAdjacentSlides();
},{passive:true});

document.addEventListener('touchmove',e=>{
  if(!_swipeActive||swipeLocked)return;
  const y=e.touches[0].clientY;
  const t=performance.now();
  const dt=t-_touchLastT;
  if(dt>0&&dt<80)_flingVy=(y-_touchLastY)/dt;
  _touchLastY=y;
  _touchLastT=t;

  const dy=y-touchStartY;
  const dx=Math.abs(e.touches[0].clientX-touchStartX);

  if(!_swipeDragging){
    if(Math.abs(dy)<10)return;
    if(dx>Math.abs(dy)*0.65){_swipeActive=false;return;}
    _swipeDragging=true;
  }

  const cur=document.getElementById('slide-'+currentIndex);
  const offset=_rubberAtEdge(dy);

  cur.style.transition='none';
  cur.style.transform=`translate3d(0,${offset}px,0)`;

  if(dy<0&&currentIndex<GAMES.length-1){
    const n=document.getElementById('slide-'+(currentIndex+1));
    if(n){n.style.transition='none';n.style.transform=`translate3d(0,calc(100% + ${offset}px),0)`;}
  }else if(dy>0&&currentIndex>0){
    const p=document.getElementById('slide-'+(currentIndex-1));
    if(p){p.style.transition='none';p.style.transform=`translate3d(0,calc(-100% + ${offset}px),0)`;}
  }
},{passive:true});

document.addEventListener('touchend',e=>{
  _swipeActive=false;
  if(swipeLocked||!_swipeDragging){_swipeDragging=false;return;}
  _swipeDragging=false;
  const dy=e.changedTouches[0].clientY-touchStartY;
  const wantNext=currentIndex<GAMES.length-1&&(dy<-SWIPE_COMMIT||_flingVy<-FLING_PXMS);
  const wantPrev=currentIndex>0&&(dy>SWIPE_COMMIT||_flingVy>FLING_PXMS);

  if(wantNext){
    goTo(currentIndex+1,'up');
  }else if(wantPrev){
    goTo(currentIndex-1,'down');
  }else{
    const cur=document.getElementById('slide-'+currentIndex);
    void cur.offsetHeight;
    cur.style.transition=T_EASE;cur.style.transform='translate3d(0,0,0)';
    if(dy<0&&currentIndex<GAMES.length-1){
      const n=document.getElementById('slide-'+(currentIndex+1));
      if(n){void n.offsetHeight;n.style.transition=T_EASE;n.style.transform='translate3d(0,100%,0)';}
    }else if(dy>0&&currentIndex>0){
      const p=document.getElementById('slide-'+(currentIndex-1));
      if(p){void p.offsetHeight;p.style.transition=T_EASE;p.style.transform='translate3d(0,-100%,0)';}
    }
  }
},{passive:true});

function goTo(index,dir){
  const prev=currentIndex;currentIndex=index;
  const ps=document.getElementById('slide-'+prev);
  const ns=document.getElementById('slide-'+index);
  void ps.offsetHeight;void ns.offsetHeight;
  ps.style.transition=T_EASE;ns.style.transition=T_EASE;
  ps.style.transform=dir==='up'?'translate3d(0,-100%,0)':'translate3d(0,100%,0)';
  ns.style.transform='translate3d(0,0,0)';
  updateDots();pauseGame(GAMES[prev].id);startGame(GAMES[index].id);
}
function toggleLock(){
  swipeLocked=!swipeLocked;
  const btn=document.getElementById('lock-btn');
  btn.textContent=swipeLocked?'🔒 KİLİTLİ':'🔓 KAYDIR';
  btn.classList.toggle('locked',swipeLocked);
}

// ── LIKES ─────────────────────────────────────────────────
// localStorage cache key: 'liked_uid' → JSON array of game ids
function getLikedCache(){
  const user=getUser();if(!user)return[];
  try{return JSON.parse(localStorage.getItem('liked_'+user.uid)||'[]');}catch{return[];}
}
function setLikedCache(arr){
  const user=getUser();if(!user)return;
  localStorage.setItem('liked_'+user.uid,JSON.stringify(arr));
}

async function loadFirebaseLikes(){
  if(!window._db)return;
  // Load global counts
  for(let i=0;i<GAMES.length;i++){
    try{
      const d=await window._fs.getDoc(window._fs.doc(window._db,'likes',GAMES[i].id));
      likes[i]=d.exists()?d.data().count||0:0;
      document.getElementById('like-count-'+i).textContent=fmtCount(likes[i]);
    }catch{}
  }
  // Load user liked state — first from localStorage cache (instant), then verify with Firebase
  const user=getUser();
  if(!user)return;
  const cache=getLikedCache();
  // Apply cache immediately so UI is instant
  GAMES.forEach((g,i)=>{
    liked[i]=cache.includes(g.id);
    const btn=document.getElementById('like-btn-'+i);if(!btn)return;
    btn.classList.toggle('liked',liked[i]);
    btn.querySelector('.icon').textContent=liked[i]?'❤️':'🤍';
  });
  // Then verify/sync from Firebase
  try{
    const d=await window._fs.getDoc(window._fs.doc(window._db,'userLikes',user.uid));
    const likedIds=d.exists()?d.data().games||[]:[];
    setLikedCache(likedIds); // update cache
    GAMES.forEach((g,i)=>{
      liked[i]=likedIds.includes(g.id);
      const btn=document.getElementById('like-btn-'+i);if(!btn)return;
      btn.classList.toggle('liked',liked[i]);
      btn.querySelector('.icon').textContent=liked[i]?'❤️':'🤍';
    });
  }catch{}
}

async function toggleLike(i){
  const user=getUser();
  if(!user){openProfile();return;}
  if(!window._db)return;
  const gid=GAMES[i].id;
  // Sadece 1 beğeni — zaten beğendiyse işlem yapma
  if(liked[i])return;
  liked[i]=true;
  likes[i]++;
  const btn=document.getElementById('like-btn-'+i);
  btn.classList.add('liked');
  btn.querySelector('.icon').textContent='❤️';
  document.getElementById('like-count-'+i).textContent=fmtCount(likes[i]);
  // localStorage cache güncelle
  const cache=getLikedCache();
  if(!cache.includes(gid)){cache.push(gid);setLikedCache(cache);}
  try{
    // Global sayaç +1
    await window._fs.setDoc(window._fs.doc(window._db,'likes',gid),{count:window._fs.increment(1)},{merge:true});
    // Kullanıcının beğeni listesi güncelle
    const uRef=window._fs.doc(window._db,'userLikes',user.uid);
    const uDoc=await window._fs.getDoc(uRef);
    const arr=uDoc.exists()?uDoc.data().games||[]:[];
    if(!arr.includes(gid)){arr.push(gid);await window._fs.setDoc(uRef,{games:arr});}
  }catch{}
}

// ── LEADERBOARD ───────────────────────────────────────────
async function showLeaderboard(gameId){
  const user=getUser();
  const gameName=GAMES.find(g=>g.id===gameId)?.name||gameId;
  const m=document.createElement('div');m.className='modal-overlay';
  m.innerHTML=`
    <div style="font-size:18px;letter-spacing:3px;color:var(--accent);margin-bottom:2px">🏆 LİDERLİK</div>
    <div style="font-size:10px;color:var(--dim);letter-spacing:2px;margin-bottom:12px">${gameName}</div>
    <div id="lb-list" style="display:flex;flex-direction:column;gap:6px;min-width:240px;min-height:60px;align-items:center;justify-content:center">
      <div style="color:var(--dim);font-size:11px">Yükleniyor...</div>
    </div>
    ${!user?`<div style="margin-top:10px;padding:10px 16px;background:rgba(0,240,255,0.07);border:1px solid var(--accent2);border-radius:10px;font-size:11px;color:var(--accent2);text-align:center;width:240px">Sıralamaya girmek için<br><span onclick="this.closest('.modal-overlay').remove();openProfile()" style="font-weight:bold;cursor:pointer;text-decoration:underline">giriş yapın</span> 👤</div>`:''}
    <button onclick="this.parentElement.remove()" style="margin-top:14px;padding:8px 22px;background:var(--accent);border:none;border-radius:20px;color:#fff;font-family:inherit;font-size:11px;letter-spacing:2px;cursor:pointer">KAPAT</button>`;
  document.body.appendChild(m);
  const lb=document.getElementById('lb-list');if(!lb)return;
  if(!window._db){
    lb.innerHTML='<div style="color:var(--dim);font-size:11px;padding:10px;text-align:center">İnternet bağlantısı gerekli</div>';return;
  }
  try{
    const q=window._fs.query(window._fs.collection(window._db,'scores_'+gameId),window._fs.orderBy('score','desc'),window._fs.limit(100));
    const snap=await window._fs.getDocs(q);
    const all=snap.docs.map(d=>d.data());
    // Misafirleri filtrele, kullanıcı başına en yüksek skoru al (uid varsa uid'ye, yoksa isme göre)
    const seen=new Map();
    for(const s of all){
      if(!s.name||s.name==='Misafir')continue;
      const key=s.uid||s.name;
      if(!seen.has(key)||s.score>seen.get(key).score) seen.set(key,s);
    }
    const scores=[...seen.values()].sort((a,b)=>b.score-a.score).slice(0,10);
    if(!scores.length){
      lb.innerHTML='<div style="color:var(--dim);font-size:11px;padding:10px">Henüz skor yok! İlk sen gir 🏆</div>';return;
    }
    const myName=user?.name;
    lb.innerHTML=scores.map((s,i)=>{
      const isMe=myName&&(s.name===myName);
      return`<div style="display:flex;gap:14px;align-items:center;width:240px;background:${isMe?'rgba(0,240,255,0.08)':'rgba(255,255,255,0.04)'};padding:9px 14px;border-radius:10px;border:1px solid ${isMe?'var(--accent2)':'var(--border)'}">
        <span style="color:${i<3?['#ffd700','#c0c0c0','#cd7f32'][i]:'var(--dim)'};font-size:11px;width:22px;font-weight:bold">#${i+1}</span>
        <span style="flex:1;font-size:12px;color:${isMe?'var(--accent2)':'#fff'}">${s.name}${isMe?' ◀':''}</span>
        <span style="color:var(--accent2);font-size:13px;font-weight:bold">${s.score}</span>
      </div>`;
    }).join('');
  }catch(e){
    lb.innerHTML='<div style="color:var(--dim);font-size:11px;padding:10px;text-align:center">Yüklenemedi, tekrar dene</div>';
  }
}
async function saveScore(gid,sc){
  if(sc<=0)return;
  const user=getUser();
  // localStorage'a her zaman kaydet (kişisel geçmiş)
  const name=user?user.name:'Misafir';
  const local=JSON.parse(localStorage.getItem('scores_'+gid)||'[]');
  local.push({name,score:sc,ts:Date.now()});
  local.sort((a,b)=>b.score-a.score);
  localStorage.setItem('scores_'+gid,JSON.stringify(local.slice(0,20)));
  // Firebase'e sadece giriş yapmış kullanıcılar, kullanıcı başına 1 kayıt (upsert)
  if(!window._db||!user)return;
  try{
    const docId=gid+'_'+user.uid;
    const ref=window._fs.doc(window._db,'scores_'+gid,docId);
    const existing=await window._fs.getDoc(ref);
    if(!existing.exists()||sc>existing.data().score){
      await window._fs.setDoc(ref,{name:user.name,score:sc,uid:user.uid,ts:window._fs.serverTimestamp()});
    }
  }catch(e){console.log('score save err',e);}
}
function shareGame(id,name,emoji){
  const gs=gameStates[id];
  const score=gs?(gs.score||0):0;
  const txt=emoji+' '+name+' — NeonFlow\nSkorun: '+score+' \uD83C\uDFAE\nSen de dene! #NeonFlow';
  const waUrl='https://wa.me/?text='+encodeURIComponent(txt);
  const m=document.createElement('div');m.className='modal-overlay';m.id='share-modal';
  m.innerHTML=
    '<div style="font-size:15px;letter-spacing:3px;color:var(--accent2);margin-bottom:4px">'+emoji+' PAYLAŞ</div>'+
    '<div style="font-size:11px;color:var(--dim);margin-bottom:14px;letter-spacing:1px">SKORUN: <span style="color:#fff;font-weight:bold">'+score+'</span></div>'+
    '<div style="background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:12px 16px;width:240px;font-size:11px;color:rgba(255,255,255,0.55);line-height:1.7;margin-bottom:14px;letter-spacing:0.5px">'+txt.replace(/\n/g,'<br>')+'</div>'+
    '<a href="'+waUrl+'" target="_blank" style="display:flex;align-items:center;gap:10px;width:240px;padding:12px 18px;border-radius:12px;text-decoration:none;background:rgba(37,211,102,0.12);border:1px solid #25d166;color:#25d166;font-family:inherit;font-size:12px;letter-spacing:2px;margin-bottom:8px">'+
    '<span style="font-size:20px">\uD83D\uDCAC</span> WHATSAPP\'TA PAYLAŞ</a>'+
    '<button id="ig-share-btn" style="display:flex;align-items:center;gap:10px;width:240px;padding:12px 18px;border-radius:12px;background:rgba(225,48,108,0.12);border:1px solid #e1306c;color:#e1306c;font-family:inherit;font-size:12px;letter-spacing:2px;cursor:pointer;margin-bottom:8px">'+
    '<span style="font-size:20px">\uD83D\uDCF8</span> INSTAGRAM\'A PAYLAŞ</button>'+
    '<button id="copy-btn" style="display:flex;align-items:center;gap:10px;width:240px;padding:10px 18px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--dim);font-family:inherit;font-size:11px;letter-spacing:2px;cursor:pointer;margin-bottom:14px">'+
    '<span style="font-size:16px">\uD83D\uDCCB</span> METNİ KOPYALA</button>'+
    '<button id="close-share" style="padding:8px 22px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--dim);font-family:inherit;font-size:10px;letter-spacing:2px;cursor:pointer">KAPAT</button>';
  document.body.appendChild(m);
  document.getElementById('close-share').onclick=()=>m.remove();
  document.getElementById('copy-btn').onclick=()=>doShare(txt,'copy');
  document.getElementById('ig-share-btn').onclick=()=>doShare(txt,'ig');
}
function doShare(txt,mode){
  const copyDone=()=>{
    if(mode==='ig'){
      const m=document.getElementById('share-modal');if(m)m.remove();
      const p=document.createElement('div');p.className='modal-overlay';
      p.innerHTML='<div style="font-size:36px;margin-bottom:12px">\uD83D\uDCF8</div>'+
        '<div style="font-size:13px;letter-spacing:2px;color:#e1306c;margin-bottom:8px">METİN KOPYALANDI!</div>'+
        '<div style="font-size:11px;color:var(--dim);text-align:center;max-width:240px;line-height:1.8;margin-bottom:18px">Instagram\'ı aç \u2192<br>Hikaye veya gönderi oluştur \u2192<br>Metni yapıştır \uD83D\uDCCB</div>'+
        '<button onclick="window.location.href=\'instagram://\';setTimeout(()=>window.open(\'https://www.instagram.com\',\'_blank\'),800)" style="display:flex;align-items:center;gap:8px;padding:11px 22px;background:rgba(225,48,108,0.15);border:1px solid #e1306c;border-radius:20px;color:#e1306c;font-family:inherit;font-size:11px;letter-spacing:2px;cursor:pointer;margin-bottom:10px"><span>\uD83D\uDCF2</span> INSTAGRAM\'I AÇ</button>'+
        '<button onclick="this.closest(\'.modal-overlay\').remove()" style="padding:8px 22px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--dim);font-family:inherit;font-size:10px;letter-spacing:2px;cursor:pointer">TAMAM</button>';
      document.body.appendChild(p);
    } else {
      const btn=document.getElementById('copy-btn');
      if(btn){btn.style.color='#00f0ff';btn.style.borderColor='#00f0ff';btn.innerHTML='\u2713 KOPYALANDI!';}
    }
  };
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(copyDone).catch(()=>fallbackCopy(txt,copyDone));}
  else fallbackCopy(txt,copyDone);
}
function fallbackCopy(txt,cb){const ta=document.createElement('textarea');ta.value=txt;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();cb&&cb();}


function getUser(){return window._currentUser||null;}
let _authMode='login';
function getMyScores(){
  const user=getUser();
  const myName=user?user.name:null;
  return GAMES_BASE.map(g=>{
    const local=JSON.parse(localStorage.getItem('scores_'+g.id)||'[]');
    const mine=myName?local.filter(s=>s.name===myName):[];
    const best=mine.length?Math.max(...mine.map(s=>s.score)):0;
    return{...g,best};
  });
}
async function getMyLikedGames(){
  const user=getUser();if(!user||!window._db)return[];
  try{
    const d=await window._fs.getDoc(window._fs.doc(window._db,'userLikes',user.uid));
    const likedIds=d.exists()?d.data().games||[]:[];
    return GAMES_BASE.filter(g=>likedIds.includes(g.id));
  }catch{return[];}
}
async function openProfile(){
  const user=getUser();
  const m=document.createElement('div');m.className='modal-overlay';m.id='profile-modal';
  if(user){
    m.innerHTML=`<div style="width:100%;max-height:82vh;overflow-y:auto;display:flex;flex-direction:column;align-items:center;gap:0;padding:18px 16px 10px">
      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#000;margin-bottom:6px">${user.name[0].toUpperCase()}</div>
      <div style="font-size:14px;color:#fff;font-weight:bold;margin-bottom:2px">${user.name}</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:14px;letter-spacing:1px">${user.email}</div>
      <div style="color:var(--dim);font-size:11px;margin-bottom:10px">Yükleniyor...</div>
      <button onclick="this.closest('.modal-overlay').remove()" style="width:260px;padding:9px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--dim);font-family:inherit;font-size:10px;letter-spacing:2px;cursor:pointer;margin-bottom:8px">KAPAT</button>
      <button onclick="logoutUser(this)" style="width:260px;padding:9px;background:rgba(255,45,85,0.1);border:1px solid var(--accent);border-radius:20px;color:var(--accent);font-family:inherit;font-size:11px;letter-spacing:2px;cursor:pointer">ÇIKIŞ YAP</button>
    </div>`;
    document.body.appendChild(m);
    // Load async data
    const [likedGames]=await Promise.all([getMyLikedGames()]);
    const scores=getMyScores();
    const inner=m.querySelector('div');if(!inner)return;
    const scoreHtml=scores.map(g=>`
      <div style="display:flex;align-items:center;gap:10px;padding:7px 12px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid var(--border)">
        <span style="font-size:14px">${g.emoji}</span>
        <span style="flex:1;font-size:10px;letter-spacing:1px">${g.name}</span>
        <span style="color:var(--accent2);font-size:12px;font-weight:bold">${g.best>0?g.best:'—'}</span>
      </div>`).join('');
    const likeHtml=likedGames.length
      ?likedGames.map(g=>`<span style="font-size:18px" title="${g.name}">${g.emoji}</span>`).join('')
      :'<span style="font-size:10px;color:var(--dim)">Henüz beğeni yok</span>';
    inner.innerHTML=`
      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#000;margin-bottom:6px">${user.name[0].toUpperCase()}</div>
      <div style="font-size:14px;color:#fff;font-weight:bold;margin-bottom:2px">${user.name}</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:14px;letter-spacing:1px">${user.email}</div>
      <div style="width:260px;margin-bottom:12px">
        <div style="font-size:10px;color:var(--accent2);letter-spacing:2px;margin-bottom:6px">❤️ BEĞENİLENLER</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;background:rgba(255,255,255,0.04);padding:10px;border-radius:10px;border:1px solid var(--border);min-height:38px;align-items:center">${likeHtml}</div>
      </div>
      <div style="width:260px;margin-bottom:16px">
        <div style="font-size:10px;color:var(--accent2);letter-spacing:2px;margin-bottom:6px">🏆 SKORLARIM</div>
        <div style="display:flex;flex-direction:column;gap:5px">${scoreHtml}</div>
      </div>
      <button onclick="this.closest('.modal-overlay').remove()" style="width:260px;padding:9px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--dim);font-family:inherit;font-size:10px;letter-spacing:2px;cursor:pointer;margin-bottom:8px">KAPAT</button>
      <button onclick="logoutUser(this)" style="width:260px;padding:9px;background:rgba(255,45,85,0.1);border:1px solid var(--accent);border-radius:20px;color:var(--accent);font-family:inherit;font-size:11px;letter-spacing:2px;cursor:pointer">ÇIKIŞ YAP</button>`;
  }else{
    _authMode='login';
    m.innerHTML=`
      <div style="font-size:22px;margin-bottom:8px">👤</div>
      <div style="display:flex;gap:0;margin-bottom:16px;border:1px solid var(--border);border-radius:10px;overflow:hidden;width:240px">
        <button id="tab-login" onclick="authTab('login')" style="flex:1;padding:9px;background:#ff2d55;border:none;color:#fff;font-family:inherit;font-size:11px;letter-spacing:2px;cursor:pointer">GİRİŞ</button>
        <button id="tab-reg" onclick="authTab('reg')" style="flex:1;padding:9px;background:transparent;border:none;color:var(--dim);font-family:inherit;font-size:11px;letter-spacing:2px;cursor:pointer">KAYIT</button>
      </div>
      <div id="auth-name-row" style="display:none;width:240px"><input class="auth-input" id="auth-name" placeholder="Ad Soyad" style="width:100%;margin-bottom:6px"></div>
      <input class="auth-input" id="auth-email" placeholder="E-posta" style="width:240px;margin-bottom:6px">
      <input class="auth-input" id="auth-pass" type="password" placeholder="Şifre" style="width:240px;margin-bottom:4px">
      <div id="auth-err" style="font-size:10px;color:var(--accent);min-height:16px;text-align:center;margin-bottom:6px;width:240px"></div>
      <button id="auth-submit" onclick="doAuth()" style="width:240px;padding:11px;background:#ff2d55;border:none;border-radius:10px;color:#fff;font-family:inherit;font-size:12px;letter-spacing:2px;cursor:pointer;margin-bottom:10px">GİRİŞ YAP</button>
      <button onclick="this.closest('.modal-overlay').remove()" style="padding:8px 22px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--dim);font-family:inherit;font-size:10px;letter-spacing:2px;cursor:pointer">KAPAT</button>`;
  }
  document.body.appendChild(m);
}
function authTab(mode){
  _authMode=mode;
  const isReg=mode==='reg';
  const el=document.getElementById('auth-name-row');if(el)el.style.display=isReg?'block':'none';
  const tl=document.getElementById('tab-login');if(tl){tl.style.background=isReg?'transparent':'#ff2d55';tl.style.color=isReg?'var(--dim)':'#fff';}
  const tr=document.getElementById('tab-reg');if(tr){tr.style.background=isReg?'#ff2d55':'transparent';tr.style.color=isReg?'#fff':'var(--dim)';}
  const sb=document.getElementById('auth-submit');if(sb)sb.textContent=isReg?'HESAP OLUŞTUR':'GİRİŞ YAP';
  const er=document.getElementById('auth-err');if(er)er.textContent='';
}
async function doAuth(){
  const isReg=_authMode==='reg';
  const email=(document.getElementById('auth-email').value||'').trim();
  const pass=document.getElementById('auth-pass').value||'';
  const err=t=>{const e=document.getElementById('auth-err');if(e)e.textContent=t;};
  if(!window._auth||!window._fAuth){err('Firebase henüz yüklenmedi, lütfen bekleyin...');return;}
  if(!email||!pass){err('Tüm alanları doldurun');return;}
  const sb=document.getElementById('auth-submit');
  if(sb){sb.disabled=true;sb.textContent='...';}
  try{
    if(isReg){
      const nameEl=document.getElementById('auth-name');
      const name=(nameEl?nameEl.value:'').trim();
      if(!name){err('Ad Soyad gerekli');if(sb){sb.disabled=false;sb.textContent='HESAP OLUŞTUR';}return;}
      const cred=await window._fAuth.createUserWithEmailAndPassword(window._auth,email,pass);
      await window._fAuth.updateProfile(cred.user,{displayName:name});
      window._currentUser={name,email,uid:cred.user.uid};
      if(window._db){try{await window._fs.setDoc(window._fs.doc(window._db,'users',cred.user.uid),{name,email});}catch{}}
    }else{
      const cred=await window._fAuth.signInWithEmailAndPassword(window._auth,email,pass);
      const name=cred.user.displayName||cred.user.email;
      window._currentUser={name,email:cred.user.email,uid:cred.user.uid};
    }
    const pm=document.getElementById('profile-modal');if(pm)pm.remove();
    updateProfileBtn();
  }catch(e){
    const msgs={
      'auth/email-already-in-use':'Bu e-posta zaten kayıtlı',
      'auth/invalid-email':'Geçersiz e-posta adresi',
      'auth/weak-password':'Şifre en az 6 karakter olmalı',
      'auth/user-not-found':'E-posta veya şifre yanlış',
      'auth/wrong-password':'E-posta veya şifre yanlış',
      'auth/invalid-credential':'E-posta veya şifre yanlış',
      'auth/too-many-requests':'Çok fazla deneme. Lütfen bekleyin.',
      'auth/network-request-failed':'İnternet bağlantısı yok',
      'auth/unauthorized-domain':'Bu domain Firebase\'de yetkisiz. Dosyayı localhost üzerinden aç.',
      'auth/operation-not-allowed':'E-posta/şifre girişi Firebase Console\'da kapalı'
    };
    const msg=msgs[e.code]||(e.message&&e.message.includes('auth/')?e.message:null)||(e.code==='auth/unauthorized-domain'||(!e.code&&e.message&&e.message.includes('domain'))?'Domain yetkisiz — dosyayı tarayıcıda aç':null)||e.message||'Bilinmeyen hata. Tarayıcıda aç ve internet bağlantını kontrol et.';
    err(msg);
    if(sb){sb.disabled=false;sb.textContent=isReg?'HESAP OLUŞTUR':'GİRİŞ YAP';}
  }
}
function logoutUser(btn){window._fAuth.signOut(window._auth);window._currentUser=null;btn.closest('.modal-overlay').remove();updateProfileBtn();}
function updateProfileBtn(){
  const btn=document.getElementById('profile-btn');if(!btn)return;
  const u=getUser();
  btn.textContent=u?u.name[0].toUpperCase():'👤';
  btn.classList.toggle('logged-in',!!u);
}

// ── COMMENTS ─────────────────────────────────────────────
async function updateCommentCount(gid){
  const el=document.getElementById('ccount-'+gid);if(!el)return;
  if(!window._db){el.textContent='0';return;}
  try{
    const snap=await window._fs.getDocs(window._fs.collection(window._db,'cmts_'+gid));
    el.textContent=snap.size||'0';
  }catch{el.textContent='0';}
}
async function showComments(gid,gname){
  const user=getUser();
  const m=document.createElement('div');m.className='modal-overlay';m.id='cmt-modal';
  const inputHtml=user
    ?`<div class="comment-input-row"><input class="comment-input" id="cmt-input" placeholder="Yorum yaz..."><button class="comment-send" onclick="postComment('${gid}')">GÖNDER</button></div>`
    :`<div style="font-size:10px;color:var(--dim);text-align:center;margin-top:8px;padding:8px;background:rgba(255,255,255,0.04);border-radius:8px">Yorum yapmak için <span onclick="this.closest('.modal-overlay').remove();openProfile()" style="color:var(--accent2);cursor:pointer">hesabına giriş yap</span></div>`;
  m.innerHTML=`
    <div style="font-size:14px;letter-spacing:2px;color:var(--accent2);margin-bottom:2px">💬 YORUMLAR</div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:10px">${gname}</div>
    <div class="comment-box" style="width:min(280px,88vw)">
      <div class="comment-list" id="cmt-list-${gid}"><div style="color:var(--dim);font-size:11px;text-align:center;padding:16px">Yükleniyor...</div></div>
      ${inputHtml}
    </div>
    <button onclick="this.closest('.modal-overlay').remove()" style="margin-top:10px;padding:8px 22px;background:transparent;border:1px solid var(--border);border-radius:20px;color:var(--dim);font-family:inherit;font-size:10px;letter-spacing:2px;cursor:pointer">KAPAT</button>`;
  document.body.appendChild(m);
  await loadComments(gid);
}
async function loadComments(gid){
  const el=document.getElementById('cmt-list-'+gid);if(!el)return;
  if(!window._db){el.innerHTML='<div style="color:var(--dim);font-size:11px;text-align:center;padding:16px">İnternet bağlantısı gerekli</div>';return;}
  try{
    const q=window._fs.query(window._fs.collection(window._db,'cmts_'+gid),window._fs.orderBy('ts','desc'),window._fs.limit(50));
    const snap=await window._fs.getDocs(q);
    const cmts=snap.docs.map(d=>d.data());
    el.innerHTML=cmts.length
      ?cmts.map(c=>`<div class="comment-item"><div class="comment-author">${c.author}</div>${c.text}</div>`).join('')
      :'<div style="color:var(--dim);font-size:11px;text-align:center;padding:16px">Henüz yorum yok. İlk yorumu sen yaz!</div>';
  }catch{
    el.innerHTML='<div style="color:var(--dim);font-size:11px;text-align:center;padding:16px">Yorumlar yüklenemedi</div>';
  }
}
async function postComment(gid){
  const inp=document.getElementById('cmt-input');
  const text=inp.value.trim();if(!text)return;
  const user=getUser();if(!user)return;
  if(!window._db)return;
  inp.value='';
  try{
    await window._fs.addDoc(window._fs.collection(window._db,'cmts_'+gid),{author:user.name,text,ts:window._fs.serverTimestamp()});
  }catch{}
  await loadComments(gid);
  updateCommentCount(gid);
}
// ── KEYBOARD ─────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  const id=GAMES[currentIndex].id;
  if(id==='snake'){const m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(m){e.preventDefault();sDir(m[0],m[1]);}}
  if(id==='tetris'){if(e.key==='ArrowLeft')tMove(-1);if(e.key==='ArrowRight')tMove(1);if(e.key==='ArrowDown')tDrop();if(e.key==='ArrowUp')tRotate();if(e.key===' '){e.preventDefault();tHardDrop();}}
  if(id==='flappy'&&e.key===' '){e.preventDefault();flap();}
});



// ── START ─────────────────────────────────────────────────
buildSlides();
updateProfileBtn();
GAMES.forEach(g=>updateCommentCount(g.id));
// İlk oyunu init et ama başlatma ekranı göster
initGame(GAMES[0].id);
pauseGame(GAMES[0].id);
const _firstStart=document.getElementById('start-'+GAMES[0].id);
if(_firstStart)_firstStart.classList.remove('hidden');
function onDbReady(){loadFirebaseLikes();}
if(window._dbReady)onDbReady();
else window.addEventListener('dbready',onDbReady);
