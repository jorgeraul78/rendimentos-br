// ─── Rendimentos BR — Main App ───

// ─── Global: Inflation data for real-rate toggle ───
let _inflationData = null;
let _showReal = false;

async function loadInflationData() {
  try {
    const res = await fetch('/api/inflacao');
    if (res.ok) {
      _inflationData = await res.json();
      console.log('IPCA loaded:', _inflationData.acum12m + '% (12m)');
    } else {
      console.warn('Inflacao endpoint returned', res.status);
    }
  } catch (e) {
    console.warn('Could not load inflation data:', e);
  }
}

// Fisher formula: realRate = (1 + nominal/100) / (1 + inflation/100) - 1
function toRealRate(nominalPct) {
  if (!_inflationData || nominalPct == null) return nominalPct;
  const ipca12m = _inflationData.acum12m;
  const real = ((1 + nominalPct / 100) / (1 + ipca12m / 100) - 1) * 100;
  return Math.round(real * 100) / 100;
}

function displayRate(nominalPct) {
  if (!_showReal || nominalPct == null) return nominalPct;
  const result = toRealRate(nominalPct);
  return result;
}

function rateLabel() {
  return _showReal ? 'Rend. real' : 'Rend. anual';
}

function setupRealToggle() {
  const btn = document.getElementById('real-toggle');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!_inflationData) {
      console.log('Loading inflation data...');
      await loadInflationData();
    }
    _showReal = !_showReal;
    console.log('Toggle:', _showReal ? 'REAL' : 'NOMINAL', '| IPCA data:', _inflationData ? _inflationData.acum12m + '%' : 'NULL');
    btn.classList.toggle('active', _showReal);
    btn.innerHTML = _showReal
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Taxa Real'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Nominal';
    // Update the IPCA badge
    const badge = document.getElementById('ipca-badge');
    if (badge && _inflationData) {
      badge.textContent = `IPCA 12m: ${_inflationData.acum12m.toFixed(2)}%`;
      badge.style.display = _showReal ? '' : 'none';
    }
    // Re-render active sections
    document.dispatchEvent(new CustomEvent('ratemode-changed'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  setupRealToggle();
  loadInflationData();
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

let _cdbCache = null;

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
        rendAnual = Math.round(selicMeta * 0.7 * 100) / 100;
      } else {
        rendAnual = Math.round((cdiAnual * item.cdi_pct / 100) * 100) / 100;
      }
      return { ...item, rendAnual };
    });

    items.sort((a, b) => b.rendAnual - a.rendAnual);
    _cdbCache = { items, cdiAnual };
    renderCDBs();
  } catch (e) {
    console.error('Error loading CDBs:', e);
    container.innerHTML = '<div class="loading">Erro ao carregar dados.</div>';
  }
}

function renderCDBs() {
  if (!_cdbCache) return;
  const { items, cdiAnual } = _cdbCache;
  const container = document.getElementById('cdbs-list');
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = '<div class="loading">Nenhum dado disponível.</div>';
    return;
  }

  const ipcaNote = _showReal && _inflationData
    ? ` · IPCA 12m: ${_inflationData.acum12m.toFixed(2)}%`
    : '';

  const cardItems = items.map(item => {
    const shown = displayRate(item.rendAnual);
    const card = createCard({
      logo: item.logo,
      logoBg: item.logo_bg,
      name: item.nome,
      tags: [
        { text: item.tipo, type: 'category' },
        { text: item.rentabilidade, type: 'limit' },
      ],
      rate: `${shown.toFixed(2)}%`,
      rateLabel: rateLabel(),
      rateDate: `CDI a.a.: ${cdiAnual.toFixed(2)}%${ipcaNote}`
    });
    container.appendChild(card);
    return { tna: shown, nome: item.nome, logo: item.logo, logoBg: item.logo_bg };
  });

  renderRendimentosChart(cardItems);
}

document.addEventListener('ratemode-changed', () => {
  renderCDBs();
  renderFundosIfCached();
});

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

// ─── Fund Historical Chart ───

const fundChartCache = {};

