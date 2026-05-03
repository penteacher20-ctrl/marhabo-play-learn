import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);
const userId = '109bb7c3-60b4-4df1-9f44-3d76faf4bc53';

// Use a colorful sample image (kids-friendly), download then upload to game-files
const imgRes = await fetch('https://picsum.photos/id/1062/600/600');
const imgBuf = Buffer.from(await imgRes.arrayBuffer());
const ts = Date.now();
const imgPath = `${userId}/${ts}-asset.jpg`;
let r = await sb.storage.from('game-files').upload(imgPath, imgBuf, { contentType: 'image/jpeg' });
if (r.error) { console.error('img upload', r.error); process.exit(1); }
const imgUrl = sb.storage.from('game-files').getPublicUrl(imgPath).data.publicUrl;
console.log('IMG:', imgUrl);

// Inline a copy of generatePuzzle (kept in sync with src/lib/templates.ts)
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const title = '🧩 بازل تجريبي - 3×3';
const rows=3, cols=3;
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#F0F2F8,#fff);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:#222;text-align:center}
h1{font-size:2rem;margin-bottom:1rem;color:#9A73E8}
.card{background:#fff;border-radius:28px;padding:32px;max-width:640px;width:100%;box-shadow:0 12px 40px -12px rgba(154,115,232,.3)}
.btn{border:none;cursor:pointer;font:inherit;font-weight:800;padding:14px 28px;border-radius:999px;background:linear-gradient(135deg,#9A73E8,#7c5fd6);color:#fff;font-size:1rem;box-shadow:0 6px 0 rgba(0,0,0,.12)}
.result{font-size:1.4rem;font-weight:900;margin-top:12px;color:#9A73E8;min-height:2em}
</style></head><body><div class="card">
<h1>${escapeHtml(title)}</h1>
<p style="margin-bottom:14px;color:#666">اسحب القطع لمكانها الصحيح</p>
<div id="board" style="position:relative;margin:0 auto;background:#F0F2F8;border-radius:20px;border:3px dashed #9A73E8aa"></div>
<div id="tray" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px;padding:14px;background:#F0F2F8;border-radius:20px;min-height:80px"></div>
<div class="result" id="res"></div>
<button class="btn" id="reset" style="margin-top:10px;background:#aaa">↺ خلط</button>
<script>
const SRC=${JSON.stringify(imgUrl)};const ROWS=${rows},COLS=${cols};
const SIZE=Math.min(420,window.innerWidth-80);const PW=SIZE/COLS,PH=SIZE/ROWS;
const board=document.getElementById('board'),tray=document.getElementById('tray'),res=document.getElementById('res');
board.style.width=SIZE+'px';board.style.height=SIZE+'px';
let placed=0;
function build(){placed=0;res.textContent='';board.innerHTML='';tray.innerHTML='';
for(let r=0;r<ROWS;r++)for(let cc=0;cc<COLS;cc++){const slot=document.createElement('div');slot.dataset.idx=r*COLS+cc;slot.style.cssText='position:absolute;left:'+(cc*PW)+'px;top:'+(r*PH)+'px;width:'+PW+'px;height:'+PH+'px;border:1px dashed #9A73E866;box-sizing:border-box';board.appendChild(slot);}
const pieces=[];for(let r=0;r<ROWS;r++)for(let cc=0;cc<COLS;cc++)pieces.push({r,c:cc,idx:r*COLS+cc});
pieces.sort(()=>Math.random()-0.5);
pieces.forEach(p=>{const el=document.createElement('div');el.className='piece';el.draggable=true;el.dataset.idx=p.idx;
el.style.cssText='width:'+PW+'px;height:'+PH+'px;background-image:url("'+SRC+'");background-size:'+(PW*COLS)+'px '+(PH*ROWS)+'px;background-position:-'+(p.c*PW)+'px -'+(p.r*PH)+'px;border-radius:8px;box-shadow:0 4px 10px rgba(0,0,0,.15);cursor:grab;border:2px solid #fff';
el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text',p.idx);el.style.opacity=.5;});
el.addEventListener('dragend',()=>el.style.opacity=1);
tray.appendChild(el);});
board.querySelectorAll('div[data-idx]').forEach(slot=>{slot.addEventListener('dragover',e=>e.preventDefault());
slot.addEventListener('drop',e=>{e.preventDefault();const idx=+e.dataTransfer.getData('text');if(idx===+slot.dataset.idx){const piece=document.querySelector('.piece[data-idx="'+idx+'"]');if(piece)snap(piece,slot);}});});}
function snap(piece,slot){slot.appendChild(piece);piece.draggable=false;piece.style.cursor='default';piece.style.boxShadow='none';piece.style.border='none';placed++;if(placed===ROWS*COLS)res.textContent='🎉 أحسنت!';}
document.getElementById('reset').onclick=build;build();
</script></div></body></html>`;

const htmlPath = `${userId}/${ts}-puzzle.html`;
r = await sb.storage.from('game-files').upload(htmlPath, Buffer.from(html), { contentType: 'text/html' });
if (r.error) { console.error('html upload', r.error); process.exit(1); }
const fileUrl = sb.storage.from('game-files').getPublicUrl(htmlPath).data.publicUrl;

const { data: game, error } = await sb.from('games').insert({
  user_id: userId, title, type: 'template:puzzle', file_url: fileUrl, is_public: true,
}).select().single();
if (error) { console.error(error); process.exit(1); }
console.log('GAME ID:', game.id);
console.log('FILE URL:', fileUrl);
console.log('PLAY: https://870a3bed-844c-48d7-a718-2f70f0704bd5.lovableproject.com/play/' + game.id);
