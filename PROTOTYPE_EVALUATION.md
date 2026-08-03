# Risk Intelligence Core Technical Prototype

## Decision

**Recommended homepage implementation: SVG/CSS implementation.**

The SVG prototype communicates the complete transaction-to-decision sequence with essentially the same clarity and visual impact as Canvas and Three.js, while keeping the visual inspectable, responsive, accessible, and directly choreographable. Three.js adds genuine spatial depth, but the measured 132.23 kB gzip renderer chunk, continuous GPU work, larger failure surface, and additional teardown code do not produce enough extra communication value for this concept.

This decision applies to the Risk Intelligence Core. It does not prohibit a future, separately justified Three.js prototype elsewhere.

## Scope and routes

The comparison lab is isolated from the five portfolio routes:

- `prototypes/index.html`
- `prototypes/svg-css.html`
- `prototypes/canvas-2d.html`
- `prototypes/three-js.html`

Every lab page is `noindex, nofollow`, is absent from `sitemap.xml`, and is not linked from the production portfolio. Vite builds the routes so their output can be tested exactly as it would be served, but no production deployment has been added or changed.

All three prototypes use the same original narrative:

1. Transaction signals enter the system.
2. Signals pass through detection layers.
3. An anomalous signal changes state and activates linked risk nodes.
4. A decision pathway routes the signal to review.

No racing imagery, downloaded model, texture, audio, copied scene, custom shader, or third-party visual asset is used.

## Guidance and technical sources

GSAP implementation follows GreenSock's official AI guidance at commit [`aed9cfd3277740755f6bfc1155c7aa645403b760`](https://github.com/greensock/gsap-skills/tree/aed9cfd3277740755f6bfc1155c7aa645403b760), specifically its core, timeline, ScrollTrigger, performance, and lifecycle guidance:

- register ScrollTrigger once;
- sequence work in a labelled timeline rather than manual delays;
- put ScrollTrigger on the top-level animation;
- animate transforms, opacity, and state rather than layout;
- use `gsap.matchMedia()` for responsive and reduced-motion behavior;
- scope lifecycle ownership and call `revert()` during teardown.