async function renderFundChart(cnpj, container) {
  // Show loading
  container.innerHTML = `<div class="fund-chart-loading"><div class="loading-spinner"></div> Carregando histórico...</div>`;

  try {
    let data;
    if (fundChartCache[cnpj]) {
      data = fundChartCache[cnpj];
    } else {
      const res = await fetch(`/api/fundos-historico?cnpj=${cnpj}`);
      if (!res.ok) throw new Error('Falha ao carregar');
      data = await res.json();
      fundChartCache[cnpj] = data;
    }

    const historico = data.historico;
    if (!historico || historico.length === 0) {
      container.innerHTML = '<div class="fund-chart-loading">Sem dados históricos disponíveis.</div>';
      return;
    }

    // Parse data
    const points = historico.map(h => ({
      date: new Date(h.date),
      quota: parseFloat(h.quota)
    })).sort((a, b) => a.date - b.date);

    const quotas = points.map(p => p.quota);
    const minQ = Math.min(...quotas);
    const maxQ = Math.max(...quotas);
    const qRange = maxQ - minQ || 1;

    // Chart dimensions
    const W = 600, H = 200;
    const pad = { top: 10, right: 10, bottom: 25, left: 50 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    // Scale functions
    const xScale = (i) => pad.left + (i / (points.length - 1)) * cW;
    const yScale = (q) => pad.top + cH - ((q - minQ + qRange * 0.05) / (qRange * 1.1)) * cH;

    // Build line path
    const linePts = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.quota).toFixed(1)}`).join(' ');

    // Build area path (line + bottom edge)
    const areaPts = linePts + ` L${xScale(points.length - 1).toFixed(1)},${(pad.top + cH).toFixed(1)} L${xScale(0).toFixed(1)},${(pad.top + cH).toFixed(1)} Z`;

    // Y-axis labels (4 ticks)
    const yTicks = [];
    for (let i = 0; i < 4; i++) {
      const val = minQ + (qRange * i) / 3;
      yTicks.push({ val, y: yScale(val) });
    }

    // X-axis month labels
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const seenMonths = new Set();
    const xLabels = [];
    points.forEach((p, i) => {
      const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        xLabels.push({ text: months[p.date.getMonth()], x: xScale(i) });
      }
    });

    const yAxisLines = yTicks.map(t =>
      `<line x1="${pad.left}" y1="${t.y.toFixed(1)}" x2="${(W - pad.right)}" y2="${t.y.toFixed(1)}" class="chart-axis" stroke-dasharray="3,3"/>
       <text x="${pad.left - 5}" y="${(t.y + 3).toFixed(1)}" text-anchor="end">${t.val.toFixed(4)}</text>`
    ).join('');

    const xAxisLabels = xLabels.map(l =>
      `<text x="${l.x.toFixed(1)}" y="${(H - 4)}" text-anchor="middle">${l.text}</text>`
    ).join('');

    container.innerHTML = `
      <div class="fund-chart-title">Evolu\u00e7\u00e3o da Cota \u2014 \u00daltimos 3 meses</div>
      <div style="position:relative">
        <svg class="fund-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient-${cnpj.replace(/[^a-zA-Z0-9]/g, '')}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00c853" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#00c853" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${yAxisLines}
          ${xAxisLabels}
          <path class="chart-area" d="${areaPts}" fill="url(#chartGradient-${cnpj.replace(/[^a-zA-Z0-9]/g, '')})" />
          <path class="chart-line" d="${linePts}" />
          <line class="chart-hover-line" x1="0" y1="${pad.top}" x2="0" y2="${pad.top + cH}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3,3" style="display:none"/>
          <circle class="chart-hover-dot" cx="0" cy="0" r="4" fill="var(--accent)" style="display:none"/>
          <rect class="chart-overlay" x="${pad.left}" y="${pad.top}" width="${cW}" height="${cH}" fill="transparent"/>
        </svg>
        <div class="fund-chart-tooltip" style="display:none"></div>
      </div>`;

    // Tooltip interactivity
    const svg = container.querySelector('.fund-chart-svg');
    const overlay = svg.querySelector('.chart-overlay');
    const hoverLine = svg.querySelector('.chart-hover-line');
    const hoverDot = svg.querySelector('.chart-hover-dot');
    const tooltip = container.querySelector('.fund-chart-tooltip');

    overlay.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width * W;
      // Find nearest point
      let nearest = 0;
      let minDist = Infinity;
      points.forEach((p, i) => {
        const dist = Math.abs(xScale(i) - mouseX);
        if (dist < minDist) { minDist = dist; nearest = i; }
      });

      const px = xScale(nearest);
      const py = yScale(points[nearest].quota);
      hoverLine.setAttribute('x1', px.toFixed(1));
      hoverLine.setAttribute('x2', px.toFixed(1));
      hoverLine.style.display = '';
      hoverDot.setAttribute('cx', px.toFixed(1));
      hoverDot.setAttribute('cy', py.toFixed(1));
      hoverDot.style.display = '';

      const d = points[nearest].date;
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      tooltip.textContent = `${dateStr} — Cota: ${points[nearest].quota.toFixed(6)}`;
      tooltip.style.display = '';

      // Position tooltip in pixel space
      const tooltipX = (px / W) * rect.width;
      const tooltipY = (py / H) * rect.height;
      tooltip.style.left = `${tooltipX + 10}px`;
      tooltip.style.top = `${tooltipY - 30}px`;

      // Flip if near right edge
      if (tooltipX > rect.width * 0.7) {
        tooltip.style.left = `${tooltipX - tooltip.offsetWidth - 10}px`;
      }
    });

    overlay.addEventListener('mouseleave', () => {
      hoverLine.style.display = 'none';
      hoverDot.style.display = 'none';
      tooltip.style.display = 'none';
    });

  } catch (err) {
    console.error('Chart error:', err);
    container.innerHTML = '<div class="fund-chart-loading">Erro ao carregar histórico.</div>';
  }
}

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

    _fundosCache = { items, cvmMonth: cvmRes.month };
    renderFundos();
  } catch (e) {
    console.error('Error loading fundos:', e);
    container.innerHTML = '<div class="loading">Erro ao carregar fundos.</div>';
  }
}

let _fundosCache = null;

function renderFundosIfCached() {
  if (_fundosCache) renderFundos();
}

function renderFundos() {
  if (!_fundosCache) return;
  const { items, cvmMonth } = _fundosCache;
  const container = document.getElementById('fundos-list');

    container.innerHTML = '';
    items.forEach(fundo => {
      const shown = fundo.rendAnual != null ? displayRate(fundo.rendAnual) : null;
      const rateStr = shown != null ? `${shown.toFixed(2)}%` : '—';
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
        rateLabel: rateLabel(),
        rateDate: dateStr
      });

      // Wrap card with chart panel
      const wrapper = document.createElement('div');
      wrapper.className = 'fund-card-wrapper';

      // Add hint text to card
      const hint = document.createElement('div');
      hint.className = 'fund-chart-hint';
      hint.textContent = '\ud83d\udcc8 Ver hist\u00f3rico';
      card.appendChild(hint);

      const chartPanel = document.createElement('div');
      chartPanel.className = 'fund-chart-panel';

      wrapper.appendChild(card);
      wrapper.appendChild(chartPanel);

      let chartLoaded = false;
      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = chartPanel.classList.toggle('expanded');
        if (isExpanded && !chartLoaded) {
          chartLoaded = true;
          renderFundChart(fundo.cnpj, chartPanel);
        }
      });

      container.appendChild(wrapper);
    });

    // Show source info
    if (cvmMonth) {
      const sourceP = document.createElement('p');
      sourceP.className = 'section-source';
      sourceP.textContent = `Fonte: CVM Informe Diário (${cvmMonth}). Rentabilidade anualizada (base 252 dias úteis).`;
      container.appendChild(sourceP);
    }
}

// ─── Títulos Públicos (Tesouro Direto) ───

let _titulosCache = null;

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

    _titulosCache = { prefixados, ipcas, selics };
    renderTitulos();
  } catch (e) {
    console.error('Error loading títulos:', e);
    prefixadoContainer.innerHTML = '<div class="loading">Erro ao carregar títulos.</div>';
  }
}

function renderTitulos() {
  if (!_titulosCache) return;
  const { prefixados, ipcas, selics } = _titulosCache;

  const prefixadoContainer = document.getElementById('prefixado-list');
  const ipcaContainer = document.getElementById('ipca-list');
  const selicContainer = document.getElementById('selic-list');

  const rateHeaderPrefix = _showReal ? 'Taxa Real' : 'Taxa a.a.';

  renderTituloTable(prefixados, prefixadoContainer, rateHeaderPrefix, '#00c853');
  // IPCA+ bonds: taxa already IS the real rate, so don't convert
  renderTituloTable(ipcas, ipcaContainer, 'IPCA +', '#2979ff', true);
  renderTituloTable(selics, selicContainer, 'Selic +', '#ffd600', true);

  // Scatter plots — destroy existing charts first
  destroyChartOnCanvas('prefixado-scatter');
  destroyChartOnCanvas('ipca-scatter');
  renderTituloScatter(prefixados, 'prefixado-scatter', 'Prefixado', '#00c853');
  renderTituloScatter(ipcas, 'ipca-scatter', 'IPCA+', '#2979ff', true);
}

function destroyChartOnCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
}

document.addEventListener('ratemode-changed', () => {
  renderTitulos();
  renderDebenturesIfCached();
});

function renderTituloTable(bonds, container, rateHeader, accentColor, skipRealConversion) {
  if (!bonds || bonds.length === 0) {
    container.innerHTML = '<div class="loading">Nenhum título disponível nesta categoria.</div>';
    return;
  }

  // Sort by maturity
  bonds.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

  const convertRate = (rate) => {
    if (rate == null) return null;
    if (skipRealConversion || !_showReal) return rate;
    return toRealRate(rate);
  };

  const bestRate = Math.max(...bonds.map(b => convertRate(b.taxaCompra) || 0));
  const rows = bonds.map(b => {
    const vto = new Date(b.vencimento);
    const vtoStr = `${String(vto.getDate()).padStart(2, '0')}/${String(vto.getMonth() + 1).padStart(2, '0')}/${vto.getFullYear()}`;
    const dias = Math.max(1, Math.round((vto - new Date()) / (1000 * 60 * 60 * 24)));
    const taxaC = convertRate(b.taxaCompra);
    const taxaV = convertRate(b.taxaVenda);
    const isHighlighted = taxaC === bestRate ? ' highlighted-row' : '';
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
      <td class="lecap-tir">${taxaC != null ? taxaC.toFixed(2) + '%' : '—'}</td>
      <td class="lecap-tir">${taxaV != null ? taxaV.toFixed(2) + '%' : '—'}</td>
    </tr>`;
  }).join('');

  const headerSuffix = _showReal && !skipRealConversion ? ' <span style="font-size:0.7em;opacity:0.7">(real)</span>' : '';

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
            <th>Taxa Compra${headerSuffix}</th>
            <th>Taxa Venda${headerSuffix}</th>
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

