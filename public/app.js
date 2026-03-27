// ─── Rendimentos BR — Main App ───

document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  setupTabs();
  loadMundo();
  loadHotMovers();
  loadCotacoes();
  loadNewsTicker();
});

// ─── Theme Toggle ───

function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

// ─── Tab switching ───

function setupTabs() {
  const subnav = document.querySelector('.subnav');
  const hero = document.getElementById('hero');
  const sectionHome = document.getElementById('section-home');

  const headerMundo = document.getElementById('header-mundo');
  const headerBrl = document.getElementById('header-brl');
  const headerTitulos = document.getElementById('header-titulos');
  const headerDebentures = document.getElementById('header-debentures');

  // Sub-tabs within BRL
  const subTabs = document.querySelectorAll('.subnav-tab[data-tab]');
  subTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const target = tab.dataset.tab;
      subTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById('tab-cdbs').style.display = target === 'cdbs' ? '' : 'none';
      document.getElementById('tab-fundos').style.display = target === 'fundos' ? '' : 'none';
      if (target === 'fundos' && !document.getElementById('fundos-list').hasChildNodes()) {
        loadFundos();
      }
    });
  });

  // Título sub-tabs
  document.querySelectorAll('.subnav-tab[data-titulo]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const target = tab.dataset.titulo;
      document.querySelectorAll('.subnav-tab[data-titulo]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('titulo-prefixado').style.display = target === 'prefixado' ? '' : 'none';
      document.getElementById('titulo-ipca').style.display = target === 'ipca' ? '' : 'none';
      document.getElementById('titulo-selic').style.display = target === 'selic' ? '' : 'none';
    });
  });

  function hideAllTabs() {
    document.getElementById('tab-cdbs').style.display = 'none';
    document.getElementById('tab-fundos').style.display = 'none';
    document.getElementById('tab-titulos').style.display = 'none';
    document.getElementById('tab-debentures').style.display = 'none';
    document.getElementById('section-mundo').style.display = 'none';
    if (sectionHome) sectionHome.classList.remove('active');
    document.querySelector('.container').style.display = '';
    [headerMundo, headerBrl, headerTitulos, headerDebentures].forEach(b => b && b.classList.remove('active'));
    hero.style.display = '';
    subnav.style.display = 'none';
  }

  function switchToHome() {
    hideAllTabs();
    if (sectionHome) sectionHome.classList.add('active');
    hero.style.display = 'none';
    document.querySelector('.container').style.display = 'none';
    updatePageTitle('home');
  }

  function updatePageTitle(section) {
    const base = 'Rendimentos BR';
    const titles = {
      home: 'Compare Rendimentos',
      mundo: 'Monitor Global',
      brl: 'CDBs e Fundos',
      titulos: 'Títulos Públicos',
      debentures: 'Debêntures',
    };
    document.title = titles[section] ? `${titles[section]} — ${base}` : base;
  }

  headerMundo.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllTabs();
    headerMundo.classList.add('active');
    document.getElementById('section-mundo').style.display = '';
    hero.querySelector('h1').textContent = 'Monitor Global';
    hero.querySelector('p').textContent = 'Principais indicadores do mercado mundial em tempo real.';
    updatePageTitle('mundo');
    location.hash = 'mundo';
  });

  headerBrl.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllTabs();
    headerBrl.classList.add('active');
    subnav.style.display = '';
    document.getElementById('tab-cdbs').style.display = '';
    hero.querySelector('h1').textContent = 'CDBs, Poupança e Fundos';
    hero.querySelector('p').textContent = 'Compare rendimentos de CDBs de liquidez diária e fundos DI no Brasil.';
    updatePageTitle('brl');
    location.hash = 'brl';
    if (!document.getElementById('cdbs-list').hasChildNodes()) {
      loadCDBs();
    }
  });

  headerTitulos.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllTabs();
    headerTitulos.classList.add('active');
    document.getElementById('tab-titulos').style.display = '';
    hero.querySelector('h1').textContent = 'Tesouro Direto';
    hero.querySelector('p').textContent = 'Títulos públicos federais — taxas e preços atualizados.';
    updatePageTitle('titulos');
    location.hash = 'titulos';
    if (!document.getElementById('prefixado-list').hasChildNodes()) {
      loadTitulos();
    }
  });

  headerDebentures.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllTabs();
    headerDebentures.classList.add('active');
    document.getElementById('tab-debentures').style.display = '';
    hero.querySelector('h1').textContent = 'Debêntures Corporativas';
    hero.querySelector('p').textContent = 'Rendimentos de debêntures das principais empresas brasileiras.';
    updatePageTitle('debentures');
    location.hash = 'debentures';
    if (!document.getElementById('debentures-list').hasChildNodes()) {
      loadDebentures();
    }
  });

  // Logo click → home
  document.querySelector('.logo').addEventListener('click', (e) => {
    e.preventDefault();
    switchToHome();
    location.hash = '';
  });

  // Handle initial hash
  const hash = location.hash.replace('#', '');
  if (hash === 'mundo') headerMundo.click();
  else if (hash === 'brl') headerBrl.click();
  else if (hash === 'titulos') headerTitulos.click();
  else if (hash === 'debentures') headerDebentures.click();
  else switchToHome();
}