Three.js implementation follows official principles for [responsive drawing buffers](https://threejs.org/manual/en/responsive.html), [resource cleanup](https://threejs.org/manual/en/cleanup.html), and [animation loops](https://threejs.org/manual/en/creating-a-scene.html). No Three.js example scene or visual composition was copied.

Codrops projects were not installed, copied, or required for this prototype.

## Dependency and licence assessment

| Package | Version | Licence | Direct dependencies | Prototype use |
| --- | --- | --- | ---: | --- |
| GSAP | 3.15.0 | GreenSock Standard “no charge” licence | 0 | Timeline, ScrollTrigger, `matchMedia()`, and teardown test |
| Three.js | 0.185.1 | MIT | 0 | Dynamically loaded procedural WebGL comparison only |
| GSAP Skills | pinned guidance only | MIT | Not installed | Implementation reference |

The GSAP npm package is available without a paid membership, but its runtime is governed by GreenSock's custom licence rather than the MIT licence used by the separate skills repository. The package versions and integrity hashes are locked in `package-lock.json`.

## Bundle evidence

The Vite production build reports:

| Asset | Raw | Gzip | Loading behavior |
| --- | ---: | ---: | --- |
| Shared GSAP + ScrollTrigger chunk | 114.68 kB | 45.11 kB | Prototype routes that choreograph motion |
| SVG prototype entry | 2.08 kB | 0.85 kB | Initial |
| Canvas prototype entry | 3.65 kB | 1.68 kB | Initial |
| Three.js loader entry | 3.83 kB | 1.83 kB | Initial |
| Three.js procedural scene chunk | 524.46 kB | 132.23 kB | Dynamic; visibility gated |
| Prototype CSS, including the existing design system | 33.67 kB | 6.71 kB | Initial on lab routes |

Approximate local first-load payloads, excluding externally hosted fonts and normal HTTP overhead:

| Route | Before its visual runs | After its visual is available |
| --- | ---: | ---: |
| SVG/CSS | 55.3 kB gzip | 55.3 kB gzip |
| Canvas 2D | 56.2 kB gzip | 56.2 kB gzip |
| Three.js | 11.2 kB gzip | 188.6 kB gzip |

The Three.js route is deliberately light before visibility. Once visible, it must load both the renderer scene and the shared GSAP/ScrollTrigger chunk. Viewing another prototype first may allow the GSAP chunk to come from cache.

The five portfolio routes retain their existing 2.48 kB raw / 1.04 kB gzip JavaScript entry and 24.59 kB raw / 5.48 kB gzip CSS. The prototype dependencies do not enter those route graphs.

## Comparative evaluation

Scores use a five-point scale where 5 is strongest for the portfolio requirement.

| Criterion | SVG/CSS | Canvas 2D | Three.js progressive enhancement |
| --- | ---: | ---: | ---: |
| Visual impact | 4 | 4 | 4 |
| Originality | 4 | 4 | 4 |
| Maintainability | 5 | 3 | 2 |
| Bundle efficiency | 5 | 4 | 1 |
| Loading performance | 5 | 4 | 3 |
| Frame stability | 5 | 4 | 4 |
| Mobile performance | 5 | 4 | 3 |
| Battery and heat profile | 5 | 4 | 2 |
| Accessibility | 5 | 3 | 2 |
| Reduced-motion support | 5 | 5 | 5 |
| Failure resilience | 5 | 4 | 4 |
| Design-system integration | 5 | 5 | 3 |
| GSAP choreography | 5 | 4 | 4 |
| **Total / 65** | **63** | **52** | **41** |

### SVG/CSS

Strengths:

- Native vector scaling and direct integration with semantic colour tokens.
- SVG title and description expose the visual concept; the four-stage HTML narrative reinforces it.
- The complete decision state remains visible with JavaScript disabled.
- Individual signals, layers, nodes, and paths are easy to target with GSAP.
- No render loop, GPU context, drawing-buffer management, or renderer teardown.
- The strongest option for responsive art direction because geometry remains inspectable in browser tools.

Trade-offs:

- Complex future particle counts would make the DOM expensive.
- GSAP and ScrollTrigger are still a meaningful payload; Phase 3 should load them only where the homepage choreography needs them.

### Canvas 2D

Strengths:

- Slightly more freedom for dense procedural drawing without DOM-node growth.
- State-object choreography is compact and deterministic.
- Drawing occurs only while state changes; there is no perpetual loop in this prototype.
- Pixel ratio is capped at 1.5 and reduced to 1.0 on narrow screens.

Trade-offs:

- The bitmap is not semantically inspectable, so the HTML narrative and SVG fallback carry accessibility.
- Every resize, visual change, label, and hit area must be managed in code.
- Styling is less directly connected to CSS and harder for a future maintainer to tune.
- It does not materially outperform SVG for the small number of signals in this concept.

### Three.js progressive enhancement

Strengths:

- Adds genuine depth and a subtle spatial relationship between detection rings and risk nodes.
- The 3D chunk is dynamically imported only after intersection.
- The renderer runs only in view, pauses when `document.hidden`, and stops offscreen.
- Standard quality caps device pixel ratio at 1.5; narrow, save-data, low-memory, or low-core devices use 1.0, fewer geometry segments, no antialiasing, and a low-power context preference.
- A WebGL context failure immediately restores the complete inline SVG.
- Teardown stops the animation loop, disconnects observers, disposes geometry/material/texture resources, disposes the renderer, and releases the context.
- No model or model pipeline is needed.

Trade-offs:

- The 132.23 kB gzip scene chunk is more than 155 times the SVG entry size and requires the additional 45.11 kB gzip choreography chunk.
- The visual result is more spatial, but it does not explain the risk process more clearly than SVG.
- A continuous visible render loop consumes GPU time even after the explanatory timeline completes. This creates the highest battery and heat risk, especially on phones.
- The canvas remains decorative and requires duplicated semantic content.
- More lifecycle, quality, context-loss, resize, and disposal code increases maintenance and test surface.
- The production build correctly warns that the dynamic Three.js chunk exceeds 500 kB raw.

## Runtime and accessibility evidence

Automated Edge/Chromium checks cover 1440 px, 390 px, and 320 px layouts:

- no horizontal overflow on any lab route;
- correct active navigation and `noindex, nofollow`;
- exactly four readable narrative stages;
- keyboard-reachable replay controls;
- SVG title/description fallbacks;
- GSAP timelines and ScrollTriggers created and cleaned up;
- reduced-motion users receive the complete state with replay hidden;
- reduced-motion Three.js users do not request the Three.js chunk;
- Canvas performed more than 150 controlled redraws during the sequence and respected its DPR cap;
- Three.js loaded only after intersection;
- Three.js paused for simulated hidden-document and offscreen states;
- desktop Three.js reported 15 geometries, 0 textures, and no console errors;
- the 4× CPU-throttled 390 px test selected low-power mode and a 1.0 DPR cap;
- synthetic WebGL context loss activated the SVG fallback;
- Three.js cleanup removed the canvas and released tracked resources.

Headless frame counts are used as a regression signal, not as a claim about real-device refresh rate. They stayed above the 20 fps smoke threshold in both standard and 4× CPU-throttled runs. Physical battery temperature and Safari GPU behavior require later real-device testing if Three.js is reconsidered.

## Integration recommendation

Phase 3 should integrate the **SVG/CSS implementation** as the Risk Intelligence Core and use progressive enhancement in this order:

1. Static semantic SVG and adjacent narrative are the baseline.
2. CSS establishes the complete readable state and responsive geometry.
3. A dynamically loaded GSAP/ScrollTrigger module choreographs signal, detection, investigation, and decision states when the section approaches the viewport.
4. `gsap.matchMedia()` bypasses motion and preserves the complete state for reduced-motion users.
5. Teardown reverts the scoped GSAP context and removes event listeners.

Do not introduce Blender, GLB, Draco, KTX2, glTF Transform, or a model pipeline. The procedural Three.js prototype did not prove those tools necessary, and Three.js itself is not recommended for this homepage centrepiece.

Before production preparation, the comparison routes should either be excluded from the deploy input or retained only as explicitly approved no-index technical documentation. No decision about deploying them is made in this phase.
