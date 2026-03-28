const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const CONFIG_PATH = path.join(__dirname, 'public', 'config.json');

app.disable('x-powered-by');
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "connect-src 'self' https://api.bcb.gov.br https://www.tesourodireto.com.br https://dados.cvm.gov.br https://query1.finance.yahoo.com",
      "object-src 'none'",
    ].join('; ')
  );
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// --- Helper: fetch JSON from URL ---
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// --- Config API ---
function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

app.get('/api/config', (req, res) => {
  res.json(readConfig());
});

// --- Fundos (CVM proxy) ---
app.get('/api/fundos', async (req, res) => {
  try {
    const fundosFn = require('./netlify/functions/fundos');
    const result = await fundosFn.handler({ queryStringParameters: req.query });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err) {
    console.error('Fundos proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch fundos data' });
  }
});

// --- Tesouro Direto API ---
app.get('/api/tesouro', async (req, res) => {
  try {
    // Try the JSON API first
    let bonds = [];
    try {
      const data = await fetchJSON('https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json');
      if (data && data.response && data.response.TrsrBdTradgList) {
        bonds = data.response.TrsrBdTradgList.map(item => {
          const b = item.TrsrBd;
          const tipo = (b.TrsrBdType && b.TrsrBdType.nm) || '';
          const indexador = (b.FinIndxs && b.FinIndxs.nm) || '';
          return {
            nome: b.nm,
            tipo,
            indexador,
            vencimento: b.mtrtyDt ? b.mtrtyDt.split('T')[0] : '',
            precoCompra: b.untrInvstmtVal,
            precoVenda: b.untrRedVal,
            taxaCompra: b.anulInvstmtRate,
            taxaVenda: b.anulRedRate,
            isin: b.isinCd || '',
          };
        });
      }
    } catch (e) {
      console.warn('Tesouro JSON API failed, using fallback data:', e.message);
    }

    // Fallback: hardcoded sample data
    if (bonds.length === 0) {
      bonds = getTesouroFallbackData();
    }

    res.json({ data: bonds, updated: new Date().toISOString() });
  } catch (err) {
    console.error('Tesouro proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch Tesouro data' });
  }
});

function getTesouroFallbackData() {
  return [
    { nome: 'Tesouro Selic 2027', tipo: 'LFT', indexador: 'SELIC', vencimento: '2027-03-01', precoCompra: 16042.35, precoVenda: 16028.12, taxaCompra: 0.0611, taxaVenda: 0.1122, isin: '' },
    { nome: 'Tesouro Selic 2029', tipo: 'LFT', indexador: 'SELIC', vencimento: '2029-03-01', precoCompra: 14856.78, precoVenda: 14840.45, taxaCompra: 0.0800, taxaVenda: 0.1500, isin: '' },
    { nome: 'Tesouro Prefixado 2027', tipo: 'LTN', indexador: 'Prefixado', vencimento: '2027-01-01', precoCompra: 785.23, precoVenda: 783.10, taxaCompra: 14.52, taxaVenda: 14.68, isin: '' },
    { nome: 'Tesouro Prefixado 2029', tipo: 'LTN', indexador: 'Prefixado', vencimento: '2029-01-01', precoCompra: 620.45, precoVenda: 618.23, taxaCompra: 14.89, taxaVenda: 15.10, isin: '' },
    { nome: 'Tesouro Prefixado 2032', tipo: 'LTN', indexador: 'Prefixado', vencimento: '2032-01-01', precoCompra: 430.12, precoVenda: 427.89, taxaCompra: 15.12, taxaVenda: 15.35, isin: '' },
    { nome: 'Tesouro Prefixado com Juros Semestrais 2035', tipo: 'NTN-F', indexador: 'Prefixado', vencimento: '2035-01-01', precoCompra: 920.56, precoVenda: 917.23, taxaCompra: 14.95, taxaVenda: 15.18, isin: '' },
    { nome: 'Tesouro IPCA+ 2029', tipo: 'NTN-B Principal', indexador: 'IPCA', vencimento: '2029-05-15', precoCompra: 3250.45, precoVenda: 3240.12, taxaCompra: 7.25, taxaVenda: 7.40, isin: '' },
    { nome: 'Tesouro IPCA+ 2035', tipo: 'NTN-B Principal', indexador: 'IPCA', vencimento: '2035-05-15', precoCompra: 2180.67, precoVenda: 2165.34, taxaCompra: 7.10, taxaVenda: 7.28, isin: '' },
    { nome: 'Tesouro IPCA+ 2045', tipo: 'NTN-B Principal', indexador: 'IPCA', vencimento: '2045-05-15', precoCompra: 1250.89, precoVenda: 1238.45, taxaCompra: 7.35, taxaVenda: 7.55, isin: '' },
    { nome: 'Tesouro IPCA+ com Juros Semestrais 2032', tipo: 'NTN-B', indexador: 'IPCA', vencimento: '2032-08-15', precoCompra: 4350.23, precoVenda: 4338.67, taxaCompra: 7.15, taxaVenda: 7.30, isin: '' },
    { nome: 'Tesouro IPCA+ com Juros Semestrais 2040', tipo: 'NTN-B', indexador: 'IPCA', vencimento: '2040-08-15', precoCompra: 4120.45, precoVenda: 4105.78, taxaCompra: 7.20, taxaVenda: 7.38, isin: '' },
    { nome: 'Tesouro IPCA+ com Juros Semestrais 2055', tipo: 'NTN-B', indexador: 'IPCA', vencimento: '2055-05-15', precoCompra: 4050.12, precoVenda: 4032.56, taxaCompra: 7.30, taxaVenda: 7.50, isin: '' },
  ];
}

