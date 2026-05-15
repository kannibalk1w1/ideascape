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
    `label: "${escapeYaml(node.label || 'Untitled')}"`,
    `color: "${node.color}"`,
    `symbol: ${node.symbol ? `"${node.symbol}"` : 'null'}`,
    `iconPath: ${node.iconPath ? `"${node.iconPath}"` : 'null'}`,
    `pinnedLabel: ${node.pinnedLabel ? 'true' : 'false'}`,
    `x: ${Number.isFinite(node.x) ? node.x : 0}`,
    `y: ${Number.isFinite(node.y) ? node.y : 0}`,
    `skin: '${JSON.stringify(node.skin || { type: 'circle' }).replace(/'/g, "''")}'`,
    '---',
    ''
  ].join('\n');
}

function escapeYaml(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---[\s\S]*?---\s*/, '');
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\s*/);
  if (!match) return {};
  return match[1].split(/\r?\n/).reduce((data, line) => {
    const separator = line.indexOf(':');
    if (separator === -1) return data;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    data[key] = parseYamlValue(raw);
    return data;
  }, {});
}

function parseYamlValue(raw) {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1).replace(/''/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return raw;
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
  const graph = fs.existsSync(graphFile) ? JSON.parse(fs.readFileSync(graphFile, 'utf8')) : recoverGraphFromNotes(vaultPath);
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

  const health = checkVaultHealth(vaultPath, graph);
  if (graph?.recovered) health.issues.unshift('Graph metadata missing; recovered nodes from Markdown notes.');
  return { vaultPath, graph, settings, health };
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
  writeJsonAtomic(path.join(vaultPath, GRAPH_PATH), graphForDisk);
  return { vaultPath, graph };
}

function writeJsonAtomic(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function recoverGraphFromNotes(vaultPath) {
  const notesDir = path.join(vaultPath, 'notes');
  if (!fs.existsSync(notesDir)) return null;
  const files = listMarkdownFiles(notesDir);
  if (files.length === 0) return null;
  const nodes = files.map((file, index) => {
    const markdown = fs.readFileSync(file, 'utf8');
    const meta = parseFrontmatter(markdown);
    const label = meta.label || path.basename(file, '.md');
    return {
      id: meta.id || `recovered-${index + 1}`,
      label,
      x: Number.isFinite(meta.x) ? meta.x : 120 + index * 80,
      y: Number.isFinite(meta.y) ? meta.y : 120,
      fx: null,
      fy: null,
      color: meta.color || '#a3e635',
      symbol: meta.symbol || null,
      iconPath: meta.iconPath || null,
      pinnedLabel: Boolean(meta.pinnedLabel),
      notePath: path.relative(vaultPath, file).replace(/\\/g, '/'),
      markdown,
      collapsed: false,
      skin: parseSkin(meta.skin)
    };
  });
  return { version: 1, recovered: true, settings: {}, nodes, edges: [], timeline: [] };
}

function listMarkdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.md') ? [fullPath] : [];
  });
}

function parseSkin(value) {
  if (!value) return { type: 'circle' };
  try {
    return JSON.parse(value);
  } catch {
    return { type: 'circle' };
  }
}

function checkVaultHealth(vaultPath, graph) {
  const issues = [];
  if (!graph) {
    issues.push('Graph metadata missing and no Markdown notes could be recovered.');
    return { ok: false, issues };
  }
  const notePaths = new Set((graph.nodes || []).map(node => node.notePath).filter(Boolean).map(normaliseRelPath));
  (graph.nodes || []).forEach(node => {
    if (!node.id) issues.push(`Node missing id: ${node.label || 'Untitled'}`);
    if (node.notePath && !fs.existsSync(path.join(vaultPath, node.notePath))) {
      issues.push(`Missing note file: ${normaliseRelPath(node.notePath)}`);
    }
  });
  const notesDir = path.join(vaultPath, 'notes');
  if (fs.existsSync(notesDir)) {
    listMarkdownFiles(notesDir).forEach(file => {
      const rel = normaliseRelPath(path.relative(vaultPath, file));
      if (!notePaths.has(rel)) issues.push(`Orphaned note file: ${rel}`);
    });
  }
  return { ok: issues.length === 0, issues };
}

function normaliseRelPath(value) {
  return String(value).replace(/\\/g, '/');
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
  if (!payload.vaultPath) throw new Error('Choose or save a vault before exporting.');
  const extension = type === 'gif' ? 'gif' : 'png';
  const exportPath = exportDir(payload.vaultPath);
  ensureDir(exportPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(exportPath, `ideascape-${stamp}.${extension}`);
  const data = payload.dataUrl.replace(/^data:[^;]+;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  return filePath;
}

function exportDir(vaultPath) {
  if (!vaultPath) throw new Error('Choose or save a vault before opening exports.');
  return path.join(vaultPath, 'exports');
}

function ensureExportDir(vaultPath) {
  const exportPath = exportDir(vaultPath);
  ensureDir(exportPath);
  return exportPath;
}

function writeThemePack(payload) {
  if (!payload.vaultPath) throw new Error('Choose or save a vault before exporting a theme.');
  if (!payload.pack?.theme?.name) throw new Error('Theme pack needs a named theme.');
  const themeDir = path.join(payload.vaultPath, '.ideascape', 'themes');
  ensureDir(themeDir);
  const filePath = path.join(themeDir, `${slugBase(payload.pack.theme.name)}.json`);
  writeJsonAtomic(filePath, payload.pack);
  return filePath;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function slugBase(label) {
  return String(label || 'theme')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'theme';
}

module.exports = { createVault, openVault, saveVault, importAsset, importSkinAsset, writeExport, exportDir, ensureExportDir, writeThemePack, readJsonFile, slugify, stripFrontmatter, parseFrontmatter, checkVaultHealth };
