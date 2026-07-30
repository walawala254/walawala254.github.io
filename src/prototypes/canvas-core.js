import { createCoreState, setCompleteState } from "./core-model.js";
import { mountMotionController } from "./motion-controller.js";

const root = document.querySelector('[data-prototype="canvas"]');

if (root) {
  const canvas = root.querySelector("canvas");
  const context = canvas.getContext("2d");
  const fallback = root.querySelector("[data-static-fallback]");
  const state = createCoreState();
  const reduceQuality = matchMedia("(max-width: 720px)").matches;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, reduceQuality ? 1 : 1.5);
  let cssWidth = 0;
  let cssHeight = 0;

  const colors = getComputedStyle(document.documentElement);
  const palette = {
    background: colors.getPropertyValue("--color-background-elevated").trim(),
    border: colors.getPropertyValue("--color-border").trim(),
    muted: colors.getPropertyValue("--color-text-muted").trim(),
    text: colors.getPropertyValue("--color-text-primary").trim(),
    mint: colors.getPropertyValue("--color-accent-primary").trim(),
    cyan: colors.getPropertyValue("--color-accent-secondary").trim(),
    critical: colors.getPropertyValue("--color-critical").trim(),
    warning: colors.getPropertyValue("--color-warning").trim()
  };

  const diagnostics = {
    renderer: "canvas-2d",
    pixelRatio,
    drawCalls: 0,
    cleanupComplete: false
  };

  function line(x1, y1, x2, y2, color, width = 1, progress = 1) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(
      x1 + (x2 - x1) * progress,
      y1 + (y2 - y1) * progress
    );
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  }

  function label(text, x, y, color = palette.muted, align = "left") {
    context.fillStyle = color;
    context.font = "600 11px 'JetBrains Mono', monospace";
    context.textAlign = align;
    context.fillText(text.toUpperCase(), x, y);
  }

  function node(x, y, size, color, active = 1) {
    context.globalAlpha = 0.2 + active * 0.8;
    context.fillStyle = color;
    context.fillRect(x - size / 2, y - size / 2, size, size);
    context.globalAlpha = 1;
  }

  function draw() {
    if (!context || !cssWidth || !cssHeight) return;
    diagnostics.drawCalls += 1;

    const scaleX = cssWidth / 900;
    const scaleY = cssHeight / 430;
    context.setTransform(pixelRatio * scaleX, 0, 0, pixelRatio * scaleY, 0, 0);
    context.clearRect(0, 0, 900, 430);
    context.fillStyle = palette.background;
    context.fillRect(0, 0, 900, 430);

    context.strokeStyle = palette.border;
    context.lineWidth = 1;
    context.strokeRect(28, 28, 844, 374);

    label("Inbound transactions", 62, 82);
    label("Detection layers", 350, 82, palette.cyan, "center");
    label("Risk nodes", 590, 82, palette.mint, "center");
    label("Decision path", 820, 82, palette.text, "right");

    line(62, 222, 250, 222, palette.border, 2);
    const inboundEnd = 62 + 188 * state.inbound;
    line(62, 222, inboundEnd, 222, palette.mint, 2);

    const signalPositions = [88, 138, 188];
    signalPositions.forEach((x, index) => {
      const offset = (1 - state.inbound) * (32 + index * 8);
      const isAnomaly = index === 1;
      context.beginPath();
      context.arc(x - offset, 222, isAnomaly ? 7 : 5, 0, Math.PI * 2);
      context.fillStyle =
        isAnomaly && state.anomaly > 0.4 ? palette.critical : palette.mint;
      context.globalAlpha = 0.22 + state.inbound * 0.78;
      context.fill();
      context.globalAlpha = 1;
    });

    [78, 58, 38].forEach((radius, index) => {
      context.beginPath();
      context.arc(350, 222, radius * (0.86 + state.detection * 0.14), 0, Math.PI * 2);
      context.strokeStyle = index === 1 ? palette.cyan : palette.border;
      context.globalAlpha = 0.22 + state.detection * (0.72 - index * 0.08);
      context.lineWidth = index === 1 ? 2 : 1;
      context.stroke();
      context.globalAlpha = 1;
    });
    node(350, 222, 13, state.anomaly > 0.4 ? palette.critical : palette.cyan, state.detection);

    const riskNodes = [
      { x: 550, y: 146, color: palette.cyan },
      { x: 600, y: 222, color: palette.warning },
      { x: 550, y: 298, color: palette.mint }
    ];
    riskNodes.forEach(({ x, y, color }) => {
      line(428, 222, x, y, palette.border, 1, state.nodes);
      node(x, y, 12, color, state.nodes);
    });

    line(600, 222, 718, 222, palette.border, 2, state.decision);
    line(718, 222, 718, 142, palette.border, 2, state.decision);
    line(718, 142, 818, 142, palette.mint, 2, state.decision);
    node(818, 142, 18, palette.mint, state.decision);
    label("Review", 818, 176, palette.text, "center");

    label("Signal", 62, 372);
    label("Detect", 298, 372);
    label("Investigate", 500, 372);
    label("Decide", 750, 372);
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, Math.round(bounds.width));
    cssHeight = Math.max(1, Math.round(bounds.height));
    const width = Math.round(cssWidth * pixelRatio);
    const height = Math.round(cssHeight * pixelRatio);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    draw();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const controller = mountMotionController({
    root,
    state,
    render: draw,
    setComplete: setCompleteState,
    buildTimeline(timeline) {
      timeline
        .addLabel("signal")
        .to(state, { inbound: 1, onUpdate: draw }, "signal")
        .addLabel("detect")
        .to(state, { detection: 1, onUpdate: draw }, "detect")
        .addLabel("investigate")
        .to(
          state,
          {
            anomaly: 1,
            nodes: 1,
            onUpdate: draw
          },
          "investigate"
        )
        .addLabel("decide")
        .to(state, { decision: 1, onUpdate: draw }, "decide");
    }
  });

  Object.assign(diagnostics, root.prototypeDiagnostics);
  root.prototypeDiagnostics = diagnostics;
  fallback.setAttribute("hidden", "");
  root.dataset.renderState = "ready";
  root.dataset.lifecycle = "active";
  resize();

  const cleanup = () => {
    resizeObserver.disconnect();
    controller.cleanup();
    diagnostics.cleanupComplete = true;
    root.dataset.lifecycle = "disposed";
  };

  window.addEventListener("pagehide", cleanup, { once: true });
  window.__RISK_CORE_CLEANUP__ = cleanup;
}
