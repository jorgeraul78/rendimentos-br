// Cotacoes strip ticker — key Brazilian market quotes
const https = require('https');

function fetchYahoo(symbolEncoded) {
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

function fetchBCB(code, n) {
  return new Promise((resolve, reject) => {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/${n}?formato=json`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

exports.handler = async () => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',
  };

  try {
    const [dolarBCB, eurYahoo, ibovYahoo, btcYahoo, cdiBCB, selicBCB] = await Promise.allSettled([
      fetchBCB(1, 2),                   // USD/BRL last 2 values
      fetchYahoo('EURBRL%3DX'),         // EUR/BRL
      fetchYahoo('%5EBVSP'),            // Ibovespa
      fetchYahoo('BTC-BRL'),            // Bitcoin BRL
      fetchBCB(12, 1),                  // CDI daily last 1
      fetchBCB(432, 1),                 // Selic target last 1
    ]);

    // USD/BRL from BCB
    let dolar = { price: 0, change: 0 };
    if (dolarBCB.status === 'fulfilled' && Array.isArray(dolarBCB.value) && dolarBCB.value.length >= 2) {
      const curr = parseFloat(String(dolarBCB.value[dolarBCB.value.length - 1].valor).replace(',', '.'));
      const prev = parseFloat(String(dolarBCB.value[dolarBCB.value.length - 2].valor).replace(',', '.'));
      dolar.price = curr;
      dolar.change = prev ? Math.round(((curr - prev) / prev) * 10000) / 100 : 0;
    } else if (dolarBCB.status === 'fulfilled' && Array.isArray(dolarBCB.value) && dolarBCB.value.length === 1) {
      dolar.price = parseFloat(String(dolarBCB.value[0].valor).replace(',', '.'));
    }

    // EUR/BRL from Yahoo
    let euro = { price: 0, change: 0 };
    if (eurYahoo.status === 'fulfilled') {
      const { price, prevClose } = eurYahoo.value;
      euro.price = price;
      euro.change = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;
    }

    // Ibovespa from Yahoo
    let ibovespa = { price: 0, change: 0 };
    if (ibovYahoo.status === 'fulfilled') {
      const { price, prevClose } = ibovYahoo.value;
      ibovespa.price = price;
      ibovespa.change = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;
    }

    // Bitcoin BRL from Yahoo
    let bitcoin = { price: 0, change: 0 };
    if (btcYahoo.status === 'fulfilled') {
      const { price, prevClose } = btcYahoo.value;
      bitcoin.price = price;
      bitcoin.change = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;
    }

    // CDI from BCB
    let cdi = { value: 0 };
    if (cdiBCB.status === 'fulfilled' && Array.isArray(cdiBCB.value) && cdiBCB.value.length > 0) {
      const dailyRate = parseFloat(String(cdiBCB.value[0].valor).replace(',', '.'));
      // Annualize: ((1 + daily/100)^252 - 1) * 100
      cdi.value = Math.round(((Math.pow(1 + dailyRate / 100, 252) - 1) * 100) * 100) / 100;
    }

    // Selic from BCB
    let selic = { value: 0 };
    if (selicBCB.status === 'fulfilled' && Array.isArray(selicBCB.value) && selicBCB.value.length > 0) {
      selic.value = parseFloat(String(selicBCB.value[0].valor).replace(',', '.'));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dolar,
        euro,
        ibovespa,
        bitcoin,
        cdi,
        selic,
        updated: new Date().toISOString(),
      }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
