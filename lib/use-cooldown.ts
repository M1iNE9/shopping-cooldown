"use client";
import { useCallback, useEffect, useState } from "react";
import { deserialize, serialize, STORAGE_KEY, type Item } from "./cooldown";

export function useCooldown() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const reload = useCallback(() => {
    try { setItems(deserialize(localStorage.getItem(STORAGE_KEY))); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "浏览器暂时无法保存记录，请检查存储权限后重试。"); }
    finally { setNow(Date.now()); setLoaded(true); }
  }, []);
  useEffect(() => {
    reload();
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) reload(); };
    const refresh = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener("storage", sync);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", reload); document.removeEventListener("visibilitychange", refresh); };
  }, [reload]);
  useEffect(() => {
    if (!loaded) return;
    const current = Date.now();
    const nearest = items.filter(x => x.status === "cooling" || x.status === "ready").map(x => x.cooldownEndAt - current).filter(x => x > 0);
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(50, Math.min(60_000, ...nearest)));
    return () => window.clearTimeout(timer);
  }, [items, now, loaded]);
  const commit = useCallback((transform: (current: Item[]) => Item[]) => {
    // Read immediately before writing, preserving recent changes from another tab.
    const current = deserialize(localStorage.getItem(STORAGE_KEY));
    const next = transform(current);
    try { localStorage.setItem(STORAGE_KEY, serialize(next)); }
    catch { throw new Error("保存没有成功，记录未更新。浏览器存储可能已满或被禁用，请检查后重试。"); }
    setItems(next); setNow(Date.now()); setError("");
    return next;
  }, []);
  return { items, loaded, now, error, reload, commit };
}
