window.APP = window.APP || {};
APP.pages = APP.pages || {};

APP.pages.calculations = (function () {
  const u = APP.utils;
  const ui = APP.ui;
  let listFilter = { search: '', status: 'all' };
  let draft = null;
  let currentKey = null;
  let saveTimer = null;

  // ---------------- Список ----------------
  function renderList(container) {
    const currency = APP.store.db.companySettings.currency;
    const all = APP.store.getAll('calculations');
    const rows = all.filter(c => {
      const client = APP.store.getById('clients', c.clientId);
      const matchesStatus = listFilter.status === 'all' || c.status === listFilter.status;
      const q = listFilter.search.trim().toLowerCase();
      const matchesSearch = !q || c.title.toLowerCase().includes(q) || (client && client.name.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    container.innerHTML = `
      <div class="page-toolbar">
        <div class="filters">
          <input type="search" id="calc-search" placeholder="Поиск по названию или клиенту..." value="${u.escapeHtml(listFilter.search)}" style="min-width:260px;">
          <select id="calc-status-filter"><option value="all">Все статусы</option>${ui.optionsHtml(APP.CALC_STATUSES, listFilter.status)}</select>
        </div>
        <a class="btn btn-primary" href="#/calculations/new">+ Новый расчёт</a>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Название</th><th>Клиент</th><th>Период</th><th class="text-right">Итого</th><th>Статус</th></tr></thead>
          <tbody>
            ${rows.map(c => {
              const client = APP.store.getById('clients', c.clientId);
              const totals = APP.calc.computeTotals(c);
              return `<tr class="clickable" data-id="${c.id}">
                <td><strong>${u.escapeHtml(c.title || 'Без названия')}</strong></td>
                <td data-label="Клиент">${u.escapeHtml(client ? client.name : '—')}</td>
                <td data-label="Период">${u.formatDate(c.periodStart)} — ${u.formatDate(c.periodEnd)}</td>
                <td class="text-right num" data-label="Итого">${u.formatMoney(totals.total, currency)}</td>
                <td data-label="Статус">${ui.badge(APP.CALC_STATUSES, c.status)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        ${rows.length ? '' : ui.emptyState('Расчёты не найдены.')}
      </div>
    `;

    u.qs('#calc-search', container).addEventListener('input', (e) => {
      listFilter.search = e.target.value;
      renderList(container);
      const input = u.qs('#calc-search', container);
      input.focus(); input.setSelectionRange(input.value.length, input.value.length);
    });
    u.qs('#calc-status-filter', container).addEventListener('change', (e) => {
      listFilter.status = e.target.value;
      renderList(container);
    });
    u.qsa('tr.clickable', container).forEach(tr => tr.addEventListener('click', () => { location.hash = `#/calculations/${tr.dataset.id}`; }));
  }

  // ---------------- Редактор ----------------
  function initDraft(id, query) {
    if (id && id !== 'new') {
      const existing = APP.store.getById('calculations', id);
      draft = existing ? JSON.parse(JSON.stringify(existing)) : null;
    } else {
      const settings = APP.store.db.companySettings;
      draft = {
        id: null,
        clientId: (query && query.clientId) || '',
        title: '',
        items: [],
        periodStart: u.todayISO(),
        periodEnd: u.addDaysISO(u.todayISO(), 30),
        vatRate: settings.vatRate,
        status: 'draft',
        createdAt: u.todayISO()
      };
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistDraft(), 400);
  }

  function persistDraft() {
    if (!draft) return;
    const wasNew = !draft.id;
    const id = APP.store.upsert('calculations', draft);
    if (wasNew) {
      currentKey = id + '|';
      history.replaceState(null, '', `#/calculations/${id}`);
    }
  }

  function renderEditor(container, id, query) {
    const key = (id || 'new') + '|' + ((query && query.clientId) || '');
    if (draft === null || key !== currentKey) {
      initDraft(id, query);
      currentKey = key;
    }
    draw(container);
  }

  function draw(container) {
    if (!draft) { container.innerHTML = ui.emptyState('Расчёт не найден.'); return; }
    const clients = APP.store.getAll('clients');
    const currency = APP.store.db.companySettings.currency;
    const totals = APP.calc.computeTotals(draft);
    const isSaved = !!draft.id;

    container.innerHTML = `
      <div class="page-toolbar">
        <a href="#/calculations" class="btn btn-ghost btn-sm">&larr; К списку расчётов</a>
        <select id="calc-status" style="width:auto;">${ui.optionsHtml(APP.CALC_STATUSES, draft.status)}</select>
      </div>

      <div class="two-col">
        <div>
          <div class="card">
            <div class="section-title">Основные данные</div>
            <div class="field"><label>Название расчёта</label><input type="text" id="f-title" placeholder="Например: Осенняя кампания" value="${u.escapeHtml(draft.title)}"></div>
            <div class="input-row">
              <div class="field" style="flex:2;">
                <label>Клиент *</label>
                <div style="display:flex; gap:8px;">
                  <select id="f-client" style="flex:1;"><option value="">— выберите клиента —</option>${ui.optionsHtml(clients, draft.clientId, 'id', 'name')}</select>
                  <button class="btn btn-secondary btn-sm" id="new-client-inline-btn" type="button">+ Клиент</button>
                </div>
              </div>
            </div>
            <div class="input-row">
              <div class="field"><label>Начало периода</label><input type="date" id="f-start" value="${draft.periodStart}"></div>
              <div class="field"><label>Окончание периода</label><input type="date" id="f-end" value="${draft.periodEnd}"></div>
              <div class="field"><label>НДС, %</label><input type="number" min="0" id="f-vat" value="${draft.vatRate}"></div>
            </div>
          </div>

          <div class="card">
            <div class="section-title">Добавить позицию из прайс-листа</div>
            <div class="input-row" style="align-items:flex-end;">
              <div class="field" style="margin-bottom:0;"><label>Категория</label><select id="add-cat"></select></div>
              <div class="field" style="margin-bottom:0; flex:2;"><label>Позиция</label><select id="add-item"></select></div>
              <div class="field" style="margin-bottom:0; max-width:90px;"><label>Кол-во</label><input type="number" min="1" value="1" id="add-qty"></div>
              <div class="field" style="margin-bottom:0; max-width:90px;"><label>Скидка %</label><input type="number" min="0" max="100" value="0" id="add-discount"></div>
              <button class="btn btn-primary" id="add-line-btn" type="button" style="margin-bottom:14px;">Добавить</button>
            </div>

            <div id="items-table">${itemsTableHtml(currency)}</div>
          </div>
        </div>

        <div>
          <div class="card">
            <div class="section-title">Итоги</div>
            <div class="doc-totals">
              <div><span>Подытог</span><span class="num" id="sum-subtotal">${u.formatMoney(totals.subtotal, currency)}</span></div>
              <div><span>Скидка</span><span class="num" id="sum-discount">- ${u.formatMoney(totals.discountAmount, currency)}</span></div>
              <div><span>Сумма после скидки</span><span class="num" id="sum-afterdiscount">${u.formatMoney(totals.afterDiscount, currency)}</span></div>
              <div><span>НДС (<span id="sum-vat-rate">${totals.vatRate}</span>%)</span><span class="num" id="sum-vat">${u.formatMoney(totals.vatAmount, currency)}</span></div>
              <div class="grand-total"><span>Итого к оплате</span><span class="num" id="sum-total">${u.formatMoney(totals.total, currency)}</span></div>
            </div>
          </div>

          <div class="card">
            <div class="section-title">Быстрые действия</div>
            ${isSaved ? `
              <div style="display:flex; flex-direction:column; gap:8px;">
                <a class="btn btn-secondary btn-block" href="#/proposals/new?calcId=${draft.id}">Создать КП</a>
                <a class="btn btn-secondary btn-block" href="#/contracts/new?calcId=${draft.id}">Создать договор</a>
                <a class="btn btn-secondary btn-block" href="#/letters/new?calcId=${draft.id}">Написать письмо</a>
              </div>
            ` : `<p class="text-muted" style="margin:0;">Сохраните расчёт, чтобы создать КП, договор или письмо на его основе.</p>`}
          </div>

          <div class="card">
            <button class="btn btn-primary btn-block" id="save-calc-btn">Сохранить расчёт</button>
          </div>
        </div>
      </div>
    `;

    bindEditorEvents(container, currency);
  }

  function itemsTableHtml(currency) {
    if (!draft.items.length) return APP.ui.emptyState('Пока нет добавленных позиций.');
    const header = `<div class="item-row-grid header"><div>Позиция</div><div>Ед.</div><div>Цена</div><div>Кол-во</div><div>Скидка %</div><div>Сумма</div><div></div></div>`;
    const rows = draft.items.map((item, idx) => {
      const c = APP.calc.computeItem(item);
      return `<div class="item-row-grid" data-idx="${idx}">
        <div class="cell-name">${u.escapeHtml(item.name)}</div>
        <div class="cell-unit text-muted"><span class="cell-label">Ед.</span>${u.escapeHtml(item.unit)}</div>
        <div class="cell-price num"><span class="cell-label">Цена</span>${u.formatMoney(item.price, currency)}</div>
        <div class="cell-qty"><span class="cell-label">Кол-во</span><input type="number" min="0" step="1" value="${item.qty}" data-field="qty" data-idx="${idx}" class="line-input"></div>
        <div class="cell-discount"><span class="cell-label">Скидка %</span><input type="number" min="0" max="100" value="${item.discount}" data-field="discount" data-idx="${idx}" class="line-input"></div>
        <div class="cell-total num"><span class="cell-label">Сумма</span><span id="line-total-${idx}">${u.formatMoney(c.lineAfterDiscount, currency)}</span></div>
        <div class="cell-remove"><button class="btn btn-ghost btn-sm" data-remove-idx="${idx}" type="button" title="Удалить">✕</button></div>
      </div>`;
    }).join('');
    return header + rows;
  }

  function refreshCategorySelect(container) {
    const categories = APP.store.getAll('priceCategories');
    const catSelect = u.qs('#add-cat', container);
    catSelect.innerHTML = APP.ui.optionsHtml(categories, categories[0] && categories[0].id, 'id', 'name');
    refreshItemSelect(container);
  }

  function refreshItemSelect(container) {
    const catId = u.qs('#add-cat', container).value;
    const items = APP.store.priceItemsByCategory(catId);
    const currency = APP.store.db.companySettings.currency;
    const itemSelect = u.qs('#add-item', container);
    itemSelect.innerHTML = items.map(i => `<option value="${i.id}">${u.escapeHtml(i.name)} — ${u.formatMoney(i.price, currency)} / ${u.escapeHtml(i.unit)}</option>`).join('') || '<option value="">Нет позиций в категории</option>';
  }

  function updateSummaryDom(container, currency) {
    const totals = APP.calc.computeTotals(draft);
    u.qs('#sum-subtotal', container).textContent = u.formatMoney(totals.subtotal, currency);
    u.qs('#sum-discount', container).textContent = '- ' + u.formatMoney(totals.discountAmount, currency);
    u.qs('#sum-afterdiscount', container).textContent = u.formatMoney(totals.afterDiscount, currency);
    u.qs('#sum-vat', container).textContent = u.formatMoney(totals.vatAmount, currency);
    u.qs('#sum-vat-rate', container).textContent = totals.vatRate;
    u.qs('#sum-total', container).textContent = u.formatMoney(totals.total, currency);
  }

  function bindEditorEvents(container, currency) {
    refreshCategorySelect(container);

    u.qs('#f-title', container).addEventListener('input', (e) => { draft.title = e.target.value; scheduleSave(); });
    u.qs('#f-client', container).addEventListener('change', (e) => { draft.clientId = e.target.value; scheduleSave(); });
    u.qs('#f-start', container).addEventListener('change', (e) => { draft.periodStart = e.target.value; scheduleSave(); });
    u.qs('#f-end', container).addEventListener('change', (e) => { draft.periodEnd = e.target.value; scheduleSave(); });
    u.qs('#f-vat', container).addEventListener('input', (e) => {
      draft.vatRate = Number(e.target.value) || 0;
      updateSummaryDom(container, currency);
      scheduleSave();
    });
    u.qs('#calc-status', container).addEventListener('change', (e) => { draft.status = e.target.value; scheduleSave(); });

    u.qs('#add-cat', container).addEventListener('change', () => refreshItemSelect(container));
    u.qs('#add-line-btn', container).addEventListener('click', () => {
      const itemId = u.qs('#add-item', container).value;
      const priceItem = APP.store.getById('priceItems', itemId);
      if (!priceItem) { ui.toast('Выберите позицию из прайс-листа', 'error'); return; }
      const qty = Number(u.qs('#add-qty', container).value) || 1;
      const discount = Number(u.qs('#add-discount', container).value) || 0;
      draft.items.push({ priceItemId: priceItem.id, name: priceItem.name, unit: priceItem.unit, price: priceItem.price, qty, discount });
      u.qs('#items-table', container).innerHTML = itemsTableHtml(currency);
      bindItemRowEvents(container, currency);
      updateSummaryDom(container, currency);
      scheduleSave();
    });

    u.qs('#new-client-inline-btn', container).addEventListener('click', () => {
      APP.pages.clients.openClientForm(null, (newClientId) => {
        draft.clientId = newClientId;
        draw(container);
      });
    });

    u.qs('#save-calc-btn', container).addEventListener('click', () => {
      if (!draft.clientId) { ui.toast('Выберите клиента', 'error'); return; }
      persistDraft();
      currentKey = draft.id + '|';
      ui.toast('Расчёт сохранён');
      draw(container);
    });

    bindItemRowEvents(container, currency);
  }

  function bindItemRowEvents(container, currency) {
    u.qsa('.line-input', container).forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.dataset.idx);
        const field = e.target.dataset.field;
        draft.items[idx][field] = Number(e.target.value) || 0;
        const c = APP.calc.computeItem(draft.items[idx]);
        const cell = u.qs(`#line-total-${idx}`, container);
        if (cell) cell.textContent = u.formatMoney(c.lineAfterDiscount, currency);
        updateSummaryDom(container, currency);
        scheduleSave();
      });
    });
    u.qsa('[data-remove-idx]', container).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.removeIdx);
        draft.items.splice(idx, 1);
        u.qs('#items-table', container).innerHTML = itemsTableHtml(currency);
        bindItemRowEvents(container, currency);
        updateSummaryDom(container, currency);
        scheduleSave();
      });
    });
  }

  return { renderList, renderEditor };
})();
