let activeObserver;
let lifecycleBound = false;

function revealImmediately(items, reason) {
  document.documentElement.classList.remove("reveal-ready");
  items.forEach((item) => {
    item.style.removeProperty("--reveal-delay");
    item.classList.add("is-visible");
    item.dataset.revealState = "visible";
  });

  window.__REVEAL_DIAGNOSTICS__ = {
    active: false,
    itemCount: items.length,
    reason
  };
}

function disconnectObserver(items, reason) {
  activeObserver?.disconnect();
  activeObserver = undefined;
  revealImmediately(items, reason);
}

export function initReveals() {
  const revealItems = [...document.querySelectorAll(".reveal")];
  const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  if (
    !revealItems.length ||
    reducedMotion ||
    !("IntersectionObserver" in window)
  ) {
    revealImmediately(
      revealItems,
      !revealItems.length
        ? "no-items"
        : reducedMotion
          ? "reduced-motion"
          : "unsupported"
    );
    return;
  }

  activeObserver?.disconnect();

  try {
    activeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const requestedDelay = Number(entry.target.dataset.delay) || 0;
          const delay = window.innerWidth < 768
            ? Math.min(requestedDelay, 80)
            : requestedDelay;

          entry.target.style.setProperty("--reveal-delay", `${delay}ms`);
          entry.target.classList.add("is-visible");
          entry.target.dataset.revealState = "visible";
          activeObserver?.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6%", threshold: 0.12 }
    );

    revealItems.forEach((item) => {
      item.dataset.revealState = "pending";
      activeObserver.observe(item);
    });
    document.documentElement.classList.add("reveal-ready");
    window.__REVEAL_DIAGNOSTICS__ = {
      active: true,
      itemCount: revealItems.length,
      reason: "observing"
    };
  } catch {
    disconnectObserver(revealItems, "observer-error");
  }

  if (!lifecycleBound) {
    lifecycleBound = true;
    window.addEventListener("pagehide", () => {
      disconnectObserver(revealItems, "pagehide");
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) revealImmediately(revealItems, "bfcache-restore");
    });
  }
}
