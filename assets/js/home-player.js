(function attachHomePlayer(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (!root || !root.document) {
    return;
  }

  const start = () => api.bindPlayers(root.document);

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(typeof globalThis === "object" ? globalThis : this, function createHomePlayer() {
  "use strict";

  function normalizeIndex(index, length) {
    if (!Number.isInteger(length) || length <= 0) {
      return -1;
    }

    return ((index % length) + length) % length;
  }

  function nextIndex(index, length) {
    return normalizeIndex(index + 1, length);
  }

  function previousIndex(index, length) {
    return normalizeIndex(index - 1, length);
  }

  function bindPlayer(player) {
    const audio = player.querySelector("[data-player-audio]");
    const tracks = Array.from(player.querySelectorAll("[data-player-track]"));
    const previous = player.querySelector("[data-player-previous]");
    const next = player.querySelector("[data-player-next]");
    const nowPlaying = player.querySelector("[data-now-playing]");
    const status = player.querySelector("[data-player-status]");

    if (!audio || tracks.length === 0) {
      return;
    }

    let currentIndex = Math.max(0, tracks.findIndex((track) => track.classList.contains("is-active")));

    const setStatus = (message) => {
      if (status) {
        status.textContent = message;
      }
    };

    const setActiveTrack = (index) => {
      tracks.forEach((track, trackIndex) => {
        const active = trackIndex === index;
        track.classList.toggle("is-active", active);
        track.setAttribute("aria-pressed", String(active));
      });
    };

    const selectTrack = (index, shouldPlay) => {
      const normalized = normalizeIndex(index, tracks.length);
      if (normalized < 0) {
        return;
      }

      const track = tracks[normalized];
      currentIndex = normalized;
      audio.pause();
      audio.src = track.dataset.src;
      audio.load();
      setActiveTrack(normalized);
      setStatus("");

      if (nowPlaying) {
        nowPlaying.textContent = `${track.dataset.title} · ${track.dataset.artist}`;
      }

      if (shouldPlay) {
        const playRequest = audio.play();
        if (playRequest && typeof playRequest.catch === "function") {
          playRequest.catch(() => {
            setStatus("浏览器阻止了播放，请在音频控件中再次点击播放。");
          });
        }
      }
    };

    tracks.forEach((track, index) => {
      track.addEventListener("click", () => selectTrack(index, true));
    });

    if (previous) {
      previous.addEventListener("click", () => {
        selectTrack(previousIndex(currentIndex, tracks.length), true);
      });
    }

    if (next) {
      next.addEventListener("click", () => {
        selectTrack(nextIndex(currentIndex, tracks.length), true);
      });
    }

    audio.addEventListener("ended", () => {
      selectTrack(nextIndex(currentIndex, tracks.length), true);
    });
    audio.addEventListener("error", () => {
      setStatus("这首音频暂时无法加载，请切换其他曲目。");
    });
    audio.addEventListener("playing", () => setStatus(""));
  }

  function bindPlayers(documentRoot) {
    documentRoot.querySelectorAll("[data-home-player]").forEach(bindPlayer);
  }

  return {
    bindPlayer,
    bindPlayers,
    nextIndex,
    normalizeIndex,
    previousIndex,
  };
});
