import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  TorusGeometry,
  WebGLRenderer
} from "three";
import { createCoreState, setCompleteState } from "./core-model.js";
import { mountMotionController } from "./motion-controller.js";

function createLine(points, material) {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(points.flatMap(({ x, y, z = 0 }) => [x, y, z]), 3)
  );
  return new Line(geometry, material);
}

function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value?.isTexture) value.dispose();
  }
  material.dispose();
}

export function mountThreeCore({
  root,
  mount,
  fallback,
  lowPower,
  onFailure
}) {
  const canvas = document.createElement("canvas");
  canvas.className = "three-canvas";
  canvas.setAttribute("aria-hidden", "true");
  mount.appendChild(canvas);

  const renderer = new WebGLRenderer({
    canvas,
    alpha: false,
    antialias: !lowPower,
    powerPreference: lowPower ? "low-power" : "high-performance"
  });
  renderer.setClearColor(new Color("#0e1316"), 1);

  const dprCap = lowPower ? 1 : 1.5;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, dprCap);
  const scene = new Scene();
  const camera = new OrthographicCamera(-4.6, 4.6, 2.2, -2.2, 0.1, 30);
  camera.position.set(0, 0, 10);

  const palette = {
    mint: new Color("#79e3b7"),
    cyan: new Color("#4fc4df"),
    critical: new Color("#e47b73"),
    warning: new Color("#dfb35f"),
    muted: new Color("#465653")
  };

  const rootGroup = new Group();
  scene.add(rootGroup);

  const baseLineMaterial = new LineBasicMaterial({
    color: palette.muted,
    transparent: true,
    opacity: 0.8
  });
  const routeMaterial = new LineBasicMaterial({
    color: palette.mint,
    transparent: true,
    opacity: 0.95
  });
  const coreMaterial = new MeshBasicMaterial({
    color: palette.cyan,
    wireframe: true,
    transparent: true,
    opacity: 0.85
  });
  const ringMaterial = new MeshBasicMaterial({
    color: palette.muted,
    wireframe: true,
    transparent: true,
    opacity: 0.6
  });
  const normalSignalMaterial = new MeshBasicMaterial({ color: palette.mint });
  const anomalyMaterial = new MeshBasicMaterial({ color: palette.critical });
  const warningMaterial = new MeshBasicMaterial({ color: palette.warning });
  const nodeMaterial = new MeshBasicMaterial({ color: palette.cyan });

  const inboundRoute = createLine(
    [
      { x: -4, y: 0 },
      { x: -1.55, y: 0 }
    ],
    baseLineMaterial
  );
  rootGroup.add(inboundRoute);

  const rings = [0.95, 0.7, 0.45].map((radius, index) => {
    const ring = new Mesh(
      new TorusGeometry(radius, lowPower ? 0.018 : 0.026, 6, lowPower ? 32 : 56),
      index === 1 ? coreMaterial : ringMaterial
    );
    ring.rotation.x = index === 1 ? 0.74 : 0;
    ring.rotation.y = index === 2 ? 0.86 : 0;
    ring.position.x = -0.65;
    rootGroup.add(ring);
    return ring;
  });

  const signals = [-3.7, -3.15, -2.6].map((x, index) => {
    const signal = new Mesh(
      new IcosahedronGeometry(index === 1 ? 0.105 : 0.075, lowPower ? 0 : 1),
      index === 1 ? anomalyMaterial : normalSignalMaterial
    );
    signal.position.set(x, 0, 0.06);
    rootGroup.add(signal);
    return signal;
  });

  const riskNodes = [
    { x: 1.55, y: 0.82, material: nodeMaterial },
    { x: 2.08, y: 0, material: warningMaterial },
    { x: 1.55, y: -0.82, material: normalSignalMaterial }
  ].map(({ x, y, material }) => {
    const node = new Mesh(
      new BoxGeometry(0.19, 0.19, 0.19),
      material
    );
    node.position.set(x, y, 0);
    node.scale.setScalar(0.2);
    rootGroup.add(node);
    rootGroup.add(
      createLine(
        [
          { x: 0.32, y: 0 },
          { x, y }
        ],
        baseLineMaterial
      )
    );
    return node;
  });

  const decisionRoute = createLine(
    [
      { x: 2.08, y: 0 },
      { x: 3.05, y: 0 },
      { x: 3.05, y: 0.82 },
      { x: 4.02, y: 0.82 }
    ],
    routeMaterial
  );
  decisionRoute.scale.x = 0.001;
  rootGroup.add(decisionRoute);

  const decisionNode = new Mesh(
    new BoxGeometry(0.28, 0.28, 0.28),
    normalSignalMaterial
  );
  decisionNode.position.set(4.02, 0.82, 0);
  decisionNode.scale.setScalar(0.2);
  rootGroup.add(decisionNode);

  const state = createCoreState();
  let active = false;
  let disposed = false;
  let startTime = performance.now();
  let frames = 0;
  let lastWidth = 0;
  let lastHeight = 0;

  const diagnostics = root.prototypeDiagnostics;
  Object.assign(diagnostics, {
    renderer: "three-js",
    dynamicChunkLoaded: true,
    lowPower,
    dprCap,
    pixelRatio,
    frames: 0,
    averageFps: 0,
    geometries: 0,
    textures: 0,
    active: false,
    cleanupComplete: false
  });

  function resize() {
    const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
    const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));

    if (width === lastWidth && height === lastHeight) return;
    lastWidth = width;
    lastHeight = height;
    renderer.setSize(width, height, false);

    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const contentWidth = 9.2;
    const contentHeight = 4.4;
    const contentAspect = contentWidth / contentHeight;
    const viewWidth = aspect >= contentAspect ? contentHeight * aspect : contentWidth;
    const viewHeight = aspect >= contentAspect ? contentHeight : contentWidth / aspect;
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }

  function applyState() {
    signals.forEach((signal, index) => {
      signal.position.x =
        -3.7 + index * 0.55 + state.inbound * (1.45 + index * 0.12);
    });
    rings.forEach((ring, index) => {
      const scale = 0.82 + state.detection * (0.18 + index * 0.02);
      ring.scale.setScalar(scale);
      ring.material.opacity = 0.25 + state.detection * 0.65;
    });
    anomalyMaterial.color
      .copy(palette.mint)
      .lerp(palette.critical, state.anomaly);
    riskNodes.forEach((node, index) => {
      const scale = 0.2 + state.nodes * (0.8 + index * 0.04);
      node.scale.setScalar(scale);
    });
    decisionRoute.scale.x = Math.max(0.001, state.decision);
    decisionNode.scale.setScalar(0.2 + state.decision * 0.8);
  }

  function render(time = performance.now()) {
    if (disposed) return;
    resize();
    applyState();

    if (active) {
      const elapsed = (time - startTime) / 1000;
      rootGroup.rotation.y = Math.sin(elapsed * 0.34) * 0.09;
      rings[1].rotation.z = elapsed * 0.16;
      rings[2].rotation.z = elapsed * -0.12;
      frames += 1;
      diagnostics.frames = frames;
      diagnostics.averageFps = Math.round(
        frames / Math.max((time - startTime) / 1000, 0.001)
      );
    }

    renderer.render(scene, camera);
    diagnostics.geometries = renderer.info.memory.geometries;
    diagnostics.textures = renderer.info.memory.textures;
  }

  const motionController = mountMotionController({
    root,
    state,
    render,
    setComplete: setCompleteState,
    buildTimeline(timeline) {
      timeline
        .addLabel("signal")
        .to(state, { inbound: 1, onUpdate: render }, "signal")
        .addLabel("detect")
        .to(state, { detection: 1, onUpdate: render }, "detect")
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
        .addLabel("decide")
        .to(state, { decision: 1, onUpdate: render }, "decide");
    }
  });

  const resizeObserver = new ResizeObserver(() => render());
  resizeObserver.observe(canvas);

  const handleContextLost = (event) => {
    event.preventDefault();
    setActive(false);
    canvas.hidden = true;
    fallback.removeAttribute("hidden");
    onFailure("WebGL context lost: SVG fallback active.");
  };
  canvas.addEventListener("webglcontextlost", handleContextLost);

  function setActive(nextActive) {
    if (disposed) return;
    if (active === nextActive) {
      diagnostics.active = active;
      if (!active) motionController.pause();
      return;
    }
    active = nextActive;
    diagnostics.active = active;

    if (active) {
      motionController.resume();
      startTime = performance.now();
      frames = 0;
      renderer.setAnimationLoop(render);
      root.dataset.lifecycle = "running";
    } else {
      motionController.pause();
      renderer.setAnimationLoop(null);
      render();
      root.dataset.lifecycle = "paused";
    }
  }

  function cleanup() {
    if (disposed) return;
    disposed = true;
    active = false;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    motionController.cleanup();

    const geometries = new Set();
    const materials = new Set();
    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => materials.add(material));
      } else if (object.material) {
        materials.add(object.material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach(disposeMaterial);

    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    diagnostics.active = false;
    diagnostics.cleanupComplete = true;
    diagnostics.geometries = 0;
    diagnostics.textures = 0;
    root.dataset.lifecycle = "disposed";
  }

  fallback.setAttribute("hidden", "");
  render();

  return { setActive, cleanup, diagnostics };
}
