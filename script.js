
const DATA_DIR='data';
const ARCHIVE_FILE=DATA_DIR + '/archives.json';
let pages=[], currentPage=0, cache={};

(function initTheme(){
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const mode = stored || (prefersDark ? 'dark':'light');
  setTheme(mode);
  document.getElementById('themeToggle').addEventListener('click', ()=>{
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    setTheme(next); localStorage.setItem('theme', next);
  });
})();
function setTheme(m){ if(m==='dark') document.body.classList.add('dark'); else document.body.classList.remove('dark'); document.getElementById('themeToggle').textContent = m==='dark'?'☀️':'🌙'; }

async function loadArchives(){
  try{
    const res = await fetch(ARCHIVE_FILE); pages = await res.json();
    if(!pages.length){ document.getElementById('dateArea').textContent='No digests available'; return; }
    pages.sort((a,b)=> new Date(b.date)-new Date(a.date)); currentPage=0; renderPager(); await loadPage(currentPage);
  }catch(e){ console.error(e); document.getElementById('dateArea').textContent='Failed to load archive index'; }
}
function renderPager(){
  const pager=document.getElementById('pager'); pager.innerHTML='';
  pages.forEach((p,i)=>{ const btn=document.createElement('button'); btn.className='page-btn'+(i===currentPage?' active':''); btn.textContent=(i+1); btn.addEventListener('click', ()=>{ if(i!==currentPage){ currentPage=i; loadPage(i); } }); pager.appendChild(btn); });
  document.getElementById('dateArea').textContent = pages[currentPage].label || pages[currentPage].date;
  document.getElementById('digestDate').textContent = 'Digest for ' + (new Date(pages[currentPage].date)).toDateString();
}
async function loadPage(i){
  if(!pages[i]) return;
  const date = pages[i].date;
  if(cache[date]){ renderPosts(cache[date]); renderPager(); return; }
  try{
    const res = await fetch(`${DATA_DIR}/${date}.json`); const data = await res.json(); cache[date]=data; renderPosts(data); renderPager();
  }catch(e){ console.error(e); document.getElementById('cards').innerHTML='<p style="color:#ef4444">No posts found today. Check back tomorrow!</p>'; }
}
function renderPosts(items){
  const container=document.getElementById('cards'); container.innerHTML=''; if(!items || items.length===0){ container.innerHTML='<p style="color:#64748b">No posts found today. Check back tomorrow!</p>'; return; }
  items.forEach(it=>{
    const card=document.createElement('article'); card.className='card';
    const header=document.createElement('div'); header.className='card-header';
    const src=document.createElement('div'); src.className='source-tag'; src.textContent=it.source||'Web';
    const right=document.createElement('div');
    const cat=document.createElement('span'); cat.className='category-tag'; cat.textContent=it.category||'General';
    const votes=document.createElement('span'); votes.className='votes'; votes.textContent='▲ '+(it.votes||'0');
    right.appendChild(cat); right.appendChild(votes); header.appendChild(src); header.appendChild(right);
    card.appendChild(header);
    const h=document.createElement('h3'); h.textContent=it.title||''; card.appendChild(h);
    const p=document.createElement('p'); p.className='summary'; p.textContent=it.summary||''; card.appendChild(p);
    const a=document.createElement('a'); a.className='view-source'; a.href=it.url||'#'; a.target='_blank'; a.textContent='View Source →'; card.appendChild(a);
    container.appendChild(card);
  });
  const obs=new IntersectionObserver((entries)=>{ entries.forEach(en=>{ if(en.isIntersecting) en.target.classList.add('visible'); }); }, {threshold:0.15});
  document.querySelectorAll('.card').forEach(c=>obs.observe(c));
}
// category filter
document.getElementById('categories').addEventListener('click', (e)=>{ const btn=e.target.closest('.pill'); if(!btn) return; document.querySelectorAll('.pill').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); const cat=btn.dataset.cat; const date=pages[currentPage] && pages[currentPage].date; const all=cache[date]||[]; const filtered = (cat==='all')? all: all.filter(x=> (x.category||'').toLowerCase()===cat.toLowerCase()); renderPosts(filtered); });
// subscribe
window.handleSubscribe = function(form){ const email=form.querySelector('input[type=email]').value; const msg=document.getElementById('subscribeMessage'); if(email){ let subs = JSON.parse(localStorage.getItem('subscribers')||'[]'); if(!subs.includes(email)) subs.push(email); localStorage.setItem('subscribers', JSON.stringify(subs)); msg.textContent='✅ Thanks — you are subscribed!'; } return true; };
// init
loadArchives();