// ─── Card Component ───

function createCard({ logo, logoBg, name, entity, tags, rate, rateLabel, rateDate }) {
  const card = document.createElement('div');
  card.className = 'fund-card';

  const tagsHTML = tags.map(t => {
    let cls = 'tag';
    if (t.type) cls += ' ' + t.type;
    return `<span class="${cls}">${t.text}</span>`;
  }).join('');

  const entityHTML = entity ? `<div class="fund-entity">${entity}</div>` : '';

  card.innerHTML = `
    <div class="fund-logo" style="background:${logoBg}">${logo}</div>
    <div class="fund-info">
      <div class="fund-name">${name}</div>
      ${entityHTML}
      <div class="fund-tags">${tagsHTML}</div>
    </div>
    <div class="fund-rate">
      <div class="rate-value">${rate}</div>
      <div class="rate-label">${rateLabel}</div>
      <div class="rate-date">${rateDate}</div>
    </div>
  `;
  return card;
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 55%, 45%)`;
}

function formatPatrimonio(value) {
  if (!value) return '—';
  const num = parseFloat(value);
  if (num >= 1e12) return `R$ ${(num / 1e12).toFixed(1)} tri`;
  if (num >= 1e9) return `R$ ${(num / 1e9).toFixed(1)} bi`;
  if (num >= 1e6) return `R$ ${Math.round(num / 1e6)} mi`;
  if (num >= 1e3) return `R$ ${Math.round(num / 1e3)} mil`;
  return `R$ ${num}`;
}

// ─── CDBs Section ───

async function loadCDBs() {
  const container = document.getElementById('cdbs-list');
  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>Carregando CDBs...</p></div>`;

  try {
    const [config, bcbRes] = await Promise.all([
      fetch('/api/config').then(r => r.json()),
      fetch('/api/bcb').then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    const cdiAnual = bcbRes?.cdi?.anual || config.benchmarks?.cdi_anual || 14.65;
    const selicMeta = bcbRes?.selic?.meta || config.benchmarks?.selic_meta || 14.75;

    const items = config.cdbs.filter(c => c.ativo).map(item => {
      let rendAnual;
      if (item.tipo === 'Poupança') {
        // Poupança: when Selic > 8.5%, yield = 0.5% monthly + TR ≈ 70% Selic
        rendAnual = Math.round(selicMeta * 0.7 * 100) / 100;
      } else {
        rendAnual = Math.round((cdiAnual * item.cdi_pct / 100) * 100) / 100;
      }
      return { ...item, rendAnual };
    });

    items.sort((a, b) => b.rendAnual - a.rendAnual);

    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = '<div class="loading">Nenhum dado disponível.</div>';
      return;
    }

    const cardItems = items.map(item => {
      const card = createCard({
        logo: item.logo,
        logoBg: item.logo_bg,
        name: item.nome,
        tags: [
          { text: item.tipo, type: 'category' },
          { text: item.rentabilidade, type: 'limit' },
        ],
        rate: `${item.rendAnual.toFixed(2)}%`,
        rateLabel: 'Rend. anual',
        rateDate: `CDI a.a.: ${cdiAnual.toFixed(2)}%`
      });
      container.appendChild(card);
      return { tna: item.rendAnual, nome: item.nome, logo: item.logo, logoBg: item.logo_bg };
    });

    renderRendimentosChart(cardItems);
  } catch (e) {
    console.error('Error loading CDBs:', e);
    container.innerHTML = '<div class="loading">Erro ao carregar dados.</div>';
  }
}

