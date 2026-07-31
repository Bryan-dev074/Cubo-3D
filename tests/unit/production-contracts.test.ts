import { readFileSync } from "node:fs";
import path, { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production rendering contracts", () => {
  it("keeps the WebGL studio light-only and associates its drag instructions", () => {
    const sceneSource = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );
    const heroSource = readFileSync(
      resolve(process.cwd(), "components/experience/HeroCopy.tsx"),
      "utf8",
    );

    expect(sceneSource).toContain("palette={LIGHT_PALETTE}");
    expect(sceneSource).not.toContain("DARK_PALETTE");
    expect(sceneSource).not.toContain("prefers-color-scheme: dark");
    expect(sceneSource).toContain('aria-describedby="cube-drag-hint"');
    expect(heroSource).toContain('id="cube-drag-hint"');
  });

  it("keeps the cube static when the user is idle", () => {
    const magicCubeSource = readFileSync(
      path.join(process.cwd(), "components/cube/MagicCube.tsx"),
      "utf8",
    );
    const dropTimelineSource = readFileSync(
      path.join(process.cwd(), "components/cube/useCubeDropTimeline.ts"),
      "utf8",
    );
    const sceneSource = readFileSync(
      path.join(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );

    expect(magicCubeSource).not.toContain("setInterval");
    expect(magicCubeSource).not.toContain("ambientTurnEnabled");
    expect(sceneSource).toContain('frameloop="demand"');
    expect(sceneSource).toContain("autoRotate={false}");
    expect(sceneSource).not.toContain("autoRotate={true}");
    expect(magicCubeSource).toContain("useCubeDropTimeline");
    expect(dropTimelineSource).toContain("INTRO_DROP_MS");
    expect(magicCubeSource).not.toMatch(
      /useFrame\([^)]*=>[^]*autoRotate/,
    );
  });

  it("plumbs adaptive cursor intent through the scene and keeps orbit finite", () => {
    const canvasSource = readFileSync(
      resolve(process.cwd(), "components/cube/CubeCanvas.tsx"),
      "utf8",
    );
    const sceneSource = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );
    const magicCubeSource = readFileSync(
      resolve(process.cwd(), "components/cube/MagicCube.tsx"),
      "utf8",
    );
    const experienceSource = readFileSync(
      resolve(process.cwd(), "components/experience/MagicCubeExperience.tsx"),
      "utf8",
    );

    expect(canvasSource).toContain("onCursorIntentChange");
    expect(sceneSource).toContain("onCursorIntentChange");
    expect(sceneSource).toContain("onStart={handleOrbitStart}");
    expect(sceneSource).toContain("onEnd={handleOrbitEnd}");
    expect(sceneSource).toContain("cubeInteractionReducer");
    expect(magicCubeSource).toContain(
      "onCursorIntentChange: onCursorIntentChange",
    );
    expect(experienceSource).toContain("<AdaptiveCursor");
    expect(experienceSource).toContain("data-custom-cursor");
    expect(experienceSource).toContain("data-cube-custom-cursor");
    expect(experienceSource).toContain("paused={introLocked}");
  });

  it("styles one technical cursor without layout or positional transitions", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const globalStyles = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf8",
    );
    const cursorRule = styles.match(
      /\.adaptiveCursor\s*\{([\s\S]*?)\n\}/,
    )?.[1];

    expect(cursorRule).toBeDefined();
    expect(cursorRule).toContain("position: fixed");
    expect(cursorRule).toContain("pointer-events: none");
    expect(cursorRule).not.toContain("transition:");
    expect(styles).toContain(".cursorDot");
    expect(styles).toContain(".cursorRing");
    expect(styles).toContain(".cursorArc");
    expect(styles).toContain(".cursorAxis");
    expect(styles).toContain(".cursorOrbit");
    expect(styles).toContain(
      '.adaptiveCursor[data-visible="true"][data-mode="disabled"]',
    );
    expect(styles).not.toMatch(
      /\.adaptiveCursor\[data-mode="disabled"\]\s*\{/,
    );
    expect(styles).toMatch(
      /@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)/,
    );
    expect(styles).toMatch(
      /\.experience\[data-custom-cursor="true"\][\s\S]*?cursor:\s*none/,
    );
    expect(globalStyles).toContain('body[data-cube-custom-cursor="true"]');
    expect(globalStyles).toMatch(
      /body\[data-cube-custom-cursor="true"\][\s\S]*?cursor:\s*none/,
    );
    expect(styles).not.toContain("transition: all");
  });

  it("drops only the real cube root and completes the finite scene handshake", () => {
    const canvasSource = readFileSync(
      path.join(process.cwd(), "components/cube/CubeCanvas.tsx"),
      "utf8",
    );
    const sceneSource = readFileSync(
      path.join(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );
    const magicCubeSource = readFileSync(
      path.join(process.cwd(), "components/cube/MagicCube.tsx"),
      "utf8",
    );
    const dropTimelineSource = readFileSync(
      path.join(process.cwd(), "components/cube/useCubeDropTimeline.ts"),
      "utf8",
    );
    const introSequenceSource = readFileSync(
      path.join(process.cwd(), "components/experience/useIntroSequence.ts"),
      "utf8",
    );

    expect(canvasSource).toContain("introPhase");
    expect(canvasSource).toContain("onDropComplete");
    expect(canvasSource).toContain("onSceneReady");
    expect(sceneSource).not.toContain("onSceneReady?.()");
    expect(sceneSource).toContain("onSceneReady={onSceneReady}");
    expect(magicCubeSource).toContain("sceneReadyCalledRef");
    expect(magicCubeSource).toContain("onSceneReady?.()");
    expect(magicCubeSource).toContain("useLayoutEffect");
    expect(magicCubeSource).toContain("useCubeDropTimeline");
    expect(dropTimelineSource).toContain("useLayoutEffect");
    expect(dropTimelineSource).toContain("sampleCubeDrop");
    expect(dropTimelineSource).toContain("dropProfile");
    expect(dropTimelineSource).toContain(
      "sampleCubeDrop(progress, dropProfileRef.current)",
    );
    expect(magicCubeSource).toContain("applyRootDrop(rootRef.current");
    expect(dropTimelineSource).toContain("dropCompletedRef");
    expect(dropTimelineSource).toContain("accumulatedVisibleMsRef");
    expect(introSequenceSource).toContain("INTRO_DROP_MS");
    expect(introSequenceSource).toContain('type: "reveal-timeout"');
    expect(magicCubeSource).toContain(
      'disabled: introPhase !== "ready"',
    );
  });

  it("keeps the mechanical package and real interface on one 1350 ms clock", () => {
    const packageSource = readFileSync(
      resolve(process.cwd(), "components/experience/PackageIntro.tsx"),
      "utf8",
    );
    const styles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );

    expect(packageSource).toContain("matchesPackageCompletionAnimation");
    expect(packageSource).toContain("PACKAGE_COMPLETION_ANIMATIONS");
    expect(packageSource).not.toContain("event.animationName ===");
    expect(packageSource).not.toContain('event.animationName === "package-intro-reveal"');
    expect(styles).toMatch(
      /animation:\s*intro-package-finish 1350ms linear forwards/,
    );
    expect(styles).toContain("cubic-bezier(0.23, 1, 0.32, 1)");
    expect(styles).toContain("cubic-bezier(0.77, 0, 0.175, 1)");
    expect(styles).toMatch(
      /data-intro-phase="opening"\] \.header[\s\S]*?400ms/,
    );
    expect(styles).toMatch(
      /data-intro-phase="opening"\] \.plotterLine:nth-child\(1\)[\s\S]*?360ms/,
    );
    expect(styles).toMatch(
      /data-intro-phase="opening"\] \.plotterLine:nth-child\(2\)[\s\S]*?410ms/,
    );
    expect(styles).toMatch(
      /data-intro-phase="sealed"\][\s\S]*?\.cubeFrame[\s\S]*?opacity:\s*0/,
    );
    expect(styles).toMatch(
      /data-intro-phase="opening"\][\s\S]*?\.plotterGlyph[\s\S]*?animation-play-state:\s*paused/,
    );
    const flapRule = styles.match(/\.packageFlap\s*\{([\s\S]*?)\n\}/)?.[1];
    expect(flapRule).toContain("backface-visibility: visible");
    expect(flapRule).not.toContain("backface-visibility: hidden");
    expect(styles).toMatch(
      /\.packageFlap\[data-flap="top"\]::before,[\s\S]*?\.packageFlap\[data-flap="bottom"\]::before\s*\{[\s\S]*?translateZ\(-3px\) rotateX\(180deg\)/,
    );
    expect(styles).toMatch(
      /\.packageFlap\[data-flap="left"\]::before,[\s\S]*?\.packageFlap\[data-flap="right"\]::before\s*\{[\s\S]*?translateZ\(-3px\) rotateY\(180deg\)/,
    );
    expect(styles).toMatch(
      /\.packageFlapEdge\s*\{[\s\S]*?translateZ\(2px\)/,
    );
  });

  it("pauses every finite package and real-interface participant while hidden", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const hiddenPauseRule = styles.match(
      /\.experience\[data-page-visible="false"\] \.groundShadow,[\s\S]*?animation-play-state:\s*paused\s*!important;\s*\}/,
    )?.[0];

    expect(hiddenPauseRule).toBeDefined();
    for (const participant of [
      ".packageIntro::before",
      ".packageIntroTimeline",
      ".packageIntroRegistration",
      ".packageSeal",
      ".packageRail",
      ".packageHinge",
      ".packageInnerFace",
      ".packageAperture",
      ".packageFlap",
      ".packageIntroSpine",
      ".cobaltSpine",
      ".header",
      ".registrationMark",
      ".plotterLine",
      ".promise",
      ".scrambleButton",
      ".firstUseHint",
      ".stage",
      ".planDrawing",
      ".telemetry",
      ".controlDock",
    ]) {
      expect(hiddenPauseRule).toContain(participant);
    }
  });

  it("keeps opened flap backs visible and brings real interface signals forward", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const flapRule = styles.match(/\.packageFlap\s*\{([\s\S]*?)\n\}/)?.[1];

    expect(flapRule).toContain("backface-visibility: visible");
    expect(flapRule).not.toContain("backface-visibility: hidden");
    expect(flapRule).toContain("background: transparent");
    expect(styles).toMatch(
      /\.packageFlap::after\s*\{[\s\S]*?backface-visibility:\s*hidden;[\s\S]*?translateZ\(1px\)/,
    );
    expect(styles).toMatch(
      /\.packageFlap\[data-flap="top"\]::before,[\s\S]*?\.packageFlap\[data-flap="bottom"\]::before\s*\{[\s\S]*?translateZ\(-3px\) rotateX\(180deg\)/,
    );
    expect(styles).toMatch(
      /\.packageFlap\[data-flap="left"\]::before,[\s\S]*?\.packageFlap\[data-flap="right"\]::before\s*\{[\s\S]*?translateZ\(-3px\) rotateY\(180deg\)/,
    );
    expect(styles).toMatch(
      /\.packageFlapEdge\s*\{[\s\S]*?translateZ\(2px\)/,
    );
    expect(styles).toMatch(
      /data-intro-phase="opening"\] \.plotterLine:nth-child\(1\)[\s\S]*?360ms/,
    );
    expect(styles).toMatch(
      /data-intro-phase="opening"\] \.plotterLine:nth-child\(2\)[\s\S]*?410ms/,
    );
    expect(styles).toMatch(
      /data-intro-phase="opening"\] \.stage,[\s\S]*?380ms/,
    );
    for (const [flap, delay] of [
      ["top", "120ms"],
      ["right", "165ms"],
      ["bottom", "210ms"],
      ["left", "255ms"],
    ] as const) {
      expect(styles).toMatch(
        new RegExp(
          `data-phase="opening"\\] \\.packageFlap\\[data-flap="${flap}"\\][\\s\\S]*?${delay} forwards`,
        ),
      );
    }
    expect(styles).toMatch(
      /data-phase="opening"\] \.packageIntroSpine\s*\{[\s\S]*?package-spine-release/,
    );
    expect(styles).toContain(
      "package-opened-flap-fade 240ms linear 980ms",
    );
    expect(styles).toMatch(
      /data-phase="opening"\] \.packageFlap\[data-flap="left"\]\s*\{[\s\S]*?z-index:\s*8/,
    );
  });

  it("starts the fixed HTML shadow cue with the drop and preserves its base transform", () => {
    const experienceSource = readFileSync(
      resolve(process.cwd(), "components/experience/MagicCubeExperience.tsx"),
      "utf8",
    );
    const experienceStyles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const magicCubeSource = readFileSync(
      resolve(process.cwd(), "components/cube/MagicCube.tsx"),
      "utf8",
    );

    expect(experienceSource).toContain("--cube-shadow-start-opacity");
    expect(experienceSource).toContain("--cube-shadow-final-opacity");
    expect(experienceSource).toContain("data-page-visible");
    const shadowRule = experienceStyles.match(
      /\.groundShadow\s*\{([\s\S]*?)\n\}/,
    )?.[1];
    expect(shadowRule).toBeDefined();
    expect(shadowRule).not.toContain("transition:");
    expect(experienceStyles).toMatch(
      /\.experience\[data-intro-phase="drop"\] \.groundShadow\s*\{[^}]*animation:\s*cube-shadow-drop 650ms linear both;/,
    );
    expect(experienceStyles).toContain(
      "translate(-50%, -50%) rotate(-4deg) scale(var(--cube-shadow-scale))",
    );
    expect(experienceStyles).toMatch(
      /\.experience\[data-intro-phase="ready"\] \.groundShadow\s*\{[^}]*opacity:\s*var\(--cube-shadow-final-opacity\);[^}]*transform:[^}]*var\(--cube-shadow-final-scale\)/,
    );
    const shadowKeyframes = experienceStyles.match(
      /@keyframes cube-shadow-drop\s*\{([\s\S]*?)\n\}/,
    )?.[1];
    expect(shadowKeyframes).toContain("--cube-shadow-start-opacity");
    expect(shadowKeyframes).toContain("--cube-shadow-final-opacity");
    expect(shadowKeyframes).toMatch(
      /0%\s*\{[^}]*--cube-shadow-start-opacity[^}]*--cube-shadow-start-scale/,
    );
    expect(shadowKeyframes).toMatch(
      /50%\s*\{[^}]*opacity:\s*0\.732;[^}]*scale\(0\.921\)/,
    );
    expect(shadowKeyframes).toMatch(
      /65%\s*\{[^}]*opacity:\s*0\.967;[^}]*scale\(0\.99\)/,
    );
    expect(shadowKeyframes).toMatch(
      /72%,\s*100%\s*\{[^}]*--cube-shadow-final-opacity[^}]*--cube-shadow-final-scale/,
    );
    expect(shadowKeyframes).not.toMatch(/\b(?:top|left):/);
    expect(experienceStyles).toMatch(
      /\.experience\[data-page-visible="false"\][\s\S]*?animation-play-state:\s*paused\s*!important;/,
    );
    expect(experienceStyles).toMatch(
      /data-page-visible="false"\][\s\S]*?\.packageIntroTimeline/,
    );
    expect(experienceStyles).toMatch(
      /data-page-visible="false"\][\s\S]*?\.packageFlap/,
    );
    expect(experienceStyles).toMatch(
      /\.experience\[data-page-visible="false"\]\s+\.stage\[data-celebrating="true"\]\s+\.cubeFrame::after[\s\S]*?animation-play-state:\s*paused\s*!important;/,
    );
    expect(magicCubeSource).toContain("useCelebrationTimeline");
  });

  it("keeps the loading poster on the same warm-white product surface", () => {
    const globalStyles = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf8",
    );

    expect(globalStyles).toMatch(
      /\.cube-poster\s*\{[\s\S]*?background:\s*#f8f8f7;/,
    );
    expect(globalStyles).not.toContain("#e8edef");
  });

  it("updates the high-frequency move count without entry motion", () => {
    const telemetrySource = readFileSync(
      resolve(process.cwd(), "components/experience/LiveTelemetry.tsx"),
      "utf8",
    );
    const experienceStyles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );

    expect(telemetrySource).not.toContain(
      "key={snapshot.confirmedUserMoves}",
    );
    expect(experienceStyles).not.toContain("animation: number-enter");
    expect(experienceStyles).not.toContain("@keyframes number-enter");
    const moveNumberRule = experienceStyles.match(
      /\.moveNumber\s*\{([^}]*)\}/,
    )?.[1];
    expect(moveNumberRule).not.toMatch(/(?:animation|transition)\s*:/);
  });

  it("centralizes ambient pause state and scopes it away from finite entry motion", () => {
    const experienceSource = readFileSync(
      resolve(process.cwd(), "components/experience/MagicCubeExperience.tsx"),
      "utf8",
    );
    const telemetrySource = readFileSync(
      resolve(process.cwd(), "components/experience/LiveTelemetry.tsx"),
      "utf8",
    );
    const styles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );

    expect(experienceSource).toContain("data-motion-paused");
    for (const blocker of [
      'introPhase !== "ready"',
      "isSceneInteracting",
      "isAnimating",
      "celebrationActive",
      "helpOpen",
      "successOpen",
      "!pageVisible",
      "introReducedMotion",
    ]) {
      expect(experienceSource).toContain(blocker);
    }
    expect(experienceSource).toContain("motionPaused={motionPaused}");
    expect(experienceSource).toContain("paused={introLocked}");
    expect(telemetrySource).toContain("readonly motionPaused: boolean");
    expect(telemetrySource).not.toContain("usePageVisibility");
    expect(telemetrySource).not.toContain("useReducedMotion");
    expect(telemetrySource).not.toContain('"visibilitychange"');

    for (const loop of [
      ".plotterGlyph",
      ".plotterRegister",
      ".planDrawing",
      ".pieceMatrix::after",
      ".statusDot",
      ".planRegistrationMotion",
      ".cobaltSpine::before",
      ".cobaltSpine::after",
      ".telemetrySummaryRail",
      ".controlDock::before",
      ".purchaseButton::after",
      ".heroRule::after",
      ".cubeFrame",
    ]) {
      expect(styles).toContain(
        `.experience[data-motion-paused="true"] ${loop}`,
      );
    }
    expect(styles).toMatch(
      /\.experience\[data-motion-paused="true"\] \.planDrawing/,
    );
    expect(styles).not.toMatch(
      /\.experience\[data-motion-paused="true"\] \.(?:packageIntro|packageFlap|groundShadow)/,
    );
    expect(styles).toMatch(
      /\.experience\[data-motion-paused="true"\]\[data-intro-phase="opening"\]\[data-page-visible="true"\]\s+\.planDrawing\s*\{[^}]*animation-play-state:\s*running\s*!important;/,
    );
    expect(styles).toMatch(
      /\.experience\[data-page-visible="false"\] \.groundShadow/,
    );
  });

  it("keeps the ambient director CSS-only and detached from WebGL rendering", () => {
    const taskSources = [
      "components/experience/MagicCubeExperience.tsx",
      "components/experience/ControlDock.tsx",
      "components/experience/LiveTelemetry.tsx",
    ].map((file) => readFileSync(resolve(process.cwd(), file), "utf8"));
    const sceneSource = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );

    for (const source of taskSources) {
      expect(source).not.toContain("setInterval");
      expect(source).not.toContain("requestAnimationFrame");
      expect(source).not.toContain("useFrame");
    }
    expect(sceneSource).not.toContain("autoRotate={true}");
  });

  it("turns off only ambient animation names for reduced motion", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );
    const reducedMotionStyles = styles.slice(
      styles.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    const reducedAmbientRule = reducedMotionStyles.match(
      /\.pieceMatrix::after,[\s\S]*?\.cubeFrame\s*\{([^}]*)\}/,
    )?.[1];

    expect(reducedAmbientRule).toMatch(/animation-name:\s*none\s*!important;/);
    expect(reducedMotionStyles).toMatch(
      /\.plotterBase\s*\{[^}]*opacity:\s*0;/,
    );
    expect(styles).not.toMatch(/\.planDrawing\s*\{[^}]*will-change:/);
    expect(styles).not.toMatch(
      /\.planRegistrationMotion\s*\{[^}]*will-change:/,
    );
    expect(styles).not.toContain("transition: all");
  });

  it("uses a fixed HTML stage shadow instead of a camera-projected contact shadow", () => {
    const sceneSource = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );
    const experienceSource = readFileSync(
      resolve(process.cwd(), "components/experience/MagicCubeExperience.tsx"),
      "utf8",
    );
    const experienceStyles = readFileSync(
      resolve(process.cwd(), "components/experience/experience.module.css"),
      "utf8",
    );

    expect(sceneSource).not.toContain("ContactShadows");
    expect(sceneSource).not.toContain("shadowSize");
    expect(experienceSource).toContain('data-testid="cube-ground-shadow"');
    expect(experienceStyles).toContain(".groundShadow");
    expect(experienceStyles).toContain("@media (max-width: 390px)");
    expect(experienceStyles).toContain("@media (max-width: 320px)");
  });

  it("keeps the three broad studio area lights after moving the shadow to HTML", () => {
    const sceneSource = readFileSync(
      resolve(process.cwd(), "components/cube/CubeScene.tsx"),
      "utf8",
    );

    expect(sceneSource.match(/<StudioAreaLight/g)).toHaveLength(3);
    expect(sceneSource).not.toContain("<spotLight");
  });

  it("runs the performance lab with the normal motion preference", () => {
    const source = readFileSync(
      resolve(process.cwd(), "tests/e2e/performance.spec.ts"),
      "utf8",
    );

    expect(source).toContain('reducedMotion: "no-preference"');
    expect(source).toContain('trace: "off"');
    expect(source).toContain("await mkdir(durableMetricsDirectory");
    expect(source).toContain("recursive: true");
  });

  it("creates the ignored visual artifact directory on a clean clone", () => {
    const source = readFileSync(
      resolve(process.cwd(), "tests/e2e/responsive.spec.ts"),
      "utf8",
    );

    expect(source).toContain("await mkdir(VISUAL_ARTIFACT_DIRECTORY");
    expect(source).toContain("recursive: true");
  });

  it("keeps generated worktrees and local evidence outside the lint surface", () => {
    const source = readFileSync(
      resolve(process.cwd(), "eslint.config.mjs"),
      "utf8",
    );

    expect(source).toContain('".worktrees/**"');
    expect(source).toContain('".superpowers/**"');
  });

  it("releases new WebGL contexts before the orbit-shadow stress story", () => {
    const source = readFileSync(
      resolve(process.cwd(), "tests/e2e/responsive.spec.ts"),
      "utf8",
    );
    const ambientStory = source.indexOf(
      "for (const viewport of AMBIENT_VIEWPORTS)",
    );
    const cadenceStory = source.indexOf(
      'test("mobile sustains at most one high contrast ambient pulse',
    );
    const reducedStory = source.indexOf(
      'test("reduced motion leaves the plotter solid',
    );
    const orbitShadowStory = source.indexOf(
      'test("mobile-390 keeps the fixed ground shadow unchanged',
    );

    expect(ambientStory).toBeGreaterThan(-1);
    expect(cadenceStory).toBeGreaterThan(ambientStory);
    expect(reducedStory).toBeGreaterThan(cadenceStory);
    expect(orbitShadowStory).toBeGreaterThan(reducedStory);
    expect(source).toContain("async function releaseWebGLContexts");
    expect(source).toContain('getExtension("WEBGL_lose_context")');
    expect(source.match(/await releaseWebGLContexts\(page\)/g)).toHaveLength(3);
    expect(source).not.toContain("test.setTimeout");
  });

  it("scopes deterministic randomness to the scramble click instead of the page lifetime", () => {
    const source = readFileSync(
      resolve(process.cwd(), "tests/e2e/helpers.ts"),
      "utf8",
    );
    const browserStateSource = source.match(
      /export async function setDeterministicBrowserState[\s\S]*?(?=export async function openExperience)/,
    )?.[0];

    expect(browserStateSource).toBeDefined();
    expect(browserStateSource).not.toContain("Math.random");
    expect(source).toContain('window.addEventListener("click", restore');
    expect(source).toContain("setTimeout(restore, 0)");
  });
});
