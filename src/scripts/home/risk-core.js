function drawableLength(element) {
  try {
    return element.getTotalLength();
  } catch {
    return 0;
  }
}

export function mountRiskCoreMotion({
  gsap,
  ScrollTrigger,
  root,
  compact = false
}) {
  const paths = [...root.querySelectorAll("[data-core-path]")];
  const inboundPaths = root.querySelectorAll(
    ".core-inputs [data-core-path]"
  );
  const anomalyPath = root.querySelectorAll(".core-route--critical");
  const investigationPaths = root.querySelectorAll("[data-core-investigate]");
  const decisionPaths = root.querySelectorAll("[data-core-decision-path]");
  const feedbackPaths = root.querySelectorAll("[data-core-feedback]");
  const signals = root.querySelectorAll("[data-core-signal]");
  const layers = root.querySelectorAll("[data-core-layer]");
  const anomaly = root.querySelector("[data-core-anomaly]");
  const investigationNodes = root.querySelectorAll("[data-core-risk-node]");
  const decisionNode = root.querySelector("[data-core-decision-node]");
  const feedbackNode = root.querySelector("[data-core-feedback-node]");
  const animatedNodes = [
    ...signals,
    ...layers,
    anomaly,
    ...investigationNodes,
    decisionNode,
    feedbackNode
  ].filter(Boolean);
  const diagnostics = {
    timelineCreated: false,
    scrollTriggerCreated: false,
    completed: false
  };

  const restoreStaticState = () => {
    gsap.set([...paths, ...animatedNodes], {
      clearProps:
        "opacity,visibility,transform,transformOrigin,strokeDasharray,strokeDashoffset"
    });
    root.dataset.coreState = "complete";
  };

  try {
    const timeline = gsap.timeline({
      paused: true,
      defaults: {
        duration: compact ? 0.36 : 0.52,
        ease: "power2.inOut",
        immediateRender: false
      },
      onStart: () => {
        root.dataset.coreState = "running";
      },
      onComplete: () => {
        diagnostics.completed = true;
        restoreStaticState();
      }
    });

    const drawPaths = (
      elements,
      position,
      { duration = compact ? 0.34 : 0.48, gap = 0.05 } = {}
    ) => {
      [...elements].forEach((element, index) => {
        const length = drawableLength(element) || 1;
        timeline.fromTo(
          element,
          {
            strokeDasharray: length,
            strokeDashoffset: length
          },
          {
            strokeDashoffset: 0,
            duration,
            ease: "none",
            immediateRender: false
          },
          `${position}+=${index * gap}`
        );
      });
    };

    timeline
      .addLabel("signal")
      .from(
        signals,
        {
          x: compact ? -18 : -32,
          autoAlpha: 0.18,
          stagger: compact ? 0.04 : 0.08
        },
        "signal"
      );

    drawPaths(inboundPaths, "signal", {
      gap: compact ? 0.025 : 0.045
    });

    timeline
      .addLabel("detect", ">-0.05")
      .from(
        layers,
        {
          scaleY: 0.3,
          transformOrigin: "center",
          autoAlpha: 0.25,
          stagger: compact ? 0.04 : 0.08
        },
        "detect"
      )
      .from(
        anomaly,
        {
          scale: 0.35,
          transformOrigin: "center",
          autoAlpha: 0,
          duration: compact ? 0.26 : 0.36
        },
        "detect+=0.1"
      );

    drawPaths(anomalyPath, "detect", {
      duration: compact ? 0.26 : 0.36,
      gap: 0
    });

    timeline
      .addLabel("investigate", ">-0.04");

    drawPaths(investigationPaths, "investigate", {
      duration: compact ? 0.32 : 0.46,
      gap: compact ? 0.035 : 0.065
    });

    timeline
      .from(
        investigationNodes,
        {
          scale: 0.3,
          transformOrigin: "center",
          autoAlpha: 0,
          stagger: compact ? 0.04 : 0.09
        },
        "investigate+=0.12"
      );

    timeline.addLabel("decide", ">-0.03");

    drawPaths(decisionPaths, "decide", {
      duration: compact ? 0.34 : 0.5,
      gap: 0.08
    });

    timeline
      .from(
        decisionNode,
        {
          scale: 0.72,
          transformOrigin: "center",
          autoAlpha: 0.18,
          duration: compact ? 0.3 : 0.42
        },
        "decide+=0.14"
      );

    timeline.addLabel("improve", ">-0.03");

    drawPaths(feedbackPaths, "improve", {
      duration: compact ? 0.42 : 0.62,
      gap: 0
    });

    timeline.from(
      feedbackNode,
      {
        scale: 0.2,
        transformOrigin: "center",
        autoAlpha: 0,
        duration: compact ? 0.24 : 0.34
      },
      "improve+=0.18"
    );

    diagnostics.timelineCreated = true;

    const trigger = ScrollTrigger.create({
      id: "home-risk-core",
      trigger: root,
      start: "top 72%",
      animation: timeline,
      toggleActions: "play none none none",
      once: true
    });

    diagnostics.scrollTriggerCreated = true;

    return {
      diagnostics,
      timeline,
      restoreStaticState,
      cleanup() {
        trigger.kill();
        timeline.kill();
        restoreStaticState();
      }
    };
  } catch {
    restoreStaticState();
    return {
      diagnostics,
      timeline: null,
      restoreStaticState,
      cleanup: restoreStaticState
    };
  }
}
