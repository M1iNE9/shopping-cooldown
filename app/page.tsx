"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Clock3, History, ImageIcon, LockKeyhole, Package, Pause, Pencil, Plus, Trash2, X } from "lucide-react";
import { RadioGroup, Tabs } from "radix-ui";
import { Toaster, toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createItem, DAY, decide, extend, MINUTE, money, monthStats, QUESTIONS, reflect, remaining, statusAt, TAGS, updateItem, type Item, type ItemInput } from "@/lib/cooldown";
import { useCooldown } from "@/lib/use-cooldown";

const STATUS_TEXT = { cooling: "冷静中", ready: "可以重新决定", abandoned: "最后没买", purchased: "仍然想买" };
const dateText = (time: number) => new Date(time).toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const blankInput: ItemInput = { name: "", price: 0, image: "", url: "", reason: "", triggerTag: "" };

function Choices({ label, value, options, onChange, className = "" }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; className?: string }) {
  return <RadioGroup.Root aria-label={label} value={value} onValueChange={onChange} className={`choices ${className}`}>
    {options.map(option => <RadioGroup.Item key={option} value={option} className="choice">{option}</RadioGroup.Item>)}
  </RadioGroup.Root>;
}

function Thumbnail({ item }: { item: Item }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.image]);
  return <span className="thumbnail">{item.image && !failed
    ? <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : <Package size={25} strokeWidth={1.2} />}</span>;
}

function ItemCard({ item, now, onOpen }: { item: Item; now: number; onOpen: () => void }) {
  const status = statusAt(item, now);
  return <button className={`item-card ${status}`} onClick={onOpen} aria-label={`查看 ${item.name}，${STATUS_TEXT[status]}`}>
    <div className="item-top"><Thumbnail item={item} /><div className="item-info"><h3>{item.name}</h3><p className="price">{money(item.price)}</p></div><ChevronRight size={17} className="card-arrow" /></div>
    <div className="item-meta">{item.triggerTag && <span className="tag">{item.triggerTag}</span>}<span>{dateText(item.createdAt)}加入</span></div>
    <div className="card-bottom">{status === "cooling" ? <><Clock3 size={17} strokeWidth={1.5} /><span>还有 <strong>{remaining(item.cooldownEndAt, now)}</strong><small>再决定</small></span></> : status === "ready" ? <><Clock3 size={17} /><span><strong>可以重新决定</strong><small>现在再看看，你还想买吗？</small></span></> : <><Check size={17} /><span><strong>{STATUS_TEXT[status]}</strong><small>{item.finalDecisionAt ? dateText(item.finalDecisionAt) : ""}</small></span></>}</div>
  </button>;
}

