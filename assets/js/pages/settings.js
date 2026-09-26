window.APP = window.APP || {};
APP.pages = APP.pages || {};

APP.pages.settings = (function () {
  const u = APP.utils;
  const ui = APP.ui;

  function render(container) {
    const s = APP.store.db.companySettings;
    container.innerHTML = `
      <div class="card" style="max-width:640px;">
        <div class="section-title">Фирменный бланк компании</div>
        <p class="text-muted" style="margin-top:0;">Эти данные подставляются во все создаваемые документы: КП, договоры и письма.</p>

        <div class="field"><label>Название компании</label><input type="text" id="s-name" value="${u.escapeHtml(s.name)}"></div>
        <div class="input-row">
          <div class="field"><label>БИН</label><input type="text" id="s-bin" value="${u.escapeHtml(s.bin)}"></div>
          <div class="field"><label>Валюта</label><input type="text" id="s-currency" value="${u.escapeHtml(s.currency)}"></div>
        </div>
        <div class="field"><label>Адрес</label><input type="text" id="s-address" value="${u.escapeHtml(s.address)}"></div>
        <div class="input-row">
          <div class="field"><label>Телефон</label><input type="tel" id="s-phone" value="${u.escapeHtml(s.phone)}"></div>
          <div class="field"><label>Email</label><input type="email" id="s-email" value="${u.escapeHtml(s.email)}"></div>
        </div>
        <div class="field"><label>Веб-сайт</label><input type="text" id="s-website" value="${u.escapeHtml(s.website)}"></div>
        <div class="field"><label>Банковские реквизиты</label><textarea id="s-bank">${u.escapeHtml(s.bank)}</textarea></div>
        <div class="input-row">
          <div class="field"><label>Имя менеджера (подпись)</label><input type="text" id="s-manager" value="${u.escapeHtml(s.managerName)}"></div>
          <div class="field"><label>Должность менеджера</label><input type="text" id="s-managerpos" value="${u.escapeHtml(s.managerPosition)}"></div>
        </div>
        <div class="field" style="max-width:160px;"><label>НДС по умолчанию, %</label><input type="number" min="0" id="s-vat" value="${s.vatRate}"></div>

        <button class="btn btn-primary" id="save-settings-btn">Сохранить настройки</button>
      </div>

      <div class="card" style="max-width:640px;">
        <div class="section-title">Данные прототипа</div>
        <p class="text-muted" style="margin-top:0;">Все изменения сохраняются локально в этом браузере. Кнопка ниже вернёт демо-данные к исходному состоянию.</p>
        <button class="btn btn-outline" id="reset-demo-btn">Сбросить демо-данные</button>
      </div>
    `;

    u.qs('#save-settings-btn', container).addEventListener('click', () => {
      Object.assign(APP.store.db.companySettings, {
        name: u.qs('#s-name', container).value.trim(),
        bin: u.qs('#s-bin', container).value.trim(),
        currency: u.qs('#s-currency', container).value.trim() || '₸',
        address: u.qs('#s-address', container).value.trim(),
        phone: u.qs('#s-phone', container).value.trim(),
        email: u.qs('#s-email', container).value.trim(),
        website: u.qs('#s-website', container).value.trim(),
        bank: u.qs('#s-bank', container).value.trim(),
        managerName: u.qs('#s-manager', container).value.trim(),
        managerPosition: u.qs('#s-managerpos', container).value.trim(),
        vatRate: Number(u.qs('#s-vat', container).value) || 0
      });
      APP.store.save();
      ui.toast('Настройки сохранены');
    });

    u.qs('#reset-demo-btn', container).addEventListener('click', () => {
      ui.confirmDialog('Все локальные изменения будут потеряны, а демо-данные восстановлены. Продолжить?', () => {
        APP.store.resetDemo();
        ui.toast('Демо-данные восстановлены');
        render(container);
      });
    });
  }

  return { render };
})();
