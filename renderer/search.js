(function () {
  const input = () => document.getElementById('search-input');
  const results = () => document.getElementById('search-results');

  function score(query, label) {
    const q = query.toLowerCase();
    const l = label.toLowerCase();
    if (l === q) return 0;
    if (l.startsWith(q)) return 1;
    if (l.includes(q)) return 2 + l.indexOf(q) / 100;
    return 10 + levenshtein(q, l);
  }

  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[a.length][b.length];
  }

  function render() {
    const query = input().value.trim();
    const el = results();
    if (!query) {
      el.classList.remove('active');
      el.innerHTML = '';
      return;
    }

    const matches = state.getNodes()
      .map(node => ({ node, score: score(query, node.label) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 20);

    el.innerHTML = matches.map(({ node }) => {
      const connected = state.connectedNodes(node.id);
      return `
        <div class="search-result" data-id="${node.id}">
          <div class="search-title">${escapeHtml(node.label)}</div>
          <div class="search-meta">${connected.length} connection${connected.length === 1 ? '' : 's'}</div>
          <div class="connected-list">${connected.map(item => escapeHtml(item.label)).join(', ') || 'No direct connections'}</div>
        </div>`;
    }).join('');
    el.classList.add('active');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function init() {
    input().addEventListener('input', render);
    input().addEventListener('focus', render);
    results().addEventListener('click', event => {
      const item = event.target.closest('.search-result');
      if (!item) return;
      interactions.focusNode(item.dataset.id);
      graph.fitView();
    });
    document.addEventListener('mousedown', event => {
      if (event.target.closest('#search-panel')) return;
      results().classList.remove('active');
    });
  }

  window.search = { init, update: render };
}());
