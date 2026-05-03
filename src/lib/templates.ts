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

export interface PuzzleConfig { title: string; words: string[]; }
export function generatePuzzle(c: PuzzleConfig): string {
  return baseHead(c.title) + `
  <h1>${escapeHtml(c.title)}</h1>
  <p style="margin-bottom:18px;color:#666">رتّب الحروف لتكوين الكلمة الصحيحة</p>
  <div id="game"></div>
  <div class="result" id="res"></div>
  <script>
    const W = ${JSON.stringify(c.words.filter(w => w.trim()))};
    let i = 0, score = 0;
    const game = document.getElementById('game'), res = document.getElementById('res');
    function shuffle(s){ const a=s.split(''); for(let k=a.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[a[k],a[j]]=[a[j],a[k]];} return a.join('')===s?shuffle(s):a; }
    function render(){
      if(i>=W.length){ game.innerHTML='<div class="score">🎉 '+score+'/'+W.length+'</div><button class="btn" onclick="location.reload()">العب مجدداً</button>'; return; }
      const target = W[i]; const letters = shuffle(target);
      const slots = target.split('').map((_,k)=>'<span class="slot" data-k="'+k+'" style="display:inline-block;min-width:42px;height:50px;border-bottom:4px solid #9A73E8;margin:0 4px;font-size:1.6rem;font-weight:900;line-height:50px"></span>').join('');
      const tiles = letters.map((l,k)=>'<button class="opt tile" data-l="'+l+'" data-k="'+k+'" style="display:inline-block;width:auto;min-width:50px;margin:4px;font-size:1.4rem">'+l+'</button>').join('');
      game.innerHTML = '<div style="margin:18px 0;direction:ltr">'+slots+'</div><div>'+tiles+'</div><button class="btn" id="reset" style="margin-top:14px;background:#aaa">↺ مسح</button>';
      let pos = 0; const placed = [];
      game.querySelectorAll('.tile').forEach(t=>t.onclick=()=>{
        if(t.disabled||pos>=target.length) return;
        const slot = game.querySelectorAll('.slot')[pos];
        slot.textContent = t.dataset.l; t.disabled=true; t.style.opacity=.3;
        placed.push({tile:t,slot}); pos++;
        if(pos===target.length){
          const guess = Array.from(game.querySelectorAll('.slot')).map(s=>s.textContent).join('');
          if(guess===target){ score++; res.textContent='✅ صحيح!'; setTimeout(()=>{ res.textContent=''; i++; render(); },900); }
          else { res.textContent='❌ حاول مجدداً'; setTimeout(()=>{ res.textContent=''; i++; render(); },1200); }
        }
      });
      game.querySelector('#reset').onclick = ()=>{ placed.forEach(p=>{p.tile.disabled=false;p.tile.style.opacity=1;p.slot.textContent='';}); placed.length=0; pos=0; };
    }
    render();
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
