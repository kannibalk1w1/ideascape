(function () {
  const { EditorSelection, EditorState } = require('@codemirror/state');
  const { EditorView, keymap, lineNumbers } = require('@codemirror/view');
  const { defaultKeymap, history, historyKeymap } = require('@codemirror/commands');
  const { markdown } = require('@codemirror/lang-markdown');
  const { ipcRenderer } = require('electron');
  const { marked } = require('marked');
  const createDOMPurify = require('dompurify');
  const DOMPurify = createDOMPurify(window);

  let view = null;
  let currentNodeId = null;

  function createState(doc) {
    return EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        history(),
        markdown(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of(update => {
          if (!update.docChanged || !currentNodeId) return;
          const markdownText = update.state.doc.toString();
          state.updateNodeContent(currentNodeId, markdownText);
          renderPreview(markdownText);
        })
      ]
    });
  }

  function open(node) {
    currentNodeId = node.id;
    document.getElementById('editor-panel').classList.remove('hidden');
    document.getElementById('editor-title').textContent = node.label;
    const host = document.getElementById('editor-host');
    if (view) view.destroy();
    view = new EditorView({
      state: createState(node.markdown || `# ${node.label}\n\n`),
      parent: host
    });
    renderPreview(view.state.doc.toString());
  }

  function close() {
    currentNodeId = null;
    document.getElementById('editor-panel').classList.add('hidden');
    if (view) {
      view.destroy();
      view = null;
    }
  }

  function renderPreview(markdownText) {
    const html = marked.parse(markdownText || '');
    document.getElementById('markdown-preview').innerHTML = DOMPurify.sanitize(html);
  }

  function wrapSelection(before, after = before) {
    if (!view) return;
    const ranges = view.state.selection.ranges;
    view.dispatch(view.state.changeByRange(range => ({
      changes: [
        { from: range.from, insert: before },
        { from: range.to, insert: after }
      ],
      range: EditorSelection.range(range.from + before.length, range.to + before.length)
    })));
    view.focus();
  }

  function prefixLines(prefix) {
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const startLine = view.state.doc.lineAt(from);
    const endLine = view.state.doc.lineAt(to);
    const changes = [];
    for (let lineNo = startLine.number; lineNo <= endLine.number; lineNo += 1) {
      const line = view.state.doc.line(lineNo);
      changes.push({ from: line.from, insert: typeof prefix === 'function' ? prefix(lineNo - startLine.number + 1) : prefix });
    }
    view.dispatch({ changes });
    view.focus();
  }

  function insertText(text) {
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
    view.focus();
  }

  async function applyToolbar(action) {
    if (action === 'heading') prefixLines('## ');
    if (action === 'bold') wrapSelection('**');
    if (action === 'italic') wrapSelection('*');
    if (action === 'bullet') prefixLines('- ');
    if (action === 'numbered') prefixLines(index => `${index}. `);
    if (action === 'link') wrapSelection('[', '](https://)');
    if (action === 'image') {
      let vaultPath = state.getVaultPath();
      if (!vaultPath) {
        const result = await vaultClient.saveVault();
        vaultPath = result?.vaultPath;
      }
      if (!vaultPath) return;
      const sourcePath = await ipcRenderer.invoke('vault:chooseAsset');
      if (!sourcePath) return;
      const relPath = await ipcRenderer.invoke('vault:importAsset', { vaultPath, sourcePath });
      insertText(`![image](../${relPath})`);
    }
  }

  function applyColour(color) {
    wrapSelection(`<span style="color:${color}">`, '</span>');
  }

  function init() {
    document.getElementById('close-editor').addEventListener('click', close);
    document.getElementById('editor-toolbar').addEventListener('click', event => {
      const button = event.target.closest('[data-md]');
      if (button) applyToolbar(button.dataset.md).catch(error => interactions.toast(error.message));
    });
    document.getElementById('text-colour').addEventListener('change', event => applyColour(event.target.value));
  }

  window.editor = { init, open, close };
}());
