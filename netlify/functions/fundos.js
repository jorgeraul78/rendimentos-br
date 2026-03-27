// Fetches fund quota data from CVM informe diário (CSV)
// Downloads monthly ZIP, decompresses, parses CSV, filters by configured CNPJs
const https = require('https');
const http = require('http');
const zlib = require('zlib');

function fetchBuffer(url) {
  const mod = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity' } }, res => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Normalize CNPJ: remove dots, slashes, dashes
function normalizeCNPJ(cnpj) {
  return cnpj.replace(/[.\-\/]/g, '');
}

// Parse CSV rows from CVM informe diario
// Columns: TP_FUNDO_CLASSE;CNPJ_FUNDO_CLASSE;ID_SUBCLASSE;DT_COMPTC;VL_TOTAL;VL_QUOTA;VL_PATRIM_LIQ;CAPTC_DIA;RESG_DIA;NR_COTST
function parseCSV(csvText, targetCNPJs) {
  const lines = csvText.split('\n');
  const records = {}; // normalized cnpj -> [{date, quota, pl, cotistas}]

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(';');
    if (cols.length < 8) continue;

    const cnpjRaw = cols[1];
    const cnpj = normalizeCNPJ(cnpjRaw);
    if (!targetCNPJs.has(cnpj)) continue;

    const date = cols[3]; // YYYY-MM-DD
    const quota = parseFloat(cols[5]);
    const pl = parseFloat(cols[6]);
    const cotistas = parseInt(cols[8]) || 0;

    if (!records[cnpj]) records[cnpj] = [];
    records[cnpj].push({ date, quota, pl, cotistas });
  }

  return records;
}

exports.handler = async (event) => {
  try {
    // Get CNPJs from query or use defaults
    const qs = event.queryStringParameters || {};
    const cnpjList = qs.cnpjs ? qs.cnpjs.split(',').map(c => normalizeCNPJ(c)) : [];
    const targetCNPJs = new Set(cnpjList);

    // Build URL for current month and previous month
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Also try previous month in case current month file is not ready yet
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ymPrev = `${prev.getFullYear()}${String(prev.getMonth() + 1).padStart(2, '0')}`;

    let records = {};
    let sourceMonth = ym;

    // Try current month first
    try {
      const url = `https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/inf_diario_fi_${ym}.zip`;
      const zipBuf = await fetchBuffer(url);

      // The ZIP contains a single CSV file. Use zlib to decompress if it's actually gzip,
      // or parse the ZIP manually for the file entry
      const csvText = extractCSVFromZip(zipBuf);
      records = parseCSV(csvText, targetCNPJs);
    } catch (e) {
      console.warn(`Failed to fetch current month ${ym}:`, e.message);
      // Fallback to previous month
      try {
        const url = `https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/inf_diario_fi_${ymPrev}.zip`;
        const zipBuf = await fetchBuffer(url);
        const csvText = extractCSVFromZip(zipBuf);
        records = parseCSV(csvText, targetCNPJs);
        sourceMonth = ymPrev;
      } catch (e2) {
        console.error('Failed to fetch CVM data:', e2.message);
      }
    }

    // Calculate annualized return for each fund
    const results = [];
    for (const cnpj of targetCNPJs) {
      const data = records[cnpj];
      if (!data || data.length < 2) continue;

      // Sort by date
      data.sort((a, b) => a.date.localeCompare(b.date));

      const latest = data[data.length - 1];
      const prev = data[data.length - 2];
      const first = data[0];

      // Daily return (latest vs previous)
      const dailyReturn = prev.quota > 0 ? (latest.quota / prev.quota - 1) : 0;
      // Annualized (base 252 business days)
      const rendAnual = Math.round(((Math.pow(1 + dailyReturn, 252) - 1) * 100) * 100) / 100;

      // Period return (latest vs first of month)
      const days = data.length;
      const periodReturn = first.quota > 0 ? (latest.quota / first.quota - 1) : 0;
      const rendMensal = Math.round(periodReturn * 10000) / 100;

      results.push({
        cnpj,
        quota: latest.quota,
        pl: latest.pl,
        cotistas: latest.cotistas,
        dataUltima: latest.date,
        dataPenultima: prev.date,
        rendAnual,
        rendMensal,
        dias: days,
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
      body: JSON.stringify({
        data: results,
        source: 'CVM Informe Diário',
        month: sourceMonth,
        updated: new Date().toISOString(),
      }),
    };
  } catch (e) {
    console.error('Fundos error:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

// Minimal ZIP parser — extract first file from ZIP archive
function extractCSVFromZip(buf) {
  // Find local file header signature (PK\x03\x04)
  let offset = 0;
  while (offset < buf.length - 4) {
    if (buf[offset] === 0x50 && buf[offset + 1] === 0x4b &&
        buf[offset + 2] === 0x03 && buf[offset + 3] === 0x04) {
      break;
    }
    offset++;
  }

  if (offset >= buf.length - 30) throw new Error('No ZIP local file header found');

  const compressionMethod = buf.readUInt16LE(offset + 8);
  const compressedSize = buf.readUInt32LE(offset + 18);
  const uncompressedSize = buf.readUInt32LE(offset + 22);
  const fileNameLength = buf.readUInt16LE(offset + 26);
  const extraFieldLength = buf.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

  const compressedData = buf.slice(dataOffset, dataOffset + compressedSize);

  if (compressionMethod === 0) {
    // Stored (no compression)
    return compressedData.toString('utf-8');
  } else if (compressionMethod === 8) {
    // Deflated
    const decompressed = zlib.inflateRawSync(compressedData);
    return decompressed.toString('utf-8');
  } else {
    throw new Error(`Unsupported compression method: ${compressionMethod}`);
  }
}
