const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/questions.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const themes = sandbox.window.DST_THEMES;

test('12 themes numbered 1 to 12', () => {
  assert.strictEqual(themes.length, 12);
  themes.forEach((theme, i) => assert.strictEqual(theme.id, i + 1));
});

test('every theme has a French name', () => {
  themes.forEach(theme => assert.ok(theme.french && theme.french.length > 3, theme.name));
});

test('6 unique questions per theme', () => {
  themes.forEach(theme => {
    assert.strictEqual(theme.questions.length, 6, theme.name);
    theme.questions.forEach(q => assert.match(q, /\?$/, q));
  });
  const all = themes.flatMap(theme => theme.questions);
  assert.strictEqual(new Set(all).size, 72);
});
