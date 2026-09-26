(function () {
  window.addEventListener('hashchange', APP.router.render);
  window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.hash = '#/';
    APP.router.render();
  });
})();