function ItemForm({ initial, onSave, onClose }: { initial?: Item; onSave: (input: ItemInput, duration: number) => void; onClose: () => void }) {
  const [input, setInput] = useState<ItemInput>(initial || blankInput);
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [period, setPeriod] = useState("24 小时");
  const [custom, setCustom] = useState("1");
  const [unit, setUnit] = useState("天");
  const [error, setError] = useState("");
  const saving = useRef(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving.current) return;
    saving.current = true;
    try {
      if (!price.trim()) throw new Error("请填写商品价格。");
      const duration = period === "自定义" ? Number(custom) * ({ "天": DAY, "小时": 60 * MINUTE, "分钟": MINUTE }[unit] || DAY) : { "24 小时": DAY, "3 天": 3 * DAY, "7 天": 7 * DAY }[period] || DAY;
      onSave({ ...input, price: Number(price) }, duration);
    } catch (err) { setError(err instanceof Error ? err.message : "暂时无法保存，请重试。"); }
    finally { saving.current = false; }
  }
  return <form onSubmit={submit} className="item-form">
    <div className="form-row"><label className="name-field">商品名称 <span>*</span><input autoFocus required maxLength={80} value={input.name} onChange={e => setInput({ ...input, name: e.target.value })} placeholder="那个一直惦记的东西" /></label><label>价格（元） <span>*</span><input required inputMode="decimal" type="number" min="0" max="100000000" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></label></div>
    <label>商品链接 <span>选填</span><input type="url" maxLength={2048} value={input.url} onChange={e => setInput({ ...input, url: e.target.value })} placeholder="https://…" /><small>先替你收好，冷静后决定购买时再打开。</small></label>
    <label>为什么现在想买？ <span>选填</span><textarea rows={2} maxLength={500} value={input.reason} onChange={e => setInput({ ...input, reason: e.target.value })} placeholder="写给过几天的自己看。" /></label>
    <fieldset><legend>是什么让你心动？ <span>选填</span></legend><Choices label="冲动原因" options={TAGS} value={input.triggerTag} onChange={triggerTag => setInput({ ...input, triggerTag })} className="tags-choices" />{input.triggerTag && <button type="button" className="clear-choice" onClick={() => setInput({ ...input, triggerTag: "" })}>清除选择</button>}</fieldset>
    {!initial && <fieldset><legend>冷静多久？</legend><Choices label="冷静多久" options={["24 小时", "3 天", "7 天", "自定义"]} value={period} onChange={setPeriod} className="period-choices" />{period === "自定义" && <div className="custom-period"><input aria-label="自定义冷静时长" required type="number" min="1" step="1" max={unit === "天" ? 365 : unit === "小时" ? 8760 : 525600} value={custom} onChange={e => setCustom(e.target.value)} /><select aria-label="时间单位" value={unit} onChange={e => setUnit(e.target.value)}><option>天</option><option>小时</option><option>分钟</option></select><span>最长 365 天</span></div>}</fieldset>}
    <details className="optional-image" open={initial?.image ? true : undefined}><summary><ImageIcon size={15} />添加商品图片 <span>选填</span></summary><label>图片 URL<input type="url" maxLength={2048} value={input.image} onChange={e => setInput({ ...input, image: e.target.value })} placeholder="https://…" /><small>图片会从你填写的网站加载。</small></label></details>
    {error && <p role="alert" className="error-note">{error}</p>}
    {initial && <p className="form-note">修改商品信息不会重新开始倒计时。</p>}
    <div className="form-footer"><button type="button" className="button secondary" onClick={onClose}>取消</button><button type="submit" className="button primary"><Pause size={15} />{initial ? "保存修改" : "开始冷静"}</button></div>
  </form>;
}

