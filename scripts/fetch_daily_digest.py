#!/usr/bin/env python3
# fetch_daily_digest.py - generates content/YYYY-MM-DD/index.html and /data/*.json (real API mode)
import os, json, re, datetime, time
from pathlib import Path
import requests
try:
    import feedparser
except Exception:
    feedparser = None
try:
    import google.generativeai as genai
except Exception:
    genai = None
ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "content"
DATA_DIR = ROOT / "data"
OUT_ROOT.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
CONFIG = {
    "site_title": "Answeree Digest",
    "sources": {
        "reddit_subreddits": ["technology","science","worldnews","lifestyle"],
        "hn_top_n": 10,
        "so_pagesize": 8,
        "quora_rss": [
            "https://www.quora.com/topic/Technology/rss",
            "https://www.quora.com/topic/Science/rss"
        ]
    },
    "ads": {"ad_client":"ca-pub-XXXXXX","ad_slot_top":"1111111111","ad_slot_mid":"2222222222","ad_slot_bottom":"3333333333"},
    "categories": ["Tech","Science","Lifestyle","AI","Business","Health","Finance","General","Entertainment"],
    "max_items": 30
}
GEMINI_MODEL = "gemini-2.5-flash-lite"
GEMINI_KEY = os.getenv('GEMINI_API_KEY')
def call_gemini(title, text, categories, model=GEMINI_MODEL):
    if genai is None or not GEMINI_KEY:
        txt = (title + ' ' + (text or '')).lower()
        for c in categories:
            if c.lower() in txt:
                return {'rewritten_title': title, 'summary': (text or title)[:240], 'category': c}
        return {'rewritten_title': title, 'summary': (text or title)[:240], 'category': 'General'}
    genai.configure(api_key=GEMINI_KEY)
    prompt = f"""You are a helpful summarizer + tagger. Given a post title and a short snippet or text, do three things:
1) Produce a single short catchy rewritten title (keep factual meaning).
2) Produce a concise 1-2 sentence summary suitable for a daily digest.
3) Choose exactly one category from this list (and only one): {', '.join(CONFIG['categories'])}.
Return only a JSON object exactly like:
{{"rewritten_title":"...","summary":"...","category":"..."}}
Title: {title}
Text:
{text}
"""
    try:
        resp = genai.generate_text(model=model, prompt=prompt, max_output_tokens=240)
        text_out = ''
        if hasattr(resp, 'candidates') and resp.candidates:
            text_out = resp.candidates[0].content.strip()
        else:
            text_out = getattr(resp, 'text', str(resp)).strip()
        m = re.search(r'\{.*\}', text_out, flags=re.S)
        if m:
            data = json.loads(m.group(0))
            cat = data.get('category','General')
            if cat not in CONFIG['categories']:
                cat = 'General'
            return {'rewritten_title': data.get('rewritten_title', title), 'summary': data.get('summary','')[:400], 'category': cat}
    except Exception as e:
        print('gemini error', e)
    return {'rewritten_title': title, 'summary': (text or title)[:240], 'category': 'General'}
def fetch_reddit(subs, per=4):
    out=[]; headers={'User-Agent':'AnswereeDigestBot/1.0'}
    for s in subs:
        try:
            url=f'https://www.reddit.com/r/{s}/top.json?t=day&limit={per}'
            r=requests.get(url, headers=headers, timeout=15)
            data=r.json()
            for ch in data.get('data',{}).get('children',[]):
                d=ch.get('data',{})
                out.append({'source':f'Reddit /r/{s}','title':d.get('title'),'snippet':d.get('selftext') or d.get('title'),'url':'https://reddit.com'+d.get('permalink',''),'votes':d.get('score',0)})
            time.sleep(0.3)
        except Exception as e:
            print('reddit error', s, e)
    return out