function renderRendimentosChart(items, containerId) {
  const container = document.getElementById(containerId || 'rendimentos-chart');
  if (!container || items.length === 0) return;

  const sorted = [...items].sort((a, b) => b.tna - a.tna);
  const maxTna = Math.max(...sorted.map(i => i.tna));
  const minTna = Math.min(...sorted.map(i => i.tna));

  function getBarColor(tna) {
    const ratio = (tna - minTna) / (maxTna - minTna || 1);
    const h = 152; // green hue (Brazilian green)
    const s = 45 + ratio * 30;
    const l = 55 - ratio * 15;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  const rows = sorted.map(item => {
    const chartMin = 5;
    const pct = Math.max(8, ((item.tna - chartMin) / (maxTna - chartMin)) * 100);
    const color = getBarColor(item.tna);
    return `
      <div class="chart-row">
        <div class="chart-logo" style="background:${item.logoBg}">${item.logo}</div>
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="width:${pct}%;background:${color}">
            <span class="chart-value">${item.tna.toFixed(2)}%</span>
          </div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = rows;
}

// ─── Fundos DI Section ───

async function loadFundos() {
  const container = document.getElementById('fundos-list');
  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>Carregando fundos da CVM...</p></div>`;

  try {
    const config = await fetch('/api/config').then(r => r.json());
    const fundos = config.fundos.filter(f => f.ativo);

    if (fundos.length === 0) {
      container.innerHTML = '<div class="loading">Nenhum fundo disponível.</div>';
      return;
    }

    // Fetch real data from CVM
    const cnpjs = fundos.map(f => f.cnpj).join(',');
    const cvmRes = await fetch(`/api/fundos?cnpjs=${cnpjs}`).then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] }));

    // Build lookup by CNPJ
    const cvmMap = {};
    for (const item of (cvmRes.data || [])) {
      cvmMap[item.cnpj] = item;
    }

    // Merge config with CVM data
    const items = fundos.map(fundo => {
      const cvm = cvmMap[fundo.cnpj];
      return {
        ...fundo,
        rendAnual: cvm ? cvm.rendAnual : null,
        rendMensal: cvm ? cvm.rendMensal : null,
        quota: cvm ? cvm.quota : null,
        pl: cvm ? cvm.pl : null,
        cotistas: cvm ? cvm.cotistas : null,
        dataUltima: cvm ? cvm.dataUltima : null,
      };
    });

    // Sort by annual return (funds with data first, then by rendAnual desc)
    items.sort((a, b) => {
      if (a.rendAnual != null && b.rendAnual == null) return -1;
      if (a.rendAnual == null && b.rendAnual != null) return 1;
      return (b.rendAnual || 0) - (a.rendAnual || 0);
    });

    container.innerHTML = '';
    items.forEach(fundo => {
      const rateStr = fundo.rendAnual != null ? `${fundo.rendAnual.toFixed(2)}%` : '—';
      const dateStr = fundo.dataUltima ? `Cota em ${fundo.dataUltima}` : 'Dados da CVM';
      const plStr = fundo.pl ? formatPatrimonio(fundo.pl) : '';
      const tags = [{ text: fundo.categoria, type: 'category' }];
      if (plStr) tags.push({ text: `PL: ${plStr}`, type: '' });
      if (fundo.cotistas) tags.push({ text: `${fundo.cotistas.toLocaleString('pt-BR')} cotistas`, type: '' });

      const card = createCard({
        logo: fundo.entidade.substring(0, 2).toUpperCase(),
        logoBg: stringToColor(fundo.entidade),
        name: fundo.nome,
        entity: fundo.entidade,
        tags,
        rate: rateStr,
        rateLabel: 'Rend. anual',
        rateDate: dateStr
      });
      container.appendChild(card);
    });

    // Show source info
    if (cvmRes.month) {
      const sourceP = document.createElement('p');
      sourceP.className = 'section-source';
      sourceP.textContent = `Fonte: CVM Informe Diário (${cvmRes.month}). Rentabilidade anualizada (base 252 dias úteis).`;
      container.appendChild(sourceP);
    }
  } catch (e) {
    console.error('Error loading fundos:', e);
    container.innerHTML = '<div class="loading">Erro ao carregar fundos.</div>';
  }
}

// ─── Títulos Públicos (Tesouro Direto) ───

