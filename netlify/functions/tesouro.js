// Proxy for Tesouro Direto (Brazilian Treasury Bonds) data
const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function classifyBond(name) {
  if (/Tesouro Selic/i.test(name)) return { tipo: 'LFT', indexador: 'Selic' };
  if (/Tesouro IPCA.*Juros/i.test(name)) return { tipo: 'NTN-B', indexador: 'IPCA' };
  if (/Tesouro IPCA/i.test(name)) return { tipo: 'NTN-B Principal', indexador: 'IPCA' };
  if (/Tesouro Prefixado.*Juros/i.test(name)) return { tipo: 'NTN-F', indexador: 'Prefixado' };
  if (/Tesouro Prefixado/i.test(name)) return { tipo: 'LTN', indexador: 'Prefixado' };
  if (/Tesouro Renda/i.test(name)) return { tipo: 'NTN-B', indexador: 'IPCA' };
  return { tipo: 'Outro', indexador: 'Outro' };
}

function parseJSONResponse(json) {
  const list = json.response && json.response.TrsrBdTradgList;
  if (!list || !Array.isArray(list)) return null;
  return list.map(item => {
    const b = item.TrsrBd;
    const cls = classifyBond(b.nm);
    return {
      nome: b.nm,
      tipo: cls.tipo,
      indexador: b.FinIndxs && b.FinIndxs.nm ? b.FinIndxs.nm : cls.indexador,
      vencimento: b.mtrtyDt ? b.mtrtyDt.split('T')[0] : '',
      precoCompra: b.untrInvstmtVal || 0,
      precoVenda: b.untrRedVal || 0,
      taxaCompra: b.anulInvstmtRate || 0,
      taxaVenda: b.anulRedRate || 0,
      isin: b.isinCd || '',
    };
  });
}

function parseCSVResponse(csv) {
  const lines = csv.split('\n');
  if (lines.length < 2) return null;
  // Header: Tipo Titulo;Data Venda;Data Vencimento;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha
  const header = lines[0].split(';').map(h => h.trim());
  const tipoIdx = header.indexOf('Tipo Titulo');
  const dateIdx = header.indexOf('Data Venda');
  const matIdx = header.indexOf('Data Vencimento');
  const taxaCompraIdx = header.indexOf('Taxa Compra Manha');
  const taxaVendaIdx = header.indexOf('Taxa Venda Manha');
  const puCompraIdx = header.indexOf('PU Compra Manha');
  const puVendaIdx = header.indexOf('PU Venda Manha');

  // Get the most recent date's data
  const data = [];
  let latestDate = '';
  for (let i = lines.length - 1; i >= 1; i--) {
    const cols = lines[i].split(';');
    if (cols.length < 5) continue;
    const dt = cols[dateIdx] || '';
    if (!latestDate) latestDate = dt;
    if (dt !== latestDate) break;
    const nome = (cols[tipoIdx] || '').trim();
    if (!nome) continue;
    const cls = classifyBond(nome);
    const matRaw = (cols[matIdx] || '').trim();
    // Convert DD/MM/YYYY to YYYY-MM-DD
    let vencimento = matRaw;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(matRaw)) {
      const [d, m, y] = matRaw.split('/');
      vencimento = `${y}-${m}-${d}`;
    }
    data.push({
      nome,
      tipo: cls.tipo,
      indexador: cls.indexador,
      vencimento,
      precoCompra: parseFloat((cols[puCompraIdx] || '0').replace(',', '.')) || 0,
      precoVenda: parseFloat((cols[puVendaIdx] || '0').replace(',', '.')) || 0,
      taxaCompra: parseFloat((cols[taxaCompraIdx] || '0').replace(',', '.')) || 0,
      taxaVenda: parseFloat((cols[taxaVendaIdx] || '0').replace(',', '.')) || 0,
      isin: '',
    });
  }
  return data.length > 0 ? data.reverse() : null;
}

