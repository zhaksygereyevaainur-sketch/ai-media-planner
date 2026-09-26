// Общие утилиты приложения
window.APP = window.APP || {};

APP.utils = (function () {
  let counter = 0;

  function uid(prefix) {
    counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.floor(Math.random() * 1000)}`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function nl2br(str) {
    return escapeHtml(str).replace(/\n/g, '<br>');
  }

  function formatMoney(num, currency) {
    const n = Number(num) || 0;
    const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n));
    return `${formatted} ${currency || '₸'}`;
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(num) || 0);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU') + ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDaysISO(iso, days) {
    const d = iso ? new Date(iso) : new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickN(arr, n) {
    const copy = arr.slice();
    const result = [];
    while (copy.length && result.length < n) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // резервный способ копирования
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  return {
    uid, escapeHtml, nl2br, formatMoney, formatNumber, formatDate, formatDateTime,
    todayISO, addDaysISO, pick, pickN, downloadText, copyText, qs, qsa, debounce
  };
})();
