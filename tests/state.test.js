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
