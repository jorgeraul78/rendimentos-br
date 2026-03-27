// Proxy for BCB SGS API — key Brazilian economic indicators
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
    'Cache-Control': 'public, max-age=300',
  };

  try {
    const [cdiResult, selicResult, ipcaResult, dolarResult] = await Promise.allSettled([
      fetchBCB(12, 5),    // CDI daily — last 5
      fetchBCB(432, 1),   // Selic target — last 1
      fetchBCB(433, 12),  // IPCA monthly — last 12
      fetchBCB(1, 1),     // USD/BRL — last 1
    ]);

    // CDI
    let cdi = { diario: 0, anual: 0 };
    if (cdiResult.status === 'fulfilled' && Array.isArray(cdiResult.value) && cdiResult.value.length > 0) {
      const lastCdi = cdiResult.value[cdiResult.value.length - 1];
      const cdiDiario = parseFloat(String(lastCdi.valor).replace(',', '.'));
      cdi.diario = cdiDiario;
      // Annualize: ((1 + daily/100)^252 - 1) * 100
      cdi.anual = Math.round(((Math.pow(1 + cdiDiario / 100, 252) - 1) * 100) * 100) / 100;
    }

    // Selic
    let selic = { meta: 0 };
    if (selicResult.status === 'fulfilled' && Array.isArray(selicResult.value) && selicResult.value.length > 0) {
      selic.meta = parseFloat(String(selicResult.value[0].valor).replace(',', '.'));
    }

    // IPCA
    let ipca = { ultimo: 0, acum12m: 0 };
    if (ipcaResult.status === 'fulfilled' && Array.isArray(ipcaResult.value) && ipcaResult.value.length > 0) {
      const ipcaData = ipcaResult.value;
      ipca.ultimo = parseFloat(String(ipcaData[ipcaData.length - 1].valor).replace(',', '.'));
      // Compound last 12 months: product of (1 + m/100) - 1
      let acum = 1;
      for (const item of ipcaData) {
        acum *= (1 + parseFloat(String(item.valor).replace(',', '.')) / 100);
      }
      ipca.acum12m = Math.round((acum - 1) * 10000) / 100;
    }

    // Dolar
    let dolar = { compra: 0 };
    if (dolarResult.status === 'fulfilled' && Array.isArray(dolarResult.value) && dolarResult.value.length > 0) {
      dolar.compra = parseFloat(String(dolarResult.value[0].valor).replace(',', '.'));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        cdi,
        selic,
        ipca,
        dolar,
        updated: new Date().toISOString(),
      }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
