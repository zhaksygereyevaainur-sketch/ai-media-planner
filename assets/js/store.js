// Хранилище состояния приложения (localStorage, без бэкенда)
window.APP = window.APP || {};

APP.store = (function () {
  const STORAGE_KEY = 'ai_media_planner_db_v1';
  const u = APP.utils;

  function loadDB() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.clients) return parsed;
      }
    } catch (e) {
      console.warn('Не удалось прочитать локальное хранилище, используем демо-данные', e);
    }
    const fresh = APP.data.getDefaultData();
    persist(fresh);
    return fresh;
  }

  function persist(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('Не удалось сохранить в локальное хранилище', e);
    }
  }

  let db = loadDB();

  function save() { persist(db); }

  function resetDemo() {
    db = APP.data.getDefaultData();
    save();
  }

  // ---- дженерик-хелперы коллекций ----
  function getAll(coll) { return db[coll] || []; }
  function getById(coll, id) { return getAll(coll).find(x => x.id === id) || null; }
  function upsert(coll, obj) {
    if (!obj.id) obj.id = u.uid(coll.slice(0, 2));
    const arr = db[coll];
    const idx = arr.findIndex(x => x.id === obj.id);
    if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], obj);
    else arr.push(obj);
    save();
    return obj.id;
  }
  function patch(coll, id, fields) {
    const obj = getById(coll, id);
    if (!obj) return null;
    Object.assign(obj, fields);
    save();
    return obj;
  }
  function remove(coll, id) {
    db[coll] = getAll(coll).filter(x => x.id !== id);
    save();
  }

  // ---- специфичные выборки ----
  function clientHistory(clientId) {
    return {
      calculations: getAll('calculations').filter(c => c.clientId === clientId),
      proposals: getAll('proposals').filter(p => p.clientId === clientId),
      contracts: getAll('contracts').filter(c => c.clientId === clientId),
      letters: getAll('letters').filter(l => l.clientId === clientId)
    };
  }

  function priceItemsByCategory(categoryId) {
    return getAll('priceItems').filter(i => i.categoryId === categoryId);
  }

  return {
    get db() { return db; },
    save, resetDemo,
    getAll, getById, upsert, patch, remove,
    clientHistory, priceItemsByCategory
  };
})();

// ---- логика расчёта сметы ----
APP.calc = (function () {
  function computeItem(item) {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    const lineSubtotal = qty * price;
    const lineDiscountAmount = lineSubtotal * (discount / 100);
    const lineAfterDiscount = lineSubtotal - lineDiscountAmount;
    return { lineSubtotal, lineDiscountAmount, lineAfterDiscount };
  }

  function computeTotals(calculation) {
    const items = calculation.items || [];
    let subtotal = 0, discountAmount = 0, afterDiscount = 0;
    items.forEach(item => {
      const c = computeItem(item);
      subtotal += c.lineSubtotal;
      discountAmount += c.lineDiscountAmount;
      afterDiscount += c.lineAfterDiscount;
    });
    const vatRate = Number(calculation.vatRate) || 0;
    const vatAmount = afterDiscount * (vatRate / 100);
    const total = afterDiscount + vatAmount;
    return { subtotal, discountAmount, afterDiscount, vatRate, vatAmount, total };
  }

  return { computeItem, computeTotals };
})();
