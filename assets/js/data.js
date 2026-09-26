// Константы и демо-данные приложения
window.APP = window.APP || {};

APP.CLIENT_STATUSES = [
  { value: 'lead', label: 'Лид', cls: 'badge-gray' },
  { value: 'in_progress', label: 'В работе', cls: 'badge-blue' },
  { value: 'client', label: 'Клиент', cls: 'badge-green' },
  { value: 'archive', label: 'Архив', cls: 'badge-slate' }
];

APP.CALC_STATUSES = [
  { value: 'draft', label: 'Черновик', cls: 'badge-gray' },
  { value: 'sent', label: 'Отправлен', cls: 'badge-blue' },
  { value: 'accepted', label: 'Принят', cls: 'badge-green' }
];

APP.DOC_STATUSES = [
  { value: 'draft', label: 'Черновик', cls: 'badge-gray' },
  { value: 'sent', label: 'Отправлено', cls: 'badge-blue' },
  { value: 'accepted', label: 'Принято', cls: 'badge-green' }
];

APP.PROPOSAL_STYLES = [
  { value: 'short', label: 'Кратко' },
  { value: 'standard', label: 'Стандарт' },
  { value: 'premium', label: 'Премиум' }
];

APP.LETTER_TYPES = [
  { value: 'cover', label: 'Сопроводительное к КП' },
  { value: 'reminder', label: 'Напоминание' },
  { value: 'thanks', label: 'Благодарность' },
  { value: 'details', label: 'Уточнение деталей' }
];

function statusMeta(list, value) {
  return list.find(s => s.value === value) || list[0];
}
APP.statusMeta = statusMeta;

