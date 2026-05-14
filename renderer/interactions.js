(function () {
  let selectedIds = new Set();
  let focusedId = null;
  let idleTimer = null;
  let screensaverTimer = null;

  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('active');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('active'), 2600);
  }

  function clearSelection() {
    selectedIds.clear();
    focusedId = null;
    graph.render();
  }

  function setSelected(ids) {
    selectedIds = new Set(ids);
    graph.render();
  }

  function focusNode(id) {
    focusedId = id;
    selectedIds = new Set([id]);
    graph.render();
  }

  function showInlineInput(screenX, screenY, canvasX, canvasY, parentId = 'root', kind = 'hierarchy') {
    document.getElementById('node-inline-input')?.remove();
    const wrapper = document.createElement('div');
    wrapper.id = 'node-inline-input';
    wrapper.className = 'node-input-wrapper';
    wrapper.style.left = `${screenX - 80}px`;
    wrapper.style.top = `${screenY - 14}px`;
    const input = document.createElement('input');
    input.className = 'node-input';
    input.placeholder = 'Node name';
    wrapper.appendChild(input);
    document.body.appendChild(wrapper);
    input.focus();

    function confirm() {
      const label = input.value.trim();
      wrapper.remove();
      if (!label) return;
      const node = state.addNode({ label, x: canvasX, y: canvasY });
      state.addEdge({ source: parentId, target: node.id, kind });
      focusNode(node.id);
      graph.render();
      graph.pulseNode(node.id);
      search.update();
      mindmap.renderOutline();
    }

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') confirm();
      if (event.key === 'Escape') wrapper.remove();
      event.stopPropagation();
    });
  }

  function showNodeMenu(x, y, node) {
    const multi = selectedIds.size > 1 && selectedIds.has(node.id);
    if (multi) {
      const ids = [...selectedIds];
      menu.show({
        x,
        y,
        target: { ids },
        items: [
          { label: `Delete ${ids.length} nodes`, action: 'delete-selected', danger: true },
          'sep',
          { label: 'Lock connected edges', action: 'lock-selected-edges' },
          { label: 'Unlock connected edges', action: 'unlock-selected-edges' }
        ]
      });
      return;
    }

    focusNode(node.id);
    menu.show({
      x,
      y,
      target: node,
      items: [
        { label: 'Add connected node', action: 'add-child' },
        { label: 'Add sibling node', action: 'add-sibling' },
        { label: 'Open note', action: 'open-note' },
        { label: 'Edit label', action: 'edit-label' },
        { label: 'Change colour', action: 'change-colour' },
        { label: node.pinnedLabel ? 'Allow label hiding' : 'Always show label', action: 'toggle-label-pin' },
        'sep',
        { label: 'Use circle skin', action: 'skin-circle' },
        { label: 'Use planet skin', action: 'skin-planet' },
        { label: 'Randomize planet', action: 'skin-randomize' },
        { label: 'Import custom sprite', action: 'skin-custom' },
        'sep',
        { label: node.collapsed ? 'Expand branch' : 'Collapse branch', action: 'toggle-collapse' },
        { label: 'Select branch', action: 'select-branch' },
        { label: 'Arrange branch', action: 'arrange-branch' },
        { label: 'Arrange as radial map', action: 'arrange-radial' },
        'sep',
        { label: 'Delete branch', action: 'delete-branch', danger: true },
        { label: 'Delete', action: 'delete-node', danger: true }
      ]
    });
  }

  function showEdgeMenu(x, y, edge) {
    menu.show({
      x,
      y,
      target: edge,
      items: [
        { label: edge.locked ? 'Unlock connection' : 'Lock connection', action: edge.locked ? 'unlock-edge' : 'lock-edge' },
        { label: edge.kind === 'hierarchy' ? 'Make association link' : 'Make hierarchy link', action: edge.kind === 'hierarchy' ? 'make-association' : 'make-hierarchy' },
        'sep',
        { label: 'Style: Solid', action: 'edge-style-solid' },
        { label: 'Style: Dashed', action: 'edge-style-dashed' },
        { label: 'Style: Dotted', action: 'edge-style-dotted' },
        { label: 'Style: Thick', action: 'edge-style-thick' },
        { label: 'Style: Faint', action: 'edge-style-faint' },
        'sep',
        { label: 'Direction: None', action: 'edge-dir-none' },
        { label: 'Direction: To target', action: 'edge-dir-forward' },
        { label: 'Direction: To source', action: 'edge-dir-backward' },
        { label: 'Direction: Both ways', action: 'edge-dir-both' },
        'sep',
        { label: 'Delete connection', action: 'delete-edge', danger: true }
      ]
    });
  }

  function init() {
    resetActivityTimers();
    ['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(eventName => {
      window.addEventListener(eventName, resetActivityTimers, { passive: true });
    });
    document.getElementById('zoom-in').addEventListener('click', () =>
      graph.getSVG().transition().duration(180).call(graph.getZoom().scaleBy, 1.25));
    document.getElementById('zoom-out').addEventListener('click', () =>
      graph.getSVG().transition().duration(180).call(graph.getZoom().scaleBy, 1 / 1.25));
    document.getElementById('fit-view').addEventListener('click', graph.fitView);

    document.getElementById('new-vault').addEventListener('click', async () => {
      const result = await vaultClient.createVault();
      if (result) toast(`Vault ready: ${result.vaultPath}`);
    });
    document.getElementById('open-vault').addEventListener('click', async () => {
      const result = await vaultClient.openVault();
      if (result) {
        graph.render();
        search.update();
        toast(`Opened vault: ${result.vaultPath}`);
      }
    });
    document.getElementById('save-vault').addEventListener('click', async () => {
      const result = await vaultClient.saveVault();
      if (result) {
        graph.render();
        search.update();
        toast('Vault saved');
      }
    });

    document.getElementById('graph').addEventListener('contextmenu', event => {
      event.preventDefault();
      if (event.target.closest('.node') || event.target.closest('.hit-area')) return;
      const [x, y] = graph.screenToCanvas(event.clientX, event.clientY);
      menu.show({
        x: event.clientX,
        y: event.clientY,
        target: { x, y, screenX: event.clientX, screenY: event.clientY },
        items: [
          { label: 'Add node here', action: 'add-node-here' }
        ]
      });
    });

    document.getElementById('graph').addEventListener('dblclick', event => {
      if (event.target.closest('.node') || event.target.closest('.hit-area')) return;
      const [x, y] = graph.screenToCanvas(event.clientX, event.clientY);
      showInlineInput(event.clientX, event.clientY, x, y);
    });

    document.getElementById('nodes').addEventListener('click', event => {
      const nodeEl = event.target.closest('.node');
      if (!nodeEl) return;
      const id = nodeEl.dataset.id;
      if (event.shiftKey) {
        selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id);
        graph.render();
        return;
      }
      focusNode(id);
    });

    document.getElementById('nodes').addEventListener('dblclick', event => {
      const nodeEl = event.target.closest('.node');
      if (!nodeEl) return;
      const node = state.getNode(nodeEl.dataset.id);
      if (node) editor.open(node);
    });

    document.getElementById('nodes').addEventListener('contextmenu', event => {
      const nodeEl = event.target.closest('.node');
      if (!nodeEl) return;
      event.preventDefault();
      event.stopPropagation();
      const node = state.getNode(nodeEl.dataset.id);
      if (node) showNodeMenu(event.clientX, event.clientY, node);
    });

    document.getElementById('edges').addEventListener('contextmenu', event => {
      const edgeEl = event.target.closest('.hit-area');
      if (!edgeEl) return;
      event.preventDefault();
      event.stopPropagation();
      const edge = state.getEdges().find(item => item.id === edgeEl.dataset.id);
      if (edge) showEdgeMenu(event.clientX, event.clientY, edge);
    });

    wireSelectionBox();
    wireKeys();
    wireMenuActions();
  }

  function resetIdleTimer() {
    graph?.setIdle?.(false);
    clearTimeout(idleTimer);
    const seconds = state.getSettings().orbit.idleSeconds;
    idleTimer = setTimeout(() => {
      if (document.getElementById('editor-panel')?.classList.contains('hidden') === false) return;
      if (document.getElementById('search-results')?.classList.contains('active')) return;
      graph.setIdle(true);
    }, Math.max(3, seconds) * 1000);
  }

  function resetActivityTimers() {
    exitScreensaver();
    resetIdleTimer();
    resetScreensaverTimer();
  }

  function resetScreensaverTimer() {
    clearTimeout(screensaverTimer);
    const settings = state.getSettings().screensaver;
    if (!settings.enabled) return;
    screensaverTimer = setTimeout(() => {
      const editorOpen = document.getElementById('editor-panel')?.classList.contains('hidden') === false;
      const optionsOpen = document.getElementById('options-panel')?.classList.contains('hidden') === false;
      const menuOpen = document.getElementById('context-menu')?.style.display === 'block';
      if (editorOpen || optionsOpen || menuOpen) {
        resetScreensaverTimer();
        return;
      }
      document.body.classList.add('screensaver-mode');
      graph.setIdle(true);
    }, Math.max(30, Math.min(60, settings.idleSeconds)) * 1000);
  }

  function exitScreensaver() {
    if (!document.body.classList.contains('screensaver-mode')) return;
    document.body.classList.remove('screensaver-mode');
  }

  function wireSelectionBox() {
    const svg = document.getElementById('graph');
    let box = null;
    let start = null;

    svg.addEventListener('mousedown', event => {
      if (!event.shiftKey || event.target.closest('.node') || event.target.closest('.hit-area')) return;
      event.preventDefault();
      const [x, y] = graph.screenToCanvas(event.clientX, event.clientY);
      start = { x, y };
      box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      box.setAttribute('class', 'select-box');
      document.getElementById('selection-layer').appendChild(box);
    });

    window.addEventListener('mousemove', event => {
      if (!box || !start) return;
      const [x, y] = graph.screenToCanvas(event.clientX, event.clientY);
      box.setAttribute('x', Math.min(x, start.x));
      box.setAttribute('y', Math.min(y, start.y));
      box.setAttribute('width', Math.abs(x - start.x));
      box.setAttribute('height', Math.abs(y - start.y));
    });

    window.addEventListener('mouseup', event => {
      if (!box || !start) return;
      const [x, y] = graph.screenToCanvas(event.clientX, event.clientY);
      const x1 = Math.min(x, start.x);
      const x2 = Math.max(x, start.x);
      const y1 = Math.min(y, start.y);
      const y2 = Math.max(y, start.y);
      setSelected(state.getNodes().filter(node => node.x >= x1 && node.x <= x2 && node.y >= y1 && node.y <= y2).map(node => node.id));
      box.remove();
      box = null;
      start = null;
    });
  }

  function wireKeys() {
    document.addEventListener('keydown', event => {
      if (event.target.closest('.cm-editor') || event.target.tagName === 'INPUT') return;
      if (event.key === 'Escape') {
        clearSelection();
        menu.hide();
        document.getElementById('node-inline-input')?.remove();
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIds.size) {
        [...selectedIds].forEach(id => state.removeNode(id));
        clearSelection();
        graph.render();
        search.update();
      }
      const wantsUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z';
      const wantsRedo = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'));
      if (wantsUndo || wantsRedo) {
        event.preventDefault();
        if ((wantsRedo ? state.redo() : state.undo())) {
          clearSelection();
          graph.render();
          search.update();
          mindmap.renderOutline();
        }
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
        event.preventDefault();
        graph.getSVG().transition().duration(180).call(graph.getZoom().scaleBy, 1.25);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        graph.getSVG().transition().duration(180).call(graph.getZoom().scaleBy, 1 / 1.25);
      }
    });
  }

  function wireMenuActions() {
    document.addEventListener('menu-action', event => {
      const { action, target } = event.detail;
      if (action === 'add-node-here') {
        showInlineInput(target.screenX, target.screenY, target.x, target.y, 'root', 'hierarchy');
      }
      if (action === 'add-child') {
        showInlineInput(window.innerWidth / 2, window.innerHeight / 2, (target.x ?? 0) + 150, (target.y ?? 0) + 70, target.id, 'hierarchy');
      }
      if (action === 'add-sibling') {
        const parent = state.hierarchyParent(target.id) || state.getNode('root');
        showInlineInput(window.innerWidth / 2, window.innerHeight / 2, (target.x ?? 0), (target.y ?? 0) + 90, parent.id, 'hierarchy');
      }
      if (action === 'open-note') editor.open(target);
      if (action === 'edit-label') {
        const label = prompt('New label', target.label);
        if (label?.trim()) {
          state.updateNode(target.id, { label: label.trim() });
          graph.render();
          search.update();
          mindmap.renderOutline();
        }
      }
      if (action === 'change-colour') {
        const color = prompt('Hex colour', target.color);
        if (/^#[0-9a-f]{6}$/i.test(color || '')) {
          state.updateNode(target.id, { color });
          graph.render();
        }
      }
      if (action === 'toggle-label-pin') {
        state.updateNode(target.id, { pinnedLabel: !target.pinnedLabel });
        graph.render();
      }
      if (action === 'skin-circle') {
        state.setNodeSkin(target.id, { type: 'circle' });
        graph.render();
      }
      if (action === 'skin-planet' || action === 'skin-randomize') {
        state.setNodeSkin(target.id, state.randomPlanetSkin());
        skins.clearCache();
        graph.render();
      }
      if (action === 'skin-custom') {
        importCustomSkin(target).catch(error => toast(error.message));
      }
      if (action === 'toggle-collapse') {
        state.toggleCollapsed(target.id);
        graph.render();
        mindmap.renderOutline();
      }
      if (action === 'select-branch') {
        setSelected(state.branchIds(target.id, true));
      }
      if (action === 'arrange-branch') {
        graph.arrangeBranch(target.id, false);
      }
      if (action === 'arrange-radial') {
        graph.arrangeBranch(target.id, true);
      }
      if (action === 'delete-branch') {
        state.removeBranch(target.id);
        clearSelection();
        graph.render();
        search.update();
        mindmap.renderOutline();
      }
      if (action === 'delete-node') {
        state.removeNode(target.id);
        clearSelection();
        graph.render();
        search.update();
        mindmap.renderOutline();
      }
      if (action === 'lock-edge') {
        state.setEdgeLocked(target.id, true);
        graph.render();
      }
      if (action === 'unlock-edge') {
        state.setEdgeLocked(target.id, false);
        graph.render();
      }
      if (action === 'delete-edge') {
        state.removeEdge(target.id);
        graph.render();
        mindmap.renderOutline();
      }
      if (action === 'make-hierarchy' || action === 'make-association') {
        state.setEdgeKind(target.id, action === 'make-hierarchy' ? 'hierarchy' : 'association');
        graph.render();
        mindmap.renderOutline();
      }
      if (action.startsWith('edge-style-')) {
        state.updateEdge(target.id, { style: action.replace('edge-style-', '') });
        graph.render();
      }
      if (action.startsWith('edge-dir-')) {
        state.updateEdge(target.id, { direction: action.replace('edge-dir-', '') });
        graph.render();
      }
      if (action === 'delete-selected') {
        target.ids.forEach(id => state.removeNode(id));
        clearSelection();
        graph.render();
        search.update();
        mindmap.renderOutline();
      }
      if (action === 'lock-selected-edges' || action === 'unlock-selected-edges') {
        const lock = action === 'lock-selected-edges';
        state.getEdges()
          .filter(edge => target.ids.includes(state.edgeEndpointId(edge.source)) || target.ids.includes(state.edgeEndpointId(edge.target)))
          .forEach(edge => state.setEdgeLocked(edge.id, lock));
        graph.render();
      }
    });
  }

  async function importCustomSkin(node) {
    const { ipcRenderer } = require('electron');
    let vaultPath = state.getVaultPath();
    if (!vaultPath) {
      const result = await vaultClient.saveVault();
      vaultPath = result?.vaultPath;
    }
    if (!vaultPath) return;
    const sourcePath = await ipcRenderer.invoke('vault:chooseSkinAsset');
    if (!sourcePath) return;
    const relPath = await ipcRenderer.invoke('vault:importSkinAsset', { vaultPath, sourcePath });
    state.setNodeSkin(node.id, { type: 'custom', path: relPath });
    graph.render();
    toast('Custom node sprite imported');
  }

  window.interactions = {
    init,
    toast,
    focusNode,
    clearSelection,
    getSelectedIds: () => selectedIds,
    getFocusedId: () => focusedId,
    resetIdleTimer,
    resetActivityTimers
  };
}());
