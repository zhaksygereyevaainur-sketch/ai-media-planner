(function () {
  window.addEventListener('hashchange', APP.router.render);
  window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.hash = '#/';
    APP.router.render();
  });

  function closeMobileNav() {
    document.getElementById('app').classList.remove('sidebar-open');
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#mobile-menu-btn')) {
      document.getElementById('app').classList.toggle('sidebar-open');
      return;
    }
    if (e.target.closest('#sidebar-backdrop')) {
      closeMobileNav();
      return;
    }
    if (e.target.closest('.sidebar-nav a, .sidebar-footer a')) {
      closeMobileNav();
    }
  });

  window.addEventListener('hashchange', closeMobileNav);
})();
