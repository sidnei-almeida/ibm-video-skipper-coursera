/**
 * Deteção de contexto (resumo):
 *
 * 1) Coursera + superfície de aprendizagem
 *    - hostname *.coursera.org
 *    - path típico: /learn/..., /learn/.../lecture/..., /lecture/... (legado), .../learn/...
 *
 * 2) IBM — muitos cursos IBM não têm "ibm" no slug (ex.: advanced-deep-learning-with-pytorch).
 *    A Coursera inclui "Offered by IBM" nas meta tags e JSON-LD (provider.name).
 *    Combinamos: URL/slug, meta + JSON-LD, links de parceiro, título.
 *
 * Limitações: se a página de vídeo for um iframe cross-origin sem estes metadados, a deteção
 * pode falhar (o script corre no contexto desse frame).
 */
(() => {
  const INTRO_SEC = 6.5;
  const OUTRO_SEC = 5;
  const INTRO_START_MAX = 0.35;

  function isCourseraHost() {
    return location.hostname === "coursera.org" || location.hostname.endsWith(".coursera.org");
  }

  function isCourseraLearningSurface() {
    if (!isCourseraHost()) return false;
    const p = location.pathname;
    return (
      p.startsWith("/learn/") ||
      p.startsWith("/lecture/") ||
      p.includes("/learn/") ||
      p.startsWith("/professional-certificates/")
    );
  }

  function courseSlugFromPath() {
    const p = location.pathname;
    let m = p.match(/^\/learn\/([^/]+)/);
    if (m) return m[1];
    m = p.match(/^\/lecture\/([^/]+)/);
    if (m) return m[1];
    m = p.match(/\/learn\/([^/]+)/);
    return m ? m[1] : "";
  }

  function urlOrParamsSuggestIbm() {
    const blob = `${location.pathname}${location.search}${location.hash}`.toLowerCase();
    if (blob.includes("ibm")) return true;
    try {
      const params = new URLSearchParams(location.search);
      for (const v of params.values()) {
        if (String(v).toLowerCase().includes("ibm")) return true;
      }
    } catch (_) {
      /* ignore */
    }
    return false;
  }

  function slugSuggestsIbm() {
    const slug = courseSlugFromPath().toLowerCase();
    return slug.includes("ibm");
  }

  function domSuggestsIbm() {
    const selectors = [
      'a[href*="ibm-skills-network"]',
      'a[href*="coursera.org/partners/ibm"]',
      'a[href*="/partners/ibm"]',
    ];
    return selectors.some((sel) => document.querySelector(sel));
  }

  function titleSuggestsIbm() {
    return /\bIBM\b/i.test(document.title);
  }

  /**
   * Coursera mete "Offered by IBM." em description / og:description mesmo quando o slug não tem ibm.
   * Ex.: /learn/advanced-deep-learning-with-pytorch/lecture/...
   */
  function metaTagsSuggestIbm() {
    const metas = document.querySelectorAll(
      'meta[name="description"], meta[property="og:description"], meta[property="twitter:description"]',
    );
    for (const m of metas) {
      const c = m.getAttribute("content") || "";
      if (/offered by\s+ibm\b/i.test(c)) return true;
    }
    return false;
  }

  function jsonLdProviderIsIbm() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      const raw = s.textContent?.trim();
      if (!raw || !raw.includes("provider")) continue;
      try {
        const data = JSON.parse(raw);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const prov = item && item.provider;
          if (prov && typeof prov === "object" && prov.name === "IBM") return true;
        }
      } catch (_) {
        if (/"provider"\s*:\s*\{[\s\S]*?"name"\s*:\s*"IBM"/.test(raw)) return true;
      }
    }
    return false;
  }

  function shouldSkipIbmCourseraVideos() {
    if (!isCourseraLearningSurface()) return false;
    return (
      urlOrParamsSuggestIbm() ||
      slugSuggestsIbm() ||
      metaTagsSuggestIbm() ||
      jsonLdProviderIsIbm() ||
      domSuggestsIbm() ||
      titleSuggestsIbm()
    );
  }

  function attachVideo(video) {
    if (video.dataset.ibmCourseraSkipper === "1") return;
    video.dataset.ibmCourseraSkipper = "1";

    let outroArmed = true;

    const resetForNewSource = () => {
      outroArmed = true;
    };

    video.addEventListener("loadedmetadata", resetForNewSource);
    video.addEventListener("emptied", resetForNewSource);

    video.addEventListener("play", () => {
      if (!shouldSkipIbmCourseraVideos()) return;
      const d = video.duration;
      if (!Number.isFinite(d) || d <= INTRO_SEC + 0.5) return;
      if (video.currentTime <= INTRO_START_MAX) {
        video.currentTime = INTRO_SEC;
      }
    });

    video.addEventListener("timeupdate", () => {
      if (!shouldSkipIbmCourseraVideos()) return;
      if (!outroArmed) return;
      const d = video.duration;
      if (!Number.isFinite(d) || d <= INTRO_SEC + OUTRO_SEC + 0.5) return;
      const threshold = d - OUTRO_SEC;
      if (video.currentTime >= threshold && video.currentTime < d - 0.05) {
        outroArmed = false;
        try {
          video.currentTime = d;
        } catch (_) {
          /* ignore */
        }
      }
    });

    video.addEventListener("seeking", () => {
      if (!shouldSkipIbmCourseraVideos()) return;
      const d = video.duration;
      if (!Number.isFinite(d)) return;
      if (video.currentTime < d - OUTRO_SEC - 0.1) {
        outroArmed = true;
      }
    });
  }

  function scan() {
    if (!shouldSkipIbmCourseraVideos()) return;
    document.querySelectorAll("video").forEach(attachVideo);
  }

  function debounce(fn, ms) {
    let t;
    return () => {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  const debouncedScan = debounce(scan, 200);

  scan();

  const mo = new MutationObserver(() => debouncedScan());
  mo.observe(document.documentElement, { childList: true, subtree: true });

  function onNavigation() {
    debouncedScan();
  }

  const _pushState = history.pushState;
  const _replaceState = history.replaceState;
  history.pushState = function (...args) {
    const r = _pushState.apply(this, args);
    queueMicrotask(onNavigation);
    return r;
  };
  history.replaceState = function (...args) {
    const r = _replaceState.apply(this, args);
    queueMicrotask(onNavigation);
    return r;
  };
  window.addEventListener("popstate", onNavigation);
})();
