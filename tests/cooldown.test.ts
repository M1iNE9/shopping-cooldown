import test from "node:test";
import assert from "node:assert/strict";
import { createItem, DAY, decide, deserialize, extend, MINUTE, monthStats, reflect, remaining, safeUrl, serialize, statusAt, updateItem, type ItemInput } from "../lib/cooldown.ts";

const start = new Date(2026, 8, 15, 12).getTime();
const input: ItemInput = { name: "测试商品", price: 129.9, image: "", url: "https://example.com/item", reason: "需要再想想", triggerTag: "打折了" };
const item = () => createItem(input, DAY, start, "test-1");

test("expiry uses absolute time, survives serialization, and respects the exact boundary", () => {
  const saved = deserialize(serialize([item()]))[0];
  assert.equal(saved.cooldownEndAt, start + DAY);
  assert.equal(statusAt(saved, start + DAY - 1), "cooling");
  assert.equal(statusAt(saved, start + DAY), "ready");
  assert.equal(statusAt(saved, start + 7 * DAY), "ready");
  assert.throws(() => decide(saved, "purchased", start + DAY - 1));
});
test("final decisions cannot repeat or be extended; a purchase is excluded from avoided spending", () => {
  const purchased = decide(item(), "purchased", start + DAY);
  assert.equal(statusAt(purchased, start + 60 * DAY), "purchased");
  assert.throws(() => decide(purchased, "abandoned", start + 2 * DAY));
  assert.throws(() => extend(purchased, 3, start + 2 * DAY));
  assert.equal(monthStats([purchased], start + DAY).avoided, 0);
});
test("extension starts at decision time, preserving reflection and original creation", () => {
  const answered = reflect(item(), 0, "不确定");
  const extended = extend(answered, 3, start + 2 * DAY);
  assert.equal(extended.cooldownEndAt, start + 5 * DAY);
  assert.equal(extended.createdAt, start);
  assert.equal(extended.reflectionAnswers[0], "不确定");
  assert.equal(extended.finalDecisionAt, null);
  assert.throws(() => extend(item(), 3, start));
  assert.throws(() => extend(item(), 2, start + DAY));
});
test("edits preserve the clock and final records are immutable", () => {
  const edited = updateItem(item(), { ...input, name: "改过的名称", price: 99 }, start + 1000);
  assert.equal(edited.cooldownEndAt, start + DAY);
  assert.equal(edited.createdAt, start);
  assert.equal(edited.price, 99);
  assert.throws(() => updateItem(decide(item(), "abandoned", start + DAY), input, start + DAY));
});
test("input rejects unsafe URLs, invalid prices and unreasonable cooldowns", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "https://name:secret@example.com", "file:///tmp/example"]) assert.throws(() => safeUrl(url));
  for (const price of [-1, NaN, Infinity, 100000001]) assert.throws(() => createItem({ ...input, price }, DAY, start, "x"));
  for (const duration of [0, MINUTE - 1, Infinity, 366 * DAY]) assert.throws(() => createItem(input, duration, start, "x"));
  assert.equal(createItem(input, MINUTE, start, "x").cooldownEndAt, start + MINUTE);
  assert.throws(() => reflect(item(), 3, "会"));
  assert.throws(() => reflect(item(), 0, "恶意值"));
});
test("corrupt storage is rejected without silently dropping records", () => {
  assert.deepEqual(deserialize(null), []);
  for (const raw of ["{", '{"version":2,"items":[]}', serialize([item(), item()]), serialize([{ ...item(), price: -1 }]), serialize([{ ...item(), finalDecisionAt: 5 }])]) assert.throws(() => deserialize(raw));
});
test("month statistics use decision month for avoided spending and integer cents", () => {
  const lastMonth = new Date(2026, 7, 31, 12).getTime();
  const decision = new Date(2026, 8, 1, 13).getTime();
  const prior = createItem({ ...input, price: 0.1 }, DAY, lastMonth, "prior");
  const current = createItem({ ...input, price: 0.2 }, MINUTE, decision, "current");
  const stats = monthStats([decide(prior, "abandoned", decision), decide(current, "abandoned", decision + MINUTE)], decision + MINUTE);
  assert.equal(stats.added, 1);
  assert.equal(stats.abandoned, 2);
  assert.equal(stats.avoided, 0.3);
  assert.equal(stats.tags[0].count, 1);
  assert.equal(monthStats([prior], new Date(2027, 7, 31).getTime()).added, 0);
});
test("countdown is quiet and rounds up without reporting zero before expiry", () => {
  assert.equal(remaining(start + 1, start), "1 分钟");
  assert.equal(remaining(start + 92 * MINUTE, start), "1 小时 32 分钟");
  assert.equal(remaining(start + 2 * DAY + 14 * 60 * MINUTE, start), "2 天 14 小时");
  assert.equal(remaining(start, start), "可以重新决定");
});
