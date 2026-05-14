(function () {
  const PALETTE = ['#5eead4', '#f97316', '#a78bfa', '#facc15', '#60a5fa', '#fb7185', '#84cc16', '#e879f9'];
  const MAX_UNDO = 50;

  let nodes = [];
  let edges = [];
  let undoStack = [];
  let paletteIndex = 0;
  let activeVaultPath = null;
  let settings = defaultSettings();

  function defaultSettings() {
    return {
      palette: {
        name: 'IdeaScape Default',
        colors: [...PALETTE],
        applyToExisting: false
      },
      background: {
        enabled: true,
        mode: 'universe',
        imagePath: null,
        opacity: 0.9,
        starDensity: 0.65,
        nebulaIntensity: 0.55,
        cometsEnabled: true,
        cometFrequency: 0.35,
        cometBrightness: 0.75
      },
      orbit: {
        enabled: true,
        idleSeconds: 12,
        strength: 0.018
      }
    };
  }

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function edgeEndpointId(endpoint) {
    return endpoint && typeof endpoint === 'object' ? endpoint.id : endpoint;
  }

  function cloneGraph() {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      settings: JSON.parse(JSON.stringify(settings)),
      nodes: nodes.map(node => ({ ...node })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edgeEndpointId(edge.source),
        target: edgeEndpointId(edge.target),
        locked: edge.locked,
        kind: edge.kind || 'association',
        style: edge.style || defaultEdgeStyle(edge.kind || 'association'),
        direction: edge.direction || defaultEdgeDirection(edge.kind || 'association')
      }))
    };
  }

  function snapshot() {
    undoStack.push(JSON.stringify(cloneGraph()));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function lockedNodeIds() {
    const ids = new Set();
    edges.filter(edge => edge.locked).forEach(edge => {
      ids.add(edgeEndpointId(edge.source));
      ids.add(edgeEndpointId(edge.target));
    });
    return ids;
  }

  function syncPins() {
    const locked = lockedNodeIds();
    nodes.forEach(node => {
      if (node.id === 'root') return;
      if (locked.has(node.id)) {
        node.fx = node.x ?? node.fx ?? 0;
        node.fy = node.y ?? node.fy ?? 0;
      } else {
        node.fx = null;
        node.fy = null;
      }
    });
  }

  function initRoot(width = window.innerWidth, height = window.innerHeight) {
    nodes = [{
      id: 'root',
      label: 'My Ideascape',
      x: width / 2,
      y: height / 2,
      fx: width / 2,
      fy: height / 2,
      color: '#a3e635',
      symbol: null,
      iconPath: null,
      pinnedLabel: true,
      notePath: 'notes/root.md',
      markdown: '# My Ideascape\n\n',
      collapsed: false
    }];
    edges = [];
    undoStack = [];
    paletteIndex = 0;
    settings = defaultSettings();
  }

  function loadGraph(graph) {
    nodes = graph.nodes.map(node => ({ collapsed: false, ...node }));
    edges = graph.edges.map(edge => normaliseEdge({ kind: 'association', ...edge }));
    settings = { ...defaultSettings(), ...(graph.settings || {}) };
    settings.palette = { ...defaultSettings().palette, ...(graph.settings?.palette || {}) };
    settings.background = { ...defaultSettings().background, ...(graph.settings?.background || {}) };
    settings.orbit = { ...defaultSettings().orbit, ...(graph.settings?.orbit || {}) };
    undoStack = [];
    syncPins();
  }

  function addNode({ label, x, y, color, markdown }) {
    snapshot();
    const node = {
      id: uuid(),
      label: label || 'Untitled',
      x: x ?? 0,
      y: y ?? 0,
      fx: null,
      fy: null,
      color: color || settings.palette.colors[paletteIndex++ % settings.palette.colors.length] || PALETTE[0],
      symbol: null,
      iconPath: null,
      pinnedLabel: false,
      notePath: null,
      markdown: markdown || `# ${label || 'Untitled'}\n\n`,
      collapsed: false
    };
    nodes.push(node);
    return node;
  }

  function removeNode(id) {
    if (id === 'root') return false;
    snapshot();
    nodes = nodes.filter(node => node.id !== id);
    edges = edges.filter(edge => edgeEndpointId(edge.source) !== id && edgeEndpointId(edge.target) !== id);
    syncPins();
    return true;
  }

  function updateNode(id, patch) {
    snapshot();
    const node = nodes.find(item => item.id === id);
    if (!node) return null;
    Object.assign(node, patch);
    return node;
  }

  function updateNodeContent(id, markdown) {
    const node = nodes.find(item => item.id === id);
    if (!node) return null;
    node.markdown = markdown;
    return node;
  }

  function defaultEdgeStyle(kind) {
    return kind === 'hierarchy' ? 'solid' : 'dashed';
  }

  function defaultEdgeDirection(kind) {
    return kind === 'hierarchy' ? 'forward' : 'none';
  }

  function normaliseEdge(edge) {
    const kind = edge.kind || 'association';
    return {
      ...edge,
      kind,
      style: edge.style || defaultEdgeStyle(kind),
      direction: edge.direction || defaultEdgeDirection(kind)
    };
  }

  function addEdge({ source, target, locked = false, kind = 'association', style, direction }) {
    const sourceId = edgeEndpointId(source);
    const targetId = edgeEndpointId(target);
    if (!sourceId || !targetId || sourceId === targetId) return null;
    const exists = edges.some(edge => {
      const a = edgeEndpointId(edge.source);
      const b = edgeEndpointId(edge.target);
      return (a === sourceId && b === targetId) || (a === targetId && b === sourceId);
    });
    if (exists) return null;
    snapshot();
    const edge = normaliseEdge({ id: uuid(), source: sourceId, target: targetId, locked, kind, style, direction });
    edges.push(edge);
    syncPins();
    return edge;
  }

  function removeEdge(id) {
    snapshot();
    edges = edges.filter(edge => edge.id !== id);
    syncPins();
  }

  function setEdgeLocked(id, locked) {
    snapshot();
    const edge = edges.find(item => item.id === id);
    if (!edge) return null;
    edge.locked = locked;
    syncPins();
    return edge;
  }

  function pinNode(id, x, y) {
    const node = nodes.find(item => item.id === id);
    if (!node) return;
    node.fx = x;
    node.fy = y;
  }

  function unpinNode(id) {
    if (id === 'root') return;
    const node = nodes.find(item => item.id === id);
    if (!node || lockedNodeIds().has(id)) return;
    node.fx = null;
    node.fy = null;
  }

  function undo() {
    if (undoStack.length === 0) return false;
    const previous = JSON.parse(undoStack.pop());
    nodes = previous.nodes.map(node => ({ collapsed: false, ...node }));
    edges = previous.edges.map(edge => normaliseEdge({ kind: 'association', ...edge }));
    settings = previous.settings || settings;
    return true;
  }

  function getNode(id) {
    return nodes.find(node => node.id === id);
  }

  function connectedNodes(id) {
    return edges
      .filter(edge => edgeEndpointId(edge.source) === id || edgeEndpointId(edge.target) === id)
      .map(edge => getNode(edgeEndpointId(edge.source) === id ? edgeEndpointId(edge.target) : edgeEndpointId(edge.source)))
      .filter(Boolean);
  }

  function hierarchyChildren(id) {
    return edges
      .filter(edge => (edge.kind || 'association') === 'hierarchy' && edgeEndpointId(edge.source) === id)
      .map(edge => getNode(edgeEndpointId(edge.target)))
      .filter(Boolean);
  }

  function hierarchyParent(id) {
    const edge = edges.find(item => (item.kind || 'association') === 'hierarchy' && edgeEndpointId(item.target) === id);
    return edge ? getNode(edgeEndpointId(edge.source)) : null;
  }

  function branchIds(rootId, includeRoot = true) {
    const ids = new Set(includeRoot ? [rootId] : []);
    const visit = id => {
      hierarchyChildren(id).forEach(child => {
        if (ids.has(child.id)) return;
        ids.add(child.id);
        visit(child.id);
      });
    };
    visit(rootId);
    return [...ids];
  }

  function visibleNodeIds() {
    const hidden = new Set();
    const visitHidden = id => {
      hierarchyChildren(id).forEach(child => {
        hidden.add(child.id);
        visitHidden(child.id);
      });
    };
    nodes.forEach(node => {
      if (node.collapsed) visitHidden(node.id);
    });
    return new Set(nodes.filter(node => !hidden.has(node.id)).map(node => node.id));
  }

  function toggleCollapsed(id) {
    snapshot();
    const node = getNode(id);
    if (!node) return null;
    node.collapsed = !node.collapsed;
    return node.collapsed;
  }

  function setEdgeKind(id, kind) {
    snapshot();
    const edge = edges.find(item => item.id === id);
    if (!edge) return null;
    edge.kind = kind;
    if (!edge.style) edge.style = defaultEdgeStyle(kind);
    if (!edge.direction || edge.direction === 'none' && kind === 'hierarchy') edge.direction = defaultEdgeDirection(kind);
    return edge;
  }

  function updateEdge(id, patch) {
    snapshot();
    const edge = edges.find(item => item.id === id);
    if (!edge) return null;
    Object.assign(edge, patch);
    return edge;
  }

  function removeBranch(id) {
    branchIds(id, true).reverse().forEach(nodeId => removeNode(nodeId));
  }

  function updateSettings(patch) {
    settings = {
      ...settings,
      ...patch,
      palette: { ...settings.palette, ...(patch.palette || {}) },
      background: { ...settings.background, ...(patch.background || {}) },
      orbit: { ...settings.orbit, ...(patch.orbit || {}) }
    };
    return settings;
  }

  function setPalette(name, colors, applyToExisting = false) {
    const validColors = colors.filter(color => /^#[0-9a-f]{6}$/i.test(color));
    if (validColors.length === 0) return null;
    settings.palette = { name, colors: validColors, applyToExisting };
    paletteIndex = 0;
    if (applyToExisting) {
      nodes.forEach((node, index) => {
        if (node.id !== 'root') node.color = validColors[index % validColors.length];
      });
    }
    return settings.palette;
  }

  function eligibleOrbitPairs() {
    const lockedIds = lockedNodeIds();
    return edges
      .filter(edge => !edge.locked)
      .map(edge => {
        const sourceId = edgeEndpointId(edge.source);
        const targetId = edgeEndpointId(edge.target);
        const sourceLocked = lockedIds.has(sourceId);
        const targetLocked = lockedIds.has(targetId);
        if (sourceLocked === targetLocked) return null;
        const parent = getNode(sourceLocked ? sourceId : targetId);
        const child = getNode(sourceLocked ? targetId : sourceId);
        if (!parent || !child || child.fx !== null || child.fy !== null || lockedIds.has(child.id)) return null;
        return { parent, child };
      })
      .filter(Boolean);
  }

  const api = {
    getNodes: () => nodes,
    getEdges: () => edges,
    initRoot,
    loadGraph,
    cloneGraph,
    addNode,
    removeNode,
    updateNode,
    updateNodeContent,
    addEdge,
    removeEdge,
    setEdgeLocked,
    pinNode,
    unpinNode,
    undo,
    getNode,
    connectedNodes,
    hierarchyChildren,
    hierarchyParent,
    branchIds,
    visibleNodeIds,
    toggleCollapsed,
    setEdgeKind,
    updateEdge,
    removeBranch,
    eligibleOrbitPairs,
    getSettings: () => settings,
    updateSettings,
    setPalette,
    edgeEndpointId,
    getVaultPath: () => activeVaultPath,
    setVaultPath: path => { activeVaultPath = path; }
  };

  if (typeof module !== 'undefined') module.exports = api;
  window.state = api;
}());
