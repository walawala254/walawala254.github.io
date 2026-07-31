import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initHomeIntro } from "./intro.js";
import { mountRiskCoreMotion } from "./risk-core.js";

gsap.registerPlugin(ScrollTrigger);

const pageRoot = document.querySelector(".home-page");

if (pageRoot) {
  const diagnostics = {
    initialized: false,
    reducedMotion: false,
    viewportTier: null,
    scrollTriggersCreated: 0,
    cleanupComplete: false,
    threeRequested: false,
    intro: null,
    riskCore: null
  };
  const media = gsap.matchMedia();
  const intro = initHomeIntro({ gsap });
  const ownedTimelines = new Set();
  const pausedByVisibility = new Set();
  let heroRecoveryTimer;
  let destroyed = false;

  diagnostics.intro = intro.diagnostics;
  window.__HOME_MOTION_DIAGNOSTICS__ = diagnostics;

  const showStaticHomepage = () => {
    const animatedTargets = document.querySelectorAll(
      "[data-hero-line], [data-hero-reveal], [data-hero-proof], [data-work-row], [data-method-step]"
    );
    gsap.set(animatedTargets, {
      clearProps: "opacity,visibility,transform,transformOrigin"
    });
    document
      .querySelectorAll(".decision-step")
      .forEach((step) => step.classList.add("is-active"));
    gsap.set("[data-story-progress]", { clearProps: "transform" });
  };

  media.add(
    {
      reduceMotion: "(prefers-reduced-motion: reduce)",
      desktop: "(min-width: 1025px)",
      tablet: "(min-width: 721px) and (max-width: 1024px)",
      mobile: "(max-width: 720px)"
    },
    (context) => {
      const { reduceMotion, desktop, tablet, mobile } = context.conditions;
      diagnostics.reducedMotion = reduceMotion;
      diagnostics.viewportTier = desktop
        ? "desktop"
        : tablet
          ? "tablet"
          : "mobile";
      pageRoot.dataset.motion = reduceMotion ? "reduced" : "enabled";
      pageRoot.dataset.motionTier = diagnostics.viewportTier;

      if (reduceMotion) {
        showStaticHomepage();
        diagnostics.initialized = true;
        return undefined;
      }

      const scope = gsap.context(() => {
        const heroLines = gsap.utils.toArray("[data-hero-line]");
        const heroSupport = gsap.utils.toArray("[data-hero-reveal]");
        const heroProof = document.querySelector("[data-hero-proof]");
        const heroTimeline = gsap.timeline({
          paused: true,
          defaults: {
            ease: "power3.out"
          },
          onComplete: () => {
            gsap.set([...heroLines, ...heroSupport, heroProof], {
              clearProps: "opacity,visibility,transform,transformOrigin"
            });
          }
        });

        heroTimeline
          .from(heroLines, {
            yPercent: mobile ? 70 : 105,
            duration: mobile ? 0.54 : 0.72,
            stagger: mobile ? 0.045 : 0.075
          })
          .from(
            heroSupport,
            {
              y: mobile ? 10 : 18,
              autoAlpha: 0,
              duration: mobile ? 0.38 : 0.54,
              stagger: mobile ? 0.04 : 0.07
            },
            "-=0.34"
          )
          .from(
            heroProof,
            {
              x: desktop ? 24 : 0,
              y: desktop ? 0 : mobile ? 12 : 10,
              autoAlpha: 0,
              duration: mobile ? 0.46 : 0.7
            },
            "-=0.55"
          );

        ownedTimelines.add(heroTimeline);
        intro.finished.then(() => {
          if (!destroyed) heroTimeline.play(0);
        });

        heroRecoveryTimer = window.setTimeout(() => {
          gsap.set([...heroLines, ...heroSupport, heroProof], {
            clearProps: "opacity,visibility,transform,transformOrigin"
          });
        }, 4200);

        const riskRoot = document.querySelector("[data-risk-core]");
        if (riskRoot) {
          const riskController = mountRiskCoreMotion({
            gsap,
            ScrollTrigger,
            root: riskRoot,
            compact: mobile
          });
          diagnostics.riskCore = riskController.diagnostics;
          if (riskController.timeline) {
            ownedTimelines.add(riskController.timeline);
          }
        }

        const storySteps = gsap.utils.toArray("[data-story-step]");
        const storyProgress = document.querySelector("[data-story-progress]");

        if (storyProgress) {
          gsap.fromTo(
            storyProgress,
            { scaleX: 0.05 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: {
                id: "home-story-progress",
                trigger: ".decision-story__rows",
                start: "top 72%",
                end: "bottom 58%",
                scrub: desktop ? 0.35 : true
              }
            }
          );
        }

        storySteps.forEach((step, index) => {
          ScrollTrigger.create({
            id: `home-story-${index + 1}`,
            trigger: step,
            start: mobile ? "top 76%" : "top 62%",
            end: mobile ? "bottom 42%" : "bottom 38%",
            onToggle: ({ isActive }) => {
              if (!isActive) return;
              storySteps.forEach((item) => {
                item.classList.toggle("is-active", item === step);
              });
            }
          });
        });

        gsap.utils.toArray("[data-work-row]").forEach((row, index) => {
          const visual = row.querySelector(".work-row__visual");
          const marker = row.querySelector(".work-row__meta > span");

          if (visual) {
            gsap.from(visual, {
              x: desktop ? 24 : 0,
              y: desktop ? 0 : 14,
              duration: mobile ? 0.4 : 0.65,
              ease: "power3.out",
              immediateRender: false,
              scrollTrigger: {
                id: `home-work-${index + 1}`,
                trigger: row,
                start: "top 78%",
                once: true
              }
            });
          }

          if (marker) {
            gsap.from(marker, {
              scale: 0.88,
              transformOrigin: "left center",
              duration: 0.42,
              immediateRender: false,
              scrollTrigger: {
                id: `home-work-marker-${index + 1}`,
                trigger: row,
                start: "top 78%",
                once: true
              }
            });
          }
        });

        gsap.utils.toArray("[data-method-step]").forEach((step, index) => {
          const marker = step.querySelector(":scope > span");
          if (!marker) return;

          gsap.from(marker, {
            scale: 0.45,
            transformOrigin: "center",
            duration: 0.38,
            delay: mobile ? 0 : index * 0.045,
            immediateRender: false,
            scrollTrigger: {
              id: `home-method-${index + 1}`,
              trigger: step,
              start: "top 82%",
              once: true
            }
          });
        });

        diagnostics.scrollTriggersCreated = ScrollTrigger.getAll().filter(
          (trigger) => trigger.vars.id?.startsWith("home-")
        ).length;
        diagnostics.initialized = true;
      }, pageRoot);

      return () => {
        window.clearTimeout(heroRecoveryTimer);
        scope.revert();
        showStaticHomepage();
      };
    }
  );

  const handleVisibility = () => {
    ownedTimelines.forEach((timeline) => {
      if (document.hidden) {
        if (!timeline.paused() && timeline.progress() < 1) {
          pausedByVisibility.add(timeline);
          timeline.pause();
        }
      } else if (pausedByVisibility.has(timeline) && timeline.progress() < 1) {
        timeline.resume();
        pausedByVisibility.delete(timeline);
      }
    });
  };

  document.addEventListener("visibilitychange", handleVisibility);

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;
    window.clearTimeout(heroRecoveryTimer);
    document.removeEventListener("visibilitychange", handleVisibility);
    intro.cleanup();
    media.revert();
    ScrollTrigger.getAll()
      .filter((trigger) => trigger.vars.id?.startsWith("home-"))
      .forEach((trigger) => trigger.kill());
    ownedTimelines.clear();
    pausedByVisibility.clear();
    showStaticHomepage();
    diagnostics.cleanupComplete = true;
  };

  window.addEventListener("pagehide", cleanup, { once: true });
  window.__HOME_MOTION_CLEANUP__ = cleanup;
}
