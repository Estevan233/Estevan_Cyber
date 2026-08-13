(function attachHomeProgress(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (!root || !root.document) {
    return;
  }

  const start = () => {
    api.updateProgress(root.document);
    root.setInterval(() => api.updateProgress(root.document), 60_000);
  };

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(typeof globalThis === "object" ? globalThis : this, function createHomeProgress() {
  "use strict";

  function clampPercentage(value) {
    return Math.max(0, Math.min(100, Math.floor(value)));
  }

  function periodBounds(period, now) {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      throw new TypeError("now must be a valid Date");
    }

    const start = new Date(now.getTime());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime());

    switch (period) {
      case "day":
        end.setDate(end.getDate() + 1);
        break;
      case "week": {
        const daysSinceMonday = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - daysSinceMonday);
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 7);
        break;
      }
      case "month":
        start.setDate(1);
        end.setTime(start.getTime());
        end.setMonth(end.getMonth() + 1);
        break;
      case "year":
        start.setMonth(0, 1);
        end.setTime(start.getTime());
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        throw new RangeError(`Unsupported period: ${period}`);
    }

    return { start, end };
  }

  function periodProgress(period, now = new Date()) {
    const { start, end } = periodBounds(period, now);
    const elapsed = now.getTime() - start.getTime();
    const duration = end.getTime() - start.getTime();

    return clampPercentage((elapsed / duration) * 100);
  }

  function updateProgress(documentRoot, now = new Date()) {
    documentRoot.querySelectorAll("[data-period]").forEach((row) => {
      const value = periodProgress(row.dataset.period, now);
      const progress = row.querySelector("progress");
      const label = row.querySelector("[data-progress-value]");

      if (progress) {
        progress.value = value;
        progress.textContent = `${value}%`;
      }

      if (label) {
        label.textContent = `${value}%`;
      }
    });
  }

  return {
    clampPercentage,
    periodBounds,
    periodProgress,
    updateProgress,
  };
});
