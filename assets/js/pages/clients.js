window.APP = window.APP || {};
APP.pages = APP.pages || {};

APP.pages.clients = (function () {
  const u = APP.utils;
  const ui = APP.ui;
  let filter = { search: '', status: 'all' };

  function renderList(container) {
    const all = APP.store.getAll('clients');
    const rows = all.filter(c => {
      const matchesStatus = filter.status === 'all' || c.status === filter.status;
      const q = filter.search.trim().toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.contactPerson || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });

    container.innerHTML = `
      <div class="page-toolbar">
        <div class="filters">
          <input type="search" id="client-search" placeholder="Поиск по названию или контакту..." value="${u.escapeHtml(filter.search)}" style="min-width:260px;">
          <select id="client-status-filter">
            <option value="all">Все статусы</option>
            ${ui.optionsHtml(APP.CLIENT_STATUSES, filter.status)}
          </select>
        </div>
        <button class="btn btn-primary" id="add-client-btn">+ Новый клиент</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Компания</th><th>Контактное лицо</th><th>Сфера</th><th>Телефон</th><th>Статус</th></tr></thead>
          <tbody>
            ${rows.map(c => `
              <tr class="clickable" data-id="${c.id}">
                <td><strong>${u.escapeHtml(c.name)}</strong></td>
                <td data-label="Контакт">${u.escapeHtml(c.contactPerson || '—')}</td>
                <td data-label="Сфера">${u.escapeHtml(c.industry || '—')}</td>
                <td data-label="Телефон">${u.escapeHtml(c.phone || '—')}</td>
                <td data-label="Статус">${ui.badge(APP.CLIENT_STATUSES, c.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${rows.length ? '' : ui.emptyState('Клиенты не найдены.')}
      </div>
    `;

    u.qs('#client-search', container).addEventListener('input', (e) => {
      filter.search = e.target.value;
      renderList(container);
      const input = u.qs('#client-search', container);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    u.qs('#client-status-filter', container).addEventListener('change', (e) => {
      filter.status = e.target.value;
      renderList(container);
    });
    u.qs('#add-client-btn', container).addEventListener('click', () => openClientForm(null, () => renderList(container)));
    u.qsa('tr.clickable', container).forEach(tr => {
      tr.addEventListener('click', () => { location.hash = `#/clients/${tr.dataset.id}`; });
    });
  }

  function openClientForm(client, onSaved) {
    const isEdit = !!client;
    const c = client || { name: '', bin: '', contactPerson: '', phone: '', email: '', industry: '', status: 'lead', notes: '' };
    ui.openModal(`
      <div class="modal-header"><h3>${isEdit ? 'Редактировать клиента' : 'Новый клиент'}</h3></div>
      <div class="modal-body">
        <div class="field"><label>Название компании *</label><input type="text" id="f-name" value="${u.escapeHtml(c.name)}"></div>
        <div class="input-row">
          <div class="field"><label>БИН/ИНН</label><input type="text" id="f-bin" value="${u.escapeHtml(c.bin)}"></div>
          <div class="field"><label>Сфера деятельности</label><input type="text" id="f-industry" value="${u.escapeHtml(c.industry)}"></div>
        </div>
        <div class="input-row">
          <div class="field"><label>Контактное лицо</label><input type="text" id="f-contact" value="${u.escapeHtml(c.contactPerson)}"></div>
          <div class="field"><label>Статус</label><select id="f-status">${ui.optionsHtml(APP.CLIENT_STATUSES, c.status)}</select></div>
        </div>
        <div class="input-row">
          <div class="field"><label>Телефон</label><input type="tel" id="f-phone" value="${u.escapeHtml(c.phone)}"></div>
          <div class="field"><label>Email</label><input type="email" id="f-email" value="${u.escapeHtml(c.email)}"></div>
        </div>
        <div class="field"><label>Заметки</label><textarea id="f-notes">${u.escapeHtml(c.notes)}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-modal-close>Отмена</button>
        <button class="btn btn-primary" id="save-client-btn">Сохранить</button>
      </div>
    `, (root) => {
      root.querySelector('#save-client-btn').addEventListener('click', () => {
        const name = u.qs('#f-name', root).value.trim();
        if (!name) { ui.toast('Укажите название компании', 'error'); return; }
        const payload = {
          id: c.id, name,
          bin: u.qs('#f-bin', root).value.trim(),
          industry: u.qs('#f-industry', root).value.trim(),
          contactPerson: u.qs('#f-contact', root).value.trim(),
          status: u.qs('#f-status', root).value,
          phone: u.qs('#f-phone', root).value.trim(),
          email: u.qs('#f-email', root).value.trim(),
          notes: u.qs('#f-notes', root).value.trim(),
          createdAt: c.createdAt || u.todayISO()
        };
        const id = APP.store.upsert('clients', payload);
        ui.closeModal();
        ui.toast(isEdit ? 'Клиент обновлён' : 'Клиент добавлен');
        if (onSaved) onSaved(id);
      });
    });
  }

  function renderDetail(container, id) {
    const client = APP.store.getById('clients', id);
    if (!client) { container.innerHTML = ui.emptyState('Клиент не найден.'); return; }
    const hist = APP.store.clientHistory(id);
    const currency = APP.store.db.companySettings.currency;

    container.innerHTML = `
      <div class="page-toolbar">
        <a href="#/clients" class="btn btn-ghost btn-sm">&larr; К списку клиентов</a>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" id="edit-client-btn">Редактировать</button>
          ${client.status !== 'archive' ? '<button class="btn btn-outline btn-sm" id="archive-client-btn">Архивировать</button>' : ''}
        </div>
      </div>

      <div class="two-col">
        <div>
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <h2 style="margin:0 0 4px;">${u.escapeHtml(client.name)}</h2>
                <div class="text-muted">${u.escapeHtml(client.industry || '—')}</div>
              </div>
              ${ui.badge(APP.CLIENT_STATUSES, client.status)}
            </div>
            <dl class="kv-list" style="margin-top:16px;">
              <dt>БИН/ИНН</dt><dd>${u.escapeHtml(client.bin || '—')}</dd>
              <dt>Контактное лицо</dt><dd>${u.escapeHtml(client.contactPerson || '—')}</dd>
              <dt>Телефон</dt><dd>${u.escapeHtml(client.phone || '—')}</dd>
              <dt>Email</dt><dd>${u.escapeHtml(client.email || '—')}</dd>
              <dt>В базе с</dt><dd>${u.formatDate(client.createdAt)}</dd>
            </dl>
            ${client.notes ? `<div style="margin-top:14px;"><div class="section-title">Заметки</div><p style="margin:0; white-space:pre-wrap;">${u.escapeHtml(client.notes)}</p></div>` : ''}
          </div>

          <div class="card">
            <div class="section-title">Быстрые действия</div>
            <div class="quick-actions" style="display:flex; gap:10px; flex-wrap:wrap;">
              <a class="btn btn-primary btn-sm" href="#/calculations/new?clientId=${client.id}">+ Новый расчёт</a>
              <a class="btn btn-secondary btn-sm" href="#/letters/new?clientId=${client.id}">+ Написать письмо</a>
            </div>
          </div>
        </div>

        <div>
          ${historyCard('Расчёты', hist.calculations, c => `#/calculations/${c.id}`, c => `${c.title} — ${u.formatMoney(APP.calc.computeTotals(c).total, currency)}`, c => APP.ui.badge(APP.CALC_STATUSES, c.status))}
          ${historyCard('Коммерческие предложения', hist.proposals, p => `#/proposals/${p.id}`, p => p.number, p => APP.ui.badge(APP.DOC_STATUSES, p.status))}
          ${historyCard('Договоры', hist.contracts, c => `#/contracts/${c.id}`, c => c.number, () => '<span class="badge badge-amber">DRAFT</span>')}
          ${historyCard('Письма', hist.letters, l => `#/letters/${l.id}`, l => l.subject, l => `<span class="text-muted">${u.escapeHtml(APP.statusMeta(APP.LETTER_TYPES, l.type).label)}</span>`)}
        </div>
      </div>
    `;

    u.qs('#edit-client-btn', container).addEventListener('click', () => openClientForm(client, () => renderDetail(container, id)));
    const archiveBtn = u.qs('#archive-client-btn', container);
    if (archiveBtn) archiveBtn.addEventListener('click', () => {
      ui.confirmDialog(`Перевести клиента «${client.name}» в архив?`, () => {
        APP.store.patch('clients', id, { status: 'archive' });
        ui.toast('Клиент перемещён в архив');
        renderDetail(container, id);
      });
    });
  }

  function historyCard(title, items, hrefFn, titleFn, badgeFn) {
    return `<div class="card">
      <div class="section-title">${title} (${items.length})</div>
      ${items.length ? `<ul class="link-list">${items.map(i => `
        <li><a class="item-link" href="${hrefFn(i)}">${u.escapeHtml(titleFn(i))}</a>${badgeFn(i)}</li>
      `).join('')}</ul>` : `<p class="text-muted" style="margin:0;">Пока нет записей.</p>`}
    </div>`;
  }

  return { renderList, renderDetail, openClientForm };
})();
