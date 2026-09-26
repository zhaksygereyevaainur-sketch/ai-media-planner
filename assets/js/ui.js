// Общие UI-хелперы: бейджи, модальные окна, тосты
window.APP = window.APP || {};

APP.ui = (function () {
  const u = APP.utils;

  function badge(list, value) {
    const meta = APP.statusMeta(list, value);
    return `<span class="badge ${meta.cls}">${u.escapeHtml(meta.label)}</span>`;
  }

  function toast(message, kind) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = `toast ${kind === 'error' ? 'toast-error' : 'toast-success'}`;
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, 2600);
  }

  function openModal(innerHtml, onMount) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-overlay" data-close-modal>
        <div class="modal-box" role="dialog">${innerHtml}</div>
      </div>`;
    root.classList.add('open');
    root.querySelector('[data-close-modal]').addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close-modal')) closeModal();
    });
    u.qsa('[data-modal-close]', root).forEach(btn => btn.addEventListener('click', closeModal));
    if (onMount) onMount(root);
  }

  function closeModal() {
    const root = document.getElementById('modal-root');
    root.classList.remove('open');
    root.innerHTML = '';
  }

  function confirmDialog(message, onConfirm) {
    openModal(`
      <div class="modal-header"><h3>Подтверждение</h3></div>
      <div class="modal-body"><p>${u.escapeHtml(message)}</p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-modal-close>Отмена</button>
        <button class="btn btn-danger" id="confirm-ok-btn">Подтвердить</button>
      </div>
    `, (root) => {
      root.querySelector('#confirm-ok-btn').addEventListener('click', () => {
        closeModal();
        onConfirm();
      });
    });
  }

  function optionsHtml(list, selected, valueKey, labelKey) {
    valueKey = valueKey || 'value';
    labelKey = labelKey || 'label';
    return list.map(item => {
      const v = typeof item === 'object' ? item[valueKey] : item;
      const l = typeof item === 'object' ? item[labelKey] : item;
      const sel = String(v) === String(selected) ? 'selected' : '';
      return `<option value="${u.escapeHtml(v)}" ${sel}>${u.escapeHtml(l)}</option>`;
    }).join('');
  }

  function emptyState(text, actionHtml) {
    return `<div class="empty-state"><p>${u.escapeHtml(text)}</p>${actionHtml || ''}</div>`;
  }

  return { badge, toast, openModal, closeModal, confirmDialog, optionsHtml, emptyState };
})();
