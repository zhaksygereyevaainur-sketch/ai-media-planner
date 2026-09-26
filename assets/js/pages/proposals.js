window.APP = window.APP || {};
APP.pages = APP.pages || {};

APP.pages.proposals = (function () {
  const u = APP.utils;
  const ui = APP.ui;
  let draft = null;
  let currentKey = null;
  let saveTimer = null;

  function nextNumber() {
    const year = new Date().getFullYear();
    const count = APP.store.getAll('proposals').length + 1;
    return `КП-${year}-${String(count).padStart(3, '0')}`;
  }

  // ---------------- Список ----------------
  function renderList(container) {
    const all = APP.store.getAll('proposals').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    container.innerHTML = `
      <div class="page-toolbar">
        <div></div>
        <button class="btn btn-primary" id="new-proposal-btn">+ Новое КП</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>№</th><th>Клиент</th><th>Дата</th><th>Стиль</th><th>Статус</th></tr></thead>
          <tbody>
            ${all.map(p => {
              const client = APP.store.getById('clients', p.clientId);
              return `<tr class="clickable" data-id="${p.id}">
                <td><strong>${u.escapeHtml(p.number)}</strong></td>
                <td>${u.escapeHtml(client ? client.name : '—')}</td>
                <td>${u.formatDate(p.date)}</td>
                <td>${u.escapeHtml(APP.statusMeta(APP.PROPOSAL_STYLES, p.style).label)}</td>
                <td>${ui.badge(APP.DOC_STATUSES, p.status)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        ${all.length ? '' : ui.emptyState('Коммерческие предложения ещё не созданы.')}
      </div>
    `;
    u.qsa('tr.clickable', container).forEach(tr => tr.addEventListener('click', () => { location.hash = `#/proposals/${tr.dataset.id}`; }));
    u.qs('#new-proposal-btn', container).addEventListener('click', () => openCalcPicker());
  }

  function openCalcPicker() {
    const calcs = APP.store.getAll('calculations');
    if (!calcs.length) { ui.toast('Сначала создайте расчёт', 'error'); return; }
    ui.openModal(`
      <div class="modal-header"><h3>Выберите расчёт</h3></div>
      <div class="modal-body">
        <div class="field"><label>Расчёт</label><select id="pick-calc">${calcs.map(c => {
          const client = APP.store.getById('clients', c.clientId);
          return `<option value="${c.id}">${u.escapeHtml((client ? client.name + ' — ' : '') + c.title)}</option>`;
        }).join('')}</select></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-modal-close>Отмена</button>
        <button class="btn btn-primary" id="pick-calc-ok">Продолжить</button>
      </div>
    `, (root) => {
      root.querySelector('#pick-calc-ok').addEventListener('click', () => {
        const calcId = u.qs('#pick-calc', root).value;
        ui.closeModal();
        location.hash = `#/proposals/new?calcId=${calcId}`;
      });
    });
  }

  // ---------------- Редактор ----------------
  function initDraft(id, query) {
    if (id && id !== 'new') {
      const existing = APP.store.getById('proposals', id);
      draft = existing ? JSON.parse(JSON.stringify(existing)) : null;
      return;
    }
    const calcId = query && query.calcId;
    if (!calcId) { draft = 'picker'; return; }
    const calc = APP.store.getById('calculations', calcId);
    if (!calc) { draft = null; return; }
    draft = {
      id: null, calculationId: calc.id, clientId: calc.clientId,
      number: nextNumber(), date: u.todayISO(), style: 'standard',
      introText: '', conditions: '', validDays: 14, status: 'draft', createdAt: u.todayISO()
    };
    regenerateAll();
  }

  function regenerateAll() {
    const client = APP.store.getById('clients', draft.clientId);
    const calc = APP.store.getById('calculations', draft.calculationId);
    draft.introText = APP.templates.generateProposalIntro(client, calc, draft.style);
    draft.conditions = APP.templates.generateProposalConditions(calc, draft.style);
  }

  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persistDraft, 400); }
  function persistDraft() {
    if (!draft || draft === 'picker') return;
    const wasNew = !draft.id;
    const id = APP.store.upsert('proposals', draft);
    if (wasNew) { currentKey = id + '|'; history.replaceState(null, '', `#/proposals/${id}`); }
  }

  function renderEditor(container, id, query) {
    const key = (id || 'new') + '|' + ((query && query.calcId) || '');
    if (draft === null || key !== currentKey) { initDraft(id, query); currentKey = key; }
    draw(container);
  }

  function draw(container) {
    if (draft === 'picker') {
      container.innerHTML = `<div class="card">${ui.emptyState('Чтобы создать КП, сначала выберите расчёт.', '<button class="btn btn-primary" id="pick-from-here">Выбрать расчёт</button>')}</div>`;
      u.qs('#pick-from-here', container).addEventListener('click', openCalcPicker);
      return;
    }
    if (!draft) { container.innerHTML = ui.emptyState('Коммерческое предложение не найдено.'); return; }

    const client = APP.store.getById('clients', draft.clientId);
    const calc = APP.store.getById('calculations', draft.calculationId);
    const settings = APP.store.db.companySettings;
    const totals = APP.calc.computeTotals(calc);
    const validUntil = u.addDaysISO(draft.date, Number(draft.validDays) || 14);

    container.innerHTML = `
      <div class="page-toolbar no-print">
        <a href="#/proposals" class="btn btn-ghost btn-sm">&larr; К списку КП</a>
        <select id="doc-status" style="width:auto;">${ui.optionsHtml(APP.DOC_STATUSES, draft.status)}</select>
      </div>

      <div class="two-col">
        <div class="no-print">
          <div class="card">
            <div class="section-title">Параметры КП</div>
            <div class="input-row">
              <div class="field"><label>Номер</label><input type="text" id="f-number" value="${u.escapeHtml(draft.number)}"></div>
              <div class="field"><label>Дата</label><input type="date" id="f-date" value="${draft.date}"></div>
            </div>
            <div class="input-row">
              <div class="field"><label>Стиль</label><select id="f-style">${ui.optionsHtml(APP.PROPOSAL_STYLES, draft.style)}</select></div>
              <div class="field"><label>Действует, дней</label><input type="number" min="1" id="f-valid" value="${draft.validDays}"></div>
            </div>
            <p class="text-muted" style="margin:4px 0 0;">Клиент: <strong>${u.escapeHtml(client ? client.name : '—')}</strong> · Расчёт: <a href="#/calculations/${calc ? calc.id : ''}">${u.escapeHtml(calc ? calc.title : '—')}</a></p>
          </div>

          <div class="card">
            <div class="section-title">Вводный текст (ИИ)</div>
            <textarea id="f-intro" rows="7">${u.escapeHtml(draft.introText)}</textarea>
            <div style="margin-top:8px;"><button class="btn btn-outline btn-sm" id="regen-intro-btn" type="button">↻ Сгенерировать заново</button></div>
          </div>

          <div class="card">
            <div class="section-title">Условия оплаты</div>
            <textarea id="f-conditions" rows="4">${u.escapeHtml(draft.conditions)}</textarea>
            <div style="margin-top:8px;"><button class="btn btn-outline btn-sm" id="regen-cond-btn" type="button">↻ Сгенерировать заново</button></div>
          </div>
        </div>

        <div>
          <div class="doc-toolbar no-print">
            <button class="btn btn-secondary btn-sm" id="copy-doc-btn">Копировать текст</button>
            <button class="btn btn-secondary btn-sm" id="download-doc-btn">Скачать файл</button>
            <button class="btn btn-secondary btn-sm" id="print-doc-btn">Печать / PDF</button>
          </div>
          <div class="doc-preview" id="doc-preview">
            ${letterheadHtml(settings)}
            <div class="doc-title">КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ № ${u.escapeHtml(draft.number)}</div>
            <div class="doc-section">
              <p>Дата: ${u.formatDate(draft.date)} &nbsp;·&nbsp; Клиент: ${u.escapeHtml(client ? client.name : '—')}</p>
            </div>
            <div class="doc-section"><p id="preview-intro">${u.nl2br(draft.introText)}</p></div>
            <div class="doc-section">
              <h4>Состав предложения</h4>
              ${itemsTableHtml(calc, settings.currency)}
              ${totalsHtml(totals, settings.currency)}
            </div>
            <div class="doc-section">
              <h4>Условия оплаты</h4>
              <p id="preview-conditions">${u.nl2br(draft.conditions)}</p>
            </div>
            <div class="doc-section">
              <p>Предложение действительно до <strong>${u.formatDate(validUntil)}</strong>.</p>
            </div>
            ${signatureHtml(settings)}
          </div>
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function letterheadHtml(settings) {
    return `<div class="doc-letterhead">
      <div>
        <div class="doc-company">${u.escapeHtml(settings.name)}</div>
        <div class="doc-company-meta">БИН ${u.escapeHtml(settings.bin)}<br>${u.escapeHtml(settings.address)}<br>${u.escapeHtml(settings.phone)} · ${u.escapeHtml(settings.email)}</div>
      </div>
      <div class="doc-meta">${u.escapeHtml(settings.website)}</div>
    </div>`;
  }

  function signatureHtml(settings) {
    return `<div class="doc-signature">
      <div>${u.escapeHtml(settings.managerPosition)}</div>
      <div><strong>${u.escapeHtml(settings.managerName)}</strong></div>
    </div>`;
  }

  function itemsTableHtml(calc, currency) {
    if (!calc) return '';
    const rows = (calc.items || []).map(item => {
      const c = APP.calc.computeItem(item);
      return `<tr>
        <td>${u.escapeHtml(item.name)}</td>
        <td>${u.escapeHtml(item.unit)}</td>
        <td class="text-right">${item.qty}</td>
        <td class="text-right">${u.formatMoney(item.price, currency)}</td>
        <td class="text-right">${item.discount}%</td>
        <td class="text-right">${u.formatMoney(c.lineAfterDiscount, currency)}</td>
      </tr>`;
    }).join('');
    return `<table class="doc-table">
      <thead><tr><th>Услуга</th><th>Ед.</th><th class="text-right">Кол-во</th><th class="text-right">Цена</th><th class="text-right">Скидка</th><th class="text-right">Сумма</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function totalsHtml(totals, currency) {
    return `<div class="doc-totals">
      <div><span>Подытог</span><span>${u.formatMoney(totals.subtotal, currency)}</span></div>
      <div><span>Скидка</span><span>- ${u.formatMoney(totals.discountAmount, currency)}</span></div>
      <div><span>НДС (${totals.vatRate}%)</span><span>${u.formatMoney(totals.vatAmount, currency)}</span></div>
      <div class="grand-total"><span>Итого к оплате</span><span>${u.formatMoney(totals.total, currency)}</span></div>
    </div>`;
  }

  function buildPlainText(container) {
    const client = APP.store.getById('clients', draft.clientId);
    const calc = APP.store.getById('calculations', draft.calculationId);
    const settings = APP.store.db.companySettings;
    const totals = APP.calc.computeTotals(calc);
    const validUntil = u.addDaysISO(draft.date, Number(draft.validDays) || 14);
    const lines = [];
    lines.push(settings.name, `БИН ${settings.bin}`, settings.address, `${settings.phone} · ${settings.email}`, '');
    lines.push(`КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ № ${draft.number}`);
    lines.push(`Дата: ${u.formatDate(draft.date)}   Клиент: ${client ? client.name : '—'}`, '');
    lines.push(draft.introText, '');
    lines.push('Состав предложения:');
    (calc.items || []).forEach(item => {
      const c = APP.calc.computeItem(item);
      lines.push(`— ${item.name} (${item.unit}) × ${item.qty}, скидка ${item.discount}% = ${u.formatMoney(c.lineAfterDiscount, settings.currency)}`);
    });
    lines.push('', `Подытог: ${u.formatMoney(totals.subtotal, settings.currency)}`);
    lines.push(`Скидка: - ${u.formatMoney(totals.discountAmount, settings.currency)}`);
    lines.push(`НДС (${totals.vatRate}%): ${u.formatMoney(totals.vatAmount, settings.currency)}`);
    lines.push(`Итого к оплате: ${u.formatMoney(totals.total, settings.currency)}`, '');
    lines.push('Условия оплаты:', draft.conditions, '');
    lines.push(`Предложение действительно до ${u.formatDate(validUntil)}.`, '');
    lines.push(settings.managerPosition, settings.managerName);
    return lines.join('\n');
  }

  function bindEvents(container) {
    u.qs('#doc-status', container).addEventListener('change', (e) => { draft.status = e.target.value; scheduleSave(); });
    u.qs('#f-number', container).addEventListener('input', (e) => { draft.number = e.target.value; scheduleSave(); u.qs('.doc-title', container).textContent = 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ № ' + e.target.value; });
    u.qs('#f-date', container).addEventListener('change', (e) => { draft.date = e.target.value; scheduleSave(); draw(container); });
    u.qs('#f-style', container).addEventListener('change', (e) => { draft.style = e.target.value; scheduleSave(); });
    u.qs('#f-valid', container).addEventListener('input', (e) => { draft.validDays = Number(e.target.value) || 14; scheduleSave(); draw(container); });

    u.qs('#f-intro', container).addEventListener('input', (e) => {
      draft.introText = e.target.value;
      u.qs('#preview-intro', container).innerHTML = u.nl2br(draft.introText);
      scheduleSave();
    });
    u.qs('#f-conditions', container).addEventListener('input', (e) => {
      draft.conditions = e.target.value;
      u.qs('#preview-conditions', container).innerHTML = u.nl2br(draft.conditions);
      scheduleSave();
    });
    u.qs('#regen-intro-btn', container).addEventListener('click', () => {
      const client = APP.store.getById('clients', draft.clientId);
      const calc = APP.store.getById('calculations', draft.calculationId);
      draft.introText = APP.templates.generateProposalIntro(client, calc, draft.style);
      scheduleSave();
      draw(container);
    });
    u.qs('#regen-cond-btn', container).addEventListener('click', () => {
      const calc = APP.store.getById('calculations', draft.calculationId);
      draft.conditions = APP.templates.generateProposalConditions(calc, draft.style);
      scheduleSave();
      draw(container);
    });

    u.qs('#copy-doc-btn', container).addEventListener('click', async () => {
      const ok = await u.copyText(buildPlainText(container));
      ui.toast(ok ? 'Текст скопирован' : 'Не удалось скопировать', ok ? 'success' : 'error');
    });
    u.qs('#download-doc-btn', container).addEventListener('click', () => {
      u.downloadText(`${draft.number}.txt`, buildPlainText(container));
    });
    u.qs('#print-doc-btn', container).addEventListener('click', () => window.print());
  }

  return { renderList, renderEditor };
})();