async function loadTitulos() {
  const prefixadoContainer = document.getElementById('prefixado-list');
  const ipcaContainer = document.getElementById('ipca-list');
  const selicContainer = document.getElementById('selic-list');

  prefixadoContainer.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>Carregando títulos...</p></div>`;

  try {
    const res = await fetch('/api/tesouro');
    const { data: bonds } = await res.json();

    if (!bonds || bonds.length === 0) {
      prefixadoContainer.innerHTML = '<div class="loading">Nenhum dado disponível.</div>';
      return;
    }

    // Separate by type
    const prefixados = bonds.filter(b => b.indexador === 'Prefixado' || b.tipo === 'LTN' || b.tipo === 'NTN-F');
    const ipcas = bonds.filter(b => b.indexador === 'IPCA' || b.tipo === 'NTN-B' || b.tipo === 'NTN-B Principal');
    const selics = bonds.filter(b => b.indexador === 'SELIC' || b.tipo === 'LFT');

    renderTituloTable(prefixados, prefixadoContainer, 'Taxa a.a.', '#00c853');
    renderTituloTable(ipcas, ipcaContainer, 'IPCA +', '#2979ff');
    renderTituloTable(selics, selicContainer, 'Selic +', '#ffd600');

    // Scatter plots
    renderTituloScatter(prefixados, 'prefixado-scatter', 'Prefixado', '#00c853');
    renderTituloScatter(ipcas, 'ipca-scatter', 'IPCA+', '#2979ff');
  } catch (e) {
    console.error('Error loading títulos:', e);
    prefixadoContainer.innerHTML = '<div class="loading">Erro ao carregar títulos.</div>';
  }
}

function renderTituloTable(bonds, container, rateHeader, accentColor) {
  if (!bonds || bonds.length === 0) {
    container.innerHTML = '<div class="loading">Nenhum título disponível nesta categoria.</div>';
    return;
  }

  // Sort by maturity
  bonds.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

  const bestRate = Math.max(...bonds.map(b => b.taxaCompra));
  const rows = bonds.map(b => {
    const vto = new Date(b.vencimento);
    const vtoStr = `${String(vto.getDate()).padStart(2, '0')}/${String(vto.getMonth() + 1).padStart(2, '0')}/${vto.getFullYear()}`;
    const dias = Math.max(1, Math.round((vto - new Date()) / (1000 * 60 * 60 * 24)));
    const isHighlighted = b.taxaCompra === bestRate ? ' highlighted-row' : '';
    const tipoShort = b.tipo || '—';

    // Shorten long names
    const nomeShort = b.nome
      .replace('com Juros Semestrais', 'c/ Juros Sem.')
      .replace('Tesouro ', 'T. ');

    return `<tr class="${isHighlighted}" style="cursor:pointer" data-bond-idx="${bonds.indexOf(b)}">
      <td><span class="lecap-ticker">${nomeShort}</span><span class="lecap-type-badge" style="background:${accentColor}22;color:${accentColor}">${tipoShort}</span></td>
      <td class="mono">R$ ${b.precoCompra ? b.precoCompra.toFixed(2) : '—'}</td>
      <td class="mono">R$ ${b.precoVenda ? b.precoVenda.toFixed(2) : '—'}</td>
      <td>${dias}</td>
      <td>${vtoStr}</td>
      <td class="lecap-tir">${b.taxaCompra ? b.taxaCompra.toFixed(2) + '%' : '—'}</td>
      <td class="lecap-tir">${b.taxaVenda ? b.taxaVenda.toFixed(2) + '%' : '—'}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="lecap-table-wrap">
      <table class="lecap-table">
        <thead>
          <tr>
            <th class="col-ticker">Título</th>
            <th>Preço Compra</th>
            <th>Preço Venda</th>
            <th>Dias</th>
            <th>Vencimento</th>
            <th>Taxa Compra</th>
            <th>Taxa Venda</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="calc-hint"><svg class="icon-hint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Clique em qualquer título para abrir a calculadora</p>`;

  // Make sortable
  const table = container.querySelector('.lecap-table');
  if (table) makeSortable(table);

  // Add click handlers for calculator
  container.querySelectorAll('tbody tr[data-bond-idx]').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.bondIdx);
      if (bonds[idx]) openTituloCalculator(bonds[idx]);
    });
  });
}

function renderTituloScatter(bonds, canvasId, label, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined' || !bonds || bonds.length === 0) return;

  const textColor = '#555555';
  const gridColor = '#1a1a1a';

  const points = bonds.map(b => {
    const dias = Math.max(1, Math.round((new Date(b.vencimento) - new Date()) / (1000 * 60 * 60 * 24)));
    return { x: dias, y: b.taxaCompra, nome: b.nome };
  }).filter(p => p.y > 0);

  if (points.length < 2) return;

  // Polynomial regression
  const allPoints = points.map(p => [p.x, p.y]).sort((a, b) => a[0] - b[0]);
  const curve = fitPolyCurve(allPoints, 2, 50);

  new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Curva',
          data: curve,
          type: 'line',
          borderColor: 'rgba(160,160,168,0.4)',
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
          fill: false,
          order: 2,
        },
        {
          label: label,
          data: points.map(p => ({ x: p.x, y: p.y, nome: p.nome })),
          backgroundColor: color,
          borderColor: color,
          pointRadius: 7,
          pointHoverRadius: 10,
          order: 1,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 10, right: 20, bottom: 5, left: 5 } },
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: "'Geist', sans-serif", size: 12 },
            filter: (item) => item.text !== 'Curva'
          }
        },
        tooltip: {
          filter: (item) => item.dataset.label !== 'Curva',
          callbacks: {
            label: (ctx) => {
              const p = ctx.raw;
              return `${p.nome}: ${p.y.toFixed(2)}% — ${p.x} dias`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Dias até o vencimento', color: textColor, font: { family: "'Geist', sans-serif", size: 12 } },
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'Geist', sans-serif" } }
        },
        y: {
          title: { display: true, text: 'Taxa a.a. (%)', color: textColor, font: { family: "'Geist', sans-serif", size: 12 } },
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'Geist', sans-serif" }, callback: v => v.toFixed(1) + '%' }
        }
      }
    }
  });
}

