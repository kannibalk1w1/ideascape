const vault = require('../src/main/vault');

test('slugify creates stable unique markdown filenames', () => {
  const existing = new Set();
  expect(vault.slugify('Game Idea!', existing)).toBe('game-idea.md');
  expect(vault.slugify('Game Idea', existing)).toBe('game-idea-2.md');
});

test('stripFrontmatter removes YAML frontmatter only', () => {
  const md = '---\nid: "abc"\n---\n# Title\n\nBody';
  expect(vault.stripFrontmatter(md)).toBe('# Title\n\nBody');
});
