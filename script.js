
const DATA_DIR = 'data';
const ARCHIVE_FILE = 'data/archives.json';
let archives = [];
let currentIndex = 0;
let postsCache = {};

// util
function el(tag, cls='', html=''){ const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e; }
function fmtDate(d){ return new Date(d).toDateString(); }

async function loadArchives(){
  try{
    const res = await fetch(ARCHIVE_FILE);
    archives = await res.json();
    if(!archives || archives.length===0) return;
    // sort reverse chronological (newest first)
    archives.sort((a,b)=> new Date(b.date)-new Date(a.date));
    currentIndex = 0;
    updateDateLabel();
    await loadPostsForIndex(currentIndex);
    renderArchiveList(); // for archive page
  }catch(e){ console.error('loadArchives', e); }
}

async function loadPostsForIndex(idx){
  if(!archives[idx]) return;
  const date = archives[idx].date;
  if(postsCache[date]) { renderPosts(postsCache[date]); return; }
  try{
    const res = await fetch(`${DATA_DIR}/${date}.json`);
    const data = await res.json();
    postsCache[date] = data;
    renderPosts(data);
  }catch(e){ console.error('loadPostsForIndex', e); document.getElementById('cardContainer').innerHTML='<p style="color:#ef4444">Failed to load posts</p>' }
}

function renderPosts(items){
  const container = document.getElementById('cardContainer') || document.getElementById('archiveList');
  if(!container) return;
  // if showing archiveList, build cards inline else replace container content
  if(container.id === 'cardContainer'){
    container.innerHTML='';
    items.forEach(it=> container.appendChild(buildCard(it)));
  } else {
    container.innerHTML='';
    items.forEach(it=> container.appendChild(buildCard(it)));
  }
}

function buildCard(it){
  const c = el('article','card');
  const header = el('div','card-header');
  header.appendChild(el('div','source-tag', it.source || 'Web'));
  const right = el('div');
  right.appendChild(el('span','category-tag', it.category || 'General'));
  right.appendChild(el('span','votes', ' ▲ '+(it.votes||0)));
  header.appendChild(right);
  c.appendChild(header);
  c.appendChild(el('h3','',''+(it.title||'')));
  c.appendChild(el('p','summary',''+(it.summary||'')));
  const a = el('a','view-btn','View Source →');
  a.href = it.url || '#'; a.target='_blank'; c.appendChild(a);
  return c;
}

// pagination controls
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('prevBtn').addEventListener('click', ()=>{ if(currentIndex < archives.length-1){ currentIndex++; updateDateLabel(); loadPostsForIndex(currentIndex); } });
  document.getElementById('nextBtn').addEventListener('click', ()=>{ if(currentIndex > 0){ currentIndex--; updateDateLabel(); loadPostsForIndex(currentIndex); } });
  // category filters
  document.getElementById('categories').addEventListener('click', (e)=>{
    const btn = e.target.closest('.category');
    if(!btn) return;
    document.querySelectorAll('.category').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    // filter displayed by category if we have posts currently
    const cat = btn.dataset.cat;
    const date = archives[currentIndex].date;
    const all = postsCache[date] || [];
    const filtered = cat==='all' ? all : all.filter(x=> (x.category||'').toLowerCase()===cat.toLowerCase());
    renderPosts(filtered);
  });

  // subscribe handlers (shared)
  window.handleSubscribe = function(form){
    const emailInput = (form.querySelector('input[type=email]')||{});
    const msgEl = form.querySelector('p') || document.getElementById('subscribeMessage');
    if(emailInput && emailInput.value){
      let subs = JSON.parse(localStorage.getItem('subscribers')|| '[]');
      if(!subs.includes(emailInput.value)){
        subs.push(emailInput.value);
        localStorage.setItem('subscribers', JSON.stringify(subs));
      }
      if(msgEl) msgEl.textContent = '✅ Thanks — you are subscribed!';
    }
    // allow form to submit to Google Forms in a new tab (we return true so it posts)
    return true;
  };

  // load archives
  loadArchives();
});