function renderTituloScatter(bonds, canvasId, label, color, skipRealConversion) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined' || !bonds || bonds.length === 0) return;

  const textColor = '#555555';
  const gridColor = '#1a1a1a';

  const convertRate = (rate) => {
    if (rate == null) return null;
    if (skipRealConversion || !_showReal) return rate;
    return toRealRate(rate);
  };

  const points = bonds.map(b => {
    const dias = Math.max(1, Math.round((new Date(b.vencimento) - new Date()) / (1000 * 60 * 60 * 24)));
    const y = convertRate(b.taxaCompra);
    return { x: dias, y, nome: b.nome };
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
      // IPCA+: approximate with taxa real + actual IPCA 12m (or estimate 5%)
      const ipcaEst = _inflationData ? _inflationData.acum12m : 5;
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
      ${_inflationData ? `<div class="calc-result-row" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
        <span>Rentab. real (- IPCA ${_inflationData.acum12m.toFixed(1)}%)</span>
        <span class="calc-result-value ${valor > 0 && toRealRate((rendLiq / valor) * 100) > 0 ? 'positive' : 'negative'}">${valor > 0 ? toRealRate((rendLiq / valor) * 100).toFixed(2) : 0}%</span>
      </div>` : ''}
    `;
  }

  document.getElementById('calc-valor').addEventListener('input', calcular);
  document.getElementById('calc-taxa').addEventListener('input', calcular);
  document.getElementById('calc-ir').addEventListener('input', calcular);
  calcular();
}

// ─── Debêntures Section ───

let _debenturesCache = null;

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
    _debenturesCache = debs;
    renderDebentures();
  } catch (e) {
    console.error('Error loading debêntures:', e);
    container.innerHTML = '<div class="loading">Erro ao carregar debêntures.</div>';
  }
}

function renderDebenturesIfCached() {
  if (_debenturesCache) renderDebentures();
}

function renderDebentures() {
  if (!_debenturesCache) return;
  const debs = _debenturesCache;
  const container = document.getElementById('debentures-list');

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

    const realNote = _showReal && _inflationData
      ? `<p class="section-source" style="margin-top:8px;color:var(--accent)">Modo taxa real ativo — spreads de debêntures são relativos ao indexador (CDI ou IPCA), não são taxas absolutas.</p>`
      : '';

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
      </div>${realNote}`;

    const table = container.querySelector('.lecap-table');
    if (table) makeSortable(table);

    // Scatter plot: spread vs dias
    destroyChartOnCanvas('debentures-scatter');
    renderDebentureScatter(debs);
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

    // Split groups into two columns: left (first half) and right (second half)
    const leftGroups = groups.slice(0, Math.ceil(groups.length / 2));
    const rightGroups = groups.slice(Math.ceil(groups.length / 2));

    const colLeft = document.createElement('div');
    colLeft.className = 'mundo-col';
    const colRight = document.createElement('div');
    colRight.className = 'mundo-col';
    grid.appendChild(colLeft);
    grid.appendChild(colRight);

    function renderGroupInto(container, groupName) {
      const header = document.createElement('div');
      header.className = 'mundo-group-header';
      header.textContent = groupName;
      container.appendChild(header);

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
        container.appendChild(card);

        if (item.sparkline && item.sparkline.length > 1) {
          drawSparkline(canvasId, item.sparkline, isUp);
        }
      });
    }

    leftGroups.forEach(g => renderGroupInto(colLeft, g));
    rightGroups.forEach(g => renderGroupInto(colRight, g));

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
