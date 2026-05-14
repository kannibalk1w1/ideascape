global.window = {};

const palette = require('../renderer/palette');

test('parsePalette extracts hex colours from pasted text', () => {
  expect(palette.parsePalette('#ff0000\n00ff00\nhello #0000ff').colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
});

test('parsePalette extracts gpl rgb rows', () => {
  expect(palette.parsePalette('GIMP Palette\n255 128 0 Orange').colors).toContain('#ff8000');
});

test('parsePalette derives a readable name from Lospec URLs', () => {
  expect(palette.parsePalette('https://lospec.com/palette-list/endesga-32 #be4a2f').name).toBe('endesga 32');
});
