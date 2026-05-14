let idCounter = 0;

global.window = {};
global.crypto = { randomUUID: () => `uuid-${++idCounter}` };

const state = require('../renderer/state');

beforeEach(() => {
  idCounter = 0;
  state.initRoot(800, 600);
});

test('initRoot creates a pinned centre node', () => {
  expect(state.getNodes()).toHaveLength(1);
  expect(state.getNode('root')).toMatchObject({
    label: 'My Ideascape',
    fx: 400,
    fy: 300
  });
});

test('loadSampleGraph creates a replayable tester graph with planets enabled', () => {
  state.loadSampleGraph(1000, 700);
  expect(state.getNodes().length).toBeGreaterThan(8);
  expect(state.getEdges().length).toBeGreaterThan(8);
  expect(state.getSettings().skins.mode).toBe('planets');
  expect(state.getSettings().skins.evolutionEnabled).toBe(true);
  expect(state.replaySteps().length).toBeGreaterThan(10);
  expect(state.getEdges().some(edge => edge.locked)).toBe(true);
});

test('addNode creates a floating node with markdown', () => {
  const node = state.addNode({ label: 'Game Loop', x: 10, y: 20 });
  expect(node.label).toBe('Game Loop');
  expect(node.fx).toBeNull();
  expect(node.markdown).toContain('# Game Loop');
});

test('addEdge prevents duplicate undirected edges', () => {
  const node = state.addNode({ label: 'A', x: 0, y: 0 });
  expect(state.addEdge({ source: 'root', target: node.id })).toBeTruthy();
  expect(state.addEdge({ source: node.id, target: 'root' })).toBeNull();
  expect(state.getEdges()).toHaveLength(1);
});

test('addEdge applies connector defaults by edge kind', () => {
  const child = state.addNode({ label: 'Child', x: 0, y: 0 });
  const association = state.addEdge({ source: 'root', target: child.id });
  expect(association.style).toBe('dashed');
  expect(association.direction).toBe('none');

  const next = state.addNode({ label: 'Next', x: 0, y: 0 });
  const hierarchy = state.addEdge({ source: child.id, target: next.id, kind: 'hierarchy' });
  expect(hierarchy.style).toBe('solid');
  expect(hierarchy.direction).toBe('forward');
});

test('updateEdge changes connector style and direction', () => {
  const child = state.addNode({ label: 'Child', x: 0, y: 0 });
  const edge = state.addEdge({ source: 'root', target: child.id });
  state.updateEdge(edge.id, { style: 'dotted', direction: 'both' });
  expect(state.getEdges()[0]).toMatchObject({ style: 'dotted', direction: 'both' });
});

test('locking an edge pins both endpoints', () => {
  const node = state.addNode({ label: 'A', x: 50, y: 80 });
  const edge = state.addEdge({ source: 'root', target: node.id });
  state.setEdgeLocked(edge.id, true);
  expect(state.getNode(node.id).fx).toBe(50);
  expect(state.getNode(node.id).fy).toBe(80);
});

test('unlocking the last locked edge releases floating nodes', () => {
  const node = state.addNode({ label: 'A', x: 50, y: 80 });
  const edge = state.addEdge({ source: 'root', target: node.id });
  state.setEdgeLocked(edge.id, true);
  state.setEdgeLocked(edge.id, false);
  expect(state.getNode(node.id).fx).toBeNull();
  expect(state.getNode(node.id).fy).toBeNull();
});

test('a node stays pinned while any locked edge touches it', () => {
  const a = state.addNode({ label: 'A', x: 50, y: 80 });
  const b = state.addNode({ label: 'B', x: 90, y: 100 });
  const e1 = state.addEdge({ source: 'root', target: a.id });
  const e2 = state.addEdge({ source: a.id, target: b.id });
  state.setEdgeLocked(e1.id, true);
  state.setEdgeLocked(e2.id, true);
  state.setEdgeLocked(e1.id, false);
  expect(state.getNode(a.id).fx).not.toBeNull();
});

test('removeNode removes connected edges', () => {
  const node = state.addNode({ label: 'A', x: 0, y: 0 });
  state.addEdge({ source: 'root', target: node.id });
  state.removeNode(node.id);
  expect(state.getNodes()).toHaveLength(1);
  expect(state.getEdges()).toHaveLength(0);
});

