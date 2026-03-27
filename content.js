/**
 * Deteção de contexto (resumo):
 *
 * 1) Coursera + superfície de aprendizagem
 *    - hostname *.coursera.org
 *    - path típico: /learn/..., /lecture/..., ... (também no window.top quando same-origin)
 *
 * 2) IBM — muitos cursos IBM não têm "ibm" no slug.
 *    Meta tags + JSON-LD no documento principal; o <video> pode estar noutro frame ou shadow DOM.
 *    Por isso: sinais IBM leem vários documentos same-origin (top/parent) quando possível.
 *
 * 3) scan() anexa vídeos só com base na superfície Coursera; o skip só corre se shouldSkip… for true.
 */
(() => {
  /** Set to `false` before release to silence console diagnostics. */
  const DEBUG = true;
  const dbg = (...args) => {
    if (DEBUG) console.log("[ibm-skipper]", ...args);
  };

  const INTRO_SEC = 6.5;
  const OUTRO_SEC = 5.5;
  const INTRO_START_MAX = 0.35;
  // false = fail-open em páginas de aula Coursera (recomendado para robustez).
  // true = só salta quando sinais IBM forem detetados.
  const STRICT_IBM_ONLY = false;
  const IBM_KNOWN_COURSE_SLUGS = new Set([
    // AUTO-GENERATED-IBM-SLUGS-START
    "advanced-deep-learning-with-pytorch",
    "advanced-rag-with-vector-databases-and-retrievers",
    "agentic-ai-with-langchain-and-langgraph",
    "agentic-ai-with-langgraph-crewai-autogen-and-beeai",
    "agile-development-and-scrum",
    "ai-deep-learning-capstone",
    "ai-engineer",
    "ai-foundations-for-everyone",
    "aix-basics",
    "application-modernization-for-enterprise-systems",
    "application-security-for-developers-devops",
    "applications-development-microservices-serverless-openshift",
    "applied-artifical-intelligence-ibm-watson-ai",
    "applied-data-science",
    "applied-data-science-capstone",
    "applied-data-science-r",
    "architecting-applications-ibm-z-cloud",
    "backend-development-capstone-project",
    "backend-javascript-developer",
    "bases-de-inteligencia-artificial-para-todos",
    "bi-analyst",
    "bi-dashboards-with-ibm-cognos-analytics-and-google-looker",
    "bi-foundations-sql-etl-data-warehouse",
    "build-ai-agents-using-mcp",
    "build-multimodal-generative-ai-applications",
    "build-rag-applications-get-started",
    "building-ai-agents-and-agentic-workflows",
    "building-ai-powered-chatbots",
    "building-deep-learning-models-with-tensorflow",
    "building-gen-ai-powered-applications",
    "business-intelligence-essentials",
    "capstone-project--digital-marketing-and-growth-hacking",
    "capstone-project-applying-business-analysis-skills",
    "career-guide-and-interview-prep-for-data-analyst",
    "career-guide-and-interview-prep-for-data-science-pc",
    "cloud-native-devops-agile-nosql",
    "cloud-native-microservices-containers-devops-agile",
    "cloud-operations-monitoring-security-and-compliance",
    "cobol-data-file-management",
    "cobol-programming-vscode",
    "cobol-testing-debugging",
    "continuous-integration-and-continuous-delivery-ci-cd",
    "core1-hardware-and-network-troubleshooting",
    "core2-os-software-security-and-operational-procedures",
    "cybersecurity-architecture",
    "cybersecurity-assessment-comptia-security-cysa",
    "cybersecurity-case-studies-capstone-project",
    "cybersecurity-compliance-framework-standards-regulations",
    "cybersecurity-fundamentals",
    "cybersecurity-job-search-resume-and-interview-prep",
    "data-analysis-visualization-foundations",
    "data-analysis-visualization-foundations-assessment",
    "data-analysis-with-python",
    "data-analysis-with-r",
    "data-engineering-career-guide-and-interview-preparation",
    "data-engineering-foundations",
    "data-enginering-capstone-project",
    "data-science-fundamentals-python-sql",
    "data-science-methodology",
    "data-science-with-r-capstone-project",
    "data-visualization-dashboards-excel-cognos",
    "data-visualization-r",
    "data-warehouse-engineering",
    "data-warehouse-fundamentals",
    "data-warehousing-capstone-project",
    "database-essentials-and-vulnerabilities",
    "deep-learning-reinforcement-learning",
    "deep-neural-networks-with-pytorch",
    "delivering-quality-work-with-agility",
    "designing-hybrid-and-multicloud-architectures",
    "designing-user-interfaces-and-experiences-uiux",
    "develop-generative-ai-applications-get-started",
    "developing-applications-with-sql-databases-and-django",
    "developing-backend-apps-with-nodejs-and-express",
    "developing-frontend-apps-with-react",
    "developing-mobile-apps-with-flutter",
    "developing-mobile-apps-with-react-native",
    "developing-websites-and-front-ends-with-bootstrap",
    "devops-and-software-engineering",
    "devops-capstone-project",
    "devops-cloud-and-agile-foundations",
    "digital-strategy",
    "encryption-and-cryptography-essentials",
    "enterprise-resiliency",
    "ethical-hacking-capstone-project-breach-response-ai",
    "ethical-hacking-with-kali-linux",
    "etl-and-data-pipelines-shell-airflow-kafka",
    "excel-basics-data-analysis-ibm",
    "exploitation-and-penetration-testing-with-metasploit",
    "flutter-and-dart-developing-ios-android-mobile-apps",
    "front-end-development-capstone-project",
    "full-stack-software-developer-assessment",
    "fundamentals-of-ai-agents-using-rag-and-langchain",
    "fundamentals-of-building-ai-agents",
    "gen-ai-foundational-models-for-nlp-and-language-understanding",
    "genai-for-execs-business-leaders-formulate-your-use-case",
    "genai-for-seo-a-hands-on-playbook",
    "generative-ai--accelerate-your-digital-marketing-career",
    "generative-ai-advanced-fine-tuning-for-llms",
    "generative-ai-boost-your-cybersecurity-career",
    "generative-ai-boost-your-sales-career",
    "generative-ai-business-and-career-growth",
    "generative-ai-educators",
    "generative-ai-elevate-software-development-career",
    "generative-ai-elevate-your-data-engineering-career",
    "generative-ai-elevate-your-data-science-career",
    "generative-ai-empowering-modern-education",
    "generative-ai-engineering-and-fine-tuning-transformers",
    "generative-ai-engineering-with-llms",
    "generative-ai-enhance-your-data-analytics-career",
    "generative-ai-ethical-considerations-and-implications",
    "generative-ai-for-business-analysts",
    "generative-ai-for-business-intelligence-analysts",
    "generative-ai-for-customer-support",
    "generative-ai-for-cybersecurity-professionals",
    "generative-ai-for-data-analysts",
    "generative-ai-for-data-engineers",
    "generative-ai-for-data-scientists",
    "generative-ai-for-digital-marketing",
    "generative-ai-for-everyone",
    "generative-ai-for-executives-and-business-leaders",
    "generative-ai-for-executives-and-business-leaders-integration-strategy",
    "generative-ai-for-executives-business-leaders-introduction",
    "generative-ai-for-human-resources",
    "generative-ai-for-java-and-spring-developers",
    "generative-ai-for-mobile-app-developers",
    "generative-ai-for-product-managers",
    "generative-ai-for-product-owners",
    "generative-ai-for-program-managers",
    "generative-ai-for-project-managers",
    "generative-ai-for-sales-professionals",
    "generative-ai-for-software-developers",
    "generative-ai-for-ui-ux-design",
    "generative-ai-foundation-models-and-platforms",
    "generative-ai-introduction-and-applications",
    "generative-ai-it-systems-analysts-and-architects",
    "generative-ai-language-modeling-with-transformers",
    "generative-ai-llm-architecture-data-preparation",
    "generative-ai-prompt-engineering-for-everyone",
    "getting-started-with-front-end-and-web-development",
    "getting-started-with-git-and-github",
    "hands-on-introduction-to-linux-commands-and-shell-scripting",
    "hybrid-cloud-capstone-project",
    "hybrid-cloud-networking-storage-systems-and-data-management",
    "ibm-ai-foundations-for-business",
    "ibm-ai-ladder-framework",
    "ibm-ai-product-manager",
    "ibm-ai-workflow",
    "ibm-ai-workflow-ai-production",
    "ibm-ai-workflow-business-priorities-data-ingestion",
    "ibm-ai-workflow-data-analysis-hypothesis-testing",
    "ibm-ai-workflow-feature-engineering-bias-detection",
    "ibm-ai-workflow-machine-learning-model-deployment",
    "ibm-ai-workflow-machine-learning-vr-nlp",
    "ibm-applied-devops-engineering",
    "ibm-backend-development",
    "ibm-business-analyst-professional-certificate",
    "ibm-cloud-native-full-stack-development-capstone",
    "ibm-cobol-basics",
    "ibm-cobol-core",
    "ibm-containers-docker-kubernetes-openshift",
    "ibm-cybersecurity-analyst",
    "ibm-data-analyst",
    "ibm-data-analyst-capstone-project",
    "ibm-data-analyst-r-excel",
    "ibm-data-architect",
    "ibm-data-engineer",
    "ibm-data-manager",
    "ibm-data-ops-methodology",
    "ibm-data-privacy",
    "ibm-data-science",
    "ibm-data-topology",
    "ibm-deep-learning-with-pytorch-keras-tensorflow",
    "ibm-digital-marketing-and-growth-hacking",
    "ibm-ethical-hacking-with-open-source-tools",
    "ibm-exploratory-data-analysis-for-machine-learning",
    "ibm-frontend-developer",
    "ibm-full-stack-cloud-developer",
    "ibm-full-stack-javascript-developer",
    "ibm-generative-ai-engineering",
    "ibm-hybrid-cloud-architect",
    "ibm-incident-response-digital-forensics",
    "ibm-intro-machine-learning",
    "ibm-ios-android-mobile-app-developer-pc",
    "ibm-it-project-manager",
    "ibm-it-scrum-master",
    "ibm-machine-learning",
    "ibm-mainframe-developer",
    "ibm-penetration-testing-threat-hunting-cryptography",
    "ibm-product-manager",
    "ibm-product-owner",
    "ibm-program-manager",
    "ibm-project-management-capstone",
    "ibm-project-manager",
    "ibm-rag-and-agentic-ai",
    "ibm-rapid-prototyping-watson-studio-autoai",
    "ibm-relational-database-administrator",
    "ibm-storage-scale",
    "ibm-storage-scale-administration",
    "ibm-storage-scale-fundamentals",
    "ibm-storage-scale-remote-data-access",
    "ibm-systems-analyst",
    "ibm-systems-and-solutions-architect",
    "ibm-technical-support",
    "ibm-ui-ux-designer",
    "ibm-unsupervised-machine-learning",
    "ibm-z-mainframe",
    "incident-response-and-defense-with-openvas",
    "information-technology-it-fundamentals-for-everyone",
    "intermediate-back-end-development-with-node-js-mongodb",
    "intermediate-web-and-front-end-development",
    "interpersonal-skills",
    "intro-to-devops",
    "introducing-zos-unix-system-services",
    "introduction-computer-vision-watson-opencv",
    "introduction-cybersecurity-cyber-attacks",
    "introduction-data-science",
    "introduction-enterprise-computing",
    "introduction-html-css-javascript",
    "introduction-software-programming-and-databases",
    "introduction-threat-intelligence-lifecycle",
    "introduction-to-ai",
    "introduction-to-big-data-with-spark-hadoop",
    "introduction-to-business-analysis",
    "introduction-to-cloud",
    "introduction-to-cybersecurity-careers",
    "introduction-to-cybersecurity-essentials",
    "introduction-to-data-analytics",
    "introduction-to-data-engineering",
    "introduction-to-deep-learning-with-keras",
    "introduction-to-digital-marketing",
    "introduction-to-hardware-and-operating-systems",
    "introduction-to-mobile-app-development",
    "introduction-to-networking-and-storage",
    "introduction-to-nosql-databases",
    "introduction-to-program-management",
    "introduction-to-project-management",
    "introduction-to-relational-databases",
    "introduction-to-software-engineering",
    "introduction-to-systems-analysis",
    "introduction-to-systems-architecture",
    "introduction-to-technical-support",
    "introduction-to-uxui-design",
    "introduction-to-web-development-with-html-css-javacript",
    "introducton-r-programming-data-science",
    "it-cloud-fundamentals",
    "it-fundamentals-cybersecurity",
    "java-developer",
    "java-development-capstone-project",
    "java-for-programming-beginners",
    "java-programming-fundamentals",
    "javascript-backend-capstone-project",
    "javascript-full-stack-capstone-project",
    "javascript-programming-essentials",
    "javascript-programming-with-react-node-mongodb",
    "key-technologies-for-business",
    "linux-for-aix-system-administrators",
    "linux-on-linuxone",
    "linux-private-cloud-administration-power-systems",
    "linux-system-administration-ibm-power-systems",
    "machine-learning-big-data-apache-spark",
    "machine-learning-capstone",
    "machine-learning-introduction-for-everyone",
    "machine-learning-with-apache-spark",
    "machine-learning-with-python",
    "malware-analysis-and-assembly",
    "mastering-operating-systems-with-ibm-aix",
    "modernize-applications-ibm-cics",
    "monitoring-and-observability-for-development-and-devops",
    "network-security-database-vulnerabilities",
    "nosql-big-data-and-spark-foundations",
    "object-oriented-program-in-java",
    "open-source-tools-for-data-science",
    "operating-systems-overview-administration-security",
    "people-and-soft-skills-for-professional-success",
    "people-soft-skills-assessment",
    "practice-exam-for-comptia-a",
    "practice-exam-for-comptia-itf-plus-certification",
    "preparation-comptia-certification",
    "present-with-purpose",
    "product-management-an-introduction",
    "product-management-capstone",
    "product-owner-capstone",
    "program-manager-capstone",
    "project-generative-ai-applications-with-rag-and-langchain",
    "project-management-career-guide-and-interview-prep",
    "python-for-applied-data-science-ai",
    "python-for-data-visualization",
    "python-project-for-ai-application-development",
    "python-project-for-data-engineering",
    "python-project-for-data-science",
    "rag-for-generative-ai-applications",
    "relational-database-administration",
    "relational-database-administration-capstone-project",
    "search-engine-optimization-and-content-marketing",
    "security-analyst-fundamentals",
    "seo-mastery-from-fundamentals-to-genai-and-geo-strategies",
    "smpe-for-zos-workshop",
    "software-developer-career-guide-and-interview-preparation",
    "software-development-practices",
    "software-development-proccess",
    "software-engineering-fundamentals",
    "software-testing-deployment-and-maintenance-strategies",
    "solving-problems-with-creative-and-critical-thinking",
    "sql-data-science",
    "sql-data-science-r",
    "sql-practical-introduction-for-querying-databases",
    "statistics-for-data-science-python",
    "statistics-fundamentals-using-excel",
    "supervised-machine-learning-classification",
    "supervised-machine-learning-regression",
    "system-administration-with-ibm-aix",
    "system-administration-with-ibm-aix-beyond-the-basics",
    "system-programming",
    "systems-analyst-capstone-project",
    "systems-and-solutions-architect-capstone-project",
    "tech-support-career-guide-and-interview-preparation",
    "technical-support-case-studies",
    "test-and-behavior-driven-development-tdd-bdd",
    "time-series-survival-analysis",
    "ux-research-and-information-architecture",
    "ux-ui-captsone-project",
    "vector-database-fundamentals",
    "vector-database-projects-ai-recommendation-systems",
    "vector-databases-for-rag-an-introduction",
    "vector-databases-introduction-with-chromadb",
    "what-is-datascience",
    "what-is-datascience-ko",
    "z-commands-and-panels",
    "zarchitecture-assembler-language-part-1-the-basics",
    "zarchitecture-assembler-language-pt-2-machine-instructions",
    "zos-rexx-programming",
    "zos-system-services-structure",
    // AUTO-GENERATED-IBM-SLUGS-END
  ]);

  function isCourseraHost() {
    return location.hostname === "coursera.org" || location.hostname.endsWith(".coursera.org");
  }

  /** Percorre window, parent, top (quando acessível) e junta paths de páginas Coursera. */
  function courseraFramePaths() {
    const paths = [];
    const seen = new Set();
    const tryPush = (w) => {
      try {
        if (!w || !w.location) return;
        const h = w.location.hostname;
        if (h !== "coursera.org" && !h.endsWith(".coursera.org")) return;
        const p = w.location.pathname || "";
        if (!seen.has(p)) {
          seen.add(p);
          paths.push(p);
        }
      } catch (_) {
        /* cross-origin */
      }
    };
    let w = window;
    for (let i = 0; i < 6 && w; i++) {
      tryPush(w);
      try {
        if (w.parent === w) break;
        w = w.parent;
      } catch (_) {
        break;
      }
    }
    tryPush(window.top);
    return paths;
  }

  function pathLooksLikeLearningSurface(p) {
    return (
      p.startsWith("/learn/") ||
      p.startsWith("/lecture/") ||
      p.includes("/learn/") ||
      p.startsWith("/professional-certificates/")
    );
  }

  function isCourseraLearningSurface() {
    if (!isCourseraHost()) return false;
    return courseraFramePaths().some(pathLooksLikeLearningSurface);
  }

  /** Documentos Coursera same-origin (para meta / JSON-LD / links) — top primeiro. */
  function courseraDocumentsForSignals() {
    const docs = [];
    const seen = new Set();
    const add = (d) => {
      if (!d || seen.has(d)) return;
      seen.add(d);
      docs.push(d);
    };
    const tryAdd = (w) => {
      try {
        if (!w || !w.location) return;
        const h = w.location.hostname;
        if (h !== "coursera.org" && !h.endsWith(".coursera.org")) return;
        add(w.document);
      } catch (_) {
        /* cross-origin */
      }
    };
    tryAdd(window.top);
    let w = window;
    for (let i = 0; i < 6 && w; i++) {
      tryAdd(w);
      try {
        if (w.parent === w) break;
        w = w.parent;
      } catch (_) {
        break;
      }
    }
    add(document);
    return docs;
  }

  function courseSlugFromPath(pathname) {
    const p = pathname || "";
    let m = p.match(/^\/learn\/([^/]+)/);
    if (m) return m[1];
    m = p.match(/^\/lecture\/([^/]+)/);
    if (m) return m[1];
    m = p.match(/^\/professional-certificates\/([^/]+)/);
    if (m) return m[1];
    m = p.match(/^\/specializations\/([^/]+)/);
    if (m) return m[1];
    m = p.match(/\/learn\/([^/]+)/);
    return m ? m[1] : "";
  }

  function urlOrParamsSuggestIbm() {
    const paths = courseraFramePaths();
    for (const p of paths) {
      const blob = `${p}${location.search}${location.hash}`.toLowerCase();
      if (blob.includes("ibm")) return true;
    }
    const blobSelf = `${location.pathname}${location.search}${location.hash}`.toLowerCase();
    if (blobSelf.includes("ibm")) return true;
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
    for (const p of courseraFramePaths()) {
      if (courseSlugFromPath(p).toLowerCase().includes("ibm")) return true;
    }
    return courseSlugFromPath(location.pathname).toLowerCase().includes("ibm");
  }

  function knownIbmSlugSuggestsIbm() {
    for (const p of courseraFramePaths()) {
      const slug = courseSlugFromPath(p).toLowerCase();
      if (slug && IBM_KNOWN_COURSE_SLUGS.has(slug)) return true;
    }
    const selfSlug = courseSlugFromPath(location.pathname).toLowerCase();
    return !!selfSlug && IBM_KNOWN_COURSE_SLUGS.has(selfSlug);
  }

  function domSuggestsIbm() {
    return courseraDocumentsForSignals().some((doc) => {
      const selectors = [
        'a[href*="ibm-skills-network"]',
        'a[href*="coursera.org/partners/ibm"]',
        'a[href*="/partners/ibm"]',
      ];
      return selectors.some((sel) => doc.querySelector(sel));
    });
  }

  function titleSuggestsIbm() {
    return courseraDocumentsForSignals().some((doc) => /\bIBM\b/i.test(doc.title || ""));
  }

  function metaTagsSuggestIbm() {
    return courseraDocumentsForSignals().some((doc) => {
      const metas = doc.querySelectorAll(
        'meta[name="description"], meta[property="og:description"], meta[property="twitter:description"]',
      );
      for (const m of metas) {
        const c = m.getAttribute("content") || "";
        if (/offered by\s+ibm\b/i.test(c)) return true;
      }
      return false;
    });
  }

  function jsonLdProviderIsIbm() {
    return courseraDocumentsForSignals().some((doc) => {
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
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
    });
  }

  function ibmSignalsDetected() {
    return (
      knownIbmSlugSuggestsIbm() ||
      urlOrParamsSuggestIbm() ||
      slugSuggestsIbm() ||
      metaTagsSuggestIbm() ||
      jsonLdProviderIsIbm() ||
      domSuggestsIbm() ||
      titleSuggestsIbm()
    );
  }

  function shouldSkipIbmCourseraVideos() {
    if (!isCourseraLearningSurface()) return false;
    if (!STRICT_IBM_ONLY) return true;
    return ibmSignalsDetected();
  }

  dbg("loaded", location.href);
  dbg("title", document.title);
  dbg("learningSurface", isCourseraLearningSurface());
  dbg("strictIbmOnly", STRICT_IBM_ONLY);
  dbg("ibmSignals", ibmSignalsDetected());
  dbg("shouldSkip", shouldSkipIbmCourseraVideos());

  /** Vídeos no documento e dentro de shadow roots abertos. */
  function queryVideosDeep(root = document) {
    const videos = [...root.querySelectorAll("video")];
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) {
        videos.push(...queryVideosDeep(el.shadowRoot));
      }
    });
    return videos;
  }

  function attachVideo(video) {
    if (video.dataset.ibmCourseraSkipper === "1") return;
    video.dataset.ibmCourseraSkipper = "1";
    dbg("video attached", video);

    let outroArmed = true;
    let introArmed = true;

    const resetForNewSource = () => {
      outroArmed = true;
      introArmed = true;
    };

    video.addEventListener("loadedmetadata", resetForNewSource);
    video.addEventListener("emptied", resetForNewSource);

    const trySkipIntro = () => {
      if (!shouldSkipIbmCourseraVideos()) return;
      const d = video.duration;
      if (!Number.isFinite(d) || d <= INTRO_SEC + 0.5) return;
      if (video.currentTime <= INTRO_START_MAX + 0.05) {
        video.currentTime = INTRO_SEC;
        introArmed = false;
      }
    };

    video.addEventListener("play", () => {
      dbg("play", video.currentTime, video.duration);
      trySkipIntro();
    });

    video.addEventListener("timeupdate", () => {
      if (!shouldSkipIbmCourseraVideos()) return;

      const d = video.duration;
      if (Number.isFinite(d) && d > INTRO_SEC + 0.5 && introArmed) {
        if (video.currentTime > INTRO_START_MAX && video.currentTime < INTRO_SEC - 0.08) {
          video.currentTime = INTRO_SEC;
          introArmed = false;
        }
      }

      if (!outroArmed) return;
      if (!Number.isFinite(d) || d <= INTRO_SEC + OUTRO_SEC + 0.5) return;
      const threshold = d - OUTRO_SEC;
      if (video.currentTime >= threshold && video.currentTime < d - 0.05) {
        outroArmed = false;
        try {
          video.currentTime = d;
          video.pause();
        } catch (_) {
          /* ignore */
        }
      }
    });

    video.addEventListener("seeking", () => {
      if (!shouldSkipIbmCourseraVideos()) return;
      const dur = video.duration;
      if (!Number.isFinite(dur)) return;
      if (video.currentTime < dur - OUTRO_SEC - 0.1) {
        outroArmed = true;
      }
      if (video.currentTime < INTRO_SEC - 0.15) {
        introArmed = true;
      } else if (video.currentTime > INTRO_SEC + 0.2) {
        introArmed = false;
      }
    });
  }

  function scan() {
    if (!isCourseraLearningSurface()) return;
    queryVideosDeep(document).forEach(attachVideo);
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
