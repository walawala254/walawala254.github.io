import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const MOTION_QUERIES = {
  reduceMotion: "(prefers-reduced-motion: reduce)",
  narrow: "(max-width: 720px)",
  standard: "(prefers-reduced-motion: no-preference)"
};

export function mountMotionController({
  root,
  state,
  render,
  setComplete,
  buildTimeline
}) {
  const replayButton = root.querySelector("[data-replay]");
  const status = root.querySelector("[data-motion-status]");
  const media = gsap.matchMedia();
  let timeline;
  let replayHandler;
  let destroyed = false;

  const diagnostics = root.prototypeDiagnostics || {};
  Object.assign(diagnostics, {
    renderer: root.dataset.prototype,
    reducedMotion: false,
    timelineCreated: false,
    scrollTriggerCreated: false,
    cleanupComplete: false
  });

  root.prototypeDiagnostics = diagnostics;

  media.add(MOTION_QUERIES, (context) => {
    const { reduceMotion, narrow } = context.conditions;
    diagnostics.reducedMotion = reduceMotion;
    root.dataset.motion = reduceMotion ? "reduced" : "enabled";
    root.dataset.viewportQuality = narrow ? "reduced" : "standard";

    if (reduceMotion) {
      setComplete(state);
      render();
      replayButton.hidden = true;
      status.textContent = "Motion bypassed: complete decision state shown.";
      return undefined;
    }

    replayButton.hidden = false;
    status.textContent = "Motion ready. Scroll into view or replay the sequence.";

    timeline = gsap.timeline({
      paused: true,
      defaults: {
        duration: narrow ? 0.45 : 0.62,
        ease: "power2.inOut"
      },
      onStart: () => {
        root.dataset.sequence = "running";
        status.textContent = "Risk signal sequence running.";
      },
      onComplete: () => {
        root.dataset.sequence = "complete";
        status.textContent = "Review pathway complete.";
      }
    });

    buildTimeline(timeline, gsap);
    diagnostics.timelineCreated = true;

    ScrollTrigger.create({
      id: `risk-core-${root.dataset.prototype}`,
      trigger: root,
      start: "top 78%",
      animation: timeline,
      toggleActions: "play none none reset"
    });
    diagnostics.scrollTriggerCreated = true;

    replayHandler = () => timeline?.restart();
    replayButton.addEventListener("click", replayHandler);

    return () => {
      replayButton.removeEventListener("click", replayHandler);
      replayHandler = undefined;
      timeline = undefined;
    };
  });

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    media.revert();
    diagnostics.cleanupComplete = true;
    root.dataset.lifecycle = "disposed";
  };

  return {
    diagnostics,
    pause() {
      diagnostics.timelinePaused = true;
      timeline?.pause();
    },
    resume() {
      if (timeline?.paused()) timeline.resume();
      diagnostics.timelinePaused = false;
    },
    replay() {
      timeline?.restart();
    },
    cleanup
  };
}
