const test = require("node:test");
const assert = require("node:assert/strict");

const {
  dateKey,
  hashString,
  selectDailyIndex,
  selectDailyImage,
} = require("../assets/js/home-curtain.js");

test("dateKey uses local calendar fields", () => {
  assert.equal(dateKey(new Date(2026, 7, 13, 23, 59)), "2026-08-13");
});

test("dateKey rejects invalid dates", () => {
  assert.throws(() => dateKey(new Date("invalid")), TypeError);
});

test("hashString is stable and date-sensitive", () => {
  assert.equal(hashString("2026-08-13"), hashString("2026-08-13"));
  assert.notEqual(hashString("2026-08-13"), hashString("2026-08-14"));
});

test("selectDailyIndex stays inside the gallery", () => {
  const date = new Date(2026, 7, 13);
  const index = selectDailyIndex(date, 6);

  assert.ok(index >= 0 && index < 6);
  assert.equal(index, selectDailyIndex(date, 6));
});

test("empty galleries return a safe fallback", () => {
  assert.equal(selectDailyIndex(new Date(2026, 7, 13), 0), -1);
  assert.equal(selectDailyImage([], new Date(2026, 7, 13)), null);
});

test("selectDailyImage returns the indexed gallery item", () => {
  const gallery = [
    { id: "one" },
    { id: "two" },
    { id: "three" },
  ];
  const date = new Date(2026, 7, 13);

  assert.equal(
    selectDailyImage(gallery, date),
    gallery[selectDailyIndex(date, gallery.length)],
  );
});