def fetch_hn(n=10):
    out=[]
    try:
        ids=requests.get('https://hacker-news.firebaseio.com/v0/topstories.json', timeout=10).json()[:n]
        for tid in ids:
            it=requests.get(f'https://hacker-news.firebaseio.com/v0/item/{tid}.json', timeout=10).json()
            out.append({'source':'Hacker News','title':it.get('title',''),'snippet':it.get('text','') or it.get('title',''),'url':it.get('url') or f'https://news.ycombinator.com/item?id={tid}','votes':it.get('score',0)})
            time.sleep(0.2)
    except Exception as e:
        print('hn error', e)
    return out
def fetch_so(pagesize=8):
    out=[]
    try:
        url=f'https://api.stackexchange.com/2.3/questions?order=desc&sort=votes&site=stackoverflow&pagesize={pagesize}&filter=withbody'
        data=requests.get(url, timeout=10).json()
        for q in data.get('items',[]):
            out.append({'source':'Stack Overflow','title':q.get('title'),'snippet':(q.get('body') or '')[:400],'url':q.get('link'),'votes':q.get('score',0)})
            time.sleep(0.2)
    except Exception as e:
        print('so error', e)
    return out
def fetch_quora(rss_list):
    out=[]
    if feedparser is None:
        print('feedparser missing; skipping quora')
        return out
    for rss in rss_list:
        try:
            feed=feedparser.parse(rss)
            for e in feed.entries[:5]:
                out.append({'source':'Quora','title':e.get('title',''),'snippet':(e.get('summary') or e.get('description') or '')[:400],'url':e.get('link'),'votes':0})
        except Exception as e:
            print('quora error', e)
    return out
def build():
    today = datetime.date.today().isoformat()
    posts = []
    posts += fetch_reddit(CONFIG['sources']['reddit_subreddits'], per=4)
    posts += fetch_hn(CONFIG['sources']['hn_top_n'])
    posts += fetch_so(CONFIG['sources']['so_pagesize'])
    posts += fetch_quora(CONFIG['sources']['quora_rss'])
    seen=set(); uniq=[]
    for p in posts:
        key=(p.get('url') or p.get('title','')).strip()
        if not key or key in seen: continue
        seen.add(key); uniq.append(p)
    posts=uniq[:CONFIG.get('max_items',30)]
    processed=[]
    for p in posts:
        res = call_gemini(p.get('title',''), p.get('snippet',''), CONFIG['categories'])
        processed.append({'source':p.get('source'),'orig_title':p.get('title'),'title':res.get('rewritten_title'),'summary':res.get('summary'),'category':res.get('category'),'url':p.get('url'),'votes':p.get('votes',0)})
        time.sleep(0.4)
    from collections import defaultdict, Counter
    bycat=defaultdict(list)
    for it in processed: bycat[it['category']].append(it)
    for k in bycat: bycat[k].sort(key=lambda x:x.get('votes',0), reverse=True)
    counts=Counter([it['category'] for it in processed])
    trending=[c for c,_ in counts.most_common(3)]
    data_obj={'date':today,'trending':trending,'items':processed}
    with open(DATA_DIR / f'{today}.json','w',encoding='utf-8') as f: json.dump(data_obj,f,indent=2)
    dates = sorted([p.name.replace('.json','') for p in DATA_DIR.iterdir() if p.suffix=='.json'], reverse=True)
    meta={}
    for d in dates:
        try:
            j=json.load(open(DATA_DIR / (d + '.json'),'r',encoding='utf-8'))
            meta[d]=j.get('trending',[])
        except: meta[d]=[]
    index_obj={'dates':dates,'meta':meta}
    with open(DATA_DIR / 'index.json','w',encoding='utf-8') as f: json.dump(index_obj,f,indent=2)
    outdir = OUT_ROOT / today
    outdir.mkdir(parents=True, exist_ok=True)
    html = f"""<html><head><meta charset='utf-8'><title>{CONFIG['site_title']} - {today}</title><link rel='icon' href='/favicon.png'></head><body><h1>{today}</h1><pre>{json.dumps(data_obj,indent=2)}</pre></body></html>"""
    with open(outdir / 'index.html','w',encoding='utf-8') as f: f.write(html)
    print('build complete', today)
if __name__=='__main__':
    build()