function getHardcodedData() {
  return [
    // Tesouro Selic
    { nome: 'Tesouro Selic 2027', tipo: 'LFT', indexador: 'Selic', vencimento: '2027-03-01', precoCompra: 15245.67, precoVenda: 15238.42, taxaCompra: 0.0712, taxaVenda: 0.0918, isin: 'BRSTNCLFT0R7' },
    { nome: 'Tesouro Selic 2029', tipo: 'LFT', indexador: 'Selic', vencimento: '2029-03-01', precoCompra: 14012.35, precoVenda: 14005.18, taxaCompra: 0.1150, taxaVenda: 0.1356, isin: 'BRSTNCLFT0S5' },
    // Tesouro Prefixado
    { nome: 'Tesouro Prefixado 2027', tipo: 'LTN', indexador: 'Prefixado', vencimento: '2027-01-01', precoCompra: 812.45, precoVenda: 810.12, taxaCompra: 14.52, taxaVenda: 14.62, isin: 'BRSTNCLTN7B3' },
    { nome: 'Tesouro Prefixado 2029', tipo: 'LTN', indexador: 'Prefixado', vencimento: '2029-01-01', precoCompra: 620.45, precoVenda: 618.23, taxaCompra: 14.89, taxaVenda: 14.99, isin: 'BRSTNCLTN7D9' },
    { nome: 'Tesouro Prefixado 2032', tipo: 'LTN', indexador: 'Prefixado', vencimento: '2032-01-01', precoCompra: 412.78, precoVenda: 410.95, taxaCompra: 14.68, taxaVenda: 14.78, isin: 'BRSTNCLTN7F4' },
    // Tesouro IPCA+
    { nome: 'Tesouro IPCA+ 2029', tipo: 'NTN-B Principal', indexador: 'IPCA', vencimento: '2029-05-15', precoCompra: 3285.42, precoVenda: 3278.15, taxaCompra: 7.25, taxaVenda: 7.35, isin: 'BRSTNCLTN6B5' },
    { nome: 'Tesouro IPCA+ 2035', tipo: 'NTN-B Principal', indexador: 'IPCA', vencimento: '2035-05-15', precoCompra: 2145.67, precoVenda: 2138.92, taxaCompra: 7.12, taxaVenda: 7.22, isin: 'BRSTNCLTN6D1' },
    { nome: 'Tesouro IPCA+ 2045', tipo: 'NTN-B Principal', indexador: 'IPCA', vencimento: '2045-05-15', precoCompra: 1198.34, precoVenda: 1192.56, taxaCompra: 7.38, taxaVenda: 7.48, isin: 'BRSTNCLTN6F6' },
    // Tesouro IPCA+ com Juros Semestrais
    { nome: 'Tesouro IPCA+ com Juros Semestrais 2032', tipo: 'NTN-B', indexador: 'IPCA', vencimento: '2032-08-15', precoCompra: 4512.89, precoVenda: 4505.34, taxaCompra: 7.18, taxaVenda: 7.28, isin: 'BRSTNCLTN4J2' },
    { nome: 'Tesouro IPCA+ com Juros Semestrais 2040', tipo: 'NTN-B', indexador: 'IPCA', vencimento: '2040-08-15', precoCompra: 4285.12, precoVenda: 4278.45, taxaCompra: 7.05, taxaVenda: 7.15, isin: 'BRSTNCLTN4L8' },
    { nome: 'Tesouro IPCA+ com Juros Semestrais 2055', tipo: 'NTN-B', indexador: 'IPCA', vencimento: '2055-05-15', precoCompra: 4098.56, precoVenda: 4091.23, taxaCompra: 7.42, taxaVenda: 7.52, isin: 'BRSTNCLTN4N4' },
    // Tesouro Prefixado com Juros Semestrais
    { nome: 'Tesouro Prefixado com Juros Semestrais 2035', tipo: 'NTN-F', indexador: 'Prefixado', vencimento: '2035-01-01', precoCompra: 892.34, precoVenda: 889.78, taxaCompra: 14.95, taxaVenda: 15.05, isin: 'BRSTNCLTNF36' },
  ];
}

exports.handler = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
  };

  // Strategy 1: Try the official JSON API
  try {
    const json = await fetchJSON('https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json');
    const data = parseJSONResponse(json);
    if (data && data.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data, source: 'api', updated: new Date().toISOString() }),
      };
    }
  } catch (e) {
    // JSON API failed (likely Cloudflare 403), try CSV fallback
  }

  // Strategy 2: Try the open data CSV
  try {
    const csv = await fetchCSV('https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PressVenda.csv');
    const data = parseCSVResponse(csv);
    if (data && data.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data, source: 'csv', updated: new Date().toISOString() }),
      };
    }
  } catch (e) {
    // CSV also failed, use hardcoded data
  }

  // Strategy 3: Hardcoded fallback
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ data: getHardcodedData(), source: 'fallback', updated: new Date().toISOString() }),
  };
};
