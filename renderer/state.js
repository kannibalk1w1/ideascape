(function () {
  const PALETTE = ['#5eead4', '#f97316', '#a78bfa', '#facc15', '#60a5fa', '#fb7185', '#84cc16', '#e879f9'];
  const MAX_UNDO = 50;

  let nodes = [];
  let edges = [];
  let undoStack = [];
  let paletteIndex = 0;
  let activeVaultPath = null;

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
      nodes: nodes.map(node => ({ ...node })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edgeEndpointId(edge.source),
        target: edgeEndpointId(edge.target),
        locked: edge.locked
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
      markdown: '# My Ideascape\n\n'
    }];
    edges = [];
    undoStack = [];
    paletteIndex = 0;
  }

  function loadGraph(graph) {
    nodes = graph.nodes.map(node => ({ ...node }));
    edges = graph.edges.map(edge => ({ ...edge }));
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
      color: color || PALETTE[paletteIndex++ % PALETTE.length],
      symbol: null,
      iconPath: null,
      pinnedLabel: false,
      notePath: null,
      markdown: markdown || `# ${label || 'Untitled'}\n\n`
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

  function addEdge({ source, target, locked = false }) {
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
    const edge = { id: uuid(), source: sourceId, target: targetId, locked };
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
    nodes = previous.nodes;
    edges = previous.edges;
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
    edgeEndpointId,
    getVaultPath: () => activeVaultPath,
    setVaultPath: path => { activeVaultPath = path; }
  };

  if (typeof module !== 'undefined') module.exports = api;
  window.state = api;
}());
