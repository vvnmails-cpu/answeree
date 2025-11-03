import fs from "fs";
import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

async function summarize(text, title, source) {
  const prompt = `Summarize briefly in 2–3 lines for a daily digest. 
Keep it factual and easy to read.
Title: ${title}
Source: ${source}
Text: ${text}`;
  const res = await model.generateContent(prompt);
  return res.response.text();
}

async function fetchJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

async function fetchRSS(url) {
  const xml = await fetch(url).then(r => r.text());
  const data = await parseStringPromise(xml);
  return (data.rss?.channel?.[0]?.item || []).map(i => ({
    title: i.title?.[0],
    url: i.link?.[0],
    description: i.description?.[0] || ""
  }));
}

async function fetchAll() {
  const sources = JSON.parse(fs.readFileSync("scripts/sources.json"));
  const results = [];

  // Reddit
  for (const url of sources.reddit || []) {
    const json = await fetchJSON(url);
    for (const p of json.data.children.slice(0, 5)) {
      results.push({
        title: p.data.title,
        url: "https://reddit.com" + p.data.permalink,
        source: "Reddit",
        votes: p.data.ups || 0,
        category: "Tech"
      });
    }
  }

  // Hacker News
  for (const api of sources.hackernews || []) {
    const ids = (await fetchJSON(api)).slice(0, 10);
    for (const id of ids) {
      const story = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json());
      if (story && story.title && story.url) {
        results.push({
          title: story.title,
          url: story.url,
          source: "Hacker News",
          votes: story.score || 0,
          category: "Tech"
        });
      }
    }
  }

  // StackOverflow, Quora, RSS
  for (const group of [sources.stackoverflow, sources.quora, sources.rss]) {
    for (const url of group || []) {
      const posts = await fetchRSS(url);
      for (const p of posts.slice(0, 5)) {
        results.push({
          title: p.title,
          url: p.url,
          source: url.includes("stackoverflow") ? "Stack Overflow" :
                  url.includes("quora") ? "Quora" : "RSS",
          votes: "",
          category: "General"
        });
      }
    }
  }

  return results;
}

async function main() {
  const items = await fetchAll();
  const summarized = [];

  for (const item of items) {
    try {
      const summary = await summarize(item.title, item.url, item.source);
      summarized.push({ ...item, summary });
    } catch (e) {
      console.error("Gemini summarization failed:", e);
    }
  }

  const date = new Date().toISOString().split("T")[0];
  fs.writeFileSync(`data/${date}.json`, JSON.stringify(summarized, null, 2));
  console.log(`✅ Digest created: ${date}.json`);
}

main().catch(console.error);