// Polynomial regression
function fitPolyCurve(points, degree, n) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const m = degree + 1;
  const A = [];
  const B = [];
  for (let i = 0; i < m; i++) {
    A[i] = [];
    for (let j = 0; j < m; j++) {
      A[i][j] = xs.reduce((s, x) => s + Math.pow(x, i + j), 0);
    }
    B[i] = xs.reduce((s, x, k) => s + ys[k] * Math.pow(x, i), 0);
  }
  for (let i = 0; i < m; i++) {
    let maxRow = i;
    for (let k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [B[i], B[maxRow]] = [B[maxRow], B[i]];
    for (let k = i + 1; k < m; k++) {
      const f = A[k][i] / A[i][i];
      for (let j = i; j < m; j++) A[k][j] -= f * A[i][j];
      B[k] -= f * B[i];
    }
  }
  const coeffs = new Array(m);
  for (let i = m - 1; i >= 0; i--) {
    coeffs[i] = B[i];
    for (let j = i + 1; j < m; j++) coeffs[i] -= A[i][j] * coeffs[j];
    coeffs[i] /= A[i][i];
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const result = [];
  for (let i = 0; i <= n; i++) {
    const x = minX + (maxX - minX) * (i / n);
    let y = 0;
    for (let j = 0; j < m; j++) y += coeffs[j] * Math.pow(x, j);
    result.push({ x: Math.round(x), y });
  }
  return result;
}

// ─── Título Calculator Modal ───

function openTituloCalculator(bond) {
  // Remove existing modal
  const existing = document.querySelector('.calc-modal-overlay');
  if (existing) existing.remove();

  const vto = new Date(bond.vencimento);
  const dias = Math.max(1, Math.round((vto - new Date()) / (1000 * 60 * 60 * 24)));
  const vtoStr = `${String(vto.getDate()).padStart(2, '0')}/${String(vto.getMonth() + 1).padStart(2, '0')}/${vto.getFullYear()}`;

  const overlay = document.createElement('div');
  overlay.className = 'calc-modal-overlay';
  overlay.innerHTML = `
    <div class="calc-modal">
      <div class="calc-modal-header">
        <div>
          <div class="calc-modal-title">${bond.nome}</div>
          <div class="calc-modal-subtitle">${bond.tipo} — Vencimento: ${vtoStr} (${dias} dias)</div>
        </div>
        <button class="calc-modal-close" aria-label="Fechar">&times;</button>
      </div>
      <div class="calc-modal-body">
        <div class="calc-row">
          <label>Valor investido (R$)</label>
          <input type="number" id="calc-valor" value="1000" min="30" step="100">
        </div>
        <div class="calc-row">
          <label>Taxa de compra (% a.a.)</label>
          <input type="number" id="calc-taxa" value="${bond.taxaCompra || 0}" step="0.01">
        </div>
        <div class="calc-row">
          <label>IR (%)</label>
          <input type="number" id="calc-ir" value="${dias <= 180 ? 22.5 : dias <= 360 ? 20 : dias <= 720 ? 17.5 : 15}" step="0.5">
        </div>
        <div class="calc-results" id="calc-results"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  overlay.querySelector('.calc-modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Calculate on input change
  function calcular() {
    const valor = parseFloat(document.getElementById('calc-valor').value) || 0;
    const taxa = parseFloat(document.getElementById('calc-taxa').value) || 0;
    const ir = parseFloat(document.getElementById('calc-ir').value) || 0;

    let rendBruto, rendLiq;

    if (bond.indexador === 'Prefixado' || bond.tipo === 'LTN' || bond.tipo === 'NTN-F') {
      // Prefixado: valor * (1 + taxa/100)^(dias/365)
      rendBruto = valor * (Math.pow(1 + taxa / 100, dias / 365) - 1);
    } else if (bond.indexador === 'IPCA') {
      // IPCA+: approximate with taxa real + IPCA estimado (5%)
      const ipcaEst = 5;
      const taxaTotal = ((1 + taxa / 100) * (1 + ipcaEst / 100) - 1) * 100;
      rendBruto = valor * (Math.pow(1 + taxaTotal / 100, dias / 365) - 1);
    } else {
      // Selic: approximate with Selic target
      rendBruto = valor * (Math.pow(1 + 14.75 / 100, dias / 365) - 1);
    }

    const impostoVal = rendBruto * (ir / 100);
    rendLiq = rendBruto - impostoVal;
    const valorFinal = valor + rendLiq;

    const resultsDiv = document.getElementById('calc-results');
    resultsDiv.innerHTML = `
      <div class="calc-result-row">
        <span>Rendimento bruto</span>
        <span class="calc-result-value positive">R$ ${rendBruto.toFixed(2)}</span>
      </div>
      <div class="calc-result-row">
        <span>IR (${ir}%)</span>
        <span class="calc-result-value negative">- R$ ${impostoVal.toFixed(2)}</span>
      </div>
      <div class="calc-result-row total">
        <span>Rendimento líquido</span>
        <span class="calc-result-value positive">R$ ${rendLiq.toFixed(2)}</span>
      </div>
      <div class="calc-result-row total">
        <span>Valor final</span>
        <span class="calc-result-value">R$ ${valorFinal.toFixed(2)}</span>
      </div>
      <div class="calc-result-row">
        <span>Rentabilidade líquida</span>
        <span class="calc-result-value">${valor > 0 ? ((rendLiq / valor) * 100).toFixed(2) : 0}%</span>
      </div>
    `;
  }

  document.getElementById('calc-valor').addEventListener('input', calcular);
  document.getElementById('calc-taxa').addEventListener('input', calcular);
  document.getElementById('calc-ir').addEventListener('input', calcular);
  calcular();
}

// ─── Debêntures Section ───

async function loadDebentures() {
  const container = document.getElementById('debentures-list');
  container.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>Carregando debêntures...</p></div>`;

  try {
    const config = await fetch('/api/config').then(r => r.json());
    const debs = config.debentures.filter(d => d.ativo);

    if (!debs || debs.length === 0) {
      container.innerHTML = '<div class="loading">Nenhuma debênture disponível.</div>';
      return;
    }

    // Sort by spread descending
    debs.sort((a, b) => b.spread - a.spread);

    const bestSpread = Math.max(...debs.map(d => d.spread));
    const rows = debs.map(d => {
      const vto = new Date(d.vencimento);
      const vtoStr = `${String(vto.getDate()).padStart(2, '0')}/${String(vto.getMonth() + 1).padStart(2, '0')}/${vto.getFullYear()}`;
      const dias = Math.max(1, Math.round((vto - new Date()) / (1000 * 60 * 60 * 24)));
      const isHighlighted = d.spread === bestSpread ? ' highlighted-row' : '';
      const tipoColor = d.tipo === 'DI+' ? '#00c853' : '#2979ff';

      return `<tr class="${isHighlighted}">
        <td><span class="lecap-ticker">${d.codigo}</span><span class="lecap-type-badge" style="background:${tipoColor}22;color:${tipoColor}">${d.tipo}</span></td>
        <td>${d.emissor}</td>
        <td>${d.rating}</td>
        <td>${d.spread.toFixed(2)}%</td>
        <td>${dias}</td>
        <td>${vtoStr}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="lecap-table-wrap">
        <table class="lecap-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Emissor</th>
              <th>Rating</th>
              <th>Spread</th>
              <th>Dias</th>
              <th>Vencimento</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    const table = container.querySelector('.lecap-table');
    if (table) makeSortable(table);

    // Scatter plot: spread vs dias
    renderDebentureScatter(debs);
  } catch (e) {
    console.error('Error loading debêntures:', e);
    container.innerHTML = '<div class="loading">Erro ao carregar debêntures.</div>';
  }
}

function renderDebentureScatter(debs) {
  const canvas = document.getElementById('debentures-scatter');
  if (!canvas || typeof Chart === 'undefined') return;

  const textColor = '#555555';
  const gridColor = '#1a1a1a';

  const diPlus = debs.filter(d => d.tipo === 'DI+');
  const ipcaPlus = debs.filter(d => d.tipo === 'IPCA+');

  const mapPoints = (arr) => arr.map(d => {
    const dias = Math.max(1, Math.round((new Date(d.vencimento) - new Date()) / (1000 * 60 * 60 * 24)));
    return { x: dias, y: d.spread, codigo: d.codigo, emissor: d.emissor };
  });

  const allPoints = [...diPlus, ...ipcaPlus].map(d => {
    const dias = Math.round((new Date(d.vencimento) - new Date()) / (1000 * 60 * 60 * 24));
    return [dias, d.spread];
  }).sort((a, b) => a[0] - b[0]);

  const curve = allPoints.length >= 3 ? fitPolyCurve(allPoints, 2, 50) : [];

  new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        ...(curve.length > 0 ? [{
          label: 'Curva',
          data: curve,
          type: 'line',
          borderColor: 'rgba(160,160,168,0.4)',
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
          fill: false,
          order: 2,
        }] : []),
        {
          label: 'CDI+',
          data: mapPoints(diPlus),
          backgroundColor: '#00c853',
          borderColor: '#00c853',
          pointRadius: 7,
          pointHoverRadius: 10,
          order: 1,
        },
        {
          label: 'IPCA+',
          data: mapPoints(ipcaPlus),
          backgroundColor: '#2979ff',
          borderColor: '#2979ff',
          pointRadius: 7,
          pointHoverRadius: 10,
          pointStyle: 'rectRounded',
          order: 1,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 10, right: 20, bottom: 5, left: 5 } },
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: "'Geist', sans-serif", size: 12 },
            filter: (item) => item.text !== 'Curva'
          }
        },
        tooltip: {
          filter: (item) => item.dataset.label !== 'Curva',
          callbacks: {
            label: (ctx) => {
              const p = ctx.raw;
              return `${p.codigo} (${p.emissor}): ${p.y.toFixed(2)}% — ${p.x} dias`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Dias até o vencimento', color: textColor, font: { family: "'Geist', sans-serif", size: 12 } },
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'Geist', sans-serif" } }
        },
        y: {
          title: { display: true, text: 'Spread (%)', color: textColor, font: { family: "'Geist', sans-serif", size: 12 } },
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: "'Geist', sans-serif" }, callback: v => v.toFixed(1) + '%' }
        }
      }
    }
  });
}

// ─── Mundo Section (Global Monitor) ───

async function loadMundo() {
  const grid = document.getElementById('mundo-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>Carregando mercados...</p></div>`;

  try {
    const res = await fetch('/api/mundo');
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const { data } = await res.json();

    if (!data || data.length === 0) {
      grid.innerHTML = '<div class="loading">Nenhum dado disponível.</div>';
      return;
    }

    grid.innerHTML = '';

    // Group items by category (preserving API order)
    const groups = [];
    const groupMap = {};
    data.forEach(item => {
      if (item.price === null) return;
      const g = item.group || 'Outros';
      if (!groupMap[g]) { groupMap[g] = []; groups.push(g); }
      groupMap[g].push(item);
    });

    groups.forEach(groupName => {
      const header = document.createElement('div');
      header.className = 'mundo-group-header';
      header.textContent = groupName;
      grid.appendChild(header);

      groupMap[groupName].forEach(item => {
        const isRate = item.group === 'Taxas';
        const isUp = item.change >= 0;
        const changeColor = isUp ? 'var(--green)' : 'var(--red)';
        const arrow = isUp ? '▲' : '▼';

        let priceStr;
        if (isRate) {
          priceStr = item.price.toFixed(3) + '%';
        } else if (item.price >= 10000) {
          priceStr = item.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        } else if (item.price >= 100) {
          priceStr = item.price.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
        } else {
          priceStr = item.price.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
        }

        const canvasId = `spark-${item.id}`;
        const card = document.createElement('div');
        card.className = 'mundo-card';
        card.innerHTML = `
          <div class="mundo-icon">${item.icon}</div>
          <div class="mundo-info">
            <div class="mundo-name">${item.name}</div>
            <div class="mundo-price">${priceStr}</div>
          </div>
          <div class="mundo-spark"><canvas id="${canvasId}" width="60" height="24"></canvas></div>
          <div class="mundo-change" style="color:${changeColor}">
            <span class="mundo-arrow">${arrow}</span>
            <span>${Math.abs(item.change).toFixed(2)}%</span>
          </div>
        `;
        grid.appendChild(card);

        if (item.sparkline && item.sparkline.length > 1) {
          drawSparkline(canvasId, item.sparkline, isUp);
        }
      });
    });

    const src = document.getElementById('mundo-source');
    if (src) src.textContent = '';
  } catch (e) {
    console.error('Error loading Mundo:', e);
    grid.innerHTML = '<div class="loading">Erro ao carregar dados do mercado.</div>';
  }
}

function drawSparkline(canvasId, data, isUp) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const color = isUp ? getComputedStyle(document.documentElement).getPropertyValue('--green').trim()
                     : getComputedStyle(document.documentElement).getPropertyValue('--red').trim();

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';

  let lastX, lastY;
  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((data[i] - min) / range) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    lastX = x;
    lastY = y;
  }
  ctx.stroke();

  // Pulsing dot at the end
  const parent = canvas.parentElement;
  parent.style.position = 'relative';
  const dot = document.createElement('div');
  dot.className = 'spark-dot';
  dot.style.left = (lastX / w * 100) + '%';
  dot.style.top = (lastY / h * 100) + '%';
  dot.style.background = color;
  dot.style.boxShadow = `0 0 6px ${color}`;
  parent.appendChild(dot);
}

// ─── Hot US Movers ───

async function loadHotMovers() {
  const grid = document.getElementById('hot-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/hot-movers');
    const { data } = await res.json();

    if (!data || data.length === 0) return;

    grid.innerHTML = data.map(item => {
      const isUp = item.change > 0;
      const changeClass = isUp ? 'positive' : 'negative';
      const arrow = isUp ? '&#9650;' : '&#9660;';
      return `<div class="hot-card ${changeClass}">
        <div class="hot-symbol">${item.symbol}</div>
        <div class="hot-name">${item.name}</div>
        <div class="hot-price">$${item.price.toFixed(2)}</div>
        <div class="hot-change ${changeClass}">${arrow} ${Math.abs(item.change).toFixed(2)}%</div>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('Error loading hot movers:', e);
  }
}

// ─── Cotações Ticker Strip ───

async function loadCotacoes() {
  const strip = document.getElementById('cotizaciones-strip');
  const inner = document.getElementById('cotizaciones-strip-inner');
  if (!strip || !inner) return;

  try {
    const res = await fetch('/api/cotacoes');
    const data = await res.json();

    const items = [];

    if (data.dolar) items.push({ label: 'USD/BRL', price: `R$ ${data.dolar.price.toFixed(2)}`, change: data.dolar.change });
    if (data.ibovespa) items.push({ label: 'IBOVESPA', price: Math.round(data.ibovespa.price).toLocaleString('pt-BR'), change: data.ibovespa.change });
    if (data.selic) items.push({ label: 'SELIC', price: `${data.selic.value.toFixed(2)}%`, change: null });
    if (data.cdi) items.push({ label: 'CDI', price: `${data.cdi.value.toFixed(2)}%`, change: null });
    if (data.bitcoin) items.push({ label: 'BTC', price: `R$ ${Math.round(data.bitcoin.price).toLocaleString('pt-BR')}`, change: data.bitcoin.change });

    if (items.length === 0) return;

    inner.innerHTML = items.map(item => {
      let changeHtml = '';
      if (item.change != null) {
        const cls = item.change > 0 ? 'positive' : item.change < 0 ? 'negative' : '';
        const sign = item.change > 0 ? '+' : '';
        changeHtml = `<span class="cotiz-change ${cls}">${sign}${item.change.toFixed(2)}%</span>`;
      }
      return `<div class="cotiz-item">
        <span class="cotiz-label">${item.label}</span>
        <span class="cotiz-price">${item.price}</span>
        ${changeHtml}
      </div>`;
    }).join('');

    strip.classList.add('loaded');
  } catch (e) {
    console.error('Error loading cotações:', e);
  }
}

// ─── News Ticker ───

async function loadNewsTicker() {
  const ticker = document.getElementById('news-ticker');
  const track = document.getElementById('news-ticker-track');
  const closeBtn = document.getElementById('news-ticker-close');
  if (!ticker || !track) return;

  try {
    const res = await fetch('/api/news');
    const { data } = await res.json();

    if (!data || data.length === 0) return;

    const itemsHTML = data.map(item =>
      `<a class="news-ticker-item" href="${item.link}" target="_blank" rel="noopener">${item.source ? `<span class="news-ticker-source">${item.source}</span>` : ''}${item.title}</a>`
    ).join('');

    track.innerHTML = itemsHTML + itemsHTML; // duplicate for loop
    ticker.style.display = 'flex';

    if (closeBtn) {
      closeBtn.addEventListener('click', () => { ticker.style.display = 'none'; });
    }
  } catch (e) {
    console.error('Error loading news:', e);
  }
}

// ─── Table Sorting ───

function makeSortable(table) {
  const headers = table.querySelectorAll('th');
  headers.forEach((th, colIdx) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const asc = th.dataset.sort !== 'asc';

      headers.forEach(h => delete h.dataset.sort);
      th.dataset.sort = asc ? 'asc' : 'desc';

      rows.sort((a, b) => {
        const aVal = a.cells[colIdx]?.textContent.trim() || '';
        const bVal = b.cells[colIdx]?.textContent.trim() || '';
        const aNum = parseFloat(aVal.replace(/[^0-9.\-]/g, ''));
        const bNum = parseFloat(bVal.replace(/[^0-9.\-]/g, ''));
        if (!isNaN(aNum) && !isNaN(bNum)) return asc ? aNum - bNum : bNum - aNum;
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });

      rows.forEach(r => tbody.appendChild(r));
    });
  });
}
