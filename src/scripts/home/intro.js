const INTRO_SESSION_KEY = "dave-bryson-risk-intro-seen";

function readSessionState() {
  try {
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSessionState() {
  try {
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
  } catch {
    // The introduction still works when storage is unavailable.
  }
}

export function initHomeIntro({ gsap, root = document }) {
  const overlay = root.querySelector("[data-home-intro]");
  const skipButton = overlay?.querySelector("[data-intro-skip]");
  const lines = overlay?.querySelectorAll("[data-intro-line]");
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const diagnostics = {
    shown: false,
    completed: false,
    skippedReason: null
  };

  if (!overlay || !skipButton || !lines?.length) {
    diagnostics.skippedReason = "markup-unavailable";
    return {
      diagnostics,
      finished: Promise.resolve(),
      pause() {},
      resume() {},
      cleanup() {}
    };
  }

  if (reduceMotion) {
    diagnostics.skippedReason = "reduced-motion";
    overlay.hidden = true;
    return {
      diagnostics,
      finished: Promise.resolve(),
      pause() {},
      resume() {},
      cleanup() {}
    };
  }

  if (readSessionState()) {
    diagnostics.skippedReason = "session";
    overlay.hidden = true;
    return {
      diagnostics,
      finished: Promise.resolve(),
      pause() {},
      resume() {},
      cleanup() {}
    };
  }

  diagnostics.shown = true;
  writeSessionState();
  overlay.hidden = false;
  overlay.dataset.state = "active";

  let timeline;
  let finished = false;
  let resolveFinished;
  const finishedPromise = new Promise((resolve) => {
    resolveFinished = resolve;
  });

  const complete = ({ immediate = false } = {}) => {
    if (finished) return;
    finished = true;
    diagnostics.completed = true;
    overlay.dataset.state = "complete";
    timeline?.kill();

    if (immediate) {
      gsap.set(overlay, { autoAlpha: 0 });
    }

    overlay.hidden = true;
    overlay.style.removeProperty("opacity");
    overlay.style.removeProperty("visibility");
    resolveFinished();
  };

  const safetyTimer = window.setTimeout(
    () => complete({ immediate: true }),
    2400
  );

  const skip = () => {
    diagnostics.skippedReason = "user";
    complete({ immediate: true });
  };

  skipButton.addEventListener("click", skip);

  try {
    timeline = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: complete
    });

    timeline
      .from(lines, {
        yPercent: 110,
        autoAlpha: 0,
        duration: 0.28,
        stagger: 0.09
      })
      .to(
        lines,
        {
          y: -3,
          duration: 0.18,
          stagger: 0.025,
          ease: "power1.inOut"
        },
        ">+0.08"
      )
      .to(overlay, {
        autoAlpha: 0,
        duration: 0.28,
        ease: "power2.in"
      });
  } catch {
    diagnostics.skippedReason = "animation-error";
    complete({ immediate: true });
  }

  return {
    diagnostics,
    finished: finishedPromise,
    pause() {
      timeline?.pause();
    },
    resume() {
      timeline?.resume();
    },
    cleanup() {
      window.clearTimeout(safetyTimer);
      skipButton.removeEventListener("click", skip);
      complete({ immediate: true });
    }
  };
}
