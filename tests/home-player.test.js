const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeIndex,
  nextIndex,
  previousIndex,
} = require("../assets/js/home-player.js");

test("normalizeIndex wraps positive and negative indexes", () => {
  assert.equal(normalizeIndex(0, 3), 0);
  assert.equal(normalizeIndex(3, 3), 0);
  assert.equal(normalizeIndex(4, 3), 1);
  assert.equal(normalizeIndex(-1, 3), 2);
});

test("empty playlists return a sentinel index", () => {
  assert.equal(normalizeIndex(0, 0), -1);
  assert.equal(nextIndex(0, 0), -1);
  assert.equal(previousIndex(0, 0), -1);
});

test("nextIndex advances and wraps", () => {
  assert.equal(nextIndex(0, 3), 1);
  assert.equal(nextIndex(2, 3), 0);
});

test("previousIndex reverses and wraps", () => {
  assert.equal(previousIndex(2, 3), 1);
  assert.equal(previousIndex(0, 3), 2);
});
