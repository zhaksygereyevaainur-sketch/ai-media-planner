// Генерация связного текста (имитация ИИ) с резервными шаблонами.
// Работает полностью локально: если бы реальная генерация была недоступна,
// пользователь всё равно получает корректный текст (см. п.8 ТЗ).
window.APP = window.APP || {};

APP.templates = (function () {
  const u = APP.utils;

  function categoryNamesForCalc(calc) {
    const items = APP.store.getAll('priceItems');
    const cats = APP.store.getAll('priceCategories');
    const usedCatIds = new Set();
    (calc.items || []).forEach(li => {
      const pi = items.find(i => i.id === li.priceItemId);
      if (pi) usedCatIds.add(pi.categoryId);
    });
    return cats.filter(c => usedCatIds.has(c.id)).map(c => c.name);
  }

  function periodText(calc) {
    return `с ${u.formatDate(calc.periodStart)} по ${u.formatDate(calc.periodEnd)}`;
  }

  // ---------- Коммерческое предложение ----------
  function generateProposalIntro(client, calc, style) {
    const totals = APP.calc.computeTotals(calc);
    const cats = categoryNamesForCalc(calc).join(', ') || 'выбранные рекламные форматы';
    const company = APP.store.db.companySettings.name;

    const openersShort = [
      `${company} направляет коммерческое предложение для ${client.name}.`,
      `Коммерческое предложение для ${client.name} от ${company}.`
    ];
    const openersStandard = [
      `${company} благодарит ${client.name} за интерес к нашим рекламным продуктам и направляет коммерческое предложение по размещению рекламы.`,
      `Благодарим ${client.name} за обращение в ${company}. Подготовили предложение по размещению рекламы с учётом специфики вашего бизнеса — ${client.industry || 'вашей отрасли'}.`
    ];
    const openersPremium = [
      `${company} рад(а) представить ${client.name} комплексное рекламное решение, разработанное с учётом целей вашего бренда в сегменте «${client.industry || 'вашей отрасли'}» и текущей рыночной ситуации.`,
      `Команда ${company} подготовила для ${client.name} индивидуальное коммерческое предложение, объединяющее наиболее эффективные каналы продвижения для достижения максимального охвата целевой аудитории.`
    ];

    const body = [
      `Предложение охватывает следующие форматы: ${cats}. Период размещения — ${periodText(calc)}.`,
      `Общая стоимость размещения с учётом предоставленной скидки составляет ${u.formatMoney(totals.total, APP.store.db.companySettings.currency)} (с учётом НДС ${totals.vatRate}%).`
    ];

    let opener;
    if (style === 'short') opener = u.pick(openersShort);
    else if (style === 'premium') opener = u.pick(openersPremium);
    else opener = u.pick(openersStandard);

    if (style === 'short') {
      return `${opener} ${body[0]} Итоговая сумма: ${u.formatMoney(totals.total, APP.store.db.companySettings.currency)}.`;
    }
    if (style === 'premium') {
      return `${opener}\n\n${body[0]} ${body[1]} Мы уверены, что предложенное сочетание каналов обеспечит устойчивый рост узнаваемости бренда и позволит эффективно донести ваше сообщение до целевой аудитории.`;
    }
    return `${opener}\n\n${body.join(' ')}`;
  }

  function generateProposalConditions(calc, style) {
    const variants = [
      'Оплата производится в течение 5 (пяти) банковских дней с момента подписания настоящего коммерческого предложения. Возможна оплата двумя платежами: 50% предоплата, 50% по факту размещения.',
      'Оплата производится в размере 100% предоплаты в течение 3 (трёх) банковских дней с момента согласования предложения.',
      'Оплата производится в течение 5 (пяти) банковских дней после подписания. По согласованию сторон возможна рассрочка на весь период размещения равными платежами.'
    ];
    return u.pick(variants);
  }

  // ---------- Договор (черновик) ----------
  const CONTRACT_FIXED = {
    rightsAndDuties: `1. Исполнитель обязуется:
— обеспечить размещение рекламных материалов Заказчика в объёме и в сроки, указанные в Приложении №1 к настоящему Договору;
— своевременно информировать Заказчика об изменениях, влияющих на сроки или условия размещения;
— предоставлять Заказчику по запросу подтверждающие материалы о факте размещения (эфирные справки, фотоотчёты).

2. Заказчик обязуется:
— предоставить рекламные макеты и материалы надлежащего качества в сроки, согласованные сторонами;
— своевременно производить оплату оказанных услуг в порядке, предусмотренном настоящим Договором;
— обеспечить соответствие предоставленных материалов требованиям законодательства Республики Казахстан о рекламе.`,
    forceMajeure: `Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств по настоящему Договору, если оно явилось следствием обстоятельств непреодолимой силы (форс-мажор), возникших после заключения Договора, которые стороны не могли предвидеть или предотвратить. При наступлении таких обстоятельств срок исполнения обязательств по Договору отодвигается соразмерно времени действия таких обстоятельств.`
  };

  function generateContractSubject(client, calc) {
    const cats = categoryNamesForCalc(calc).join(', ') || 'рекламные форматы';
    const variants = [
      `Исполнитель обязуется оказать Заказчику услуги по размещению рекламных материалов (${cats}) в соответствии со спецификацией (Приложение №1), а Заказчик обязуется принять и оплатить указанные услуги в порядке и на условиях, предусмотренных настоящим Договором.`,
      `По настоящему Договору Исполнитель обязуется оказать, а Заказчик — принять и оплатить услуги по размещению рекламных материалов Заказчика с использованием следующих каналов: ${cats}, в объёме и сроки согласно Приложению №1 (Спецификация).`
    ];
    return u.pick(variants);
  }

  function generateContractTerms(calc) {
    const variants = [
      `Срок оказания услуг: ${periodText(calc)}. Исполнитель уведомляет Заказчика о фактических датах выхода рекламных материалов не позднее чем за 2 (два) рабочих дня. Заказчик предоставляет рекламные макеты и материалы не позднее чем за 5 (пять) рабочих дней до даты размещения.`,
      `Услуги оказываются в период ${periodText(calc)}. Стороны согласовывают точный график размещения дополнительно, но не позднее 3 (трёх) рабочих дней до начала соответствующего периода. Материалы для размещения предоставляются Заказчиком заблаговременно, не менее чем за 5 (пять) рабочих дней.`
    ];
    return u.pick(variants);
  }

  // ---------- Деловые письма ----------
  function generateLetter(type, client, ctx, wishes) {
    const nameParts = client.contactPerson ? client.contactPerson.trim().split(/\s+/) : [];
    const contact = nameParts.length ? nameParts[nameParts.length - 1] : 'коллеги';
    const company = APP.store.db.companySettings.name;
    const manager = APP.store.db.companySettings.managerName;
    const managerPos = APP.store.db.companySettings.managerPosition;
    const signature = `С уважением,\n${manager}\n${managerPos}, ${company}`;
    let subject = '', body = '';

    if (type === 'cover') {
      const kpNumber = ctx.proposal ? ctx.proposal.number : null;
      const period = ctx.calc ? periodText(ctx.calc) : '';
      subject = kpNumber ? `Коммерческое предложение ${kpNumber} — ${company}` : `Коммерческое предложение — ${company}`;
      body = `Здравствуйте, ${contact}!\n\n` +
        `Направляем коммерческое предложение по размещению рекламы ${client.name}${period ? ' на период ' + period : ''}.\n\n` +
        `В приложении — расчёт стоимости с учётом согласованных условий${ctx.proposal ? '. Предложение действительно в течение ' + (ctx.proposal.validDays || 14) + ' дней с даты направления' : ''}.\n\n` +
        `Будем рады обсудить детали в удобное для вас время.\n\n${signature}`;
    } else if (type === 'reminder') {
      subject = `Напоминание по коммерческому предложению — ${company}`;
      body = `Здравствуйте, ${contact}!\n\n` +
        `Напоминаем, что ранее направленное коммерческое предложение${ctx.proposal ? ' ' + ctx.proposal.number : ''} ожидает вашего решения. ` +
        `Будем признательны за обратную связь в ближайшее время, чтобы мы могли зарезервировать выбранные рекламные форматы на нужный период.\n\n` +
        `Готовы ответить на любые вопросы и при необходимости скорректировать условия.\n\n${signature}`;
    } else if (type === 'thanks') {
      subject = `Благодарим за сотрудничество — ${company}`;
      body = `Здравствуйте, ${contact}!\n\n` +
        `Благодарим ${client.name} за доверие и продуктивное сотрудничество. Нам важно, что вы выбираете ${company} для решения ваших рекламных задач.\n\n` +
        `Будем рады продолжить работу и обсудить новые возможности продвижения вашего бренда.\n\n${signature}`;
    } else if (type === 'details') {
      subject = `Уточнение деталей размещения — ${company}`;
      body = `Здравствуйте, ${contact}!\n\n` +
        `Для подготовки точного расчёта просим уточнить несколько деталей: желаемые сроки размещения, приоритетные форматы и ориентировочный бюджет кампании.\n\n` +
        `Это поможет нам предложить оптимальный набор рекламных решений под ваши задачи.\n\n${signature}`;
    } else {
      subject = `Письмо клиенту — ${company}`;
      body = `Здравствуйте, ${contact}!\n\n${signature}`;
    }

    if (wishes && wishes.trim()) {
      body = body.replace(signature, `${wishes.trim()}\n\n${signature}`);
    }

    return { subject, body };
  }

  return {
    generateProposalIntro, generateProposalConditions,
    generateContractSubject, generateContractTerms, CONTRACT_FIXED,
    generateLetter
  };
})();
