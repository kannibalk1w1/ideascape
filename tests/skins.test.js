global.window = {};

const skins = require('../renderer/skins');

test('seeded random generator is deterministic', () => {
  const a = skins.seeded(123);
  const b = skins.seeded(123);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});
