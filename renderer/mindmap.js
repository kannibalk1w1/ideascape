(function () {
  function init() {
    renderOutline();
    document.getElementById('outline-panel').addEventListener('click', event => {
      const row = event.target.closest('.outline-row');
      if (!row) return;
      if (event.target.closest('.outline-toggle')) {
        state.toggleCollapsed(row.dataset.id);
        graph.render();
        renderOutline();
        return;
      }
      interactions.focusNode(row.dataset.id);
    });
  }

  function renderOutline() {
    const panel = document.getElementById('outline-panel');
    const rows = [];
    const walk = (node, depth) => {
      const children = state.hierarchyChildren(node.id);
      rows.push(`
        <div class="outline-row" data-id="${node.id}" style="padding-left:${8 + depth * 16}px">
          <span class="outline-toggle">${children.length ? (node.collapsed ? '+' : '-') : ''}</span>
          <span>${escapeHtml(node.label)}</span>
        </div>`);
      if (!node.collapsed) children.forEach(child => walk(child, depth + 1));
    };
    const root = state.getNode('root');
    if (root) walk(root, 0);
    panel.innerHTML = rows.join('');
    panel.classList.toggle('active', rows.length > 1);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  window.mindmap = { init, renderOutline };
}());
