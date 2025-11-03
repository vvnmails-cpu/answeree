# Answeree Digest - Infinite Scroll Edition (Deploy-ready)

This repo generates a daily digest (Reddit, Hacker News, Stack Overflow, Quora) and categorizes/summarizes with Gemini 2.5 Flash Lite.
It produces static JSON in `/data` and per-day HTML in `/content/YYYY-MM-DD/` and uses `index.html` with infinite-scroll to load past digests.

## Setup
1. Create a new GitHub repository and upload these files.
2. Add repository secret `GEMINI_API_KEY` (your Gemini key).
3. Enable GitHub Pages (Branch: main, Folder: / (root)).
4. (Optional) Replace AdSense placeholders in `scripts/fetch_daily_digest.py` and `index.html`.
5. Run the workflow manually from Actions → Build Daily Digest → Run workflow to generate initial data.

## Local testing
1. Install deps: `pip install -r requirements.txt`
2. Export key: `export GEMINI_API_KEY=your_key_here`
3. Run: `python scripts/fetch_daily_digest.py`
4. Open `index.html` in a simple static server, e.g. `python -m http.server`
