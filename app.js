/* Extracted functions for testability — also used by index.html via <script src="app.js"> */

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function splitChunks(text, max) {
  const s = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const ch = []; let cur = '';
  for (const x of s) {
    if (cur.length + x.length > max && cur) { ch.push(cur.trim()); cur = x; }
    else cur += x;
  }
  if (cur.trim()) ch.push(cur.trim());
  const res = [];
  for (const c of ch) {
    if (c.length <= max) { res.push(c); continue; }
    for (let i = 0; i < c.length; i += max) res.push(c.slice(i, i + max));
  }
  return res;
}

function formatAuthors(authorList) {
  const authors = (authorList || []).slice(0, 4)
    .map(a => `${a.family || ''} ${(a.given || '').charAt(0)}.`.trim()).join(', ')
    + ((authorList?.length || 0) > 4 ? ' et al.' : '');
  return authors;
}

function extractKeywords(titles, stopWords) {
  const freq = {};
  titles.join(' ').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 4 && !stopWords.has(w)).forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
}

function truncateDoi(doi) {
  if (!doi) return '';
  return doi.length > 42 ? doi.slice(0, 42) + '…' : doi;
}

function filterItems(items) {
  return (items || []).filter(it =>
    it.title?.[0] && it.title[0].length > 20 && it.abstract && it.abstract.length > 80
  );
}

function cleanAbstract(abstract) {
  return (abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { esc, splitChunks, formatAuthors, extractKeywords, truncateDoi, filterItems, cleanAbstract };
}
