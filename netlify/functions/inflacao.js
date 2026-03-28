// Proxy for BCB SGS API — IPCA inflation data for real-rate calculations
const https = require('https');

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
    'Cache-Control': 'public, max-age=600',
  };

  try {
    // IPCA monthly — last 12 months (BCB SGS max per request is 20)
    const ipcaData = await fetchBCB(433, 12);

    if (!Array.isArray(ipcaData) || ipcaData.length === 0) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'No IPCA data from BCB' }) };
    }

    // Parse monthly values
    const monthly = ipcaData.map(item => ({
      date: item.data,  // dd/mm/yyyy
      value: parseFloat(String(item.valor).replace(',', '.'))
    }));

    // Compute accumulated windows: 3m, 6m, 12m
    function accumulate(months) {
      const slice = monthly.slice(-months);
      let acum = 1;
      for (const m of slice) {
        acum *= (1 + m.value / 100);
      }
      return Math.round((acum - 1) * 10000) / 100;
    }

    // Annualize from accumulated period
    function annualize(acumPct, months) {
      return Math.round((Math.pow(1 + acumPct / 100, 12 / months) - 1) * 10000) / 100;
    }

    const acum3m = accumulate(3);
    const acum6m = accumulate(6);
    const acum12m = accumulate(12);

    const ultimo = monthly[monthly.length - 1];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ultimo: { date: ultimo.date, value: ultimo.value },
        acum3m,
        acum6m,
        acum12m,
        anualizado3m: annualize(acum3m, 3),
        anualizado6m: annualize(acum6m, 6),
        anualizado12m: acum12m,  // 12m accumulated IS the annual rate
        monthly,
        updated: new Date().toISOString(),
      }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