test('undo restores previous graph snapshot', () => {
  state.addNode({ label: 'Undo Me', x: 0, y: 0 });
  expect(state.getNodes()).toHaveLength(2);
  expect(state.undo()).toBe(true);
  expect(state.getNodes()).toHaveLength(1);
});

test('redo reapplies an undone graph snapshot and clears after new edits', () => {
  const node = state.addNode({ label: 'Redo Me', x: 0, y: 0 });
  expect(state.undo()).toBe(true);
  expect(state.getNode(node.id)).toBeUndefined();
  expect(state.redo()).toBe(true);
  expect(state.getNode(node.id).label).toBe('Redo Me');

  state.undo();
  state.addNode({ label: 'Different Path', x: 0, y: 0 });
  expect(state.redo()).toBe(false);
});

test('replay steps track node and edge additions and persist with the graph', () => {
  const node = state.addNode({ label: 'Timeline', x: 0, y: 0 });
  const edge = state.addEdge({ source: 'root', target: node.id, kind: 'hierarchy' });
  const steps = state.replaySteps();

  expect(steps.map(step => step.event.type)).toEqual(['node', 'node', 'edge']);
  expect(steps[1].nodeIds.has(node.id)).toBe(true);
  expect(steps[1].edgeIds.has(edge.id)).toBe(false);
  expect(steps[2].edgeIds.has(edge.id)).toBe(true);

  const graph = state.cloneGraph();
  state.initRoot(800, 600);
  state.loadGraph(graph);
  expect(state.replaySteps()).toHaveLength(3);
});

test('sampled replay steps preserve first and last timeline states', () => {
  let parent = state.getNode('root');
  for (let index = 0; index < 20; index += 1) {
    const child = state.addNode({ label: `Step ${index}`, x: 0, y: 0 });
    state.addEdge({ source: parent.id, target: child.id, kind: 'hierarchy' });
    parent = child;
  }

  const all = state.replaySteps();
  const sampled = state.sampledReplaySteps(8);
  expect(sampled).toHaveLength(8);
  expect(sampled[0].index).toBe(0);
  expect(sampled.at(-1).index).toBe(all.at(-1).index);
});

test('updateNodeContent does not add graph undo snapshots', () => {
  const node = state.addNode({ label: 'Note', x: 0, y: 0 });
  state.updateNodeContent(node.id, '# Changed');
  state.undo();
  expect(state.getNode(node.id)).toBeUndefined();
});

test('connectedNodes returns direct neighbours', () => {
  const a = state.addNode({ label: 'A', x: 0, y: 0 });
  const b = state.addNode({ label: 'B', x: 0, y: 0 });
  state.addEdge({ source: 'root', target: a.id });
  state.addEdge({ source: a.id, target: b.id });
  expect(state.connectedNodes(a.id).map(node => node.id).sort()).toEqual(['root', b.id].sort());
});

test('setPalette changes future node colours and can recolour existing nodes', () => {
  const existing = state.addNode({ label: 'Existing', x: 0, y: 0 });
  state.setPalette('Test', ['#111111', '#222222'], false);
  const next = state.addNode({ label: 'Next', x: 0, y: 0 });
  expect(existing.color).not.toBe('#111111');
  expect(next.color).toBe('#111111');

  state.setPalette('Apply', ['#333333'], true);
  expect(state.getNode(existing.id).color).toBe('#333333');
});

test('saved palettes persist in graph settings and can be activated or deleted', () => {
  const saved = state.savePalette('Night Garden', ['#101010', '#88cc44']);
  expect(saved.id).toBe('palette-uuid-1');
  expect(state.getSettings().palette.library).toContainEqual(saved);

  const graph = state.cloneGraph();
  state.initRoot(800, 600);
  state.loadGraph(graph);
  expect(state.getSettings().palette.library).toContainEqual(saved);

  state.useSavedPalette(saved.id);
  expect(state.getSettings().palette.activeId).toBe(saved.id);
  expect(state.getSettings().palette.colors).toEqual(['#101010', '#88cc44']);
  expect(state.deleteSavedPalette(saved.id)).toBe(true);
  expect(state.getSettings().palette.library.find(item => item.id === saved.id)).toBeUndefined();
  expect(state.deleteSavedPalette('default')).toBe(false);
});

