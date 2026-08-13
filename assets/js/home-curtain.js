(function attachHomeCurtain(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (!root || !root.document) {
    return;
  }

  const start = () => api.bindHeroes(root.document);

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(typeof globalThis === "object" ? globalThis : this, function createHomeCurtain() {
  "use strict";

  function dateKey(date = new Date()) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new TypeError("date must be a valid Date");
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function hashString(value) {
    let hash = 2166136261;

    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function selectDailyIndex(date, length) {
    if (!Number.isInteger(length) || length <= 0) {
      return -1;
    }

    return hashString(dateKey(date)) % length;
  }

  function selectDailyImage(gallery, date = new Date()) {
    if (!Array.isArray(gallery) || gallery.length === 0) {
      return null;
    }

    return gallery[selectDailyIndex(date, gallery.length)] || null;
  }

  function parseGallery(hero) {
    const data = hero.querySelector("[data-hero-gallery]");

    if (!data) {
      return [];
    }

    try {
      const gallery = JSON.parse(data.textContent || "[]");
      return Array.isArray(gallery) ? gallery : [];
    } catch (_error) {
      return [];
    }
  }

  function bindHero(hero, date = new Date()) {
    const image = hero.querySelector("[data-hero-image]");
    const mobileSource = hero.querySelector("[data-hero-source]");
    const caption = hero.querySelector("[data-hero-caption]");
    const category = hero.querySelector("[data-hero-category]");
    const selected = selectDailyImage(parseGallery(hero), date);

    if (!image || !selected) {
      hero.classList.add("is-ready");
      return null;
    }

    if (mobileSource && selected.mobile) {
      mobileSource.srcset = selected.mobile;
    }

    image.alt = selected.alt || "";
    image.width = selected.width || 1920;
    image.height = selected.height || 1080;
    image.style.objectPosition = selected.position || "center";

    if (selected.desktopSrcset) {
      image.srcset = selected.desktopSrcset;
      image.sizes = "100vw";
    }

    if (caption) {
      caption.textContent = selected.title || "今日封面";
    }

    if (category) {
      category.textContent = selected.category || "每日精选";
    }

    const reveal = () => hero.classList.add("is-ready");
    image.addEventListener("load", reveal, { once: true });
    image.addEventListener("error", reveal, { once: true });
    image.src = selected.desktop;

    if (image.complete) {
      reveal();
    }

    return selected;
  }

  function bindHeroes(documentRoot) {
    const heroes = Array.from(documentRoot.querySelectorAll("[data-curtain-hero]"));

    heroes.forEach((hero) => {
      bindHero(hero);
    });

    const windowRoot = documentRoot.defaultView;
    const primaryHero = heroes[0];

    if (windowRoot && primaryHero) {
      const updateHeaderTone = () => {
        const revealPoint = primaryHero.offsetTop + primaryHero.offsetHeight - 80;
        documentRoot.documentElement.classList.toggle(
          "ec-curtain-scrolled",
          windowRoot.scrollY >= revealPoint,
        );
      };

      updateHeaderTone();
      windowRoot.addEventListener("scroll", updateHeaderTone, { passive: true });
      windowRoot.addEventListener("resize", updateHeaderTone);
    }
  }

  return {
    bindHero,
    bindHeroes,
    dateKey,
    hashString,
    selectDailyImage,
    selectDailyIndex,
  };
});
