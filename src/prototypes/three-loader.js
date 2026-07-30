const root = document.querySelector('[data-prototype="three"]');

if (root) {
  const mount = root.querySelector("[data-three-mount]");
  const fallback = root.querySelector("[data-static-fallback]");
  const status = root.querySelector("[data-renderer-status]");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const connection = navigator.connection;
  const narrow = matchMedia("(max-width: 720px)").matches;
  const lowPower =
    narrow ||
    connection?.saveData === true ||
    (navigator.hardwareConcurrency &&
      navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);
  let visible = false;
  let sceneController;
  let loadingPromise;
  let destroyed = false;

  const diagnostics = {
    renderer: "three-js",
    dynamicImportRequested: false,
    reducedMotion: reduceMotion,
    lowPower: Boolean(lowPower),
    visible: false,
    documentVisible: !document.hidden,
    fallbackActive: true,
    cleanupComplete: false
  };

  root.prototypeDiagnostics = diagnostics;

  function activateFallback(message) {
    fallback.removeAttribute("hidden");
    root.dataset.renderState = "fallback";
    diagnostics.fallbackActive = true;
    status.textContent = message;
  }

  function supportsWebGL() {
    try {
      const testCanvas = document.createElement("canvas");
      const context =
        testCanvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
        testCanvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
      if (!context) return false;
      context.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  }

  async function loadThreePrototype() {
    if (destroyed || sceneController || loadingPromise || reduceMotion) return;

    if (!supportsWebGL()) {
      activateFallback("WebGL unavailable: SVG fallback active.");
      return;
    }

    diagnostics.dynamicImportRequested = true;
    root.dataset.renderState = "loading";
    status.textContent = "Loading the isolated 3D renderer.";

    loadingPromise = import("./three-core.js")
      .then(({ mountThreeCore }) => {
        if (destroyed) return;
        sceneController = mountThreeCore({
          root,
          mount,
          fallback,
          lowPower: Boolean(lowPower),
          onFailure: (message) => activateFallback(message)
        });
        diagnostics.fallbackActive = false;
        root.dataset.renderState = "ready";
        status.textContent = lowPower
          ? "3D active in reduced-quality mode."
          : "3D active in standard-quality mode.";
        syncActivity();
      })
      .catch((error) => {
        console.error("Risk Intelligence Core 3D failed to initialise.", error);
        activateFallback("3D initialisation failed: SVG fallback active.");
      });
  }

  function syncActivity() {
    diagnostics.visible = visible;
    diagnostics.documentVisible = !document.hidden;
    const shouldRun = visible && !document.hidden && !destroyed;

    if (shouldRun && !sceneController) {
      loadThreePrototype();
    }

    sceneController?.setActive(shouldRun);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      syncActivity();
    },
    { rootMargin: "0px", threshold: 0.08 }
  );

  observer.observe(mount);
  document.addEventListener("visibilitychange", syncActivity);

  if (reduceMotion) {
    root.dataset.motion = "reduced";
    activateFallback("Reduced motion requested: complete SVG decision state shown.");
    root.querySelector("[data-replay]").hidden = true;
  }

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    observer.disconnect();
    document.removeEventListener("visibilitychange", syncActivity);
    sceneController?.cleanup();
    sceneController = undefined;
    diagnostics.cleanupComplete = true;
    root.dataset.lifecycle = "disposed";
  };

  window.addEventListener("pagehide", cleanup, { once: true });
  window.__RISK_CORE_CLEANUP__ = cleanup;
  root.dataset.lifecycle = "observing";
}
