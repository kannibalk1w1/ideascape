test('renderer package imports expose the APIs the app uses', () => {
  expect(require('@codemirror/state').EditorSelection.range).toBeInstanceOf(Function);
  expect(require('@codemirror/view').EditorView).toBeInstanceOf(Function);
  expect(require('@codemirror/lang-markdown').markdown).toBeInstanceOf(Function);
  expect(require('marked').marked.parse).toBeInstanceOf(Function);
  expect(require('dompurify')).toBeInstanceOf(Function);
  expect(require('gifenc').GIFEncoder).toBeInstanceOf(Function);
  expect(require('html-to-image').toPng).toBeInstanceOf(Function);
});
