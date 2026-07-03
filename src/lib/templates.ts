// Generates standalone HTML strings for each template type.
// Each generator takes a config object and returns a complete HTML document.

const baseHead = (title: string) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;900&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:'Tajawal',sans-serif;background:linear-gradient(135deg,#F0F2F8,#fff);min-height:100dvh;color:#222;text-align:center;overflow-x:hidden}
  .card{min-height:100dvh;width:100%;padding:clamp(16px,3vw,32px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
  h1{font-size:clamp(1.4rem,3.2vw,2.2rem);color:#9A73E8}
  .btn{display:inline-block;border:none;cursor:pointer;font:inherit;font-weight:800;padding:14px 28px;border-radius:999px;background:linear-gradient(135deg,#9A73E8,#7c5fd6);color:#fff;font-size:1rem;box-shadow:0 6px 0 rgba(0,0,0,.12);transition:transform .15s}
  .btn:hover{transform:translateY(-2px)}
  .btn:active{transform:translateY(2px)}
  .opt{display:block;width:100%;text-align:start;background:#F0F2F8;border:3px solid transparent;border-radius:20px;padding:14px 18px;margin:8px 0;font:inherit;font-weight:700;cursor:pointer;transition:all .15s}
  .opt:hover{border-color:#9A73E8;background:#fff}
  .opt.correct{background:#8EE870;border-color:#5cc04a;color:#fff}
  .opt.wrong{background:#FF6C67;border-color:#e04a45;color:#fff}
  .score{font-size:1.5rem;font-weight:900;color:#9A73E8;margin-bottom:1rem}
  input[type=text]{font:inherit;font-weight:700;padding:8px 14px;border-radius:14px;border:2px solid #ddd;background:#fff;text-align:center;width:140px;margin:0 4px}
  input[type=text].ok{border-color:#8EE870;background:#e8fbe0}
  input[type=text].bad{border-color:#FF6C67;background:#ffe8e7}
  .pair{padding:14px 18px;border-radius:18px;background:#F0F2F8;font-weight:700;cursor:pointer;border:3px solid transparent;transition:all .15s;font-size:1.05rem}
  .pair.sel{border-color:#9A73E8;background:#fff}
  .pair.done{background:#8EE870;color:#fff;cursor:default;border-color:#5cc04a}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;width:100%;max-width:980px}
  .wheel-wrap{position:relative;width:min(70vmin,440px);aspect-ratio:1;margin:0 auto 20px}
  .wheel{width:100%;height:100%;border-radius:50%;transition:transform 4s cubic-bezier(.17,.67,.3,1.05);box-shadow:0 0 0 8px #fff,0 12px 40px rgba(0,0,0,.2)}
  .pointer{position:absolute;top:-12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-top:28px solid #FF6C67;z-index:2}
  .result{font-size:1.4rem;font-weight:900;margin-top:12px;color:#9A73E8;min-height:2em}
  .progress{height:8px;background:#F0F2F8;border-radius:99px;overflow:hidden;margin-bottom:18px;width:100%;max-width:780px}
  .progress>div{height:100%;background:linear-gradient(90deg,#8EE870,#2FEAFF);transition:width .3s}
  .stage{width:100%;max-width:880px;display:flex;flex-direction:column;align-items:center;gap:14px}
  #game{width:100%;max-width:780px}
</style></head><body><div class="card">`;

const tail = `</div></body></html>`;

function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
function escapeJs(s: string) { return JSON.stringify(s); }

export interface QuizConfig { title: string; questions: { q: string; options: string[]; correct: number }[]; }
export function generateQuiz(c: QuizConfig): string {
  const data = c.questions.map(q => ({ q: q.q, options: q.options, correct: q.correct }));
  return baseHead(c.title) + `
  <h1>${escapeHtml(c.title)}</h1>
  <div class="progress"><div id="bar" style="width:0"></div></div>
  <div id="game"></div>
  <script>
    const Q = ${JSON.stringify(data)};
    let i = 0, score = 0;
    const game = document.getElementById('game'), bar = document.getElementById('bar');
    function render(){
      bar.style.width = (i/Q.length*100)+'%';
      if(i>=Q.length){ game.innerHTML = '<div class="score">🎉 نتيجتك: '+score+'/'+Q.length+'</div><button class="btn" onclick="location.reload()">العب مجدداً</button>'; bar.style.width='100%'; return; }
      const q = Q[i];
      game.innerHTML = '<h2 style="margin-bottom:18px;font-size:1.3rem">'+q.q+'</h2>'+
        q.options.map((o,k)=>'<button class="opt" data-k="'+k+'">'+o+'</button>').join('');
      game.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
        const k = +b.dataset.k;
        game.querySelectorAll('.opt').forEach(x=>x.disabled=true);
        if(k===q.correct){ b.classList.add('correct'); score++; }
        else { b.classList.add('wrong'); game.querySelectorAll('.opt')[q.correct].classList.add('correct'); }
        setTimeout(()=>{ i++; render(); }, 900);
      });
    }
    render();
  </script>` + tail;
}

export interface BlanksConfig { title: string; sentences: { text: string; answers: string[] }[]; }
export function generateBlanks(c: BlanksConfig): string {
  return baseHead(c.title) + `
  <h1>${escapeHtml(c.title)}</h1>
  <div id="game"></div>
  <button class="btn" id="check" style="margin-top:18px">تحقّق</button>
  <div class="result" id="res"></div>
  <script>
    const S = ${JSON.stringify(c.sentences)};
    const game = document.getElementById('game');
    game.innerHTML = S.map((s,si)=>{
      let ai = 0;
      const html = s.text.split('___').reduce((acc,part,k,arr)=>acc+part+(k<arr.length-1?'<input type="text" data-s="'+si+'" data-a="'+(ai++)+'">':''),'');
      return '<p style="margin:14px 0;font-size:1.15rem;line-height:2">'+html+'</p>';
    }).join('');
    document.getElementById('check').onclick = ()=>{
      let ok=0,total=0;
      S.forEach((s,si)=>s.answers.forEach((a,ai)=>{
        total++;
        const inp = document.querySelector('input[data-s="'+si+'"][data-a="'+ai+'"]');
        const v = (inp.value||'').trim();
        if(v && v === a){ inp.classList.remove('bad'); inp.classList.add('ok'); ok++; }
        else { inp.classList.remove('ok'); inp.classList.add('bad'); }
      }));
      document.getElementById('res').textContent = '✅ '+ok+' / '+total;
    };
  </script>` + tail;
}

export interface MatchingConfig {
  title: string;
  pairs?: { a: string; b: string }[];
  images?: string[];
  backUrl?: string;
}
export function generateMatching(c: MatchingConfig): string {
  if (c.images && c.images.length && c.backUrl) {
    return generateMatchingImages(c.title, c.images, c.backUrl);
  }
  return baseHead(c.title) + `
  <h1>${escapeHtml(c.title)}</h1>
  <p style="margin-bottom:18px;color:#666">طابق العناصر ببعضها</p>
  <div class="grid" id="game"></div>
  <div class="result" id="res"></div>
  <script>
    const P = ${JSON.stringify(c.pairs || [])};
    const items = [];
    P.forEach((p,i)=>{ items.push({t:p.a,id:i,side:'L'}); items.push({t:p.b,id:i,side:'R'}); });
    items.sort(()=>Math.random()-0.5);
    const game = document.getElementById('game');
    game.innerHTML = items.map((it,k)=>'<button class="pair" data-id="'+it.id+'" data-k="'+k+'">'+it.t+'</button>').join('');
    let sel=null, done=0;
    game.querySelectorAll('.pair').forEach(b=>b.onclick=()=>{
      if(b.classList.contains('done')) return;
      if(!sel){ sel=b; b.classList.add('sel'); return; }
      if(sel===b){ sel.classList.remove('sel'); sel=null; return; }
      if(sel.dataset.id===b.dataset.id){ sel.classList.add('done'); b.classList.add('done'); sel.classList.remove('sel'); done++;
        if(done===P.length) document.getElementById('res').textContent='🎉 أحسنت!';
      } else { const s=sel; setTimeout(()=>s.classList.remove('sel'),400); }
      sel=null;
    });
  </script>` + tail;
}

function generateMatchingImages(title: string, images: string[], backUrl: string): string {
  return baseHead(title) + `
  <style>
    body{padding:0!important;background:linear-gradient(135deg,#fef3ff,#eef2ff)!important}
    .card{display:contents!important}
    .mm-app{min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:16px;gap:14px;box-sizing:border-box}
    .mm-app h1{margin:0;font-size:clamp(1.1rem,2.6vw,1.7rem);color:#7a4fd6;text-align:center}
    .mm-info{display:flex;gap:18px;font-weight:800;color:#7a4fd6}
    .mm-grid{display:grid;gap:10px;width:100%;max-width:900px}
    .mm-card{aspect-ratio:3/4;perspective:1000px;cursor:pointer}
    .mm-inner{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d;border-radius:14px}
    .mm-card.flip .mm-inner,.mm-card.done .mm-inner{transform:rotateY(180deg)}
    .mm-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:14px;background-size:cover;background-position:center;box-shadow:0 6px 18px rgba(109,91,255,.25);border:3px solid #fff}
    .mm-back{background-image:url('${backUrl}')}
    .mm-front{transform:rotateY(180deg);background-color:#fff}
    .mm-card.done .mm-front{box-shadow:0 0 0 4px #8EE870,0 6px 20px rgba(142,232,112,.5)}
    .mm-result{font-size:1.4rem;font-weight:800;color:#7a4fd6;text-align:center;min-height:40px}
  </style>
  <div class="mm-app">
    <h1>${escapeHtml(title)}</h1>
    <div class="mm-info"><span>الحركات: <span id="moves">0</span></span><span>المتبقي: <span id="rem">0</span></span></div>
    <div class="mm-grid" id="grid"></div>
    <div class="mm-result" id="res"></div>
  </div>
  <script>
    const IMGS = ${JSON.stringify(images)};
    const deck = [];
    IMGS.forEach((u,i)=>{ deck.push({u,id:i}); deck.push({u,id:i}); });
    for(let i=deck.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
    const n = deck.length;
    const cols = Math.min(6, Math.ceil(Math.sqrt(n*0.75)));
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = 'repeat('+cols+',1fr)';
    grid.innerHTML = deck.map((c,k)=>'<div class="mm-card" data-k="'+k+'" data-id="'+c.id+'"><div class="mm-inner"><div class="mm-face mm-back"></div><div class="mm-face mm-front" style="background-image:url(\\''+c.u+'\\')"></div></div></div>').join('');
    let a=null, lock=false, done=0, moves=0;
    const remEl=document.getElementById('rem'), movesEl=document.getElementById('moves');
    remEl.textContent = IMGS.length;
    grid.querySelectorAll('.mm-card').forEach(el=>el.onclick=()=>{
      if(lock||el.classList.contains('done')||el.classList.contains('flip'))return;
      el.classList.add('flip');
      if(!a){ a=el; return; }
      moves++; movesEl.textContent=moves;
      const b=el;
      if(a.dataset.id===b.dataset.id){ a.classList.add('done'); b.classList.add('done'); a=null; done++; remEl.textContent=IMGS.length-done;
        if(done===IMGS.length){ document.getElementById('res').textContent='🎉 أحسنت! في '+moves+' حركة'; }
      } else { lock=true; setTimeout(()=>{ a.classList.remove('flip'); b.classList.remove('flip'); a=null; lock=false; },800); }
    });
  </script>` + tail;
}

export interface WheelConfig { title: string; items: string[]; }
export function generateWheel(c: WheelConfig): string {
  const colors = ["#9A73E8","#FF6C67","#FFCC35","#8EE870","#2FEAFF"];
  const n = Math.max(c.items.length, 2);
  const slice = 360/n;
  const grad = c.items.map((_,i)=>`${colors[i%colors.length]} ${i*slice}deg ${(i+1)*slice}deg`).join(",");
  return baseHead(c.title) + `
  <h1>${escapeHtml(c.title)}</h1>
  <div class="wheel-wrap">
    <div class="pointer"></div>
    <div class="wheel" id="wheel" style="background:conic-gradient(${grad})"></div>
  </div>
  <button class="btn" id="spin">🎡 لُف العجلة</button>
  <div class="result" id="res"></div>
  <script>
    const items = ${JSON.stringify(c.items)};
    const slice = 360/items.length;
    let rot = 0;
    document.getElementById('spin').onclick = ()=>{
      const pick = Math.floor(Math.random()*items.length);
      rot += 360*5 + (360 - (pick*slice + slice/2));
      document.getElementById('wheel').style.transform='rotate('+rot+'deg)';
      document.getElementById('res').textContent='';
      setTimeout(()=>document.getElementById('res').textContent='⭐ '+items[pick], 4100);
    };
  </script>` + tail;
}

export interface PuzzleConfig { title: string; imageUrl: string; rows: number; cols: number; }
export function generatePuzzle(c: PuzzleConfig): string {
  return baseHead(c.title) + `
  <style>
    body{padding:0!important;background:linear-gradient(135deg,#fef3ff,#eef2ff)!important}
    .card{display:contents!important}
    .pz-app{min-height:100dvh;display:flex;flex-direction:column;align-items:center;padding:14px;gap:12px;box-sizing:border-box}
    .pz-head{width:100%;max-width:1100px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .pz-head h1{margin:0;font-size:clamp(1.1rem,2.4vw,1.6rem);color:#7a4fd6}
    .pz-head .hint{font-size:.85rem;color:#666}
    .pz-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .pz-toolbar button{border:none;border-radius:999px;padding:8px 16px;font-weight:800;cursor:pointer;color:#fff;background:linear-gradient(135deg,#9A73E8,#6D5BFF);box-shadow:0 4px 12px rgba(109,91,255,.3)}
    .pz-toolbar select{border:2px solid #d8cdf6;border-radius:999px;padding:6px 12px;background:#fff;font-weight:700;color:#7a4fd6}
    .pz-main{display:grid;grid-template-columns:auto 220px;gap:18px;align-items:start;width:100%;max-width:1100px}
    @media(max-width:820px){.pz-main{grid-template-columns:1fr}}
    .pz-board-wrap{display:flex;flex-direction:column;gap:14px;align-items:center;min-width:0}
    #board{position:relative;background:#faf7ff;border-radius:18px;border:3px dashed #b9a4f0;box-shadow:inset 0 4px 14px rgba(0,0,0,.05);touch-action:none}
    #tray{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:14px;background:#fff;border-radius:18px;border:2px solid #e6dffb;min-height:120px;width:100%;max-width:520px;box-sizing:border-box}
    .pz-side{display:flex;flex-direction:column;align-items:center;gap:10px;background:#fff;border-radius:18px;padding:14px;border:2px solid #e6dffb;position:sticky;top:14px}
    .pz-side .ref-label{font-size:.85rem;color:#7a4fd6;font-weight:800}
    .pz-side .ref{width:190px;height:190px;border-radius:14px;object-fit:cover;background:#f5f0ff;border:2px solid #d8cdf6}
    .pz-side .progress{font-size:.85rem;color:#666;font-weight:700}
    .pz-side .bar{width:100%;height:8px;background:#eee;border-radius:99px;overflow:hidden}
    .pz-side .bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#9A73E8,#6D5BFF);transition:width .3s}
    .pp{cursor:grab;user-select:none;-webkit-user-drag:none;touch-action:none;filter:drop-shadow(0 2px 0 rgba(0,0,0,.5)) drop-shadow(0 4px 6px rgba(0,0,0,.25));transition:transform .1s}
    .pp:active{cursor:grabbing;transform:scale(1.05)}
    .pp.placed{cursor:default;filter:none;pointer-events:none}
    .pz-result{font-size:1.4rem;font-weight:900;color:#7a4fd6;text-align:center;min-height:1.5em}
  </style>
  <div class="pz-app">
    <div class="pz-head">
      <h1>🧩 ${escapeHtml(c.title)}</h1>
      <div class="pz-toolbar">
        <label style="font-size:.8rem;color:#666;font-weight:700">الصعوبة:</label>
        <select id="difficulty">
          <option value="3">سهل (3×3)</option>
          <option value="4" selected>متوسط (4×4)</option>
          <option value="5">صعب (5×5)</option>
          <option value="6">خبير (6×6)</option>
        </select>
        <button id="hint" style="background:linear-gradient(135deg,#FFB347,#FF8A65)">💡 تلميح</button>
        <button id="reset">↺ خلط جديد</button>
      </div>
    </div>
    <div class="pz-main">
      <div class="pz-board-wrap">
        <div id="board"></div>
        <div id="tray"></div>
        <div class="pz-result" id="res"></div>
      </div>
      <aside class="pz-side">
        <span class="ref-label">📷 الصورة المرجعية</span>
        <img id="refImg" class="ref" src="${c.imageUrl}" alt="reference" crossorigin="anonymous">
        <div class="progress"><span id="progTxt">0 / 0</span></div>
        <div class="bar"><i id="progBar"></i></div>
      </aside>
    </div>
  </div>
  <script>
    const SRC = ${JSON.stringify(c.imageUrl)};
    let ROWS=${c.rows||4}, COLS=${c.cols||4};
    const board=document.getElementById('board'), tray=document.getElementById('tray'), res=document.getElementById('res');
    const progTxt=document.getElementById('progTxt'), progBar=document.getElementById('progBar');
    const diffSel=document.getElementById('difficulty');
    diffSel.value=String(ROWS);

    let SIZE=400, PW=0, PH=0, KNOB=0, PAD=0;
    let hEdge=[], vEdge=[];
    let imgReady=false;

    function calcSize(){
      const wrap=board.parentNode;
      const avail=Math.min(wrap.clientWidth-4, window.innerHeight*0.65, 560);
      SIZE=Math.max(260, Math.floor(avail));
      PW=SIZE/COLS; PH=SIZE/ROWS;
      KNOB=Math.min(PW,PH)*0.18;
      PAD=Math.ceil(KNOB+6);
      board.style.width=SIZE+'px'; board.style.height=SIZE+'px';
    }

    function loadImage(){
      return new Promise((resolve)=>{
        const img=new Image();
        img.onload=()=>{ imgReady=true; resolve(true); };
        img.onerror=()=>{ imgReady=true; resolve(false); };
        img.src=SRC;
      });
    }

    function genEdges(){
      hEdge=[]; vEdge=[];
      for(let r=0;r<=ROWS;r++){const row=[];for(let c=0;c<COLS;c++)row.push(r===0||r===ROWS?0:(Math.random()<0.5?1:-1));hEdge.push(row);}
      for(let r=0;r<ROWS;r++){const row=[];for(let c=0;c<=COLS;c++)row.push(c===0||c===COLS?0:(Math.random()<0.5?1:-1));vEdge.push(row);}
    }

    function piecePath(r,c){
      const w=PW,h=PH,k=KNOB;
      // Shared edges must be complementary: one side protrudes while the
      // neighbouring side cuts inward. The stored sign describes the edge
      // from the top/left piece perspective; top/left faces invert it.
      const top=-hEdge[r][c],right=vEdge[r][c+1],bottom=hEdge[r+1][c],left=-vEdge[r][c];
      const x0=PAD,y0=PAD;
      let d='M '+x0+' '+y0;
      if(top===0){d+=' L '+(x0+w)+' '+y0;}
      else{const m=x0+w/2,dir=top;d+=' L '+(m-k)+' '+y0+' C '+(m-k)+' '+(y0-2*k*dir)+' '+(m+k)+' '+(y0-2*k*dir)+' '+(m+k)+' '+y0+' L '+(x0+w)+' '+y0;}
      if(right===0){d+=' L '+(x0+w)+' '+(y0+h);}
      else{const m=y0+h/2,dir=right;d+=' L '+(x0+w)+' '+(m-k)+' C '+(x0+w+2*k*dir)+' '+(m-k)+' '+(x0+w+2*k*dir)+' '+(m+k)+' '+(x0+w)+' '+(m+k)+' L '+(x0+w)+' '+(y0+h);}
      if(bottom===0){d+=' L '+x0+' '+(y0+h);}
      else{const m=x0+w/2,dir=bottom;d+=' L '+(m+k)+' '+(y0+h)+' C '+(m+k)+' '+(y0+h+2*k*dir)+' '+(m-k)+' '+(y0+h+2*k*dir)+' '+(m-k)+' '+(y0+h)+' L '+x0+' '+(y0+h);}
      if(left===0){d+=' L '+x0+' '+y0;}
      else{const m=y0+h/2,dir=left;d+=' L '+x0+' '+(m+k)+' C '+(x0-2*k*dir)+' '+(m+k)+' '+(x0-2*k*dir)+' '+(m-k)+' '+x0+' '+(m-k)+' L '+x0+' '+y0;}
      return d+' Z';
    }

    // Use CSS background-image + SVG clip-path. Each piece is a div sized W×H
    // with the FULL puzzle image as background, positioned so the (r,c) cell
    // lands at (PAD,PAD). Then an inline <svg> clipPath cuts the jigsaw shape.
    function makePieceEl(r,c){
      const W=PW+PAD*2, H=PH+PAD*2;
      const d=piecePath(r,c);
      const clipId='clip_'+r+'_'+c+'_'+Math.random().toString(36).slice(2,7);
      const wrap=document.createElement('div');
      wrap.className='pp';
      wrap.dataset.idx=r*COLS+c;
      wrap.dataset.r=r; wrap.dataset.c=c;
      wrap.style.cssText='position:relative;width:'+W+'px;height:'+H+'px';

      // background layer (clipped)
      const bg=document.createElement('div');
      bg.style.cssText='position:absolute;inset:0;background-image:url("'+SRC+'");background-repeat:no-repeat;background-size:'+SIZE+'px '+SIZE+'px;background-position:'+(PAD-c*PW)+'px '+(PAD-r*PH)+'px;clip-path:url(#'+clipId+');-webkit-clip-path:url(#'+clipId+')';
      wrap.appendChild(bg);

      // SVG with clipPath def + outline stroke on top
      const svgNs='http://www.w3.org/2000/svg';
      const svg=document.createElementNS(svgNs,'svg');
      svg.setAttribute('width',W); svg.setAttribute('height',H);
      svg.setAttribute('viewBox','0 0 '+W+' '+H);
      svg.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:visible';
      const defs=document.createElementNS(svgNs,'defs');
      const cp=document.createElementNS(svgNs,'clipPath');
      cp.setAttribute('id',clipId);
      cp.setAttribute('clipPathUnits','userSpaceOnUse');
      const cpPath=document.createElementNS(svgNs,'path');
      cpPath.setAttribute('d',d);
      cp.appendChild(cpPath); defs.appendChild(cp); svg.appendChild(defs);
      // Cartoon-style double outline: bold black + crisp white inner highlight.
      const outline=document.createElementNS(svgNs,'path');
      outline.setAttribute('d',d);
      outline.setAttribute('fill','none');
      outline.setAttribute('stroke','#111');
      outline.setAttribute('stroke-width','2.2');
      outline.setAttribute('stroke-linejoin','round');
      outline.setAttribute('stroke-linecap','round');
      svg.appendChild(outline);
      const inner=document.createElementNS(svgNs,'path');
      inner.setAttribute('d',d);
      inner.setAttribute('fill','none');
      inner.setAttribute('stroke','#fff');
      inner.setAttribute('stroke-width','1');
      inner.setAttribute('stroke-linejoin','round');
      inner.setAttribute('stroke-opacity','.85');
      svg.appendChild(inner);
      wrap.appendChild(svg);
      return wrap;
    }

    let placed=0, total=0, pieces=[];
    function updateProgress(){
      progTxt.textContent=placed+' / '+total;
      progBar.style.width=(total?placed/total*100:0)+'%';
    }

    async function build(){
      ROWS=COLS=parseInt(diffSel.value,10)||4;
      total=ROWS*COLS; placed=0; res.textContent=''; updateProgress();
      board.innerHTML=''; tray.innerHTML=''; pieces=[];
      calcSize();
      if(!imgReady) await loadImage();
      genEdges();
      // slots
      for(let r=0;r<ROWS;r++) for(let cc=0;cc<COLS;cc++){
        const slot=document.createElement('div');
        slot.dataset.idx=r*COLS+cc;
        slot.style.cssText='position:absolute;left:'+(cc*PW)+'px;top:'+(r*PH)+'px;width:'+PW+'px;height:'+PH+'px;border:1px dashed rgba(154,115,232,.35);box-sizing:border-box';
        board.appendChild(slot);
      }
      const list=[]; for(let r=0;r<ROWS;r++) for(let cc=0;cc<COLS;cc++) list.push({r,c:cc});
      list.sort(()=>Math.random()-0.5);
      list.forEach(p=>{
        const el=makePieceEl(p.r,p.c);
        el.style.margin=(-PAD)+'px';
        attachDrag(el,p);
        tray.appendChild(el);
        pieces.push(el);
      });
    }

    function attachDrag(el,p){
      let dragging=false, ox=0, oy=0;
      const W=PW+PAD*2, H=PH+PAD*2;
      const start=(cx,cy,e)=>{
        if(el.classList.contains('placed')) return;
        const r=el.getBoundingClientRect();
        ox=cx-r.left; oy=cy-r.top;
        document.body.appendChild(el);
        el.style.margin='0';
        el.style.position='fixed';
        el.style.left=(cx-ox)+'px'; el.style.top=(cy-oy)+'px';
        el.style.zIndex='9999';
        dragging=true;
        try{el.setPointerCapture(e.pointerId);}catch(_){}
      };
      const move=(cx,cy)=>{ if(!dragging)return; el.style.left=(cx-ox)+'px'; el.style.top=(cy-oy)+'px'; };
      const end=(cx,cy)=>{
        if(!dragging) return; dragging=false;
        const br=board.getBoundingClientRect();
        // Center of piece body (not bbox)
        const px=cx-ox+PAD+PW/2, py=cy-oy+PAD+PH/2;
        const tx=px-br.left, ty=py-br.top;
        if(tx>0&&tx<SIZE&&ty>0&&ty<SIZE){
          const targetC=Math.floor(tx/PW), targetR=Math.floor(ty/PH);
          if(targetR===p.r && targetC===p.c){
            board.appendChild(el);
            el.style.position='absolute';
            el.style.left=(p.c*PW - PAD)+'px';
            el.style.top=(p.r*PH - PAD)+'px';
            el.style.zIndex='10';
            el.classList.add('placed');
            placed++; updateProgress();
            if(placed===total){ res.textContent='🎉 أحسنت! أكملت اللغز'; }
            return;
          }
        }
        // back to tray
        tray.appendChild(el);
        el.style.position=''; el.style.left=''; el.style.top=''; el.style.zIndex=''; el.style.margin=(-PAD)+'px';
      };
      el.addEventListener('pointerdown',e=>{e.preventDefault();start(e.clientX,e.clientY,e);});
      el.addEventListener('pointermove',e=>{if(dragging){e.preventDefault();move(e.clientX,e.clientY);}});
      el.addEventListener('pointerup',e=>end(e.clientX,e.clientY));
      el.addEventListener('pointercancel',e=>end(e.clientX,e.clientY));
    }

    document.getElementById('reset').onclick=build;
    document.getElementById('hint').onclick=()=>{
      // pick a random not-yet-placed piece in the tray and snap it home
      const remaining=pieces.filter(el=>!el.classList.contains('placed') && el.parentNode===tray);
      if(!remaining.length) return;
      const el=remaining[Math.floor(Math.random()*remaining.length)];
      const r=parseInt(el.dataset.r,10), c=parseInt(el.dataset.c,10);
      board.appendChild(el);
      el.style.margin='0';
      el.style.position='absolute';
      el.style.left=(c*PW - PAD)+'px';
      el.style.top=(r*PH - PAD)+'px';
      el.style.zIndex='10';
      // brief flash highlight
      el.style.transition='filter .2s';
      el.style.filter='drop-shadow(0 0 12px #FFB347) drop-shadow(0 3px 4px rgba(0,0,0,.25))';
      setTimeout(()=>{ el.style.filter=''; }, 700);
      el.classList.add('placed');
      placed++; updateProgress();
      if(placed===total){ res.textContent='🎉 أحسنت! أكملت اللغز'; }
    };
    diffSel.onchange=build;
    window.addEventListener('resize',()=>{ /* keep current pieces; only rebuild on user reset */ });
    build();
  </script>` + tail;
}

export interface ColoringConfig { title: string; imageUrl: string; }
export function generateColoring(c: ColoringConfig): string {
  return baseHead(c.title) + `
  <style>
    body{padding:0!important;display:block!important;background:#F0F2F8!important}
    .card{display:contents!important;max-width:none!important;width:auto!important;padding:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important}
    .color-app{position:fixed;inset:0;display:grid;grid-template-columns:280px 1fr;gap:0;background:#F0F2F8}
    .color-app header{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fff;border-bottom:1px solid #e7e9f1;box-shadow:0 1px 4px rgba(0,0,0,.04);z-index:3}
    .color-app header h1{font-size:1.1rem;color:#9A73E8;margin:0}
    .color-app aside{background:#fff;border-inline-end:1px solid #e7e9f1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
    .color-app main{position:relative;overflow:hidden;background:#dfe3ee}
    .panel{background:#F8F9FC;border-radius:14px;padding:10px}
    .panel h3{font-size:.8rem;color:#888;font-weight:800;margin-bottom:8px;text-align:start}
    .tool-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
    .tool-row .btn{padding:10px 6px;font-size:.85rem;border-radius:12px;box-shadow:none}
    .swatches{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
    .swatches button{aspect-ratio:1;border-radius:50%;border:3px solid #fff;cursor:pointer;padding:0;box-shadow:0 1px 3px rgba(0,0,0,.15)}
    .row{display:flex;align-items:center;gap:8px;justify-content:space-between}
    .row label{font-weight:700;color:#555;font-size:.85rem}
    .actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:auto}
    .actions .btn{padding:10px 8px;font-size:.85rem;border-radius:12px;box-shadow:none}
    .zoom-bar{position:absolute;left:12px;bottom:12px;display:flex;gap:6px;z-index:2}
    .zoom-bar .btn{padding:8px 12px;font-size:.9rem;border-radius:10px;box-shadow:none}
    @media (max-width:760px){
      .color-app{grid-template-columns:1fr;grid-template-rows:auto 1fr auto}
      .color-app aside{order:3;border-inline-end:none;border-top:1px solid #e7e9f1;flex-direction:row;overflow-x:auto;overflow-y:hidden;padding:10px;gap:10px;max-height:42vh}
      .panel{min-width:170px;flex:0 0 auto}
      .actions{margin-top:0}
    }
  </style>
  <div class="color-app">
    <header>
      <h1>${escapeHtml(c.title)}</h1>
      <span style="font-size:.8rem;color:#888">إصبع للرسم • إصبعان للتكبير</span>
    </header>
    <aside>
      <div class="panel">
        <h3>الأدوات</h3>
        <div id="tools" class="tool-row"></div>
      </div>
      <div class="panel">
        <h3>الألوان</h3>
        <div id="palette" class="swatches"></div>
        <div class="row" style="margin-top:8px">
          <label>لون مخصص</label>
          <input type="color" id="picker" value="#FF6C67" style="width:42px;height:34px;border:none;background:transparent;cursor:pointer;padding:0">
        </div>
      </div>
      <div class="panel">
        <h3>الإعدادات</h3>
        <div class="row"><label>الحجم</label><span id="sizeV" style="color:#9A73E8;font-weight:900">10</span></div>
        <input type="range" id="size" min="2" max="60" value="10" style="width:100%">
        <div class="row" style="margin-top:6px"><label>تنعيم</label><span id="smoothV" style="color:#9A73E8;font-weight:900">55</span></div>
        <input type="range" id="smooth" min="0" max="90" value="55" style="width:100%">
      </div>
      <div class="actions">
        <button class="btn" id="undo" style="background:#666">↶ تراجع</button>
        <button class="btn" id="reset" style="background:#aaa">↺ إعادة</button>
        <button class="btn" id="save" style="grid-column:1/-1">💾 حفظ الصورة</button>
      </div>
    </aside>
    <main id="stage" style="touch-action:none;-webkit-user-select:none;user-select:none">
      <div id="zoom" style="position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform">
        <div id="canvasWrap" style="position:relative;display:block;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.15)">
          <canvas id="bg" style="display:block;position:relative;z-index:1;pointer-events:none"></canvas>
          <canvas id="cv" style="display:block;position:absolute;left:0;top:0;z-index:2;cursor:crosshair;touch-action:none;background:transparent;mix-blend-mode:multiply;opacity:.86"></canvas>
        </div>
      </div>
      <div class="zoom-bar">
        <button class="btn" id="zin">➕</button>
        <button class="btn" id="zout" style="background:#bbb">➖</button>
        <button class="btn" id="zfit" style="background:#666">⤢ ملاءمة</button>
      </div>
    </main>
  </div>
  <script>
    const SRC = ${JSON.stringify(c.imageUrl)};
    const colors=['#FF6C67','#FF8FBF','#FFCC35','#FF8A1F','#8EE870','#2FB46B','#2FEAFF','#3B82F6','#9A73E8','#7B4F2A','#222','#fff'];
    let color=colors[0], tool='brush', size=10;
    const PAINT_ALPHA = 210;
    const pal=document.getElementById('palette');
    pal.innerHTML=colors.map((c,i)=>'<button data-c="'+c+'" aria-label="'+c+'" style="border-color:'+(i===0?'#222':'#fff')+';background:'+c+'"></button>').join('');
    function selectColor(c){ color=c; document.getElementById('picker').value=/^#[0-9a-f]{6}$/i.test(c)?c:'#000000'; pal.querySelectorAll('button').forEach(x=>x.style.borderColor=x.dataset.c===c?'#222':'#fff'); }
    pal.querySelectorAll('button').forEach(b=>b.onclick=()=>selectColor(b.dataset.c));
    document.getElementById('picker').oninput=e=>{ selectColor(e.target.value); pal.querySelectorAll('button').forEach(x=>x.style.borderColor='#fff'); };
    const tools=[['brush','🖌️ فرشاة'],['fill','🪣 دلو'],['eraser','🧽 ممحاة']];
    const tEl=document.getElementById('tools');
    tEl.innerHTML=tools.map(([k,l])=>'<button data-t="'+k+'" class="btn" style="padding:8px 12px;font-size:.9rem;background:'+(k==='brush'?'#9A73E8':'#bbb')+'">'+l+'</button>').join('');
    tEl.querySelectorAll('button').forEach(b=>b.onclick=()=>{ tool=b.dataset.t; tEl.querySelectorAll('button').forEach(x=>x.style.background=x.dataset.t===tool?'#9A73E8':'#bbb'); cv.style.cursor=tool==='fill'?'pointer':'crosshair'; });
    const sz=document.getElementById('size'), szV=document.getElementById('sizeV');
    sz.oninput=()=>{ size=+sz.value; szV.textContent=size; };
    const cv=document.getElementById('cv'),ctx=cv.getContext('2d',{willReadFrequently:true});
    const bg=document.getElementById('bg'),bctx=bg.getContext('2d',{willReadFrequently:true});
    const wrap=document.getElementById('canvasWrap');
    const stage=document.getElementById('stage'), zoomEl=document.getElementById('zoom');
    let scale=1, tx=0, ty=0;
    function applyXf(){ zoomEl.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')'; }
    function fitToStage(){ const sw=stage.clientWidth, sh=stage.clientHeight; scale=Math.min(sw/cv.width, sh/cv.height); tx=(sw-cv.width*scale)/2; ty=(sh-cv.height*scale)/2; applyXf(); }
    const img=new Image(); img.crossOrigin='anonymous';
    function setSize(w,h){ cv.width=bg.width=w; cv.height=bg.height=h; wrap.style.width=w+'px'; wrap.style.height=h+'px'; }
    img.onload=()=>{ const max=1200; const r=Math.min(1,max/img.width,max/img.height); setSize(img.width*r, img.height*r); drawBg(); ctx.clearRect(0,0,cv.width,cv.height); pushHistory(); fitToStage(); };
    img.onerror=()=>{ setSize(1000,700); drawBg(); ctx.clearRect(0,0,cv.width,cv.height); pushHistory(); fitToStage(); };
    img.src=SRC;
    function drawBg(){ bctx.clearRect(0,0,bg.width,bg.height); bctx.fillStyle='#fff'; bctx.fillRect(0,0,bg.width,bg.height); if(img.complete&&img.naturalWidth) bctx.drawImage(img,0,0,bg.width,bg.height); }
    function redraw(){ ctx.clearRect(0,0,cv.width,cv.height); }
    document.getElementById('zin').onclick=()=>{ zoomAt(stage.clientWidth/2,stage.clientHeight/2,1.25); };
    document.getElementById('zout').onclick=()=>{ zoomAt(stage.clientWidth/2,stage.clientHeight/2,1/1.25); };
    document.getElementById('zfit').onclick=fitToStage;
    function zoomAt(px,py,f){ const wx=(px-tx)/scale, wy=(py-ty)/scale; scale*=f; scale=Math.max(0.2,Math.min(8,scale)); tx=px-wx*scale; ty=py-wy*scale; applyXf(); }
    const history=[]; function pushHistory(){ try{ history.push(ctx.getImageData(0,0,cv.width,cv.height)); if(history.length>20)history.shift(); }catch(e){} }
    function hex(h){ if(h.length===4)h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]; return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16),255]; }
    function fill(x,y,col){
      // Composite (bg + paint) to decide region; paint result onto overlay only
      const W=cv.width,H=cv.height;
      const bgData=bctx.getImageData(0,0,W,H).data;
      const fgImg=ctx.getImageData(0,0,W,H); const fg=fgImg.data;
      function sample(i){ const a=fg[i+3]/255; const ia=1-a; return [fg[i]*a+bgData[i]*ia, fg[i+1]*a+bgData[i+1]*ia, fg[i+2]*a+bgData[i+2]*ia]; }
      const i0=(y*W+x)*4; const s=sample(i0); const sr=s[0],sg=s[1],sb=s[2];
      if(sr<60&&sg<60&&sb<60) return; // don't fill dark outlines
      const tr=col[0],tg=col[1],tb=col[2];
      const stack=[[x,y]]; const tol=60;
      const visited=new Uint8Array(W*H);
      while(stack.length){
        const [cx,cy]=stack.pop(); if(cx<0||cy<0||cx>=W||cy>=H) continue;
        const p=cy*W+cx; if(visited[p]) continue; visited[p]=1;
        const i=p*4; const cs=sample(i);
        if(Math.abs(cs[0]-sr)>tol||Math.abs(cs[1]-sg)>tol||Math.abs(cs[2]-sb)>tol) continue;
        fg[i]=tr;fg[i+1]=tg;fg[i+2]=tb;fg[i+3]=PAINT_ALPHA;
        stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
      }
      ctx.putImageData(fgImg,0,0);
    }
    function pos(e){ const r=cv.getBoundingClientRect(); const sx=cv.width/r.width, sy=cv.height/r.height; return { x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy }; }
    function stagePos(e){ const r=stage.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; }
    let drawing=false, drawId=null;
    let sx0=0,sy0=0,smooth=0.55,pts=[];
    const smI=document.getElementById('smooth'), smV=document.getElementById('smoothV');
    smI.oninput=()=>{ smooth=+smI.value/100; smV.textContent=smI.value; };
    function drawSegment(){ const n=pts.length; if(n<2) return; ctx.beginPath();
      if(n===2){ ctx.moveTo(pts[0].x,pts[0].y); ctx.lineTo(pts[1].x,pts[1].y); }
      else { const a=pts[n-3],b=pts[n-2],c=pts[n-1]; const m1={x:(a.x+b.x)/2,y:(a.y+b.y)/2}, m2={x:(b.x+c.x)/2,y:(b.y+c.y)/2}; ctx.moveTo(m1.x,m1.y); ctx.quadraticCurveTo(b.x,b.y,m2.x,m2.y); }
      ctx.stroke();
    }
    function addPoint(x,y){ const a=1-smooth; sx0=sx0+(x-sx0)*a; sy0=sy0+(y-sy0)*a;
      const last=pts[pts.length-1]; if(last && Math.hypot(sx0-last.x,sy0-last.y)<0.5) return;
      pts.push({x:sx0,y:sy0}); drawSegment();
    }
    function endStroke(){ if(!drawing) return; if(pts.length>=2){ const a=pts[pts.length-2],b=pts[pts.length-1]; ctx.beginPath(); const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; ctx.moveTo(m.x,m.y); ctx.quadraticCurveTo(b.x,b.y,b.x,b.y); ctx.stroke(); } ctx.globalAlpha=1; drawing=false; pts=[]; pushHistory(); drawId=null; }

    // Multi-touch state
    const pointers=new Map(); // id -> {sx,sy} stage coords
    let gesture=null; // {startDist, startScale, startTx, startTy, startMid}

    function down(e){
      pointers.set(e.pointerId, stagePos(e));
      try{ stage.setPointerCapture(e.pointerId); }catch(_){}
      e.preventDefault();
      if(pointers.size===1){
        if(tool==='fill'){ const p=pos(e); fill(Math.floor(p.x),Math.floor(p.y),hex(color)); pushHistory(); return; }
        const p=pos(e); drawId=e.pointerId; drawing=true; sx0=p.x; sy0=p.y; pts=[{x:p.x,y:p.y}];
        ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=size;
        ctx.globalCompositeOperation = tool==='eraser' ? 'destination-out' : 'source-over';
        ctx.globalAlpha = tool==='eraser' ? 1 : PAINT_ALPHA / 255;
        ctx.strokeStyle = tool==='eraser' ? 'rgba(0,0,0,1)' : color;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath(); ctx.arc(p.x,p.y,size/2,0,Math.PI*2); ctx.fill();
      } else if(pointers.size===2){
        // cancel in-flight stroke (revert via history) and switch to gesture
        if(drawing){ drawing=false; pts=[]; drawId=null;
          const last=history[history.length-1]; if(last) ctx.putImageData(last,0,0);
        }
        const [a,b]=[...pointers.values()];
        gesture={ startDist:Math.hypot(a.x-b.x,a.y-b.y), startScale:scale, startTx:tx, startTy:ty,
          startMid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}, worldMid:{x:((a.x+b.x)/2-tx)/scale, y:((a.y+b.y)/2-ty)/scale} };
      }
    }
    function move(e){
      if(!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, stagePos(e));
      e.preventDefault();
      if(gesture && pointers.size>=2){
        const [a,b]=[...pointers.values()];
        const d=Math.hypot(a.x-b.x,a.y-b.y); const f=d/gesture.startDist;
        scale=Math.max(0.2,Math.min(8, gesture.startScale*f));
        const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        tx=mid.x - gesture.worldMid.x*scale;
        ty=mid.y - gesture.worldMid.y*scale;
        applyXf();
        return;
      }
      if(drawing && e.pointerId===drawId){
        const evs=(e.getCoalescedEvents&&e.getCoalescedEvents().length)?e.getCoalescedEvents():[e];
        for(const ev of evs){ const p=pos(ev); addPoint(p.x,p.y); }
      }
    }
    function up(e){
      pointers.delete(e.pointerId);
      try{ stage.releasePointerCapture(e.pointerId); }catch(_){}
      if(pointers.size<2) gesture=null;
      if(e.pointerId===drawId) endStroke();
    }
    stage.addEventListener('pointerdown',down);
    stage.addEventListener('pointermove',move);
    stage.addEventListener('pointerup',up);
    stage.addEventListener('pointercancel',up);
    stage.addEventListener('pointerleave',up);
    stage.addEventListener('wheel',e=>{ e.preventDefault(); const p=stagePos(e); zoomAt(p.x,p.y, e.deltaY<0?1.1:1/1.1); },{passive:false});


    

    document.getElementById('undo').onclick=()=>{ if(history.length>1){ history.pop(); const last=history[history.length-1]; ctx.putImageData(last,0,0); } };
    document.getElementById('reset').onclick=()=>{ redraw(); history.length=0; pushHistory(); };
    document.getElementById('save').onclick=()=>{
      const out=document.createElement('canvas'); out.width=cv.width; out.height=cv.height;
      const octx=out.getContext('2d');
      octx.drawImage(bg,0,0); octx.globalAlpha=.86; octx.globalCompositeOperation='multiply'; octx.drawImage(cv,0,0); octx.globalAlpha=1; octx.globalCompositeOperation='source-over';
      const a=document.createElement('a'); a.download='coloring.png'; a.href=out.toDataURL(); a.click();
    };
  </script>` + tail;
}

export interface DrawConfig { title: string; prompt?: string; }
export function generateDraw(c: DrawConfig): string {
  return baseHead(c.title) + `
  <h1>${escapeHtml(c.title)}</h1>
  ${c.prompt ? '<p style="margin-bottom:14px;color:#666;font-size:1.1rem;font-weight:700">'+escapeHtml(c.prompt)+'</p>' : ''}
  <canvas id="cv" width="560" height="380" style="background:#fff;border-radius:20px;box-shadow:inset 0 0 0 3px #F0F2F8;cursor:crosshair;max-width:100%;touch-action:none"></canvas>
  <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center">
    <span id="palette"></span>
    <input type="range" id="size" min="2" max="40" value="6" style="width:120px">
    <button class="btn" id="clear" style="background:#FF6C67">🗑️ مسح</button>
    <button class="btn" id="save">💾 حفظ</button>
  </div>
  <script>
    const colors=['#222','#9A73E8','#FF6C67','#FFCC35','#8EE870','#2FEAFF','#fff'];
    const pal=document.getElementById('palette');
    let color=colors[0], size=6;
    pal.innerHTML=colors.map((c,i)=>'<button data-c="'+c+'" style="width:32px;height:32px;border-radius:50%;border:3px solid '+(i===0?'#222':'#fff')+';background:'+c+';margin:0 4px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2)"></button>').join('');
    pal.querySelectorAll('button').forEach(b=>b.onclick=()=>{ color=b.dataset.c; pal.querySelectorAll('button').forEach(x=>x.style.borderColor='#fff'); b.style.borderColor='#222'; });
    document.getElementById('size').oninput=e=>size=+e.target.value;
    const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
    ctx.lineCap='round';ctx.lineJoin='round';
    let drawing=false,lx=0,ly=0;
    function pos(e){ const r=cv.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:(t.clientX-r.left)*cv.width/r.width,y:(t.clientY-r.top)*cv.height/r.height}; }
    function down(e){drawing=true;const p=pos(e);lx=p.x;ly=p.y;e.preventDefault();}
    function move(e){if(!drawing)return;const p=pos(e);ctx.strokeStyle=color;ctx.lineWidth=size;ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(p.x,p.y);ctx.stroke();lx=p.x;ly=p.y;e.preventDefault();}
    function up(){drawing=false;}
    cv.addEventListener('mousedown',down);cv.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
    cv.addEventListener('touchstart',down);cv.addEventListener('touchmove',move);window.addEventListener('touchend',up);
    document.getElementById('clear').onclick=()=>ctx.clearRect(0,0,cv.width,cv.height);
    document.getElementById('save').onclick=()=>{ const a=document.createElement('a'); a.download='drawing.png'; a.href=cv.toDataURL(); a.click(); };
  </script>` + tail;
}

// ====================== Tower Kingdom (Sky Tower Academy) ======================
export interface TowerQuestion {
  question_ar: string; question_en: string;
  answers_ar: string[]; answers_en: string[];
  correct: number;
}
export interface TowerConfig { title: string; questions: TowerQuestion[]; }

export function generateTower(c: TowerConfig): string {
  const data = JSON.stringify(c.questions);
  const safeTitle = escapeHtml(c.title);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${safeTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;900&family=Fredoka:wght@500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;font-family:'Tajawal','Fredoka',sans-serif;color:#fff}
body.en{font-family:'Fredoka','Tajawal',sans-serif}
#stage{position:fixed;inset:0;overflow:hidden;background:linear-gradient(180deg,#7ec8ff 0%,#c1e9ff 60%,#fff4c9 100%);transition:background 2.2s ease}
.stage-1{background:linear-gradient(180deg,#7ec8ff,#c1e9ff 60%,#fff4c9)!important}
.stage-2{background:linear-gradient(180deg,#5aa8f0,#7fd3a4 60%,#eafbdc)!important}
.stage-3{background:linear-gradient(180deg,#3b6fb0,#7891ba 60%,#d9d0b7)!important}
.stage-4{background:linear-gradient(180deg,#5e4dbb,#c58cff 55%,#ffe28a)!important}
.stage-5{background:linear-gradient(180deg,#2a1f6b,#7452c7 55%,#ff9edb)!important}
.stage-6{background:linear-gradient(180deg,#020218,#1a0d55 55%,#4a1080)!important}
.parallax{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.cloud{position:absolute;width:120px;height:40px;background:#fff;border-radius:40px;opacity:.85;filter:blur(1px);box-shadow:20px -10px 0 -5px #fff,-20px -6px 0 -8px #fff}
.star{position:absolute;width:3px;height:3px;background:#fff;border-radius:50%;box-shadow:0 0 6px #fff;opacity:0}
.stage-5 .star,.stage-6 .star{opacity:.9;animation:tw 2s infinite alternate}
@keyframes tw{to{opacity:.3;transform:scale(.6)}}
#world{position:absolute;left:50%;bottom:0;transform:translateX(-50%);transition:transform 1.1s cubic-bezier(.4,1.4,.4,1);will-change:transform}
#tower{display:flex;flex-direction:column-reverse;align-items:center;position:relative}
.floor{width:150px;height:56px;position:relative;display:flex;align-items:center;justify-content:center;font-weight:900;color:#3c2a1a;font-size:14px;transform-origin:50% 100%;animation:pop .7s cubic-bezier(.34,1.7,.55,1) both}
.floor .lbl{position:absolute;bottom:6px;font-size:11px;opacity:.55}
@keyframes pop{0%{transform:translateY(-40px) scale(.6);opacity:0}60%{transform:translateY(6px) scale(1.08);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
.tier-wood{background:linear-gradient(180deg,#c98a4b,#8a5a2a);border:3px solid #6a3f18;border-radius:8px;box-shadow:inset 0 -8px 0 rgba(0,0,0,.15)}
.tier-stone{background:linear-gradient(180deg,#c7c9cd,#8b8f97);border:3px solid #565a63;border-radius:8px;color:#1c1c1c;box-shadow:inset 0 -8px 0 rgba(0,0,0,.18)}
.tier-castle{background:linear-gradient(180deg,#e4d3a2,#a48657);border:3px solid #5a4423;border-radius:10px;color:#2d1a06;box-shadow:inset 0 -8px 0 rgba(0,0,0,.18)}
.tier-crystal{background:linear-gradient(180deg,#cfeeff,#82c6ff);border:3px solid #3d84c7;border-radius:12px;color:#0d3a63;box-shadow:0 0 18px rgba(150,220,255,.6),inset 0 -8px 0 rgba(0,0,0,.1)}
.tier-gold{background:linear-gradient(180deg,#ffe37a,#c99521);border:3px solid #7a5407;border-radius:14px;color:#3a2500;box-shadow:0 0 22px rgba(255,220,120,.7),inset 0 -8px 0 rgba(0,0,0,.15)}
.tier-magic{background:linear-gradient(180deg,#ffdefb,#a771ff 60%,#5330b0);border:3px solid #40197a;border-radius:16px;color:#fff;box-shadow:0 0 28px rgba(200,140,255,.9),inset 0 -8px 0 rgba(0,0,0,.15)}
.floor.boss{width:170px;height:66px;box-shadow:0 0 40px rgba(255,220,120,.9),inset 0 -8px 0 rgba(0,0,0,.2)!important;animation:pop .7s cubic-bezier(.34,1.7,.55,1) both, boss 1.6s ease-in-out infinite alternate}
@keyframes boss{to{filter:hue-rotate(30deg) brightness(1.1)}}
.flag{position:absolute;top:-16px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:16px solid #ff5566}
.base{width:210px;height:38px;background:linear-gradient(180deg,#6bbf59,#3c8a35);border-radius:14px 14px 0 0;border:3px solid #285823;position:relative;box-shadow:inset 0 -6px 0 rgba(0,0,0,.25)}
.base:before{content:'';position:absolute;left:-40px;right:-40px;bottom:-8px;height:24px;background:#3c8a35;border-radius:50%;filter:blur(6px);opacity:.6}
.hud{position:fixed;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;gap:8px;z-index:5;pointer-events:none}
.chip{background:rgba(0,0,0,.45);backdrop-filter:blur(8px);color:#fff;padding:8px 14px;border-radius:999px;font-weight:900;font-size:14px;display:inline-flex;gap:6px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:auto}
.chip button{background:none;border:none;color:#fff;font:inherit;cursor:pointer;padding:0 4px}
.qcard{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);width:min(560px,94vw);background:rgba(255,255,255,.97);color:#222;padding:18px 20px 22px;border-radius:28px;box-shadow:0 20px 60px rgba(0,0,0,.35);z-index:6;text-align:center;animation:slide .5s cubic-bezier(.34,1.7,.55,1) both}
@keyframes slide{from{transform:translate(-50%,60px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.qcard h2{font-size:1.25rem;margin-bottom:14px;color:#3d2a70;line-height:1.4}
.qcard .opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:420px){.qcard .opts{grid-template-columns:1fr}}
.opt{background:linear-gradient(180deg,#fff,#f0f2f8);border:3px solid #dfe3ef;border-radius:18px;padding:14px 12px;font:inherit;font-weight:800;font-size:1rem;cursor:pointer;color:#333;transition:all .15s;box-shadow:0 4px 0 rgba(0,0,0,.08)}
.opt:hover{transform:translateY(-2px);border-color:#9A73E8}
.opt.correct{background:linear-gradient(180deg,#a5f3a0,#5cc04a);border-color:#3d9a2a;color:#fff}
.opt.tryagain{background:linear-gradient(180deg,#ffe0a1,#ffb84d);border-color:#c47f0a;color:#5a3400;animation:shake .4s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.toast{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#ffd166,#ef476f);color:#fff;padding:20px 28px;border-radius:24px;font-weight:900;font-size:1.4rem;z-index:20;box-shadow:0 12px 40px rgba(0,0,0,.35);pointer-events:none;animation:pop .5s cubic-bezier(.34,1.7,.55,1),fadeOut .5s 1.4s forwards}
@keyframes fadeOut{to{opacity:0;transform:translate(-50%,-70%) scale(.9)}}
.pause-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);z-index:30;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#fff}
.pause-overlay.on{display:flex}
.pause-overlay button{background:linear-gradient(135deg,#ffd166,#ef476f);color:#fff;border:0;padding:14px 30px;border-radius:999px;font:inherit;font-weight:900;font-size:1.1rem;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.35)}
.mascot{position:fixed;bottom:200px;right:12px;font-size:2.6rem;z-index:4;animation:bob 2.5s ease-in-out infinite;pointer-events:none;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35))}
@keyframes bob{50%{transform:translateY(-10px) rotate(-4deg)}}
.confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:15}
.confetti span{position:absolute;top:-10vh;width:10px;height:16px;border-radius:2px;animation:fall linear forwards}
@keyframes fall{to{transform:translateY(120vh) rotate(720deg)}}
</style></head>
<body>
<div id="stage" class="stage-1">
  <div class="parallax" id="para"></div>
  <div id="world">
    <div id="tower"></div>
    <div class="base"></div>
  </div>
  <div class="mascot" id="mascot">🧚‍♀️</div>
</div>
<div class="hud">
  <span class="chip">🏰 <span data-i="floor">الطابق</span> <span id="hFloor">0</span></span>
  <span class="chip">⭐ <span id="hStars">0</span></span>
  <span class="chip">🪙 <span id="hCoins">0</span></span>
  <span class="chip">
    <button id="btnLang" title="Language">AR/EN</button> ·
    <button id="btnFs" title="Fullscreen">⛶</button> ·
    <button id="btnPause">⏸</button>
  </span>
</div>
<div id="qwrap"></div>
<div class="pause-overlay" id="pause">
  <div style="font-size:2rem;font-weight:900" data-i="paused">⏸ إيقاف مؤقت</div>
  <button id="btnResume" data-i="resume">▶ استئناف</button>
  <button id="btnReset" style="background:#666" data-i="reset">↺ ابدأ من جديد</button>
</div>
<script>
(function(){
  const Q=${data};
  const STR={
    ar:{floor:'الطابق',paused:'إيقاف مؤقت',resume:'استئناف',reset:'ابدأ من جديد',great:'ممتاز! 🎉',good:'أحسنت! ⭐',try:'حاول مرة أخرى 💪',bossIntro:'⚡ تحدي البطل! ٣ أسئلة متتالية',bossWin:'🏆 مكافأة كبرى!'},
    en:{floor:'Floor',paused:'Paused',resume:'Resume',reset:'Start Over',great:'Great! 🎉',good:'Nice! ⭐',try:'Try again 💪',bossIntro:'⚡ Hero Challenge! 3 questions in a row',bossWin:'🏆 Big reward!'}
  };
  const SAVE_KEY='tower_${(c.title||'game').replace(/[^a-z0-9]/gi,'_').slice(0,24)}';
  let lang=(localStorage.getItem(SAVE_KEY+'_lang')||(document.documentElement.dir==='rtl'?'ar':'ar'));
  let state=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||{floor:0,coins:0,stars:0,qi:0,bossStreak:0};
  const world=document.getElementById('world');
  const tower=document.getElementById('tower');
  const stage=document.getElementById('stage');
  const para=document.getElementById('para');
  const qwrap=document.getElementById('qwrap');

  // Parallax: clouds + stars
  for(let i=0;i<14;i++){
    const c=document.createElement('div');c.className='cloud';
    c.style.left=(Math.random()*100)+'%';
    c.style.top=(Math.random()*100)+'%';
    c.style.transform='scale('+(0.6+Math.random()*1.1)+')';
    c.style.opacity=(0.5+Math.random()*0.5);
    para.appendChild(c);
  }
  for(let i=0;i<80;i++){
    const s=document.createElement('div');s.className='star';
    s.style.left=(Math.random()*100)+'%';
    s.style.top=(Math.random()*100)+'%';
    s.style.animationDelay=(Math.random()*2)+'s';
    para.appendChild(s);
  }

  function tierFor(f){
    if(f<=5)return 'wood'; if(f<=10)return 'stone'; if(f<=15)return 'castle';
    if(f<=20)return 'crystal'; if(f<=30)return 'gold'; return 'magic';
  }
  function stageFor(f){
    if(f<5)return 1; if(f<10)return 2; if(f<16)return 3; if(f<22)return 4; if(f<30)return 5; return 6;
  }
  function applyStage(){
    stage.className='stage-'+stageFor(state.floor);
  }
  function addFloor(f,boss){
    const el=document.createElement('div');
    el.className='floor tier-'+tierFor(f)+(boss?' boss':'');
    el.innerHTML='<span>'+(boss?'★ ':'')+f+'</span><span class="lbl">'+f+'</span>'+(f%5===0?'<span class="flag"></span>':'');
    tower.appendChild(el);
  }
  function rebuild(){
    tower.innerHTML='';
    for(let i=1;i<=state.floor;i++) addFloor(i, i%10===0);
    // camera follows top of tower
    const h=state.floor*56 + 38; // base
    const off=Math.max(0, h - window.innerHeight*0.55);
    world.style.transition='none';
    world.style.transform='translateX(-50%) translateY('+off+'px)';
    void world.offsetHeight;
    world.style.transition='';
    applyStage();
  }
  function grow(boss){
    state.floor++;
    addFloor(state.floor, boss || state.floor%10===0);
    const h=state.floor*56 + 38;
    const off=Math.max(0, h - window.innerHeight*0.55);
    world.style.transform='translateX(-50%) translateY('+off+'px)';
    applyStage();
    save();
  }
  function toast(msg){
    const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);
    setTimeout(()=>t.remove(),2100);
  }
  function confetti(){
    const w=document.createElement('div');w.className='confetti';
    const cols=['#ef476f','#ffd166','#06d6a0','#118ab2','#8338ec','#fb5607'];
    for(let i=0;i<120;i++){
      const s=document.createElement('span');
      s.style.left=(Math.random()*100)+'vw';
      s.style.background=cols[i%cols.length];
      s.style.animationDuration=(2.5+Math.random()*2.5)+'s';
      s.style.animationDelay=(Math.random()*.6)+'s';
      if(Math.random()<.3)s.style.borderRadius='50%';
      w.appendChild(s);
    }
    document.body.appendChild(w);setTimeout(()=>w.remove(),5500);
  }
  function beep(freq,dur){
    try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A();const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.0001,a.currentTime);g.gain.exponentialRampToValueAtTime(.25,a.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dur);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+dur+.05);}catch(e){}
  }
  function fanfare(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>beep(f,.35),i*130));}
  function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
  function updHud(){
    document.getElementById('hFloor').textContent=state.floor;
    document.getElementById('hStars').textContent=state.stars;
    document.getElementById('hCoins').textContent=state.coins;
    document.querySelectorAll('[data-i]').forEach(el=>{const k=el.dataset.i;if(STR[lang][k])el.textContent=STR[lang][k];});
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    document.body.classList.toggle('en',lang==='en');
  }
  function nextQ(){
    if(!Q.length){qwrap.innerHTML='<div class="qcard"><h2>لا توجد أسئلة</h2></div>';return;}
    const q=Q[state.qi % Q.length];
    const qText=lang==='ar'?q.question_ar:q.question_en;
    const opts=lang==='ar'?q.answers_ar:q.answers_en;
    qwrap.innerHTML='<div class="qcard"><h2>'+esc(qText)+'</h2><div class="opts">'+
      opts.map((o,k)=>'<button class="opt" data-k="'+k+'">'+esc(o)+'</button>').join('')+
      '</div></div>';
    qwrap.querySelectorAll('.opt').forEach(b=>b.onclick=()=>answer(+b.dataset.k,q,b));
  }
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function answer(k,q,btn){
    qwrap.querySelectorAll('.opt').forEach(x=>x.disabled=true);
    if(k===q.correct){
      btn.classList.add('correct'); beep(880,.15); setTimeout(()=>beep(1175,.2),120);
      state.qi++; state.coins+=10; state.stars+=1;
      const nextFloor=state.floor+1;
      const isBoss=nextFloor%10===0;
      grow(isBoss);
      toast(isBoss?STR[lang].bossWin:(Math.random()<.5?STR[lang].great:STR[lang].good));
      if(isBoss){confetti();fanfare();state.coins+=50;state.stars+=3;save();updHud();}
      else updHud();
      setTimeout(nextQ,1100);
    }else{
      btn.classList.add('tryagain'); beep(220,.15);
      toast(STR[lang].try);
      setTimeout(()=>{qwrap.querySelectorAll('.opt').forEach(x=>{x.disabled=false;x.classList.remove('tryagain');});},700);
    }
  }
  document.getElementById('btnLang').onclick=()=>{lang=lang==='ar'?'en':'ar';localStorage.setItem(SAVE_KEY+'_lang',lang);updHud();nextQ();};
  document.getElementById('btnFs').onclick=()=>{try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();}catch(e){}};
  const pauseEl=document.getElementById('pause');
  document.getElementById('btnPause').onclick=()=>pauseEl.classList.add('on');
  document.getElementById('btnResume').onclick=()=>pauseEl.classList.remove('on');
  document.getElementById('btnReset').onclick=()=>{state={floor:0,coins:0,stars:0,qi:0,bossStreak:0};save();rebuild();updHud();nextQ();pauseEl.classList.remove('on');};

  rebuild(); updHud(); nextQ();
})();
</script>
</body></html>`;
}

