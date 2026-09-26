window.APP = window.APP || {};
APP.pages = APP.pages || {};

APP.pages.dashboard = (function () {
  const u = APP.utils;

  function render(container) {
    const clients = APP.store.getAll('clients');
    const calcs = APP.store.getAll('calculations');
    const proposals = APP.store.getAll('proposals');
    const contracts = APP.store.getAll('contracts');
    const letters = APP.store.getAll('letters');
    const currency = APP.store.db.companySettings.currency;

    const activeClients = clients.filter(c => c.status !== 'archive').length;
    const totalPipeline = calcs.reduce((sum, c) => sum + APP.calc.computeTotals(c).total, 0);

    const recent = []
      .concat(calcs.map(c => ({ type: 'Расчёт', title: c.title, date: c.createdAt, href: `#/calculations/${c.id}` })))
      .concat(proposals.map(p => ({ type: 'КП', title: p.number, date: p.createdAt, href: `#/proposals/${p.id}` })))
      .concat(contracts.map(c => ({ type: 'Договор', title: c.number, date: c.createdAt, href: `#/contracts/${c.id}` })))
      .concat(letters.map(l => ({ type: 'Письмо', title: l.subject, date: l.createdAt, href: `#/letters/${l.id}` })))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);

    container.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:16px;">
        <div class="card stat-card"><div class="stat-value">${clients.length}</div><div class="stat-label">Клиентов (активных: ${activeClients})</div></div>
        <div class="card stat-card"><div class="stat-value">${calcs.length}</div><div class="stat-label">Расчётов</div></div>
        <div class="card stat-card"><div class="stat-value">${proposals.length}</div><div class="stat-label">Коммерческих предложений</div></div>
        <div class="card stat-card"><div class="stat-value">${u.formatMoney(totalPipeline, currency)}</div><div class="stat-label">Сумма по всем расчётам</div></div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="section-title">Быстрый старт</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn btn-primary" href="#/calculations/new">+ Новый расчёт</a>
          <a class="btn btn-secondary" href="#/clients">+ Новый клиент</a>
          <a class="btn btn-secondary" href="#/letters/new">+ Написать письмо</a>
          <a class="btn btn-secondary" href="#/price-list">Открыть прайс-лист</a>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Последние действия</div>
        ${recent.length ? `<ul class="link-list">${recent.map(r => `
          <li>
            <span><span class="badge badge-blue">${r.type}</span> &nbsp; <a class="item-link" href="${r.href}">${u.escapeHtml(r.title || '—')}</a></span>
            <span class="text-muted">${u.formatDate(r.date)}</span>
          </li>`).join('')}</ul>` : APP.ui.emptyState('Пока нет активности.')}
      </div>
    `;
  }

  return { render };
})();
