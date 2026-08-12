const test = require("node:test");
const assert = require("node:assert/strict");

const {
  clampPercentage,
  periodProgress,
} = require("../assets/js/home-progress.js");

test("clampPercentage keeps values in the supported range", () => {
  assert.equal(clampPercentage(-2), 0);
  assert.equal(clampPercentage(42.9), 42);
  assert.equal(clampPercentage(120), 100);
});

test("day progress uses local midnight boundaries", () => {
  assert.equal(periodProgress("day", new Date(2026, 7, 12, 0, 0, 0)), 0);
  assert.equal(periodProgress("day", new Date(2026, 7, 12, 12, 0, 0)), 50);
  assert.equal(periodProgress("day", new Date(2026, 7, 12, 23, 59, 59)), 99);
});

test("week progress starts on Monday", () => {
  assert.equal(periodProgress("week", new Date(2026, 7, 10, 0, 0, 0)), 0);
  assert.equal(periodProgress("week", new Date(2026, 7, 13, 12, 0, 0)), 50);
  assert.equal(periodProgress("week", new Date(2026, 7, 16, 23, 59, 59)), 99);
});

test("month progress accounts for leap years", () => {
  assert.equal(periodProgress("month", new Date(2024, 1, 1, 0, 0, 0)), 0);
  assert.equal(periodProgress("month", new Date(2024, 1, 15, 12, 0, 0)), 50);
});

test("year progress accounts for leap years", () => {
  assert.equal(periodProgress("year", new Date(2024, 0, 1, 0, 0, 0)), 0);
  assert.equal(periodProgress("year", new Date(2024, 6, 2, 0, 0, 0)), 50);
});

test("unknown periods are rejected", () => {
  assert.throws(() => periodProgress("decade", new Date()), RangeError);
});
