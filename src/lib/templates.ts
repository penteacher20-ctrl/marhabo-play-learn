// Generates standalone HTML strings for each template type.
// Each generator takes a config object and returns a complete HTML document.

const baseHead = (title: string) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;900&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Tajawal',sans-serif;background:linear-gradient(135deg,#F0F2F8,#fff);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:#222;text-align:center}
  h1{font-size:2rem;margin-bottom:1rem;color:#9A73E8}
  .card{background:#fff;border-radius:28px;padding:32px;max-width:640px;width:100%;box-shadow:0 12px 40px -12px rgba(154,115,232,.3)}
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
  .pair{padding:12px 18px;border-radius:18px;background:#F0F2F8;font-weight:700;cursor:pointer;border:3px solid transparent;transition:all .15s}
  .pair.sel{border-color:#9A73E8;background:#fff}
  .pair.done{background:#8EE870;color:#fff;cursor:default;border-color:#5cc04a}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .wheel-wrap{position:relative;width:300px;height:300px;margin:0 auto 20px}
  .wheel{width:100%;height:100%;border-radius:50%;transition:transform 4s cubic-bezier(.17,.67,.3,1.05);box-shadow:0 0 0 8px #fff,0 12px 40px rgba(0,0,0,.2)}
  .pointer{position:absolute;top:-12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-top:28px solid #FF6C67;z-index:2}
  .result{font-size:1.4rem;font-weight:900;margin-top:12px;color:#9A73E8;min-height:2em}
  .progress{height:8px;background:#F0F2F8;border-radius:99px;overflow:hidden;margin-bottom:18px}
  .progress>div{height:100%;background:linear-gradient(90deg,#8EE870,#2FEAFF);transition:width .3s}
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

export interface MatchingConfig { title: string; pairs: { a: string; b: string }[]; }
export function generateMatching(c: MatchingConfig): string {
  return baseHead(c.title) + `
  <h1>${escapeHtml(c.title)}</h1>
  <p style="margin-bottom:18px;color:#666">طابق العناصر ببعضها</p>
  <div class="grid" id="game"></div>
  <div class="result" id="res"></div>
  <script>
    const P = ${JSON.stringify(c.pairs)};
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
  <h1>${escapeHtml(c.title)}</h1>
  <p style="margin-bottom:14px;color:#666">اسحب القطع لمكانها الصحيح</p>
  <div id="board" style="position:relative;margin:0 auto;background:#F0F2F8;border-radius:20px;border:3px dashed #9A73E8aa"></div>
  <div id="tray" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px;padding:14px;background:#F0F2F8;border-radius:20px;min-height:80px"></div>
  <div class="result" id="res"></div>
  <button class="btn" id="reset" style="margin-top:10px;background:#aaa">↺ خلط</button>
  <script>
    const SRC = ${JSON.stringify(c.imageUrl)};
    const ROWS = ${c.rows}, COLS = ${c.cols};
    const SIZE = Math.min(420, window.innerWidth - 80);
    const PW = SIZE/COLS, PH = SIZE/ROWS;
    const board = document.getElementById('board'), tray = document.getElementById('tray'), res = document.getElementById('res');
    board.style.width = SIZE+'px'; board.style.height = SIZE+'px';
    let placed = 0;
    function build(){
      placed = 0; res.textContent=''; board.innerHTML=''; tray.innerHTML='';
      // slot outlines
      for(let r=0;r<ROWS;r++) for(let cc=0;cc<COLS;cc++){
        const slot = document.createElement('div');
        slot.dataset.idx = r*COLS+cc;
        slot.style.cssText='position:absolute;left:'+(cc*PW)+'px;top:'+(r*PH)+'px;width:'+PW+'px;height:'+PH+'px;border:1px dashed #9A73E866;box-sizing:border-box';
        board.appendChild(slot);
      }
      const pieces=[]; for(let r=0;r<ROWS;r++) for(let cc=0;cc<COLS;cc++) pieces.push({r,c:cc,idx:r*COLS+cc});
      pieces.sort(()=>Math.random()-0.5);
      pieces.forEach(p=>{
        const el = document.createElement('div');
        el.className='piece'; el.draggable=true; el.dataset.idx=p.idx;
        el.style.cssText='width:'+PW+'px;height:'+PH+'px;background-image:url("'+SRC+'");background-size:'+(PW*COLS)+'px '+(PH*ROWS)+'px;background-position:-'+(p.c*PW)+'px -'+(p.r*PH)+'px;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,.15);cursor:grab;border:2px solid #fff';
        el.addEventListener('dragstart',e=>{ e.dataTransfer.setData('text',p.idx); el.style.opacity=.5; });
        el.addEventListener('dragend',()=>el.style.opacity=1);
        // touch
        let touchClone=null;
        el.addEventListener('touchstart',e=>{ touchClone=el; e.preventDefault(); },{passive:false});
        el.addEventListener('touchmove',e=>{ const t=e.touches[0]; el.style.position='fixed'; el.style.left=(t.clientX-PW/2)+'px'; el.style.top=(t.clientY-PH/2)+'px'; el.style.zIndex=99; e.preventDefault(); },{passive:false});
        el.addEventListener('touchend',e=>{ const t=e.changedTouches[0]; el.style.display='none'; const tgt=document.elementFromPoint(t.clientX,t.clientY); el.style.display=''; el.style.position=''; el.style.zIndex=''; el.style.left=''; el.style.top=''; if(tgt&&tgt.dataset&&+tgt.dataset.idx===p.idx) snap(el,tgt); });
        tray.appendChild(el);
      });
      board.querySelectorAll('div[data-idx]').forEach(slot=>{
        slot.addEventListener('dragover',e=>e.preventDefault());
        slot.addEventListener('drop',e=>{ e.preventDefault(); const idx=+e.dataTransfer.getData('text'); if(idx===+slot.dataset.idx){ const piece=tray.querySelector('.piece[data-idx="'+idx+'"]')||document.querySelector('.piece[data-idx="'+idx+'"]'); if(piece) snap(piece,slot); } });
      });
    }
    function snap(piece,slot){ slot.appendChild(piece); piece.draggable=false; piece.style.cursor='default'; piece.style.boxShadow='none'; piece.style.border='none'; placed++; if(placed===ROWS*COLS) res.textContent='🎉 أحسنت!'; }
    document.getElementById('reset').onclick = build;
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
          <canvas id="cv" style="display:block;position:absolute;left:0;top:0;z-index:2;cursor:crosshair;touch-action:none;background:transparent"></canvas>
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
        fg[i]=tr;fg[i+1]=tg;fg[i+2]=tb;fg[i+3]=255;
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
    function endStroke(){ if(!drawing) return; if(pts.length>=2){ const a=pts[pts.length-2],b=pts[pts.length-1]; ctx.beginPath(); const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; ctx.moveTo(m.x,m.y); ctx.quadraticCurveTo(b.x,b.y,b.x,b.y); ctx.stroke(); } drawing=false; pts=[]; pushHistory(); drawId=null; }

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
    document.getElementById('save').onclick=()=>{ const a=document.createElement('a'); a.download='coloring.png'; a.href=cv.toDataURL(); a.click(); };
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
