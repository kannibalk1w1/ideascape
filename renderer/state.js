(function () {
  const PALETTE = ['#5eead4', '#f97316', '#a78bfa', '#facc15', '#60a5fa', '#fb7185', '#84cc16', '#e879f9'];
  const MAX_UNDO = 50;

  let nodes = [];
  let edges = [];
  let undoStack = [];
  let redoStack = [];
  let timeline = [];
  let paletteIndex = 0;
  let activeVaultPath = null;
  let settings = defaultSettings();

  function defaultSettings() {
    return {
      palette: {
        activeId: 'default',
        name: 'IdeaScape Default',
        colors: [...PALETTE],
        applyToExisting: false,
        library: [{ id: 'default', name: 'IdeaScape Default', colors: [...PALETTE] }]
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
      },
      screensaver: {
        enabled: true,
        idleSeconds: 45
      },
      effects: {
        connectorKinetics: true,
        shipsEnabled: true,
        shipFrequency: 0.25
      },
      skins: {
        mode: 'circles',
        tintCustom: true,
        rings: 'rare',
        detail: 'medium',
        evolutionEnabled: false,
        evolutionThresholds: {
          planetoid: 0,
          rocky: 5,
          gasGiant: 15,
          star: 30,
          blackHole: 50
        }
      },
      themes: {
        activeId: 'default',
        library: builtInThemes()
      }
    };
  }

  function builtInThemes() {
    return [
      themeDefinition('default', 'IdeaScape Default', {
        palette: { name: 'IdeaScape Default', colors: [...PALETTE] },
        background: defaultBackgroundSettings(),
        effects: defaultEffectsSettings(),
        orbit: { enabled: true, idleSeconds: 12, strength: 0.018 },
        screensaver: { enabled: true, idleSeconds: 45 },
        skins: defaultSkinSettings()
      }),
      themeDefinition('deep-space', 'Deep Space', {
        palette: { name: 'Deep Space', colors: ['#67e8f9', '#818cf8', '#c084fc', '#f0abfc', '#22d3ee'] },
        background: { ...defaultBackgroundSettings(), starDensity: 0.9, nebulaIntensity: 0.75, opacity: 1 },
        effects: { connectorKinetics: true, shipsEnabled: true, shipFrequency: 0.35 },
        orbit: { enabled: true, idleSeconds: 8, strength: 0.02 },
        screensaver: { enabled: true, idleSeconds: 45 },
        skins: { ...defaultSkinSettings(), mode: 'planets', rings: 'rare' }
      }),
      themeDefinition('solar-drift', 'Solar Drift', {
        palette: { name: 'Solar Drift', colors: ['#facc15', '#fb923c', '#f97316', '#ef4444', '#fde68a'] },
        background: { ...defaultBackgroundSettings(), starDensity: 0.55, nebulaIntensity: 0.35, cometBrightness: 0.9 },
        effects: { connectorKinetics: true, shipsEnabled: true, shipFrequency: 0.2 },
        orbit: { enabled: true, idleSeconds: 10, strength: 0.016 },
        screensaver: { enabled: true, idleSeconds: 45 },
        skins: { ...defaultSkinSettings(), mode: 'mixed', rings: 'common' }
      }),
      themeDefinition('quiet-map', 'Quiet Map', {
        palette: { name: 'Quiet Map', colors: ['#e5e7eb', '#93c5fd', '#a7f3d0', '#fde68a', '#fca5a5'] },
        background: { ...defaultBackgroundSettings(), starDensity: 0.25, nebulaIntensity: 0.12, cometsEnabled: false, opacity: 0.55 },
        effects: { connectorKinetics: false, shipsEnabled: false, shipFrequency: 0 },
        orbit: { enabled: false, idleSeconds: 12, strength: 0.018 },
        screensaver: { enabled: false, idleSeconds: 45 },
        skins: { ...defaultSkinSettings(), mode: 'circles', rings: 'off' }
      })
    ];
  }

  function defaultBackgroundSettings() {
    return {
      enabled: true,
      mode: 'universe',
      imagePath: null,
      opacity: 0.9,
      starDensity: 0.65,
      nebulaIntensity: 0.55,
      cometsEnabled: true,
      cometFrequency: 0.35,
      cometBrightness: 0.75
    };
  }

  function defaultEffectsSettings() {
    return {
      connectorKinetics: true,
      shipsEnabled: true,
      shipFrequency: 0.25
    };
  }

  function defaultSkinSettings() {
    return {
      mode: 'circles',
      tintCustom: true,
      rings: 'rare',
      detail: 'medium',
      evolutionEnabled: false,
      evolutionThresholds: {
        planetoid: 0,
        rocky: 5,
        gasGiant: 15,
        star: 30,
        blackHole: 50
      }
    };
  }

  function themeDefinition(id, name, values) {
    return { id, name, builtIn: id !== 'default', ...values };
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
        direction: edge.direction || defaultEdgeDirection(edge.kind || 'association'),
        relation: edge.relation || null,
        label: edge.label || '',
        note: edge.note || ''
      })),
      timeline: timeline.map(event => ({ ...event }))
    };
  }

  function snapshot() {
    undoStack.push(JSON.stringify(cloneGraph()));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
  }

  function mergeSettings(loaded) {
    const defaults = defaultSettings();
    const merged = { ...defaults, ...loaded };
    merged.palette = { ...defaults.palette, ...(loaded.palette || {}) };
    merged.palette.library = loaded.palette?.library || defaults.palette.library;
    merged.background = { ...defaults.background, ...(loaded.background || {}) };
    merged.orbit = { ...defaults.orbit, ...(loaded.orbit || {}) };
    merged.screensaver = { ...defaults.screensaver, ...(loaded.screensaver || {}) };
    merged.effects = { ...defaults.effects, ...(loaded.effects || {}) };
    merged.skins = { ...defaults.skins, ...(loaded.skins || {}) };
    merged.skins.evolutionThresholds = { ...defaults.skins.evolutionThresholds, ...(loaded.skins?.evolutionThresholds || {}) };
    merged.themes = { ...defaults.themes, ...(loaded.themes || {}) };
    merged.themes.library = mergeThemeLibrary(defaults.themes.library, loaded.themes?.library || []);
    return merged;
  }

  function mergeThemeLibrary(defaults, loaded) {
    const byId = new Map(defaults.map(theme => [theme.id, theme]));
    loaded.forEach(theme => byId.set(theme.id, { ...theme }));
    return [...byId.values()];
  }

  function restoreGraph(graph) {
    nodes = graph.nodes.map(node => ({ collapsed: false, skin: { type: 'circle' }, ...node }));
    edges = graph.edges.map(edge => normaliseEdge({ kind: 'association', ...edge }));
    settings = mergeSettings(graph.settings || {});
    timeline = normaliseTimeline(graph.timeline);
    syncPins();
  }

  function normaliseTimeline(loaded) {
    if (Array.isArray(loaded) && loaded.length) return loaded.map(event => ({ ...event }));
    return [
      ...nodes.map(node => ({
        id: `timeline-${node.id}`,
        type: 'node',
        nodeId: node.id,
        label: node.label,
        at: node.createdAt || null
      })),
      ...edges.map(edge => ({
        id: `timeline-${edge.id}`,
        type: 'edge',
        edgeId: edge.id,
        source: edgeEndpointId(edge.source),
        target: edgeEndpointId(edge.target),
        at: edge.createdAt || null
      }))
    ];
  }

  function recordTimeline(event) {
    timeline.push({
      id: uuid(),
      at: new Date().toISOString(),
      ...event
    });
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
      collapsed: false,
      skin: { type: 'circle' }
    }];
    edges = [];
    undoStack = [];
    redoStack = [];
    timeline = [{
      id: 'timeline-root',
      type: 'node',
      nodeId: 'root',
      label: 'My Ideascape',
      at: new Date().toISOString()
    }];
    paletteIndex = 0;
    settings = defaultSettings();
  }

  function loadSampleGraph(width = window.innerWidth, height = window.innerHeight) {
    initRoot(width, height);
    updateSettings({
      skins: { mode: 'planets', evolutionEnabled: true },
      effects: { connectorKinetics: true, shipsEnabled: true },
      orbit: { enabled: true, idleSeconds: 8 }
    });
    undoStack = [];
    redoStack = [];
    const root = getNode('root');
    const ideas = addNode({ label: 'Game Prototype', x: root.x - 230, y: root.y - 90 });
    const art = addNode({ label: 'Visual Atmosphere', x: root.x + 230, y: root.y - 90 });
    const notes = addNode({ label: 'Research Notes', x: root.x - 80, y: root.y + 170 });
    const exports = addNode({ label: 'Shareable Replay', x: root.x + 220, y: root.y + 140 });
    addEdge({ source: 'root', target: ideas.id, kind: 'hierarchy', locked: true });
    addEdge({ source: 'root', target: art.id, kind: 'hierarchy' });
    addEdge({ source: 'root', target: notes.id, kind: 'hierarchy' });
    addEdge({ source: ideas.id, target: exports.id, kind: 'hierarchy', style: 'thick' });
    addEdge({ source: art.id, target: exports.id, kind: 'association', style: 'dotted', direction: 'forward' });
    ['Loop', 'Controls', 'Feedback'].forEach((label, index) => {
      const child = addNode({ label, x: ideas.x - 70 + index * 70, y: ideas.y - 130 });
      addEdge({ source: ideas.id, target: child.id, kind: 'hierarchy' });
    });
    ['Palette', 'Planets', 'Comets'].forEach((label, index) => {
      const child = addNode({ label, x: art.x - 70 + index * 70, y: art.y - 130 });
      addEdge({ source: art.id, target: child.id, kind: 'hierarchy' });
    });
    undoStack = [];
    redoStack = [];
    syncPins();
  }

  function loadGraph(graph) {
    restoreGraph(graph);
    undoStack = [];
    redoStack = [];
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
      collapsed: false,
      skin: defaultNodeSkin()
    };
    nodes.push(node);
    recordTimeline({ type: 'node', nodeId: node.id, label: node.label });
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
      direction: edge.direction || defaultEdgeDirection(kind),
      relation: edge.relation || null,
      label: edge.label || '',
      note: edge.note || ''
    };
  }

  function addEdge({ source, target, locked = false, kind = 'association', style, direction, relation = null, label = '', note = '' }) {
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
    const edge = normaliseEdge({ id: uuid(), source: sourceId, target: targetId, locked, kind, style, direction, relation, label, note });
    edges.push(edge);
    recordTimeline({ type: 'edge', edgeId: edge.id, source: sourceId, target: targetId });
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
    redoStack.push(JSON.stringify(cloneGraph()));
    restoreGraph(previous);
    return true;
  }

  function redo() {
    if (redoStack.length === 0) return false;
    undoStack.push(JSON.stringify(cloneGraph()));
    const next = JSON.parse(redoStack.pop());
    restoreGraph(next);
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

  function relationPresets() {
    return {
      related: { relation: 'related', label: 'related', kind: 'association', style: 'dashed', direction: 'none' },
      parent: { relation: 'parent', label: 'parent', kind: 'hierarchy', style: 'solid', direction: 'forward' },
      dependsOn: { relation: 'dependsOn', label: 'depends on', kind: 'association', style: 'dashed', direction: 'forward' },
      blocks: { relation: 'blocks', label: 'blocks', kind: 'association', style: 'thick', direction: 'forward' },
      supports: { relation: 'supports', label: 'supports', kind: 'association', style: 'solid', direction: 'forward' },
      inspires: { relation: 'inspires', label: 'inspires', kind: 'association', style: 'dotted', direction: 'forward' }
    };
  }

  function applyRelationPreset(id, presetId) {
    const preset = relationPresets()[presetId];
    if (!preset) return null;
    return updateEdge(id, preset);
  }

  function removeBranch(id) {
    branchIds(id, true).reverse().forEach(nodeId => removeNode(nodeId));
  }

  function updateSettings(patch) {
    snapshot();
    settings = {
      ...settings,
      ...patch,
      palette: { ...settings.palette, ...(patch.palette || {}) },
      background: { ...settings.background, ...(patch.background || {}) },
      orbit: { ...settings.orbit, ...(patch.orbit || {}) },
      screensaver: { ...settings.screensaver, ...(patch.screensaver || {}) },
      effects: { ...settings.effects, ...(patch.effects || {}) },
      skins: {
        ...settings.skins,
        ...(patch.skins || {}),
        evolutionThresholds: { ...settings.skins.evolutionThresholds, ...(patch.skins?.evolutionThresholds || {}) }
      }
    };
    return settings;
  }

  function setPalette(name, colors, applyToExisting = false, activeId = null) {
    const validColors = colors.filter(color => /^#[0-9a-f]{6}$/i.test(color));
    if (validColors.length === 0) return null;
    snapshot();
    settings.palette = { ...settings.palette, activeId, name, colors: validColors, applyToExisting };
    paletteIndex = 0;
    if (applyToExisting) {
      nodes.forEach((node, index) => {
        if (node.id !== 'root') node.color = validColors[index % validColors.length];
      });
    }
    return settings.palette;
  }

  function savePalette(name, colors) {
    const validColors = colors.filter(color => /^#[0-9a-f]{6}$/i.test(color));
    if (!name || validColors.length === 0) return null;
    snapshot();
    const id = `palette-${uuid()}`;
    const saved = { id, name, colors: validColors };
    settings.palette.library = [...settings.palette.library.filter(item => item.name !== name), saved];
    settings.palette.activeId = id;
    settings.palette.name = name;
    settings.palette.colors = validColors;
    paletteIndex = 0;
    return saved;
  }

  function useSavedPalette(id, applyToExisting = false) {
    const saved = settings.palette.library.find(item => item.id === id);
    if (!saved) return null;
    return setPalette(saved.name, saved.colors, applyToExisting, id);
  }

  function deleteSavedPalette(id) {
    if (id === 'default') return false;
    snapshot();
    settings.palette.library = settings.palette.library.filter(item => item.id !== id);
    if (settings.palette.activeId === id) {
      const fallback = settings.palette.library[0] || defaultSettings().palette.library[0];
      settings.palette.activeId = fallback.id;
      settings.palette.name = fallback.name;
      settings.palette.colors = fallback.colors;
    }
    return true;
  }

  function captureCurrentTheme(id, name, builtIn = false) {
    return {
      id,
      name,
      builtIn,
      palette: {
        name: settings.palette.name,
        colors: [...settings.palette.colors]
      },
      background: JSON.parse(JSON.stringify(settings.background)),
      effects: JSON.parse(JSON.stringify(settings.effects)),
      orbit: JSON.parse(JSON.stringify(settings.orbit)),
      screensaver: JSON.parse(JSON.stringify(settings.screensaver)),
      skins: JSON.parse(JSON.stringify(settings.skins))
    };
  }

  function saveTheme(name) {
    if (!name?.trim()) return null;
    snapshot();
    const id = `theme-${uuid()}`;
    const theme = captureCurrentTheme(id, name.trim());
    settings.themes.library = [...settings.themes.library.filter(item => item.name !== theme.name), theme];
    settings.themes.activeId = id;
    return theme;
  }

  function applyTheme(id) {
    const theme = settings.themes.library.find(item => item.id === id);
    if (!theme) return null;
    snapshot();
    settings.palette = {
      ...settings.palette,
      activeId: null,
      name: theme.palette.name,
      colors: [...theme.palette.colors],
      applyToExisting: false
    };
    settings.background = { ...settings.background, ...theme.background };
    settings.effects = { ...settings.effects, ...theme.effects };
    settings.orbit = { ...settings.orbit, ...theme.orbit };
    settings.screensaver = { ...settings.screensaver, ...theme.screensaver };
    settings.skins = {
      ...settings.skins,
      ...theme.skins,
      evolutionThresholds: { ...settings.skins.evolutionThresholds, ...(theme.skins?.evolutionThresholds || {}) }
    };
    settings.themes.activeId = id;
    paletteIndex = 0;
    return theme;
  }

  function deleteTheme(id) {
    const theme = settings.themes.library.find(item => item.id === id);
    if (!theme || theme.builtIn || id === 'default') return false;
    snapshot();
    settings.themes.library = settings.themes.library.filter(item => item.id !== id);
    if (settings.themes.activeId === id) settings.themes.activeId = 'default';
    return true;
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

  function defaultNodeSkin() {
    if (settings.skins.mode === 'planets' || settings.skins.mode === 'mixed') {
      return randomPlanetSkin();
    }
    return { type: 'circle' };
  }

  function randomPlanetSkin() {
    const variants = ['cratered', 'rocky', 'ringed', 'icy', 'marble', 'asteroid'];
    return {
      type: 'planet',
      variant: variants[Math.floor(Math.random() * variants.length)],
      seed: Math.floor(Math.random() * 1000000)
    };
  }

  function descendantCount(id) {
    return branchIds(id, false).length;
  }

  function evolvedVariant(id) {
    const count = descendantCount(id);
    const thresholds = settings.skins.evolutionThresholds;
    if (count >= thresholds.blackHole) return 'blackHole';
    if (count >= thresholds.star) return 'star';
    if (count >= thresholds.gasGiant) return 'gasGiant';
    if (count >= thresholds.rocky) return 'rocky';
    return 'planetoid';
  }

  function replaySteps() {
    const nodeIds = new Set();
    const edgeIds = new Set();
    return timeline.map((event, index) => {
      if (event.type === 'node' && getNode(event.nodeId)) nodeIds.add(event.nodeId);
      if (event.type === 'edge' && edges.some(edge => edge.id === event.edgeId)) edgeIds.add(event.edgeId);
      const label = event.type === 'node'
        ? `Added ${getNode(event.nodeId)?.label || event.label || 'node'}`
        : `Connected ${getNode(event.source)?.label || 'node'} to ${getNode(event.target)?.label || 'node'}`;
      return {
        index,
        label,
        event: { ...event },
        nodeIds: new Set(nodeIds),
        edgeIds: new Set(edgeIds)
      };
    });
  }

  function sampledReplaySteps(maxFrames = 80) {
    const steps = replaySteps();
    if (steps.length <= maxFrames) return steps;
    const last = steps.length - 1;
    const sampled = [];
    for (let index = 0; index < maxFrames; index += 1) {
      sampled.push(steps[Math.round(index * last / (maxFrames - 1))]);
    }
    return sampled.filter((step, index) => index === 0 || step.index !== sampled[index - 1].index);
  }

  function setNodeSkin(id, skin) {
    return updateNode(id, { skin });
  }

  const api = {
    getNodes: () => nodes,
    getEdges: () => edges,
    initRoot,
    loadSampleGraph,
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
    redo,
    getNode,
    connectedNodes,
    hierarchyChildren,
    hierarchyParent,
    branchIds,
    visibleNodeIds,
    toggleCollapsed,
    setEdgeKind,
    updateEdge,
    applyRelationPreset,
    relationPresets,
    removeBranch,
    eligibleOrbitPairs,
    getSettings: () => settings,
    updateSettings,
    setPalette,
    savePalette,
    useSavedPalette,
    deleteSavedPalette,
    saveTheme,
    applyTheme,
    deleteTheme,
    randomPlanetSkin,
    setNodeSkin,
    descendantCount,
    evolvedVariant,
    replaySteps,
    sampledReplaySteps,
    edgeEndpointId,
    getVaultPath: () => activeVaultPath,
    setVaultPath: path => { activeVaultPath = path; }
  };

  if (typeof module !== 'undefined') module.exports = api;
  window.state = api;
}());
