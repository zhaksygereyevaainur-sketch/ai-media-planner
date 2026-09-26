window.APP = window.APP || {};

APP.router = (function () {
  function parseHash() {
    let hash = location.hash || '';
    hash = hash.replace(/^#/, '');
    const [pathPart, queryPart] = hash.split('?');
    const parts = pathPart.replace(/^\/+/, '').split('/').filter(Boolean);
    const query = {};
    if (queryPart) {
      queryPart.split('&').forEach(kv => {
        const [k, v] = kv.split('=');
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { parts, query };
  }

  const routes = {
    '': { title: 'Дашборд', sub: 'Обзор рабочего места', nav: 'dashboard' },
    clients: { title: 'Клиенты', sub: 'Карточки клиентов и история работы', nav: 'clients' },
    'price-list': { title: 'Прайс-листы', sub: 'Каталог рекламных продуктов', nav: 'price-list' },
    calculations: { title: 'Расчёты', sub: 'Конструктор сметы размещения', nav: 'calculations' },
    proposals: { title: 'Коммерческие предложения', sub: 'КП на основе расчётов', nav: 'proposals' },
    contracts: { title: 'Договоры', sub: 'Черновики договоров (DRAFT)', nav: 'contracts' },
    letters: { title: 'Деловые письма', sub: 'Письма клиентам', nav: 'letters' },
    settings: { title: 'Настройки', sub: 'Фирменный бланк и параметры', nav: 'settings' }
  };

  function resolve() {
    const { parts, query } = parseHash();
    const section = parts[0] || '';
    const meta = routes[section] || routes[''];
    return { section, id: parts[1], query, meta };
  }

  function render() {
    const content = document.getElementById('content');
    const { section, id, query, meta } = resolve();

    document.getElementById('page-title').textContent = meta.title;
    document.getElementById('page-sub').textContent = meta.sub;
    APP.utils.qsa('.sidebar-nav a, .sidebar-footer a[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === meta.nav));

    switch (section) {
      case '':
        APP.pages.dashboard.render(content);
        break;
      case 'clients':
        if (id) APP.pages.clients.renderDetail(content, id);
        else APP.pages.clients.renderList(content);
        break;
      case 'price-list':
        APP.pages.priceList.render(content);
        break;
      case 'calculations':
        if (id) APP.pages.calculations.renderEditor(content, id, query);
        else APP.pages.calculations.renderList(content);
        break;
      case 'proposals':
        if (id) APP.pages.proposals.renderEditor(content, id, query);
        else APP.pages.proposals.renderList(content);
        break;
      case 'contracts':
        if (id) APP.pages.contracts.renderEditor(content, id, query);
        else APP.pages.contracts.renderList(content);
        break;
      case 'letters':
        if (id) APP.pages.letters.renderEditor(content, id, query);
        else APP.pages.letters.renderList(content);
        break;
      case 'settings':
        APP.pages.settings.render(content);
        break;
      default:
        APP.pages.dashboard.render(content);
    }
    content.scrollTop = 0;
  }

  return { render, resolve };
})();