// --- BCB SGS API ---
app.get('/api/bcb', async (req, res) => {
  try {
    const [cdiRes, selicRes, ipcaRes, dolarRes] = await Promise.allSettled([
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/5?formato=json'),
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json'),
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json'),
    ]);

    let cdi = { diario: 0, anual: 0 };
    if (cdiRes.status === 'fulfilled' && cdiRes.value.length > 0) {
      const last = cdiRes.value[cdiRes.value.length - 1];
      const diario = parseFloat(last.valor);
      cdi = { diario, anual: Math.round(((Math.pow(1 + diario / 100, 252) - 1) * 100) * 100) / 100 };
    }

    let selic = { meta: 0 };
    if (selicRes.status === 'fulfilled' && selicRes.value.length > 0) {
      selic = { meta: parseFloat(selicRes.value[0].valor) };
    }

    let ipca = { ultimo: 0, acum12m: 0 };
    if (ipcaRes.status === 'fulfilled' && ipcaRes.value.length > 0) {
      const vals = ipcaRes.value.map(v => parseFloat(v.valor));
      ipca.ultimo = vals[vals.length - 1];
      // Compound 12-month
      ipca.acum12m = Math.round(((vals.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) * 100) * 100) / 100;
    }

    let dolar = { compra: 0 };
    if (dolarRes.status === 'fulfilled' && dolarRes.value.length > 0) {
      dolar = { compra: parseFloat(dolarRes.value[0].valor) };
    }

    res.json({ cdi, selic, ipca, dolar, updated: new Date().toISOString() });
  } catch (err) {
    console.error('BCB proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch BCB data' });
  }
});

// --- Cotações (ticker strip) ---