test('settings include screensaver defaults and merge loaded settings', () => {
  expect(state.getSettings().screensaver).toMatchObject({ enabled: true, idleSeconds: 45 });
  const graph = state.cloneGraph();
  graph.settings = { screensaver: { idleSeconds: 30 }, orbit: { idleSeconds: 8 } };
  state.loadGraph(graph);
  expect(state.getSettings().screensaver).toMatchObject({ enabled: true, idleSeconds: 30 });
  expect(state.getSettings().orbit).toMatchObject({ enabled: true, idleSeconds: 8 });
});

test('new nodes follow node skin mode settings', () => {
  state.updateSettings({ skins: { mode: 'planets' } });
  const node = state.addNode({ label: 'Planet', x: 0, y: 0 });
  expect(node.skin.type).toBe('planet');

  state.setNodeSkin(node.id, { type: 'circle' });
  expect(state.getNode(node.id).skin.type).toBe('circle');
});

test('eligibleOrbitPairs returns floating children of locked parents only', () => {
  const parent = state.addNode({ label: 'Parent', x: 100, y: 100 });
  const child = state.addNode({ label: 'Child', x: 160, y: 100 });
  const locked = state.addEdge({ source: 'root', target: parent.id });
  state.setEdgeLocked(locked.id, true);
  state.addEdge({ source: parent.id, target: child.id });
  expect(state.eligibleOrbitPairs().map(pair => pair.child.id)).toEqual([child.id]);
});

test('hierarchy branch helpers track children, parent, and branch ids', () => {
  const child = state.addNode({ label: 'Child', x: 0, y: 0 });
  const grandchild = state.addNode({ label: 'Grandchild', x: 0, y: 0 });
  state.addEdge({ source: 'root', target: child.id, kind: 'hierarchy' });
  state.addEdge({ source: child.id, target: grandchild.id, kind: 'hierarchy' });

  expect(state.hierarchyChildren('root').map(node => node.id)).toEqual([child.id]);
  expect(state.hierarchyParent(grandchild.id).id).toBe(child.id);
  expect(state.branchIds(child.id, true).sort()).toEqual([child.id, grandchild.id].sort());
});

test('collapsed branches hide descendants from visible node ids', () => {
  const child = state.addNode({ label: 'Child', x: 0, y: 0 });
  const grandchild = state.addNode({ label: 'Grandchild', x: 0, y: 0 });
  state.addEdge({ source: 'root', target: child.id, kind: 'hierarchy' });
  state.addEdge({ source: child.id, target: grandchild.id, kind: 'hierarchy' });
  state.toggleCollapsed(child.id);

  expect(state.visibleNodeIds().has(child.id)).toBe(true);
  expect(state.visibleNodeIds().has(grandchild.id)).toBe(false);
});

test('descendant count drives evolved node variants from editable thresholds', () => {
  const parent = state.addNode({ label: 'Parent', x: 0, y: 0 });
  let current = parent;
  for (let index = 0; index < 5; index += 1) {
    const child = state.addNode({ label: `Child ${index}`, x: 0, y: 0 });
    state.addEdge({ source: current.id, target: child.id, kind: 'hierarchy' });
    current = child;
  }

  expect(state.descendantCount(parent.id)).toBe(5);
  expect(state.evolvedVariant(parent.id)).toBe('rocky');
  state.updateSettings({ skins: { evolutionThresholds: { gasGiant: 5, star: 6, blackHole: 7 } } });
  expect(state.evolvedVariant(parent.id)).toBe('gasGiant');
});

test('undo restores edge kind and collapsed state', () => {
  const child = state.addNode({ label: 'Child', x: 0, y: 0 });
  const edge = state.addEdge({ source: 'root', target: child.id, kind: 'hierarchy' });
  state.toggleCollapsed('root');
  expect(state.getNode('root').collapsed).toBe(true);
  state.undo();
  expect(state.getNode('root').collapsed).toBe(false);
  expect(state.getEdges().find(item => item.id === edge.id).kind).toBe('hierarchy');
});
