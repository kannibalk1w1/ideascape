const fs = require('fs');
const path = require('path');

const GRAPH_PATH = path.join('.ideascape', 'graph.json');
const SETTINGS_PATH = path.join('.ideascape', 'settings.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(label, existing = new Set()) {
  const base = String(label || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
  let slug = base;
  let i = 2;
  while (existing.has(`${slug}.md`)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  existing.add(`${slug}.md`);
  return `${slug}.md`;
}

function frontmatter(node) {
  return [
    '---',
    `id: "${node.id}"`,
    `color: "${node.color}"`,
    `symbol: ${node.symbol ? `"${node.symbol}"` : 'null'}`,
    `iconPath: ${node.iconPath ? `"${node.iconPath}"` : 'null'}`,
    `pinnedLabel: ${node.pinnedLabel ? 'true' : 'false'}`,
    '---',
    ''
  ].join('\n');
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---[\s\S]*?---\s*/, '');
}

function noteMarkdown(node, graph) {
  const content = stripFrontmatter(node.markdown || `# ${node.label}\n\n`);
  const connected = graph.edges
    .filter(edge => edge.source === node.id || edge.target === node.id)
    .map(edge => graph.nodes.find(n => n.id === (edge.source === node.id ? edge.target : edge.source)))
    .filter(Boolean);

  const connectionBlock = connected.length
    ? ['\n## Connections\n', ...connected.map(n => `- [[${n.label}]]`), ''].join('\n')
    : '';

  return `${frontmatter(node)}${content.trim()}\n${connectionBlock}`;
}

function normaliseGraph(graph) {
  const existing = new Set();
  const nodes = graph.nodes.map(node => ({
    ...node,
    notePath: node.notePath || path.join('notes', slugify(node.label, existing)),
    markdown: node.markdown || `# ${node.label}\n\n`
  }));

  return { ...graph, nodes };
}

function createVault(vaultPath) {
  ensureDir(vaultPath);
  ensureDir(path.join(vaultPath, 'notes'));
  ensureDir(path.join(vaultPath, 'attachments'));
  ensureDir(path.join(vaultPath, '.ideascape'));
  const settings = { version: 1, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(vaultPath, SETTINGS_PATH), JSON.stringify(settings, null, 2));
  return { vaultPath, graph: null, settings };
}

function openVault(vaultPath) {
  const graphFile = path.join(vaultPath, GRAPH_PATH);
  const settingsFile = path.join(vaultPath, SETTINGS_PATH);
  const graph = fs.existsSync(graphFile) ? JSON.parse(fs.readFileSync(graphFile, 'utf8')) : null;
  const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : {};

  if (graph) {
    graph.nodes = graph.nodes.map(node => {
      const noteFile = node.notePath ? path.join(vaultPath, node.notePath) : null;
      return {
        ...node,
        markdown: noteFile && fs.existsSync(noteFile) ? fs.readFileSync(noteFile, 'utf8') : node.markdown
      };
    });
  }

  return { vaultPath, graph, settings };
}

function saveVault(payload) {
  const vaultPath = payload.vaultPath;
  const graph = normaliseGraph(payload.graph);
  ensureDir(path.join(vaultPath, 'notes'));
  ensureDir(path.join(vaultPath, 'attachments'));
  ensureDir(path.join(vaultPath, '.ideascape'));

  graph.nodes.forEach(node => {
    const noteFile = path.join(vaultPath, node.notePath);
    ensureDir(path.dirname(noteFile));
    fs.writeFileSync(noteFile, noteMarkdown(node, graph), 'utf8');
  });

  const graphForDisk = {
    ...graph,
    nodes: graph.nodes.map(node => ({ ...node, markdown: undefined }))
  };
  fs.writeFileSync(path.join(vaultPath, GRAPH_PATH), JSON.stringify(graphForDisk, null, 2), 'utf8');
  return { vaultPath, graph };
}

function importAsset(payload) {
  const sourcePath = payload.sourcePath;
  const vaultPath = payload.vaultPath;
  ensureDir(path.join(vaultPath, 'attachments'));
  const ext = path.extname(sourcePath);
  const name = `${Date.now()}-${path.basename(sourcePath, ext).replace(/[^a-z0-9_-]+/gi, '-')}${ext}`;
  const relPath = path.join('attachments', name);
  fs.copyFileSync(sourcePath, path.join(vaultPath, relPath));
  return relPath.replace(/\\/g, '/');
}

function importSkinAsset(payload) {
  const sourcePath = payload.sourcePath;
  const vaultPath = payload.vaultPath;
  const skinDir = path.join(vaultPath, '.ideascape', 'skins', 'user');
  ensureDir(skinDir);
  const ext = path.extname(sourcePath);
  const name = `${Date.now()}-${path.basename(sourcePath, ext).replace(/[^a-z0-9_-]+/gi, '-')}${ext}`;
  const relPath = path.join('.ideascape', 'skins', 'user', name);
  fs.copyFileSync(sourcePath, path.join(vaultPath, relPath));
  return relPath.replace(/\\/g, '/');
}

function writeExport(payload, type) {
  const extension = type === 'gif' ? 'gif' : 'png';
  const exportDir = path.join(payload.vaultPath || process.cwd(), 'exports');
  ensureDir(exportDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(exportDir, `ideascape-${stamp}.${extension}`);
  const data = payload.dataUrl.replace(/^data:[^;]+;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  return filePath;
}

module.exports = { createVault, openVault, saveVault, importAsset, importSkinAsset, writeExport, slugify, stripFrontmatter };
