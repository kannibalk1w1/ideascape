(function () {
  let currentTarget = null;
  const menuEl = document.getElementById('context-menu');

  function show({ x, y, items, target }) {
    currentTarget = target;
    menuEl.innerHTML = items.map(item => {
      if (item === 'sep') return '<div class="menu-sep"></div>';
      return `<div class="menu-item${item.danger ? ' danger' : ''}" data-action="${item.action}">${item.label}</div>`;
    }).join('');
    menuEl.style.display = 'block';
    menuEl.style.left = `${x}px`;
    menuEl.style.top = `${y}px`;

    const rect = menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) menuEl.style.left = `${Math.max(8, x - rect.width)}px`;
    if (rect.bottom > window.innerHeight) menuEl.style.top = `${Math.max(8, y - rect.height)}px`;
  }

  function hide() {
    menuEl.style.display = 'none';
    currentTarget = null;
  }

  menuEl.addEventListener('click', event => {
    const item = event.target.closest('.menu-item');
    if (!item) return;
    document.dispatchEvent(new CustomEvent('menu-action', {
      detail: { action: item.dataset.action, target: currentTarget }
    }));
    hide();
  });

  document.addEventListener('click', event => {
    if (!menuEl.contains(event.target)) hide();
  });

  window.menu = { show, hide, getTarget: () => currentTarget };
}());
