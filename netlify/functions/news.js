// Google News Brasil — Brazilian financial news RSS proxy
const https = require('https');

const RSS_URL = 'https://news.google.com/rss/search?q=mercado+financeiro+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419';

function fetchRSS() {
  return new Promise((resolve, reject) => {
    const req = https.get(RSS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extractTag(xml, tag) {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = xml.indexOf(open);
  if (start === -1) return '';
  const end = xml.indexOf(close, start);
  if (end === -1) return '';
  let content = xml.substring(start + open.length, end).trim();
  // Handle CDATA
  if (content.startsWith('<![CDATA[')) {
    content = content.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
  }
  return content;
}

function parseRSS(xml) {
  const items = [];
  let pos = 0;
  while (true) {
    const itemStart = xml.indexOf('<item>', pos);
    if (itemStart === -1) break;
    const itemEnd = xml.indexOf('</item>', itemStart);
    if (itemEnd === -1) break;
    const itemXml = xml.substring(itemStart, itemEnd + 7);

    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const source = extractTag(itemXml, 'source');

    if (title && link) {
      items.push({
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
        link,
        source: source.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
        pubDate,
      });
    }

    pos = itemEnd + 7;
    if (items.length >= 20) break;
  }
  return items;
}

exports.handler = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
  };

  try {
    const xml = await fetchRSS();
    const items = parseRSS(xml);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items, updated: new Date().toISOString() }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
