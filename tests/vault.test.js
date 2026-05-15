const vault = require('../src/main/vault');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('slugify creates stable unique markdown filenames', () => {
  const existing = new Set();
  expect(vault.slugify('Game Idea!', existing)).toBe('game-idea.md');
  expect(vault.slugify('Game Idea', existing)).toBe('game-idea-2.md');
});

test('stripFrontmatter removes YAML frontmatter only', () => {
  const md = '---\nid: "abc"\n---\n# Title\n\nBody';
  expect(vault.stripFrontmatter(md)).toBe('# Title\n\nBody');
});

test('importSkinAsset copies sprites into editable vault skin folder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideascape-skin-'));
  const source = path.join(dir, 'moon.png');
  fs.writeFileSync(source, 'sprite');
  const rel = vault.importSkinAsset({ vaultPath: dir, sourcePath: source });
  expect(rel).toMatch(/^\.ideascape\/skins\/user\/.*moon\.png$/);
  expect(fs.existsSync(path.join(dir, rel))).toBe(true);
});

test('writeExport creates an exports folder with timestamped files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideascape-export-'));
  const filePath = vault.writeExport({
    vaultPath: dir,
    dataUrl: `data:image/png;base64,${Buffer.from('png').toString('base64')}`
  }, 'png');
  expect(filePath).toMatch(/exports[\\/]+ideascape-.*\.png$/);
  expect(fs.existsSync(filePath)).toBe(true);
  expect(fs.readFileSync(filePath, 'utf8')).toBe('png');
});

test('writeExport requires an explicit vault path', () => {
  expect(() => vault.writeExport({
    dataUrl: `data:image/png;base64,${Buffer.from('png').toString('base64')}`
  }, 'png')).toThrow('Choose or save a vault before exporting.');
});

test('writeThemePack creates a shareable theme json file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideascape-theme-'));
  const filePath = vault.writeThemePack({
    vaultPath: dir,
    pack: { type: 'ideascape-theme', version: 1, theme: { name: 'Solar Drift' } }
  });
  expect(filePath).toMatch(/\.ideascape[\\/]+themes[\\/]+solar-drift\.json$/);
  expect(JSON.parse(fs.readFileSync(filePath, 'utf8')).theme.name).toBe('Solar Drift');
});

test('saveVault writes richer frontmatter and graph metadata atomically', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideascape-vault-'));
  const graph = {
    version: 1,
    settings: {},
    nodes: [{
      id: 'node-1',
      label: 'Recovered Idea',
      x: 12,
      y: 34,
      color: '#123456',
      symbol: '*',
      pinnedLabel: true,
      skin: { type: 'planet', variant: 'rocky', seed: 7 },
      markdown: '# Recovered Idea\n\nBody'
    }],
    edges: []
  };

  vault.saveVault({ vaultPath: dir, graph });
  const note = fs.readFileSync(path.join(dir, 'notes', 'recovered-idea.md'), 'utf8');
  expect(note).toContain('label: "Recovered Idea"');
  expect(note).toContain('x: 12');
  expect(note).toContain('skin: \'{"type":"planet","variant":"rocky","seed":7}\'');
  expect(fs.existsSync(path.join(dir, '.ideascape', 'graph.json'))).toBe(true);
  expect(fs.existsSync(path.join(dir, '.ideascape', 'graph.json.tmp'))).toBe(false);
});

test('openVault recovers nodes from markdown frontmatter if graph metadata is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideascape-recover-'));
  fs.mkdirSync(path.join(dir, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'notes', 'idea.md'), [
    '---',
    'id: "idea-1"',
    'label: "Loose Idea"',
    'color: "#abcdef"',
    'symbol: "!"',
    'pinnedLabel: true',
    'x: 42',
    'y: 84',
    'skin: \'{"type":"planet","variant":"icy","seed":9}\'',
    '---',
    '# Loose Idea',
    '',
    'Body'
  ].join('\n'));

  const result = vault.openVault(dir);
  expect(result.graph.recovered).toBe(true);
  expect(result.graph.nodes[0]).toMatchObject({
    id: 'idea-1',
    label: 'Loose Idea',
    color: '#abcdef',
    symbol: '!',
    pinnedLabel: true,
    x: 42,
    y: 84,
    notePath: 'notes/idea.md',
    skin: { type: 'planet', variant: 'icy', seed: 9 }
  });
  expect(result.health.issues).toContain('Graph metadata missing; recovered nodes from Markdown notes.');
});

test('checkVaultHealth reports missing notes and orphaned notes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideascape-health-'));
  const graph = {
    version: 1,
    nodes: [{ id: 'missing', label: 'Missing', notePath: 'notes/missing.md' }],
    edges: []
  };
  fs.mkdirSync(path.join(dir, '.ideascape'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'notes'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ideascape', 'graph.json'), JSON.stringify(graph));
  fs.writeFileSync(path.join(dir, 'notes', 'orphan.md'), '# Orphan');

  const health = vault.checkVaultHealth(dir, graph);
  expect(health.issues).toEqual(expect.arrayContaining([
    'Missing note file: notes/missing.md',
    'Orphaned note file: notes/orphan.md'
  ]));
});
