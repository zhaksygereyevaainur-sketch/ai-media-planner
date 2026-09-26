window.APP = window.APP || {};
APP.pages = APP.pages || {};

APP.pages.letters = (function () {
  const u = APP.utils;
  const ui = APP.ui;
  let draft = null;
  let currentKey = null;
  let saveTimer = null;

  // ---------------- Список ----------------
  function renderList(container) {
    const all = APP.store.getAll('letters').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    container.innerHTML = `
      <div class="page-toolbar">
        <div></div>
        <a class="btn btn-primary" href="#/letters/new">+ Новое письмо</a>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Тема</th><th>Клиент</th><th>Тип</th><th>Дата</th></tr></thead>
          <tbody>
            ${all.map(l => {
              const client = APP.store.getById('clients', l.clientId);
              return `<tr class="clickable" data-id="${l.id}">
                <td><strong>${u.escapeHtml(l.subject)}</strong></td>
                <td data-label="Клиент">${u.escapeHtml(client ? client.name : '—')}</td>
                <td data-label="Тип">${u.escapeHtml(APP.statusMeta(APP.LETTER_TYPES, l.type).label)}</td>
                <td data-label="Дата">${u.formatDate(l.createdAt)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        ${all.length ? '' : ui.emptyState('Письма ещё не созданы.')}
      </div>
    `;
    u.qsa('tr.clickable', container).forEach(tr => tr.addEventListener('click', () => { location.hash = `#/letters/${tr.dataset.id}`; }));
  }

  // ---------------- Редактор ----------------
  function initDraft(id, query) {
    if (id && id !== 'new') {
      const existing = APP.store.getById('letters', id);
      draft = existing ? JSON.parse(JSON.stringify(existing)) : null;
      return;
    }
    const clientId = query && query.clientId;
    if (!clientId) { draft = 'picker'; return; }
    const calcId = query && query.calcId;
    const calc = calcId ? APP.store.getById('calculations', calcId) : null;
    const proposal = calc ? APP.store.getAll('proposals').find(p => p.calculationId === calc.id) : null;
    draft = {
      id: null, clientId, calculationId: calc ? calc.id : null, proposalId: proposal ? proposal.id : null,
      type: 'cover', subject: '', body: '', wishes: '', createdAt: u.todayISO()
    };
    regenerate();
  }

  function regenerate() {
    const client = APP.store.getById('clients', draft.clientId);
    const calc = draft.calculationId ? APP.store.getById('calculations', draft.calculationId) : null;
    const proposal = draft.proposalId ? APP.store.getById('proposals', draft.proposalId) : null;
    const generated = APP.templates.generateLetter(draft.type, client, { calc, proposal }, draft.wishes);
    draft.subject = generated.subject;
    draft.body = generated.body;
  }

  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(persistDraft, 400); }
  function persistDraft() {
    if (!draft || draft === 'picker') return;
    const wasNew = !draft.id;
    const id = APP.store.upsert('letters', draft);
    if (wasNew) { currentKey = id + '||'; history.replaceState(null, '', `#/letters/${id}`); }
  }

  function renderEditor(container, id, query) {
    const key = (id || 'new') + '|' + ((query && query.clientId) || '') + '|' + ((query && query.calcId) || '');
    if (draft === null || key !== currentKey) { initDraft(id, query); currentKey = key; }
    draw(container);
  }

  function openPicker(container) {
    const clients = APP.store.getAll('clients');
    container.innerHTML = `<div class="card">
      <div class="section-title">Новое письмо</div>
      <div class="field"><label>Клиент *</label><select id="pick-client"><option value="">— выберите клиента —</option>${ui.optionsHtml(clients, '', 'id', 'name')}</select></div>
      <div class="field"><label>Связанный расчёт (опционально)</label><select id="pick-calc"><option value="">— без привязки —</option></select></div>
      <button class="btn btn-primary" id="pick-continue-btn">Продолжить</button>
    </div>`;
    const updateCalcOptions = () => {
      const clientId = u.qs('#pick-client', container).value;
      const calcs = APP.store.getAll('calculations').filter(c => c.clientId === clientId);
      u.qs('#pick-calc', container).innerHTML = '<option value="">— без привязки —</option>' + calcs.map(c => `<option value="${c.id}">${u.escapeHtml(c.title)}</option>`).join('');
    };
    u.qs('#pick-client', container).addEventListener('change', updateCalcOptions);
    u.qs('#pick-continue-btn', container).addEventListener('click', () => {
      const clientId = u.qs('#pick-client', container).value;
      if (!clientId) { ui.toast('Выберите клиента', 'error'); return; }
      const calcId = u.qs('#pick-calc', container).value;
      location.hash = `#/letters/new?clientId=${clientId}${calcId ? '&calcId=' + calcId : ''}`;
    });
  }

  function draw(container) {
    if (draft === 'picker') { openPicker(container); return; }
    if (!draft) { container.innerHTML = ui.emptyState('Письмо не найдено.'); return; }

    const client = APP.store.getById('clients', draft.clientId);
    const settings = APP.store.db.companySettings;

    container.innerHTML = `
      <div class="page-toolbar no-print">
        <a href="#/letters" class="btn btn-ghost btn-sm">&larr; К списку писем</a>
      </div>

      <div class="two-col">
        <div class="no-print">
          <div class="card">
            <div class="section-title">Параметры письма</div>
            <p class="text-muted" style="margin-top:0;">Клиент: <strong>${u.escapeHtml(client ? client.name : '—')}</strong></p>
            <div class="field"><label>Тип письма</label><select id="f-type">${ui.optionsHtml(APP.LETTER_TYPES, draft.type)}</select></div>
            <div class="field"><label>Дополнительные пожелания</label><textarea id="f-wishes" rows="3" placeholder="Например: упомянуть скидку за раннее бронирование">${u.escapeHtml(draft.wishes || '')}</textarea></div>
            <button class="btn btn-primary btn-sm" id="generate-btn" type="button">↻ Сгенерировать текст</button>
          </div>
        </div>

        <div>
          <div class="doc-toolbar no-print">
            <button class="btn btn-secondary btn-sm" id="copy-doc-btn">Копировать текст</button>
            <button class="btn btn-secondary btn-sm" id="download-doc-btn">Скачать файл</button>
            <button class="btn btn-secondary btn-sm" id="print-doc-btn">Печать / PDF</button>
          </div>
          <div class="doc-preview" id="doc-preview">
            <div class="field"><label>Тема письма</label><input type="text" id="f-subject" value="${u.escapeHtml(draft.subject)}"></div>
            <div class="field"><label>Текст письма</label><textarea id="f-body" rows="14">${u.escapeHtml(draft.body)}</textarea></div>
          </div>
        </div>
      </div>
    `;

    bindEvents(container, settings);
  }

  function buildPlainText() {
    return `Тема: ${draft.subject}\n\n${draft.body}`;
  }

  function bindEvents(container) {
    u.qs('#f-type', container).addEventListener('change', (e) => { draft.type = e.target.value; scheduleSave(); });
    u.qs('#f-wishes', container).addEventListener('input', (e) => { draft.wishes = e.target.value; scheduleSave(); });
    u.qs('#generate-btn', container).addEventListener('click', () => {
      regenerate();
      scheduleSave();
      draw(container);
    });
    u.qs('#f-subject', container).addEventListener('input', (e) => { draft.subject = e.target.value; scheduleSave(); });
    u.qs('#f-body', container).addEventListener('input', (e) => { draft.body = e.target.value; scheduleSave(); });

    u.qs('#copy-doc-btn', container).addEventListener('click', async () => {
      const ok = await u.copyText(buildPlainText());
      ui.toast(ok ? 'Текст скопирован' : 'Не удалось скопировать', ok ? 'success' : 'error');
    });
    u.qs('#download-doc-btn', container).addEventListener('click', () => {
      u.downloadText(`Письмо ${u.todayISO()}.txt`, buildPlainText());
    });
    u.qs('#print-doc-btn', container).addEventListener('click', () => window.print());
  }

  return { renderList, renderEditor };
})();