export default function Home() {
  const { items, loaded, error, now, reload, commit } = useCooldown();
  const [view, setView] = useState("home");
  const [filter, setFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "purchase" | null>(null);
  const [extending, setExtending] = useState(false);
  const focusOrigin = useRef<HTMLElement | null>(null);
  const actionBusy = useRef(false);
  const selected = items.find(item => item.id === selectedId);
  const currentStatus = selected ? statusAt(selected, now) : null;
  const stats = monthStats(items, now);
  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
  const cooling = sorted.filter(item => statusAt(item, now) === "cooling");
  const ready = sorted.filter(item => statusAt(item, now) === "ready").sort((a, b) => a.cooldownEndAt - b.cooldownEndAt);
  const history = sorted.filter(item => ["abandoned", "purchased"].includes(item.status)).sort((a, b) => (b.finalDecisionAt || 0) - (a.finalDecisionAt || 0));
  const visibleHistory = history.filter(item => filter === "all" || item.status === filter);
  function openForm(initial?: Item) { focusOrigin.current = document.activeElement as HTMLElement; setEditing(initial); setFormOpen(true); }
  function restoreFocus() { window.requestAnimationFrame(() => (focusOrigin.current?.isConnected ? focusOrigin.current : document.getElementById("add-item"))?.focus()); }
  function closeDetail() { setSelectedId(null); setExtending(false); setConfirm(null); }
  function onItem(id: string) { focusOrigin.current = document.activeElement as HTMLElement; setSelectedId(id); setExtending(false); }
  function safely(action: () => void) { if (actionBusy.current) return; actionBusy.current = true; try { action(); } catch (err) { toast.error(err instanceof Error ? err.message : "操作没有成功，请重试。"); } finally { actionBusy.current = false; } }
  function change(id: string, action: (item: Item) => Item) {
    return commit(current => { if (!current.some(item => item.id === id)) throw new Error("记录已在其他页面移除，请刷新后查看。"); return current.map(item => item.id === id ? action(item) : item); });
  }
  function save(input: ItemInput, duration: number) {
    if (editing) change(editing.id, item => updateItem(item, input, Date.now()));
    else { const item = createItem(input, duration, Date.now(), crypto.randomUUID()); commit(current => [item, ...current]); }
    setFormOpen(false); setEditing(undefined); toast.success(editing ? "已保存，冷静时间保持不变。" : "先放一放，给自己一点时间。");
  }
  function finalDecision(decision: "abandoned" | "purchased") {
    if (!selected) return;
    safely(() => {
      change(selected.id, item => decide(item, decision, Date.now())); setConfirm(null);
      if (decision === "abandoned") { toast.success("成功冷静下来。", { description: `避免冲动消费 ${money(selected.price)}` }); closeDetail(); setView("history"); setFilter("abandoned"); }
      else toast("已经记下你的决定。", { description: "买或不买，都由你决定。" });
    });
  }
  function deleteItem() {
    if (!selected) return;
    safely(() => {
      let removed: Item | undefined;
      commit(current => { removed = current.find(item => item.id === selected.id); return current.filter(item => item.id !== selected.id); });
      closeDetail();
      toast("记录已移除", { duration: 10_000, action: { label: "撤销", onClick: () => safely(() => { const item = removed; if (item) commit(current => current.some(x => x.id === item.id) ? current : [item, ...current]); }) } });
    });
  }

  useEffect(() => {
    type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown };
    const context = (document as Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(context.registerTool({
        name: "start_cooldown_entry", description: "打开添加商品表单。只开始填写流程，不创建记录；用户填写并点击开始冷静后才保存。", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) { if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("This tool accepts an empty object."); focusOrigin.current = document.activeElement as HTMLElement; setEditing(undefined); setFormOpen(true); return { form: "open", itemCreated: false }; },
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Optional API is absent in most browsers. */ }
    return () => lifecycle.abort();
  }, []);

  return <div className="shell">
    <a className="skip-link" href="#main">跳到主要内容</a>
    <header className="site-header"><button className="brand" onClick={() => setView("home")} aria-label="购物冷静器首页"><span className="wordmark" aria-hidden="true"><i>w</i><i>a</i><i>i</i><i>t</i><i>.</i></span><span className="brand-name">购物冷静器<small>给冲动，按个暂停。</small></span></button><button className="text-button" onClick={() => { setView(view === "home" ? "history" : "home"); setFilter("all"); }}>{view === "home" ? <><History size={17} />历史记录</> : <><ArrowLeft size={17} />返回清单</>}</button></header>
    <main id="main">
      <section className={`intro ${view === "history" ? "history-intro" : ""}`}><div className="intro-copy"><span className="eyebrow">{view === "home" ? "给自己一点时间 / TAKE YOUR TIME" : "每一次认真想过，都算数"}</span><h1>{view === "home" ? "先别急着买" : "过去的决定"}<span>。</span></h1><p>{view === "home" ? "把想买的东西放在这里，过几天再决定。" : "回头看看，那些曾经让你心动的东西。"}</p><button id="add-item" className="button primary" disabled={!loaded || !!error} onClick={() => openForm()}><Plus size={18} />加入冷静期</button></div><div className="intro-keepsake has-image" aria-hidden="true"><img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/hourglass-collage.png`} alt="" width={260} height={260} /><span className="keepsake-note">喜欢的东西，值得慢慢想。</span></div></section>
      {error ? <div role="alert" className="storage-error"><h2>记录暂时没有读出来。</h2><p>{error}</p><button className="button secondary" onClick={reload}>重新读取</button></div> : !loaded ? <div className="loading-state" role="status"><Clock3 size={22} />正在找回你的冷静清单…</div> : view === "home" ? <>
        <section className="list-section"><div className="section-heading"><h2>正在冷静 <span className="count">{cooling.length}</span></h2><span className="subtle">现在，不需要做决定</span></div>{cooling.length ? <div className="item-grid">{cooling.map(item => <ItemCard key={item.id} item={item} now={now} onOpen={() => onItem(item.id)} />)}</div> : <div className="empty-state"><span className="empty-icon"><Clock3 size={28} strokeWidth={1.3} /></span><h3>{items.length ? "此刻，没有正在等待的东西。" : "这里还没有东西。"}</h3><p>下次看到一个特别想买的东西，<br />可以先放在这里。</p><button className="button secondary" onClick={() => openForm()}><Plus size={16} />{items.length ? "加入冷静期" : "加入第一个商品"}</button></div>}</section>
        {ready.length > 0 && <section className="list-section ready-section"><div className="section-heading"><h2>可以重新决定 <span className="count">{ready.length}</span></h2><span className="subtle">不急，按你的节奏来</span></div><div className="item-grid">{ready.map(item => <ItemCard key={item.id} item={item} now={now} onOpen={() => onItem(item.id)} />)}</div></section>}
        <section className="results"><div className="section-heading"><div><span className="eyebrow">我的冷静成果</span><h2>给消费留一点余地。</h2></div><span className="month-label">{new Date(now).getFullYear()} 年 {new Date(now).getMonth() + 1} 月</span></div><div className="metrics"><div><span>本月加入冷静期</span><strong>{stats.added}<small> 件</small></strong></div><div><span>本月最终没买</span><strong>{stats.abandoned}<small> 件</small></strong></div><div><span>本月避免冲动消费</span><strong>{money(stats.avoided)}</strong></div></div>
          {stats.tags.length > 0 && <div className="insight"><span className="insight-label">我的冲动来源</span><p>这个月，{stats.tags.filter(x => x.count === stats.tags[0].count).map(x => `「${x.tag}」`).join("、")}最常让你心动。</p><div className="insight-tags">{stats.tags.map(x => <span key={x.tag}>{x.tag}<b>{x.count} 次</b></span>)}</div></div>}
        </section>
      </> : <section className="history-section"><Tabs.Root value={filter} onValueChange={setFilter}><Tabs.List className="history-tabs" aria-label="历史记录筛选"><Tabs.Trigger value="all">全部 <span>{history.length}</span></Tabs.Trigger><Tabs.Trigger value="abandoned">没买 <span>{history.filter(x => x.status === "abandoned").length}</span></Tabs.Trigger><Tabs.Trigger value="purchased">决定购买 <span>{history.filter(x => x.status === "purchased").length}</span></Tabs.Trigger></Tabs.List>{["all", "abandoned", "purchased"].map(tab => <Tabs.Content key={tab} value={tab}>{visibleHistory.length ? <div className="item-grid">{visibleHistory.map(item => <ItemCard key={item.id} item={item} now={now} onOpen={() => onItem(item.id)} />)}</div> : <div className="empty-state"><span className="empty-icon"><History size={26} strokeWidth={1.3} /></span><h3>还没有这样的记录。</h3><p>等你重新做出决定，它就会留在这里。</p><button className="button secondary" onClick={() => setView("home")}>回到冷静清单</button></div>}</Tabs.Content>)}</Tabs.Root></section>}
    </main>
    <footer><div><span><LockKeyhole size={14} />记录仅保存在此浏览器</span><small>换设备、无痕浏览或清除浏览器数据后，记录不会同步保留。</small></div><span>买或不买，都由你决定。</span></footer>
    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="calm-dialog form-dialog" showCloseButton={false} onCloseAutoFocus={event => { if (!selectedId) { event.preventDefault(); restoreFocus(); } }}><div className="dialog-heading"><div><DialogTitle>{editing ? "再整理一下。" : "先放这里。"}</DialogTitle><DialogDescription>{editing ? "记下准确的信息，继续按自己的节奏等待。" : "今天先记下来，把决定留给之后的自己。"}</DialogDescription></div><DialogClose className="icon-button" aria-label="关闭添加商品"><X size={19} /></DialogClose></div><ItemForm key={editing?.id || "new"} initial={editing} onSave={save} onClose={() => setFormOpen(false)} /></DialogContent></Dialog>
    <Dialog open={!!selected && !formOpen} onOpenChange={open => { if (!open) closeDetail(); }}><DialogContent className="calm-dialog detail-dialog" showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); if (!formOpen) restoreFocus(); }}><div className="dialog-heading"><div><span className={`status-pill ${currentStatus}`}>{currentStatus && STATUS_TEXT[currentStatus]}</span><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>给自己一个重新思考的空间。</DialogDescription></div><DialogClose className="icon-button" aria-label="关闭商品详情"><X size={19} /></DialogClose></div>{selected && <>
      <div className="detail-product"><Thumbnail item={selected} /><div><strong>{money(selected.price)}</strong><p>{dateText(selected.createdAt)} 加入冷静期</p></div>{["cooling", "ready"].includes(currentStatus || "") && <button className="text-button" onClick={() => openForm(selected)}><Pencil size={15} />编辑</button>}</div>
      {currentStatus === "cooling" ? <div className="detail-countdown"><span>还有</span><strong>{remaining(selected.cooldownEndAt, now)}</strong><span>再决定</span><small>{dateText(selected.cooldownEndAt)} 后可以重新决定</small></div> : currentStatus === "ready" ? <div className="decision-intro"><h3>冷静时间到了。</h3><p>现在再看看，你还想买吗？</p></div> : <div className="decision-intro"><h3>{currentStatus === "abandoned" ? "这件东西，你最后没有买。" : "认真想过，还是喜欢。"}</h3><p>{currentStatus === "abandoned" ? `避免冲动消费 ${money(selected.price)}` : "这是你给自己留过时间之后的决定。"}</p></div>}
      <div className="original-reason"><h3>当时为什么想买？</h3><p>{selected.reason || "当时没有写下理由，也没关系。"}</p>{selected.triggerTag && <span className="tag">{selected.triggerTag}</span>}</div>
      <section className="reflections"><h3>再想一下 <span>可选 · 回答自动保存</span></h3>{QUESTIONS.map((question, index) => <div className="reflection" key={question.text}><p><span>0{index + 1}</span>{question.text}</p><Choices label={question.text} options={question.options} value={selected.reflectionAnswers[index]} onChange={answer => safely(() => { change(selected.id, item => reflect(item, index, answer)); })} />{selected.reflectionAnswers[index] && <button className="clear-choice" onClick={() => safely(() => { change(selected.id, item => reflect(item, index, "")); })}>清除回答</button>}</div>)}</section>
      {currentStatus === "ready" && <div className="decision-area"><div className="decision-actions"><button className="button secondary" onClick={() => finalDecision("abandoned")}>不买了</button><button className="button secondary" aria-expanded={extending} onClick={() => setExtending(!extending)}>再等等</button><button className="button secondary" onClick={() => setConfirm("purchase")}>还是想买</button></div>{extending && <div className="extend-options"><span>那就再放一放。</span>{[1, 3, 7].map(days => <button className="choice" key={days} onClick={() => safely(() => { change(selected.id, item => extend(item, days, Date.now())); setExtending(false); toast("那就再放一放。"); })}>再等 {days} 天</button>)}</div>}</div>}
      {currentStatus === "purchased" && <div className="purchase-link">{selected.url ? <a className="button secondary" href={selected.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">前往商品页面<ArrowUpRight size={17} /></a> : <p>没有填写商品链接，你可以自行前往商品页面。</p>}<small>这里记录的是购买决定，不代表已经付款。</small></div>}
      <div className="detail-footer"><span>{selected.finalDecisionAt ? `${dateText(selected.finalDecisionAt)} 做出决定` : "不急着得出答案。"}</span><button className="text-button" onClick={() => setConfirm("delete")}><Trash2 size={15} />移除记录</button></div>
    </>}</DialogContent></Dialog>
    <AlertDialog open={!!confirm} onOpenChange={open => { if (!open) setConfirm(null); }}><AlertDialogContent className="calm-confirm"><AlertDialogTitle>{confirm === "delete" ? "移除这条记录？" : "认真想过，还是想买？"}</AlertDialogTitle><AlertDialogDescription>{confirm === "delete" ? "这条记录也会从冷静成果中移除。移除后可以通过提示中的「撤销」恢复。" : "将它记为「决定购买」。如果你存过商品链接，接下来就可以打开。"}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel className="button secondary">{confirm === "delete" ? "保留记录" : "再想一想"}</AlertDialogCancel><button className="button primary" onClick={() => confirm === "delete" ? deleteItem() : finalDecision("purchased")}>{confirm === "delete" ? "移除记录" : "确认决定购买"}</button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Toaster position="bottom-center" duration={3000} toastOptions={{ className: "calm-toast" }} />
  </div>;
}
