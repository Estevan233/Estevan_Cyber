(function () {
  "use strict";
  if (!document.getElementById("mood-app")) return;
  const C = window.MoodCore;
  const $ = (id) => document.getElementById(id);
  const form = $("mood-form");
  const names = ["", "很低落", "有点难受", "还好", "挺不错", "很愉快"];
  let entries = [], editing = null, limit = 6, locked = false;
  function status(message, error = false) {
    $("mood-status").textContent = message;
    $("mood-status").dataset.error = String(error);
  }
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function download(raw, filename) {
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = node("a"); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  try {
    const raw = localStorage.getItem(C.KEY);
    if (raw !== null) entries = C.parseBackup(raw);
  } catch (error) {
    locked = true;
    status("无法读取本机日记，已停止写入以保护原数据。请先导出备份，再清空或恢复。原因：" + error.message, true);
  }
  function persist(next) {
    if (locked) { status("本机存储不可用或数据损坏。请先导出原始备份，再通过清空记录恢复。", true); return false; }
    try {
      localStorage.setItem(C.KEY, JSON.stringify({ version: 1, entries: next }));
      entries = next;
      render();
      return true;
    } catch (error) {
      status("保存失败，记录未更改。存储空间可能不足或浏览器禁用了存储，请导出备份。", true);
      return false;
    }
  }
  function selected(name) { return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value); }
  function resetForm() {
    form.reset(); editing = null;
    $("mood-at").value = C.localTime(); $("energy-value").textContent = "3 / 5";
    $("mood-cancel").hidden = true; $("editor-title").textContent = "现在，感觉怎么样？"; $("mood-save").textContent = "保存这一刻";
  }
  function showView(view) {
    for (const key of ["journal", "review", "care"]) $("view-" + key).hidden = key !== view;
    document.querySelectorAll(".mood-tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    if (view !== "care") { pauseBreathing(); $("care-audio").pause(); }
    if (view === "review") renderReview();
    if (view === "care") updateSuggestion();
  }
  document.querySelectorAll(".mood-tabs button").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  $("mood-open-care").addEventListener("click", () => showView("care"));
  $("mood-see-review").addEventListener("click", () => { showView("review"); $("view-review").scrollIntoView({ behavior: "auto", block: "start" }); });
  $("mood-cancel").addEventListener("click", resetForm);
  $("mood-energy").addEventListener("input", () => { $("energy-value").textContent = $("mood-energy").value + " / 5"; });
  function updateSuggestion() {
    const current = selected("score")[0];
    const latest = entries[0];
    const text = C.recommendation(current ? Number(current) : latest?.score, current ? selected("emotions") : (latest?.emotions || []));
    $("mood-suggestion").textContent = text;
    $("care-recommendation").textContent = (current ? "根据你当前的选择：" : latest ? "根据最近一次记录：" : "给此刻的你：") + text;
  }
  form.addEventListener("change", updateSuggestion);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      if (!C.validTime($("mood-at").value) || $("mood-at").value > C.localTime()) throw new Error("请选择有效时间，不能记录未来的情绪");
      const entry = C.validateEntry({ id: editing || crypto.randomUUID(), at: $("mood-at").value, score: Number(selected("score")[0]), energy: Number($("mood-energy").value), emotions: selected("emotions"), triggers: selected("triggers"), note: $("mood-note").value.trim() });
      if (persist(C.mergeEntries(entries, [entry]))) { resetForm(); updateSuggestion(); status("这一刻已保存。谢谢你愿意听听自己。"); }
    } catch (error) { status(error.message, true); }
  });
  function editEntry(entry) {
    resetForm(); editing = entry.id;
    for (const key of ["score", "emotions", "triggers"]) {
      form.querySelectorAll(`input[name="${key}"]`).forEach((input) => { input.checked = key === "score" ? Number(input.value) === entry.score : entry[key].includes(input.value); });
    }
    $("mood-at").value = entry.at; $("mood-note").value = entry.note; $("mood-energy").value = entry.energy; $("energy-value").textContent = entry.energy + " / 5";
    $("mood-cancel").hidden = false; $("editor-title").textContent = "回到那一刻"; $("mood-save").textContent = "保存修改";
    showView("journal"); form.scrollIntoView({ block: "start" }); $("mood-note").focus({ preventScroll: true }); updateSuggestion();
  }
  function render() {
    const sorted = C.mergeEntries(entries, []);
    const list = $("mood-history"); list.replaceChildren();
    if (!sorted.length) list.append(node("p", "这里暂时空着。写下第一条记录，给今天留一点位置。", "mood-empty"));
    for (const entry of sorted.slice(0, limit)) {
      const article = node("article", undefined, "mood-entry");
      const header = node("header"); header.append(node("strong", names[entry.score]));
      const time = node("time", entry.at.replace("T", " · ")); time.dateTime = entry.at; header.append(time); article.append(header);
      article.append(node("p", entry.note || "这一刻，没有写下文字。"));
      article.append(node("p", [...entry.emotions, ...entry.triggers, `精力 ${entry.energy}/5`].join(" · "), "mood-entry-tags"));
      const actions = node("div", undefined, "mood-actions");
      const edit = node("button", "编辑"); edit.type = "button"; edit.setAttribute("aria-label", "编辑 " + entry.at.replace("T", " ")); edit.addEventListener("click", () => editEntry(entry));
      const remove = node("button", "删除"); remove.type = "button"; remove.setAttribute("aria-label", "删除 " + entry.at.replace("T", " ")); remove.addEventListener("click", () => {
        if (confirm("删除这条日记？删除后无法撤销，请确认已备份。") && persist(entries.filter((e) => e.id !== entry.id))) {
          if (editing === entry.id) resetForm(); status("记录已删除。");
        }
      });
      actions.append(edit, remove); article.append(actions); list.append(article);
    }
    $("mood-load-more").hidden = sorted.length <= limit;
    $("today-count").textContent = sorted.filter((e) => e.at.slice(0, 10) === C.dateKey(new Date())).length;
    $("latest-note").textContent = sorted.length ? `最近一次：${sorted[0].at.replace("T", " ")} · ${names[sorted[0].score]}` : "还没有记录。随时开始，也随时休息。";
    updateSuggestion(); renderReview();
  }
  $("mood-load-more").addEventListener("click", () => { limit += 6; render(); });
  function renderReview() {
    const stats = C.summarize(entries, Number($("mood-period").value));
    const summary = $("mood-stats"); summary.replaceChildren();
    for (const [value, label] of [[stats.count, "次记录"], [stats.activeDays, "天留下了足迹"], [stats.average === null ? "—" : stats.average.toFixed(1), "平均心情 / 5（非健康评分）"]]) {
      const block = node("div", undefined, "mood-stat"); block.append(node("strong", value), node("span", label)); summary.append(block);
    }
    const chart = $("mood-chart"); chart.replaceChildren();
    if (!stats.count) chart.append(node("p", "这段时间还没有记录，图表会在你记录后自然出现。", "mood-empty"));
    else {
      const bars = node("div", undefined, "mood-chart-bars");
      for (const day of stats.timeline) {
        const row = node("div", undefined, "mood-chart-day"); row.dataset.empty = String(day.average === null);
        row.title = `${day.date}：${day.average === null ? "无记录" : day.average.toFixed(1) + "/5 · " + day.count + " 次"}`;
        row.setAttribute("role", "img"); row.setAttribute("aria-label", row.title); row.tabIndex = 0;
        const bar = node("i"); bar.style.height = (day.average === null ? 2 : day.average * 25) + "px";
        row.append(bar, node("span", day.date.slice(8))); bars.append(row);
      }
      chart.append(bars); chart.scrollLeft = chart.scrollWidth;
      const table = node("details"); table.append(node("summary", "查看每日具体数值"));
      const values = node("ul"); for (const day of stats.timeline.filter((d) => d.count)) values.append(node("li", `${day.date}：平均 ${day.average.toFixed(1)}/5，${day.count} 次记录`));
      table.append(values); chart.append(table);
    }
    const triggers = $("mood-triggers"); triggers.replaceChildren();
    if (!stats.triggers.length) triggers.append(node("p", "尚未记录影响因素。暂时不知道也没有关系。", "mood-muted"));
    for (const tag of stats.triggers) {
      const row = node("div", undefined, "mood-trigger"); const label = node("div"); label.append(node("span", tag.name), node("span", `${tag.count} 次 · 平均 ${(tag.sum / tag.count).toFixed(1)}/5`));
      const progress = node("progress"); progress.max = stats.count; progress.value = tag.count; progress.setAttribute("aria-label", `${tag.name}出现在 ${tag.count}/${stats.count} 次记录中`); row.append(label, progress); triggers.append(row);
    }
    $("mood-insight").textContent = stats.count < 3 ? "先积累几次真实记录，再慢慢找线索。我们不会用一两条日记给你贴标签。" : stats.triggers.length ? `这段时间，「${stats.triggers[0].name}」在你记录的因素中出现最多（${stats.triggers[0].count} 次）。可以回看当时发生了什么，也留意哪些时刻让你舒服一些。这只是共同出现的线索，不代表因果。` : "已经留下了一些足迹。下次如果愿意，可以顺手选择影响因素，让回顾更具体。";
  }
  $("mood-period").addEventListener("change", renderReview);
  $("mood-export").addEventListener("click", () => {
    try {
      const raw = localStorage.getItem(C.KEY) || JSON.stringify({ version: 1, entries: [] });
      download(raw, `emotion-diary-${C.dateKey(new Date())}.json`); status("已生成本机备份。文件未加密，请妥善保存。");
    } catch (error) { status("无法读取存储以导出备份：" + error.message, true); }
  });
  $("mood-import").addEventListener("change", async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("备份文件过大（最多 5 MB）");
      const incoming = C.parseBackup(await file.text());
      if (!confirm(`导入 ${incoming.length} 条记录？同编号的记录将被导入版本替换，其他记录保留。建议先导出当前备份。`)) return;
      if (persist(C.mergeEntries(entries, incoming))) { resetForm(); status(`导入完成，当前共 ${entries.length} 条记录。`); }
    } catch (error) { status("未导入，现有记录未更改：" + error.message, true); }
    finally { event.target.value = ""; }
  });
  $("mood-clear").addEventListener("click", () => {
    if (!confirm("永久清空此浏览器中的全部情绪日记？此操作无法撤销。请先导出备份。")) return;
    try { localStorage.removeItem(C.KEY); locked = false; entries = []; resetForm(); render(); status("本机日记已清空。"); }
    catch (error) { status("清空失败：" + error.message, true); }
  });
  // Re-read before the next save when another tab changes the same browser store.
  window.addEventListener("storage", (event) => {
    if (event.key !== C.KEY && event.key !== null) return;
    try { entries = event.newValue === null ? [] : C.parseBackup(event.newValue); locked = false; resetForm(); render(); status("其他标签页修改了记录，当前页面已同步。"); }
    catch (error) { locked = true; status("其他标签页的数据无法读取，已停止写入。请先导出备份。", true); }
  });
  let timer = null, elapsed = 0, started = 0, baseElapsed = 0;
  function paintBreathing() {
    const seconds = Math.min(300, Math.floor(elapsed / 1000));
    const left = 300 - seconds;
    $("breath-time").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    const active = timer !== null;
    $("breath-phase").textContent = left === 0 ? "谢谢你陪了自己一会儿" : active ? seconds % 10 < 5 ? "轻轻吸气" : "慢慢呼气" : elapsed ? "暂停 · 按自己的节奏" : "准备好了再开始";
    $("breath-visual").dataset.phase = active ? seconds % 10 < 5 ? "in" : "out" : "idle";
    $("breath-start").textContent = active ? "暂停" : left === 0 ? "再来一次" : elapsed ? "继续" : "开始 5 分钟";
  }
  function pauseBreathing() {
    if (timer !== null) { elapsed = baseElapsed + Date.now() - started; clearInterval(timer); timer = null; paintBreathing(); }
  }
  $("breath-start").addEventListener("click", () => {
    if (timer !== null) { pauseBreathing(); return; }
    if (elapsed >= 300000) elapsed = 0;
    baseElapsed = elapsed; started = Date.now();
    timer = setInterval(() => {
      elapsed = baseElapsed + Date.now() - started;
      if (elapsed >= 300000) { clearInterval(timer); timer = null; elapsed = 300000; }
      paintBreathing();
    }, 250);
    paintBreathing();
  });
  $("breath-reset").addEventListener("click", () => { pauseBreathing(); elapsed = 0; paintBreathing(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { pauseBreathing(); $("care-audio").pause(); } });
  const steps = ["看看周围，找到 5 样你看得见的东西。", "感受 4 样你能触碰的东西，例如衣服、椅子或地面。", "听听身边，注意 3 种声音。", "留意 2 种你能闻到或想起的气味。", "注意 1 种味道，或感受一小口水。", "把注意力带回双脚和周围。你可以在这里停一会儿。"];
  let step = 0;
  function paintGrounding() { $("ground-number").textContent = step < 5 ? 5 - step : "✓"; $("ground-instruction").textContent = steps[step]; $("ground-next").textContent = step === 5 ? "再走一遍" : "下一步"; }
  $("ground-next").addEventListener("click", () => { step = (step + 1) % steps.length; paintGrounding(); });
  $("ground-reset").addEventListener("click", () => { step = 0; paintGrounding(); });
  function loadTrack() { $("care-audio").pause(); $("care-audio").src = $("care-track").value; $("care-audio-status").textContent = ""; }
  $("care-track").addEventListener("change", loadTrack);
  $("care-audio").addEventListener("error", () => { $("care-audio-status").textContent = "音乐暂时无法加载，请切换曲目或稍后重试。"; });
  resetForm(); render(); loadTrack();
})();
