import { createCoreState, setCompleteState } from "./core-model.js";
import { mountMotionController } from "./motion-controller.js";

const root = document.querySelector('[data-prototype="svg"]');

if (root) {
  const state = createCoreState();
  const inboundSignals = root.querySelectorAll("[data-inbound-signal]");
  const detectionLayers = root.querySelectorAll("[data-detection-layer]");
  const anomaly = root.querySelector("[data-anomaly]");
  const riskNodes = root.querySelectorAll("[data-risk-node]");
  const decisionPath = root.querySelector("[data-decision-path]");
  const decisionNode = root.querySelector("[data-decision-node]");
  const styles = getComputedStyle(document.documentElement);
  const mint = styles.getPropertyValue("--color-accent-primary").trim();
  const critical = styles.getPropertyValue("--color-critical").trim();

  const render = () => {
    root.style.setProperty("--prototype-inbound", state.inbound);
    root.style.setProperty("--prototype-detection", state.detection);
    root.style.setProperty("--prototype-anomaly", state.anomaly);
    root.style.setProperty("--prototype-nodes", state.nodes);
    root.style.setProperty("--prototype-decision", state.decision);
  };

  const controller = mountMotionController({
    root,
    state,
    render,
    setComplete: setCompleteState,
    buildTimeline(timeline, gsap) {
      gsap.set(inboundSignals, { x: -42, autoAlpha: 0.18 });
      gsap.set(detectionLayers, {
        scale: 0.84,
        transformOrigin: "center",
        autoAlpha: 0.25
      });
      gsap.set(riskNodes, {
        scale: 0.55,
        transformOrigin: "center",
        autoAlpha: 0.2
      });
      gsap.set(decisionNode, {
        scale: 0.65,
        transformOrigin: "center",
        autoAlpha: 0.25
      });
      gsap.set(decisionPath, { strokeDasharray: 330, strokeDashoffset: 330 });

      timeline
        .addLabel("signal")
        .call(() => {
          anomaly.style.fill = mint;
        }, null, "signal")
        .to(
          state,
          {
            inbound: 1,
            onUpdate: render
          },
          "signal"
        )
        .to(
          inboundSignals,
          {
            x: 0,
            autoAlpha: 1,
            stagger: 0.11
          },
          "signal"
        )
        .addLabel("detect")
        .to(
          state,
          {
            detection: 1,
            onUpdate: render
          },
          "detect"
        )
        .to(
          detectionLayers,
          {
            scale: 1,
            autoAlpha: 1,
            stagger: 0.08
          },
          "detect"
        )
        .addLabel("investigate")
        .to(
          state,
          {
            anomaly: 1,
            nodes: 1,
            onUpdate: render
          },
          "investigate"
        )
        .to(
          anomaly,
          {
            scale: 1.4,
            transformOrigin: "center",
            duration: 0.32,
            yoyo: true,
            repeat: 1
          },
          "investigate"
        )
        .call(() => {
          anomaly.style.fill = critical;
        }, null, "investigate")
        .to(
          riskNodes,
          {
            scale: 1,
            autoAlpha: 1,
            stagger: 0.1
          },
          "investigate"
        )
        .addLabel("decide")
        .to(
          state,
          {
            decision: 1,
            onUpdate: render
          },
          "decide"
        )
        .to(
          decisionPath,
          {
            strokeDashoffset: 0,
            ease: "none"
          },
          "decide"
        )
        .to(
          decisionNode,
          {
            scale: 1,
            autoAlpha: 1,
            duration: 0.35
          },
          ">-0.2"
        );
    }
  });

  render();
  root.dataset.renderState = "ready";
  root.dataset.lifecycle = "active";

  const cleanup = () => {
    controller.cleanup();
    anomaly.style.removeProperty("fill");
  };
  window.addEventListener("pagehide", cleanup, { once: true });
  window.__RISK_CORE_CLEANUP__ = cleanup;
}