// --- Inflação (IPCA for real-rate calculations) ---
app.get('/api/inflacao', async (req, res) => {
  try {
    const ipcaData = await fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json');
    if (!Array.isArray(ipcaData) || ipcaData.length === 0) {
      return res.status(502).json({ error: 'No IPCA data from BCB' });
    }

    const monthly = ipcaData.map(item => ({
      date: item.data,
      value: parseFloat(String(item.valor).replace(',', '.'))
    }));

    function accumulate(months) {
      const slice = monthly.slice(-months);
      let acum = 1;
      for (const m of slice) acum *= (1 + m.value / 100);
      return Math.round((acum - 1) * 10000) / 100;
    }

    function annualize(acumPct, months) {
      return Math.round((Math.pow(1 + acumPct / 100, 12 / months) - 1) * 10000) / 100;
    }

    const acum3m = accumulate(3);
    const acum6m = accumulate(6);
    const acum12m = accumulate(12);
    const ultimo = monthly[monthly.length - 1];

    res.json({
      ultimo: { date: ultimo.date, value: ultimo.value },
      acum3m, acum6m, acum12m,
      anualizado3m: annualize(acum3m, 3),
      anualizado6m: annualize(acum6m, 6),
      anualizado12m: acum12m,
      monthly,
      updated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Inflacao proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch inflation data' });
  }
});

app.get('/api/cotacoes', async (req, res) => {
  try {
    const [dolarRes, ibovRes, btcRes, cdiRes, selicRes] = await Promise.allSettled([
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/2?formato=json'),
      fetchYahooQuote('%5EBVSP'),
      fetchYahooQuote('BTC-BRL'),
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json'),
      fetchJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
    ]);

    let dolar = null;
    if (dolarRes.status === 'fulfilled' && dolarRes.value.length >= 2) {
      const curr = parseFloat(dolarRes.value[1].valor);
      const prev = parseFloat(dolarRes.value[0].valor);
      const change = prev ? Math.round(((curr - prev) / prev) * 10000) / 100 : 0;
      dolar = { price: curr, change };
    }

    let ibovespa = null;
    if (ibovRes.status === 'fulfilled') {
      const { price, prevClose } = ibovRes.value;
      ibovespa = { price, change: prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0 };
    }

    let bitcoin = null;
    if (btcRes.status === 'fulfilled') {
      const { price, prevClose } = btcRes.value;
      bitcoin = { price, change: prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0 };
    }

    let cdi = null;
    if (cdiRes.status === 'fulfilled' && cdiRes.value.length > 0) {
      const diario = parseFloat(cdiRes.value[0].valor);
      cdi = { value: Math.round(((Math.pow(1 + diario / 100, 252) - 1) * 100) * 100) / 100 };
    }

    let selicVal = null;
    if (selicRes.status === 'fulfilled' && selicRes.value.length > 0) {
      selicVal = { value: parseFloat(selicRes.value[0].valor) };
    }

    res.json({ dolar, ibovespa, bitcoin, cdi, selic: selicVal, updated: new Date().toISOString() });
  } catch (err) {
    console.error('Cotações proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch cotações' });
  }
});

function fetchYahooQuote(symbolEncoded) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolEncoded}?interval=1d&range=2d`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const result = json.chart.result[0];
          const meta = result.meta;
          resolve({ price: meta.regularMarketPrice, prevClose: meta.chartPreviousClose || meta.previousClose || 0 });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// --- Hot US Movers (Yahoo Finance proxy) ---
app.get('/api/hot-movers', async (req, res) => {
  const POOL = [
    'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA','AMD','NFLX','COIN',
    'PLTR','SMCI','MSTR','AVGO','CRM','UBER','SNOW','SQ','SHOP','RIVN',
    'SOFI','HOOD','INTC','BA','DIS','NKE','PYPL','BABA','JPM','V',
  ];

  try {
    const results = await Promise.allSettled(POOL.map(symbol => fetchYahooQuote(symbol).then(r => ({
      symbol, name: symbol, price: r.price,
      change: r.prevClose ? Math.round(((r.price - r.prevClose) / r.prevClose) * 10000) / 100 : 0
    }))));

    const data = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter(q => q && q.price != null)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);

    res.json({ data, updated: new Date().toISOString() });
  } catch (err) {
    console.error('Hot movers proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch hot movers data' });
  }
});

// --- Mundo (Yahoo Finance proxy) ---
app.get('/api/mundo', async (req, res) => {
  try {
    // Redirect to the Netlify function format
    const mundoFn = require('./netlify/functions/mundo');
    const result = await mundoFn.handler({ queryStringParameters: req.query });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err) {
    console.error('Mundo proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch mundo data' });
  }
});

// --- News (Google News BR) ---
app.get('/api/news', async (req, res) => {
  try {
    const newsFn = require('./netlify/functions/news');
    const result = await newsFn.handler({});
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err) {
    console.error('News proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch news' });
  }
});

app.listen(PORT, () => {
  console.log(`Rendimentos BR running at http://localhost:${PORT}`);
});