APP.data = (function () {
  function getDefaultData() {
    const companySettings = {
      name: 'ТОО «Медиа Хаб»',
      bin: '123456789012',
      address: 'г. Алматы, пр. Достык, 105, оф. 401',
      phone: '+7 (727) 123-45-67',
      email: 'info@mediahub.kz',
      website: 'www.mediahub.kz',
      bank: 'АО «Halyk Bank», БИК HSBKKZKX, ИИК KZ12 3456 7890 1234 5678',
      managerName: 'Сатпаева Айгерим Ерлановна',
      managerPosition: 'Менеджер по рекламе',
      vatRate: 12,
      currency: '₸'
    };

    const clients = [
      {
        id: 'cl-1', name: 'ТОО «Асыл Тағам»', bin: '040540001234',
        contactPerson: 'Ахметов Данияр', phone: '+7 701 234 56 78', email: 'daniyar@asyltagam.kz',
        industry: 'Пищевая розница', status: 'client',
        notes: 'Постоянный клиент, размещается ежеквартально. Предпочитает наружную рекламу и ТВ.',
        createdAt: '2026-01-14'
      },
      {
        id: 'cl-2', name: 'ИП «Строй Мастер»', bin: '780112300987',
        contactPerson: 'Ержанов Бауыржан', phone: '+7 707 555 12 34', email: 'b.erzhanov@stroimaster.kz',
        industry: 'Строительные материалы', status: 'in_progress',
        notes: 'Обсуждается размещение к весеннему сезону, ждём согласования бюджета.',
        createdAt: '2026-08-02'
      },
      {
        id: 'cl-3', name: 'ТОО «Grand Auto»', bin: '090640005566',
        contactPerson: 'Тлеубердиева Асель', phone: '+7 702 888 90 12', email: 'a.tleuberdiyeva@grandauto.kz',
        industry: 'Автодилер', status: 'lead',
        notes: 'Первый контакт на выставке, интересуется digital-продвижением.',
        createdAt: '2026-09-10'
      },
      {
        id: 'cl-4', name: 'ТОО «Milk Way»', bin: '050330007788',
        contactPerson: 'Иманбаева Гульнара', phone: '+7 705 321 44 55', email: 'g.imanbayeva@milkway.kz',
        industry: 'Молочная продукция', status: 'client',
        notes: 'Работаем второй год, есть рамочная договорённость по прессе и радио.',
        createdAt: '2025-11-20'
      },
      {
        id: 'cl-5', name: '«Fashion House»', bin: '060220009911',
        contactPerson: 'Рахимова Динара', phone: '+7 708 111 22 33', email: 'd.rakhimova@fashionhouse.kz',
        industry: 'Розничная торговля, одежда', status: 'archive',
        notes: 'Сотрудничество приостановлено клиентом в 2025 году.',
        createdAt: '2024-05-05'
      }
    ];

    const priceCategories = [
      { id: 'pc-tv', name: 'ТВ' },
      { id: 'pc-radio', name: 'Радио' },
      { id: 'pc-out', name: 'Наружная реклама' },
      { id: 'pc-digital', name: 'Digital' },
      { id: 'pc-press', name: 'Пресса' }
    ];

    const priceItems = [
      { id: 'pi-1', categoryId: 'pc-tv', name: 'Ролик 15 сек, прайм-тайм', unit: 'выход', price: 45000, description: 'Размещение в вечернем прайм-тайме, будни' },
      { id: 'pi-2', categoryId: 'pc-tv', name: 'Ролик 30 сек, дневной эфир', unit: 'выход', price: 28000, description: 'Дневной эфир, будни и выходные' },
      { id: 'pi-3', categoryId: 'pc-tv', name: 'Бегущая строка', unit: 'сутки', price: 15000, description: 'Информационная строка внизу экрана' },
      { id: 'pi-4', categoryId: 'pc-radio', name: 'Ролик 15 сек', unit: 'выход', price: 8000, description: 'Ротация в течение дня' },
      { id: 'pi-5', categoryId: 'pc-radio', name: 'Ролик 30 сек', unit: 'выход', price: 12000, description: 'Ротация в течение дня' },
      { id: 'pi-6', categoryId: 'pc-radio', name: 'Спонсорство программы', unit: 'месяц', price: 350000, description: 'Упоминание бренда в эфире программы' },
      { id: 'pi-7', categoryId: 'pc-out', name: 'Билборд 3x6', unit: 'месяц', price: 180000, description: 'Стандартная конструкция в городской черте' },
      { id: 'pi-8', categoryId: 'pc-out', name: 'Сити-борд', unit: 'месяц', price: 220000, description: 'Формат в местах с высоким пешеходным трафиком' },
      { id: 'pi-9', categoryId: 'pc-out', name: 'Реклама на транспорте', unit: 'месяц', price: 95000, description: 'Брендирование городского транспорта' },
      { id: 'pi-10', categoryId: 'pc-digital', name: 'Баннер на сайте', unit: '1000 показов', price: 2500, description: 'Показы на партнёрских площадках' },
      { id: 'pi-11', categoryId: 'pc-digital', name: 'Таргетированная реклама в соцсетях', unit: 'месяц', price: 250000, description: 'Ведение и оптимизация кампаний' },
      { id: 'pi-12', categoryId: 'pc-digital', name: 'SEO-продвижение', unit: 'месяц', price: 300000, description: 'Продвижение сайта в поисковых системах' },
      { id: 'pi-13', categoryId: 'pc-press', name: 'Модуль 1/4 полосы', unit: 'публикация', price: 60000, description: 'Цветной модуль в еженедельном издании' },
      { id: 'pi-14', categoryId: 'pc-press', name: 'Модуль 1/2 полосы', unit: 'публикация', price: 110000, description: 'Цветной модуль в еженедельном издании' },
      { id: 'pi-15', categoryId: 'pc-press', name: 'Статья на правах рекламы', unit: 'публикация', price: 150000, description: 'Материал до 3000 знаков с фото' }
    ];

    const calculations = [
      {
        id: 'calc-1', clientId: 'cl-1', title: 'Осенняя кампания — ТВ и наружная реклама',
        items: [
          { priceItemId: 'pi-1', name: 'Ролик 15 сек, прайм-тайм', unit: 'выход', price: 45000, qty: 20, discount: 10 },
          { priceItemId: 'pi-7', name: 'Билборд 3x6', unit: 'месяц', price: 180000, qty: 3, discount: 5 },
          { priceItemId: 'pi-9', name: 'Реклама на транспорте', unit: 'месяц', price: 95000, qty: 2, discount: 0 }
        ],
        periodStart: '2026-10-01', periodEnd: '2026-12-31',
        vatRate: 12, status: 'accepted', createdAt: '2026-09-15'
      },
      {
        id: 'calc-2', clientId: 'cl-4', title: 'Радио и пресса — зимняя волна',
        items: [
          { priceItemId: 'pi-6', name: 'Спонсорство программы', unit: 'месяц', price: 350000, qty: 1, discount: 0 },
          { priceItemId: 'pi-13', name: 'Модуль 1/4 полосы', unit: 'публикация', price: 60000, qty: 4, discount: 8 }
        ],
        periodStart: '2026-11-01', periodEnd: '2027-01-31',
        vatRate: 12, status: 'sent', createdAt: '2026-09-20'
      },
      {
        id: 'calc-3', clientId: 'cl-3', title: 'Digital-продвижение нового салона',
        items: [
          { priceItemId: 'pi-11', name: 'Таргетированная реклама в соцсетях', unit: 'месяц', price: 250000, qty: 2, discount: 0 },
          { priceItemId: 'pi-10', name: 'Баннер на сайте', unit: '1000 показов', price: 2500, qty: 40, discount: 0 }
        ],
        periodStart: '2026-10-15', periodEnd: '2026-12-15',
        vatRate: 12, status: 'draft', createdAt: '2026-09-24'
      }
    ];

    const proposals = [
      {
        id: 'kp-1', calculationId: 'calc-1', clientId: 'cl-1', number: 'КП-2026-014',
        date: '2026-09-16', style: 'standard',
        introText: 'ТОО «Медиа Хаб» благодарит ТОО «Асыл Тағам» за интерес к нашим рекламным продуктам. Мы подготовили предложение по размещению рекламы в сегменте пищевой розницы, ориентированное на рост узнаваемости бренда в осенне-зимний период. Ниже представлен расчёт стоимости с учётом выбранных форматов — телевидение и наружная реклама — и предоставленной скидки.',
        conditions: 'Оплата производится в течение 5 (пяти) банковских дней с момента подписания настоящего коммерческого предложения. Возможна оплата двумя платежами: 50% предоплата, 50% по факту размещения.',
        validDays: 14, status: 'accepted', createdAt: '2026-09-16'
      }
    ];

    const contracts = [
      {
        id: 'ct-1', calculationId: 'calc-1', proposalId: 'kp-1', clientId: 'cl-1', number: 'ДГ-2026-009',
        date: '2026-09-18',
        subjectText: 'Исполнитель обязуется оказать Заказчику услуги по размещению рекламных материалов на телевидении и объектах наружной рекламы в соответствии со спецификацией (Приложение №1), а Заказчик обязуется принять и оплатить указанные услуги в порядке и на условиях, предусмотренных настоящим Договором.',
        termsText: 'Срок оказания услуг: с 01.10.2026 по 31.12.2026. Исполнитель уведомляет Заказчика о фактических датах выхода рекламных материалов не позднее чем за 2 (два) рабочих дня. Заказчик предоставляет рекламные макеты и материалы не позднее чем за 5 (пять) рабочих дней до даты размещения.',
        status: 'draft', createdAt: '2026-09-18'
      }
    ];

    const letters = [
      {
        id: 'lt-1', clientId: 'cl-1', calculationId: 'calc-1', proposalId: 'kp-1', type: 'cover',
        subject: 'Коммерческое предложение КП-2026-014 — ТОО «Медиа Хаб»',
        body: 'Здравствуйте, Данияр!\n\nНаправляем коммерческое предложение по размещению рекламы ТОО «Асыл Тағам» на телевидении и объектах наружной рекламы на период с 01.10.2026 по 31.12.2026.\n\nВ приложении — расчёт стоимости с учётом согласованной скидки. Предложение действительно в течение 14 дней с даты направления.\n\nБудем рады обсудить детали в удобное для вас время.\n\nС уважением,\nСатпаева Айгерим Ерлановна\nМенеджер по рекламе, ТОО «Медиа Хаб»',
        createdAt: '2026-09-16'
      }
    ];

    return { companySettings, clients, priceCategories, priceItems, calculations, proposals, contracts, letters };
  }

  return { getDefaultData };
})();
