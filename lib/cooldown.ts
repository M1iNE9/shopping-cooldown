export const STORAGE_KEY = "shopping-cooldown:v1";
export const MINUTE = 60_000;
export const DAY = 86_400_000;
export const TAGS = ["打折了", "刷到种草", "一直想要", "奖励自己", "心情消费", "别人都有", "其他"] as const;
export const QUESTIONS = [
  { text: "我是真的需要，还是现在很想要？", options: ["真的需要", "不确定", "可能不需要"] },
  { text: "家里有没有类似的东西？", options: ["有", "没有", "不确定"] },
  { text: "如果它今天不打折，我还会买吗？", options: ["会", "不确定", "不会"] },
] as const;
export type Status = "cooling" | "ready" | "abandoned" | "purchased";
export type Item = {
  id: string; name: string; price: number; image: string; url: string; reason: string;
  triggerTag: string; createdAt: number; cooldownEndAt: number; status: Status;
  reflectionAnswers: string[]; finalDecisionAt: number | null;
};
export type ItemInput = Pick<Item, "name" | "price" | "image" | "url" | "reason" | "triggerTag">;
export function safeUrl(value: string) {
  if (!value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    return url.href;
  } catch { throw new Error("链接需要以 https:// 或 http:// 开头，且不能包含账户密码。"); }
}
export function validateInput(input: ItemInput): ItemInput {
  if (!input.name.trim() || input.name.trim().length > 80) throw new Error("请填写 1–80 字的商品名称。");
  if (!Number.isFinite(input.price) || input.price < 0 || input.price > 100_000_000) throw new Error("请填写 0–100,000,000 之间的有效价格。");
  if (input.reason.length > 500) throw new Error("想买的理由请控制在 500 字内。");
  if (input.triggerTag && !TAGS.some(tag => tag === input.triggerTag)) throw new Error("请选择一个有效的冲动原因。");
  if (input.image.length > 2048 || input.url.length > 2048) throw new Error("链接过长，请使用 2048 字以内的链接。");
  return { name: input.name.trim(), price: Math.round(input.price * 100) / 100, image: safeUrl(input.image), url: safeUrl(input.url), reason: input.reason.trim(), triggerTag: input.triggerTag };
}
export function statusAt(item: Item, now: number): Status {
  if (item.status === "abandoned" || item.status === "purchased") return item.status;
  return now >= item.cooldownEndAt ? "ready" : "cooling";
}
export function createItem(input: ItemInput, duration: number, now: number, id: string): Item {
  if (!Number.isFinite(duration) || duration < MINUTE || duration > 365 * DAY) throw new Error("冷静时间需要在 1 分钟到 365 天之间。");
  return { ...validateInput(input), id, createdAt: now, cooldownEndAt: now + duration, status: "cooling", reflectionAnswers: ["", "", ""], finalDecisionAt: null };
}
export function updateItem(item: Item, input: ItemInput, now: number): Item {
  if (["abandoned", "purchased"].includes(statusAt(item, now))) throw new Error("这条记录已做出决定，不能再修改商品信息。");
  return { ...item, ...validateInput(input) };
}
export function decide(item: Item, decision: "abandoned" | "purchased", now: number): Item {
  if (statusAt(item, now) !== "ready") throw new Error("等冷静时间结束后，再重新决定。");
  if (!["abandoned", "purchased"].includes(decision)) throw new Error("无效的决定。");
  return { ...item, status: decision, finalDecisionAt: now };
}
export function extend(item: Item, days: number, now: number): Item {
  if (statusAt(item, now) !== "ready" || ![1, 3, 7].includes(days)) throw new Error("只有冷静结束的商品可以再等 1、3 或 7 天。");
  return { ...item, status: "cooling", cooldownEndAt: now + days * DAY, finalDecisionAt: null };
}
export function reflect(item: Item, index: number, answer: string): Item {
  if (!QUESTIONS[index] || (answer && !(QUESTIONS[index].options as readonly string[]).includes(answer))) throw new Error("无效的回答。");
  const answers = [...item.reflectionAnswers]; answers[index] = answer;
  return { ...item, reflectionAnswers: answers };
}
export function remaining(end: number, now: number) {
  const minutes = Math.max(0, Math.ceil((end - now) / MINUTE));
  if (!minutes) return "可以重新决定";
  const days = Math.floor(minutes / 1440), hours = Math.floor((minutes % 1440) / 60), mins = minutes % 60;
  if (days) return `${days} 天${hours ? ` ${hours} 小时` : ""}`;
  if (hours) return `${hours} 小时${mins ? ` ${mins} 分钟` : ""}`;
  return `${minutes} 分钟`;
}
export const money = (value: number) => `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
export function monthStats(items: Item[], now: number) {
  const current = new Date(now);
  const sameMonth = (time: number) => { const date = new Date(time); return date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth(); };
  const added = items.filter(item => sameMonth(item.createdAt));
  const abandoned = items.filter(item => item.status === "abandoned" && item.finalDecisionAt !== null && sameMonth(item.finalDecisionAt));
  const tags = TAGS.map(tag => ({ tag, count: added.filter(item => item.triggerTag === tag).length })).filter(x => x.count).sort((a, b) => b.count - a.count);
  return { added: added.length, abandoned: abandoned.length, avoided: abandoned.reduce((total, item) => total + Math.round(item.price * 100), 0) / 100, tags };
}
export function serialize(items: Item[]) { return JSON.stringify({ version: 1, items }); }
export function deserialize(raw: string | null): Item[] {
  if (raw === null) return [];
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.items)) throw new Error();
    const ids = new Set<string>();
    return data.items.map((value: unknown) => {
      if (!value || typeof value !== "object") throw new Error();
      const item = value as Item;
      if (typeof item.id !== "string" || !item.id || ids.has(item.id)) throw new Error();
      ids.add(item.id);
      if (![item.name, item.image, item.url, item.reason, item.triggerTag].every(v => typeof v === "string")) throw new Error();
      if (![item.createdAt, item.cooldownEndAt].every(t => typeof t === "number" && Number.isFinite(t) && t >= 0 && t <= 8.64e15)) throw new Error();
      if (item.cooldownEndAt <= item.createdAt || !["cooling", "ready", "abandoned", "purchased"].includes(item.status)) throw new Error();
      if (![null, undefined].includes(item.finalDecisionAt as null) && (typeof item.finalDecisionAt !== "number" || !Number.isFinite(item.finalDecisionAt) || item.finalDecisionAt < item.createdAt || item.finalDecisionAt > 8.64e15)) throw new Error();
      if (item.finalDecisionAt === undefined || ((item.status === "abandoned" || item.status === "purchased") !== (item.finalDecisionAt !== null))) throw new Error();
      if (!Array.isArray(item.reflectionAnswers) || item.reflectionAnswers.length !== 3) throw new Error();
      item.reflectionAnswers.forEach((answer, index) => { if (typeof answer !== "string" || (answer && !(QUESTIONS[index].options as readonly string[]).includes(answer))) throw new Error(); });
      return { ...item, ...validateInput(item) };
    });
  } catch { throw new Error("暂时无法读取保存的记录。原始数据仍在，未被覆盖。请保留此浏览器的数据，稍后重试。"); }
}
