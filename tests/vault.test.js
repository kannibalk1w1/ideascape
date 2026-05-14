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
