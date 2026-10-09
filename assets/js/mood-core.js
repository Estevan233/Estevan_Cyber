(function (root) {
  "use strict";
  const EMOTIONS = ["平静", "开心", "感激", "期待", "焦虑", "疲惫", "难过", "生气", "孤独", "迷茫"];
  const TRIGGERS = ["学业", "工作", "人际关系", "家庭", "睡眠", "身体状态", "独处", "运动", "日常小事", "暂不清楚"];
  const KEY = "estevancyber.mood.v1";
  const pad = (n) => String(n).padStart(2, "0");
  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function localTime(date = new Date()) {
    return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function validTime(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && localTime(parsed) === value && parsed.getFullYear() >= 2000;
  }
  function validateEntry(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("记录格式不正确");
    if (typeof entry.id !== "string" || !/^[A-Za-z0-9-]{1,80}$/.test(entry.id)) throw new Error("记录编号不正确");
    if (!validTime(entry.at)) throw new Error("记录时间不正确");
    for (const key of ["score", "energy"]) {
      if (!Number.isInteger(entry[key]) || entry[key] < 1 || entry[key] > 5) throw new Error("情绪或精力值不正确");
    }
    if (typeof entry.note !== "string" || entry.note.length > 2000) throw new Error("日记文字不能超过 2000 字");
    for (const [key, allowed] of [["emotions", EMOTIONS], ["triggers", TRIGGERS]]) {
      if (!Array.isArray(entry[key]) || entry[key].length > allowed.length || entry[key].some((item) => !allowed.includes(item))) throw new Error("标签不正确");
    }
    return { id: entry.id, at: entry.at, score: entry.score, energy: entry.energy, note: entry.note, emotions: [...new Set(entry.emotions)], triggers: [...new Set(entry.triggers)] };
  }
  function parseBackup(raw) {
    if (typeof raw !== "string" || raw.length > 5 * 1024 * 1024) throw new Error("备份文件过大（最多 5 MB）");
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 10000) throw new Error("不是受支持的情绪日记备份");
    const entries = data.entries.map(validateEntry);
    if (new Set(entries.map((e) => e.id)).size !== entries.length) throw new Error("备份包含重复记录编号");
    return entries;
  }
  function mergeEntries(current, incoming) {
    const merged = [...new Map([...current, ...incoming].map((e) => [e.id, validateEntry(e)])).values()];
    if (merged.length > 10000) throw new Error("最多保存 10000 条记录，请先导出备份");
    return merged.sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
  }
  function summarize(entries, days, now = new Date()) {
    if (![7, 30, 90].includes(days)) throw new Error("不支持的回顾范围");
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
    const end = localTime(now);
    const filtered = entries.filter((e) => e.at >= localTime(start) && e.at <= end);
    const daily = new Map();
    const triggers = new Map();
    for (const entry of filtered) {
      const key = entry.at.slice(0, 10);
      const row = daily.get(key) || { sum: 0, count: 0 };
      row.sum += entry.score; row.count += 1; daily.set(key, row);
      for (const tag of new Set(entry.triggers)) {
        const group = triggers.get(tag) || { name: tag, count: 0, sum: 0 };
        group.count += 1; group.sum += entry.score; triggers.set(tag, group);
      }
    }
    const timeline = [];
    for (let i = 0; i < days; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = dateKey(date); const row = daily.get(key);
      timeline.push({ date: key, average: row ? row.sum / row.count : null, count: row ? row.count : 0 });
    }
    return { count: filtered.length, activeDays: daily.size, average: filtered.length ? filtered.reduce((sum, e) => sum + e.score, 0) / filtered.length : null,
      timeline, triggers: [...triggers.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) };
  }
  function recommendation(score, emotions = []) {
    if (emotions.includes("疲惫")) return "如果有些累，先休息、喝点水，或让一段安静的音乐陪着你。不需要勉强运动。";
    if (emotions.includes("焦虑") || emotions.includes("生气") || score <= 2) return "此刻可能不太容易。可以试试温和呼吸或感官觉察；如果不适合你，停下来也完全可以。";
    if (score >= 4) return "把这一刻的好意留给自己。可以记下一件值得感激的小事，或在方便时散散步。";
    return "不需要立刻改变心情。选一段音乐，松松肩膀，或把注意力带回眼前。";
  }
  const api = { KEY, EMOTIONS, TRIGGERS, dateKey, localTime, validTime, validateEntry, parseBackup, mergeEntries, summarize, recommendation };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MoodCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
