window.APP = window.APP || {};
APP.pages = APP.pages || {};

APP.pages.priceList = (function () {
  const u = APP.utils;
  const ui = APP.ui;
  let activeCategory = null;
  let search = '';

  function render(container) {
    const categories = APP.store.getAll('priceCategories');
    if (!activeCategory && categories.length) activeCategory = categories[0].id;
    const items = APP.store.getAll('priceItems').filter(i => {
      const matchesCat = !activeCategory || i.categoryId === activeCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || i.name.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
    const currency = APP.store.db.companySettings.currency;

    container.innerHTML = `
      <div class="page-toolbar">
        <div class="filters">
          <input type="search" id="price-search" placeholder="Поиск позиции..." value="${u.escapeHtml(search)}" style="min-width:240px;">
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" id="add-category-btn">+ Категория</button>
          <button class="btn btn-primary" id="add-item-btn">+ Позиция</button>
        </div>
      </div>

      <div class="tabs">
        ${categories.map(c => `<button data-cat="${c.id}" class="${c.id === activeCategory ? 'active' : ''}">${u.escapeHtml(c.name)}</button>`).join('')}
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Название</th><th>Ед. измерения</th><th class="text-right">Цена</th><th>Описание</th><th></th></tr></thead>
          <tbody>
            ${items.map(i => `
              <tr>
                <td><strong>${u.escapeHtml(i.name)}</strong></td>
                <td data-label="Ед.">${u.escapeHtml(i.unit)}</td>
                <td class="text-right num" data-label="Цена">${u.formatMoney(i.price, currency)}</td>
                <td class="text-muted" data-label="Описание">${u.escapeHtml(i.description || '—')}</td>
                <td style="white-space:nowrap;">
                  <button class="btn btn-ghost btn-sm" data-edit="${i.id}">Изм.</button>
                  <button class="btn btn-ghost btn-sm" data-del="${i.id}">Удал.</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        ${items.length ? '' : ui.emptyState('В этой категории пока нет позиций.')}
      </div>
    `;

    u.qs('#price-search', container).addEventListener('input', (e) => {
      search = e.target.value;
      render(container);
      const input = u.qs('#price-search', container);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
    u.qsa('.tabs button', container).forEach(btn => btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      render(container);
    }));
    u.qs('#add-category-btn', container).addEventListener('click', () => openCategoryForm(() => render(container)));
    u.qs('#add-item-btn', container).addEventListener('click', () => openItemForm(null, () => render(container)));
    u.qsa('[data-edit]', container).forEach(btn => btn.addEventListener('click', () => {
      const item = APP.store.getById('priceItems', btn.dataset.edit);
      openItemForm(item, () => render(container));
    }));
    u.qsa('[data-del]', container).forEach(btn => btn.addEventListener('click', () => {
      const item = APP.store.getById('priceItems', btn.dataset.del);
      ui.confirmDialog(`Удалить позицию «${item.name}»?`, () => {
        APP.store.remove('priceItems', item.id);
        ui.toast('Позиция удалена');
        render(container);
      });
    }));
  }

  function openCategoryForm(onSaved) {
    ui.openModal(`
      <div class="modal-header"><h3>Новая категория</h3></div>
      <div class="modal-body">
        <div class="field"><label>Название категории *</label><input type="text" id="f-cat-name"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-modal-close>Отмена</button>
        <button class="btn btn-primary" id="save-cat-btn">Сохранить</button>
      </div>
    `, (root) => {
      root.querySelector('#save-cat-btn').addEventListener('click', () => {
        const name = u.qs('#f-cat-name', root).value.trim();
        if (!name) { ui.toast('Укажите название категории', 'error'); return; }
        const id = APP.store.upsert('priceCategories', { name });
        activeCategory = id;
        ui.closeModal();
        ui.toast('Категория добавлена');
        onSaved();
      });
    });
  }

  function openItemForm(item, onSaved) {
    const isEdit = !!item;
    const i = item || { categoryId: activeCategory, name: '', unit: '', price: '', description: '' };
    const categories = APP.store.getAll('priceCategories');
    ui.openModal(`
      <div class="modal-header"><h3>${isEdit ? 'Редактировать позицию' : 'Новая позиция'}</h3></div>
      <div class="modal-body">
        <div class="field"><label>Категория</label><select id="f-item-cat">${ui.optionsHtml(categories, i.categoryId, 'id', 'name')}</select></div>
        <div class="field"><label>Название *</label><input type="text" id="f-item-name" value="${u.escapeHtml(i.name)}"></div>
        <div class="input-row">
          <div class="field"><label>Единица измерения</label><input type="text" id="f-item-unit" placeholder="выход, сутки, месяц..." value="${u.escapeHtml(i.unit)}"></div>
          <div class="field"><label>Цена *</label><input type="number" min="0" id="f-item-price" value="${u.escapeHtml(i.price)}"></div>
        </div>
        <div class="field"><label>Описание</label><textarea id="f-item-desc">${u.escapeHtml(i.description)}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-modal-close>Отмена</button>
        <button class="btn btn-primary" id="save-item-btn">Сохранить</button>
      </div>
    `, (root) => {
      root.querySelector('#save-item-btn').addEventListener('click', () => {
        const name = u.qs('#f-item-name', root).value.trim();
        const price = Number(u.qs('#f-item-price', root).value);
        if (!name || !price) { ui.toast('Заполните название и цену', 'error'); return; }
        const payload = {
          id: i.id,
          categoryId: u.qs('#f-item-cat', root).value,
          name, price,
          unit: u.qs('#f-item-unit', root).value.trim(),
          description: u.qs('#f-item-desc', root).value.trim()
        };
        APP.store.upsert('priceItems', payload);
        ui.closeModal();
        ui.toast(isEdit ? 'Позиция обновлена' : 'Позиция добавлена');
        onSaved();
      });
    });
  }

  return { render };
})();
