window.APP = window.APP || {};
APP.pages = APP.pages || {};

APP.pages.contracts = (function () {
  const u = APP.utils;
  const ui = APP.ui;
  let draft = null;
  let currentKey = null;
  let saveTimer = null;

  function nextNumber() {
    const year = new Date().getFullYear();
    const count = APP.store.getAll('contracts').length + 1;
    return `ДГ-${year}-${String(count).padStart(3, '0')}`;
  }

  // ---------------- Список ----------------
  function renderList(container) {
    const all = APP.store.getAll('contracts').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    container.innerHTML = `
      <div class="page-toolbar">
        <div></div>
        <button class="btn btn-primary" id="new-contract-btn">+ Новый договор</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>№</th><th>Клиент</th><th>Дата</th><th>Статус</th></tr></thead>
          <tbody>
            ${all.map(c => {
              const client = APP.store.getById('clients', c.clientId);
              return `<tr class="clickable" data-id="${c.id}">
                <td><strong>${u.escapeHtml(c.number)}</strong></td>
                <td>${u.escapeHtml(client ? client.name : '—')}</td>
                <td>${u.formatDate(c.date)}</td>
                <td>${ui.badge(APP.DOC_STATUSES, c.status)} <span class="badge badge-amber">DRAFT</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        ${all.length ? '' : ui.emptyState('Договоры ещё не созданы.')}
      </div>
    `;
    u.qsa('tr.clickable', container).forEach(tr => tr.addEventListener('click', () => { location.hash = `#/contracts/${tr.dataset.id}`; }));
    u.qs('#new-contract-btn', container).addEventListener('click', () => openCalcPicker());
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
        location.hash = `#/contracts/new?calcId=${calcId}`;
      });
    });
  }

  // ---------------- Редактор ----------------
  function initDraft(id, query) {
    if (id && id !== 'new') {
      const existing = APP.store.getById('contracts', id);
      draft = existing ? JSON.parse(JSON.stringify(existing)) : null;
      return;
    }
    const calcId = query && query.calcId;
    if (!calcId) { draft = 'picker'; return; }
    const calc = APP.store.getById('calculations', calcId);
    if (!calc) { draft = null; return; }
    const proposal = APP.store.getAll('proposals').find(p => p.calculationId === calc.id);
    draft = {
      id: null, calculationId: calc.id, proposalId: proposal ? proposal.id : null, clientId: calc.clientId,
      number: nextNumber(), date: u.todayISO(), subjectText: '', termsText: '', status: 'draft', createdAt: u.todayISO()
    };
    regenerateAll();
  }

  function regenerateAll() {
    const calc = APP.store.getById('calculations', draft.calculationId);
    const client = APP.store.getById('clients', draft.clientId);
    draft.subjectText = APP.templates.generateContractSubject(client, calc);
    draft.termsText = APP.templates.generateContractTerms(calc);
  }

  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persistDraft, 400); }
  function persistDraft() {
    if (!draft || draft === 'picker') return;
    const wasNew = !draft.id;
    const id = APP.store.upsert('contracts', draft);
    if (wasNew) { currentKey = id + '|'; history.replaceState(null, '', `#/contracts/${id}`); }
  }

  function renderEditor(container, id, query) {
    const key = (id || 'new') + '|' + ((query && query.calcId) || '');
    if (draft === null || key !== currentKey) { initDraft(id, query); currentKey = key; }
    draw(container);
  }

  function draw(container) {
    if (draft === 'picker') {
      container.innerHTML = `<div class="card">${ui.emptyState('Чтобы создать договор, сначала выберите расчёт.', '<button class="btn btn-primary" id="pick-from-here">Выбрать расчёт</button>')}</div>`;
      u.qs('#pick-from-here', container).addEventListener('click', openCalcPicker);
      return;
    }
    if (!draft) { container.innerHTML = ui.emptyState('Договор не найден.'); return; }

    const client = APP.store.getById('clients', draft.clientId);
    const calc = APP.store.getById('calculations', draft.calculationId);
    const settings = APP.store.db.companySettings;
    const totals = APP.calc.computeTotals(calc);

    container.innerHTML = `
      <div class="page-toolbar no-print">
        <a href="#/contracts" class="btn btn-ghost btn-sm">&larr; К списку договоров</a>
        <select id="doc-status" style="width:auto;">${ui.optionsHtml(APP.DOC_STATUSES, draft.status)}</select>
      </div>

      <div class="two-col">
        <div class="no-print">
          <div class="card">
            <div class="section-title">Параметры договора</div>
            <div class="input-row">
              <div class="field"><label>Номер</label><input type="text" id="f-number" value="${u.escapeHtml(draft.number)}"></div>
              <div class="field"><label>Дата</label><input type="date" id="f-date" value="${draft.date}"></div>
            </div>
            <p class="text-muted" style="margin:4px 0 0;">Клиент: <strong>${u.escapeHtml(client ? client.name : '—')}</strong> · Расчёт: <a href="#/calculations/${calc ? calc.id : ''}">${u.escapeHtml(calc ? calc.title : '—')}</a></p>
          </div>

          <div class="card">
            <div class="section-title">Предмет договора (ИИ)</div>
            <textarea id="f-subject" rows="6">${u.escapeHtml(draft.subjectText)}</textarea>
            <div style="margin-top:8px;"><button class="btn btn-outline btn-sm" id="regen-subject-btn" type="button">↻ Сгенерировать заново</button></div>
          </div>

          <div class="card">
            <div class="section-title">Сроки и порядок исполнения (ИИ)</div>
            <textarea id="f-terms" rows="6">${u.escapeHtml(draft.termsText)}</textarea>
            <div style="margin-top:8px;"><button class="btn btn-outline btn-sm" id="regen-terms-btn" type="button">↻ Сгенерировать заново</button></div>
          </div>

          <div class="card">
            <div class="section-title">Фиксированные разделы компании</div>
            <p class="text-muted">Права/обязанности сторон и форс-мажор берутся из юридически утверждённого шаблона компании и не редактируются в прототипе.</p>
          </div>
        </div>

        <div>
          <div class="doc-toolbar no-print">
            <button class="btn btn-secondary btn-sm" id="copy-doc-btn">Копировать текст</button>
            <button class="btn btn-secondary btn-sm" id="download-doc-btn">Скачать файл</button>
            <button class="btn btn-secondary btn-sm" id="print-doc-btn">Печать / PDF</button>
          </div>
          <div class="doc-preview" id="doc-preview">
            <div class="doc-warning">ПРОЕКТ ДОКУМЕНТА — ТРЕБУЕТ ПРОВЕРКИ ЮРИСТА ПЕРЕД ПОДПИСАНИЕМ</div>
            ${letterheadHtml(settings)}
            <div class="doc-title">ДОГОВОР № ${u.escapeHtml(draft.number)} <br><span style="font-size:12px; font-weight:400; text-transform:none;">на оказание рекламных услуг</span></div>
            <div class="doc-section">
              <h4>Преамбула</h4>
              <p>${u.escapeHtml(settings.name)}, именуемое в дальнейшем «Исполнитель», с одной стороны, и ${u.escapeHtml(client ? client.name : '—')}, именуемое в дальнейшем «Заказчик», с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем.</p>
            </div>
            <div class="doc-section">
              <h4>1. Предмет договора</h4>
              <p id="preview-subject">${u.nl2br(draft.subjectText)}</p>
            </div>
            <div class="doc-section">
              <h4>2. Цена и порядок расчётов</h4>
              ${itemsTableHtml(calc, settings.currency)}
              ${totalsHtml(totals, settings.currency)}
            </div>
            <div class="doc-section">
              <h4>3. Права и обязанности сторон</h4>
              <p>${u.nl2br(APP.templates.CONTRACT_FIXED.rightsAndDuties)}</p>
            </div>
            <div class="doc-section">
              <h4>4. Срок действия и порядок исполнения</h4>
              <p id="preview-terms">${u.nl2br(draft.termsText)}</p>
            </div>
            <div class="doc-section">
              <h4>5. Форс-мажор</h4>
              <p>${u.nl2br(APP.templates.CONTRACT_FIXED.forceMajeure)}</p>
            </div>
            <div class="doc-section">
              <h4>6. Реквизиты и подписи сторон</h4>
              <div class="grid grid-2">
                <div><strong>Исполнитель</strong><br>${u.escapeHtml(settings.name)}<br>БИН ${u.escapeHtml(settings.bin)}<br>${u.escapeHtml(settings.address)}<br>${u.escapeHtml(settings.bank)}</div>
                <div><strong>Заказчик</strong><br>${u.escapeHtml(client ? client.name : '—')}<br>БИН ${u.escapeHtml(client ? client.bin : '—')}<br>Контакт: ${u.escapeHtml(client ? client.contactPerson : '—')}</div>
              </div>
              ${signatureHtml(settings)}
            </div>
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
      <div>${u.escapeHtml(settings.managerPosition)}<br>_________________ / ${u.escapeHtml(settings.managerName)} /</div>
      <div>Заказчик<br>_________________ / ______________ /</div>
    </div>`;
  }

  function itemsTableHtml(calc, currency) {
    if (!calc) return '';
    const rows = (calc.items || []).map(item => {
      const c = APP.calc.computeItem(item);
      return `<tr>
        <td>${u.escapeHtml(item.name)}</td><td>${u.escapeHtml(item.unit)}</td>
        <td class="text-right">${item.qty}</td><td class="text-right">${u.formatMoney(item.price, currency)}</td>
        <td class="text-right">${item.discount}%</td><td class="text-right">${u.formatMoney(c.lineAfterDiscount, currency)}</td>
      </tr>`;
    }).join('');
    return `<div class="doc-table-scroll"><table class="doc-table">
      <thead><tr><th>Услуга</th><th>Ед.</th><th class="text-right">Кол-во</th><th class="text-right">Цена</th><th class="text-right">Скидка</th><th class="text-right">Сумма</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  function totalsHtml(totals, currency) {
    return `<div class="doc-totals">
      <div><span>Подытог</span><span>${u.formatMoney(totals.subtotal, currency)}</span></div>
      <div><span>Скидка</span><span>- ${u.formatMoney(totals.discountAmount, currency)}</span></div>
      <div><span>НДС (${totals.vatRate}%)</span><span>${u.formatMoney(totals.vatAmount, currency)}</span></div>
      <div class="grand-total"><span>Итого по договору</span><span>${u.formatMoney(totals.total, currency)}</span></div>
    </div>`;
  }

  function buildPlainText() {
    const client = APP.store.getById('clients', draft.clientId);
    const calc = APP.store.getById('calculations', draft.calculationId);
    const settings = APP.store.db.companySettings;
    const totals = APP.calc.computeTotals(calc);
    const lines = [];
    lines.push('ПРОЕКТ ДОКУМЕНТА — ТРЕБУЕТ ПРОВЕРКИ ЮРИСТА ПЕРЕД ПОДПИСАНИЕМ', '');
    lines.push(`ДОГОВОР № ${draft.number} от ${u.formatDate(draft.date)}`, '');
    lines.push(`${settings.name} («Исполнитель») и ${client ? client.name : '—'} («Заказчик») заключили настоящий Договор о нижеследующем.`, '');
    lines.push('1. Предмет договора', draft.subjectText, '');
    lines.push('2. Цена и порядок расчётов');
    (calc.items || []).forEach(item => {
      const c = APP.calc.computeItem(item);
      lines.push(`— ${item.name} (${item.unit}) × ${item.qty}, скидка ${item.discount}% = ${u.formatMoney(c.lineAfterDiscount, settings.currency)}`);
    });
    lines.push(`Итого по договору: ${u.formatMoney(totals.total, settings.currency)} (в т.ч. НДС ${totals.vatRate}%)`, '');
    lines.push('3. Права и обязанности сторон', APP.templates.CONTRACT_FIXED.rightsAndDuties, '');
    lines.push('4. Срок действия и порядок исполнения', draft.termsText, '');
    lines.push('5. Форс-мажор', APP.templates.CONTRACT_FIXED.forceMajeure, '');
    lines.push('6. Реквизиты сторон');
    lines.push(`Исполнитель: ${settings.name}, БИН ${settings.bin}, ${settings.address}`);
    lines.push(`Заказчик: ${client ? client.name : '—'}, БИН ${client ? client.bin : '—'}`);
    return lines.join('\n');
  }

  function bindEvents(container) {
    u.qs('#doc-status', container).addEventListener('change', (e) => { draft.status = e.target.value; scheduleSave(); });
    u.qs('#f-number', container).addEventListener('input', (e) => {
      draft.number = e.target.value; scheduleSave();
      u.qs('.doc-title', container).innerHTML = `ДОГОВОР № ${u.escapeHtml(e.target.value)} <br><span style="font-size:12px; font-weight:400; text-transform:none;">на оказание рекламных услуг</span>`;
    });
    u.qs('#f-date', container).addEventListener('change', (e) => { draft.date = e.target.value; scheduleSave(); });

    u.qs('#f-subject', container).addEventListener('input', (e) => {
      draft.subjectText = e.target.value;
      u.qs('#preview-subject', container).innerHTML = u.nl2br(draft.subjectText);
      scheduleSave();
    });
    u.qs('#f-terms', container).addEventListener('input', (e) => {
      draft.termsText = e.target.value;
      u.qs('#preview-terms', container).innerHTML = u.nl2br(draft.termsText);
      scheduleSave();
    });
    u.qs('#regen-subject-btn', container).addEventListener('click', () => {
      const client = APP.store.getById('clients', draft.clientId);
      const calc = APP.store.getById('calculations', draft.calculationId);
      draft.subjectText = APP.templates.generateContractSubject(client, calc);
      scheduleSave();
      draw(container);
    });
    u.qs('#regen-terms-btn', container).addEventListener('click', () => {
      const calc = APP.store.getById('calculations', draft.calculationId);
      draft.termsText = APP.templates.generateContractTerms(calc);
      scheduleSave();
      draw(container);
    });

    u.qs('#copy-doc-btn', container).addEventListener('click', async () => {
      const ok = await u.copyText(buildPlainText());
      ui.toast(ok ? 'Текст скопирован' : 'Не удалось скопировать', ok ? 'success' : 'error');
    });
    u.qs('#download-doc-btn', container).addEventListener('click', () => {
      u.downloadText(`${draft.number}.txt`, buildPlainText());
    });
    u.qs('#print-doc-btn', container).addEventListener('click', () => window.print());
  }

  return { renderList, renderEditor };
})();
