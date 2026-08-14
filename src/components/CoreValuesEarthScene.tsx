"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type CoreValuesSceneLayer = {
  title: string;
  layer: string;
  color: string;
  text: string;
  radius: number;
  reason?: string;
};

type Props = {
  layers: readonly CoreValuesSceneLayer[];
  activeTitle: string | null;
  highlightedTitle: string | null;
  reducedMotion: boolean;
  onHover: (title: string | null) => void;
  onReady: () => void;
  onSelect: (title: string) => void;
  onUnavailable: () => void;
};

type RenderedLayer = {
  baseColor: THREE.Color;
  materials: THREE.MeshStandardMaterial[];
  title: string;
};

const EARTH_RADIUS = 2.3;
const MODEL_RADII = [0.66, 1.15, 1.75, EARTH_RADIUS] as const;

// SphereGeometry uses longitude around the Y axis. Keeping 270 degrees removes
// the front-right quarter so the nested layers and both cut faces remain visible.
const CUT_START = Math.PI;
const CUT_LENGTH = Math.PI * 1.5;
const CUT_FACES = [Math.PI / 2, Math.PI] as const;
const BASE_ROTATION = { x: -0.1, y: -0.5, z: -0.025 };

function createCutFaceGeometry(innerRadius: number, outerRadius: number, segments: number) {
  if (innerRadius === 0) {
    return new THREE.CircleGeometry(
      outerRadius,
      segments,
      -Math.PI / 2,
      Math.PI,
    );
  }

  return new THREE.RingGeometry(
    innerRadius,
    outerRadius,
    segments,
    1,
    -Math.PI / 2,
    Math.PI,
  );
}

function createCutArcGeometry(radius: number, segments: number) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = -Math.PI / 2 + (index / segments) * Math.PI;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0,
    ));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

export default function CoreValuesEarthScene({
  layers,
  activeTitle,
  highlightedTitle,
  reducedMotion,
  onHover,
  onReady,
  onSelect,
  onUnavailable,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeTitleRef = useRef(activeTitle);
  const highlightedTitleRef = useRef(highlightedTitle);
  const onHoverRef = useRef(onHover);
  const onReadyRef = useRef(onReady);
  const onUnavailableRef = useRef(onUnavailable);
  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => { activeTitleRef.current = activeTitle; }, [activeTitle]);
  useEffect(() => { highlightedTitleRef.current = highlightedTitle; }, [highlightedTitle]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onUnavailableRef.current = onUnavailable; }, [onUnavailable]);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);

  // Selection belongs to the adjacent semantic buttons. Keeping this prop in the
  // public API avoids coupling the renderer rewrite to the accessible controls.
  void onSelect;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const compactViewport = window.matchMedia("(max-width: 767px)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      onUnavailableRef.current();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compactViewport ? 1.35 : 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.pointerEvents = "auto";
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.style.width = "100%";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(compactViewport ? 36 : 33, 1, 0.1, 50);
    camera.position.set(0, 0.05, compactViewport ? 8.45 : 8.1);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight("#FFF9F2", "#3B2738", 1.75));

    const keyLight = new THREE.DirectionalLight("#FFF7ED", 2.25);
    keyLight.position.set(-4.2, 5.6, 6.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#E6D1E0", 0.85);
    fillLight.position.set(4.6, 0.8, 3.2);
    scene.add(fillLight);

    const earth = new THREE.Group();
    earth.rotation.set(BASE_ROTATION.x, BASE_ROTATION.y, BASE_ROTATION.z);
    scene.add(earth);

    const widthSegments = compactViewport ? 64 : 96;
    const heightSegments = compactViewport ? 40 : 64;
    const faceSegments = compactViewport ? 56 : 88;
    const renderedLayers: RenderedLayer[] = [];

    layers.forEach((layer, index) => {
      const radius = MODEL_RADII[index];
      const innerRadius = index === 0 ? 0 : MODEL_RADII[index - 1];
      const baseColor = new THREE.Color(layer.color);
      const materials: THREE.MeshStandardMaterial[] = [];

      const shellMaterial = new THREE.MeshStandardMaterial({
        color: baseColor.clone(),
        emissive: baseColor.clone(),
        emissiveIntensity: 0.025,
        metalness: 0,
        roughness: 0.82,
        side: THREE.DoubleSide,
      });
      materials.push(shellMaterial);

      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(
          radius,
          widthSegments,
          heightSegments,
          CUT_START,
          CUT_LENGTH,
          0,
          Math.PI,
        ),
        shellMaterial,
      );
      shell.renderOrder = index;
      earth.add(shell);

      CUT_FACES.forEach((longitude, faceIndex) => {
        const faceMaterial = new THREE.MeshStandardMaterial({
          color: baseColor.clone(),
          emissive: baseColor.clone(),
          emissiveIntensity: 0.04,
          metalness: 0,
          roughness: 0.88,
          side: THREE.DoubleSide,
        });
        materials.push(faceMaterial);

        const face = new THREE.Mesh(
          createCutFaceGeometry(innerRadius, radius, faceSegments),
          faceMaterial,
        );
        face.rotation.y = longitude - Math.PI;
        // A tiny offset prevents coplanar faces from flickering at their shared axis.
        face.position.set(
          -Math.cos(longitude) * faceIndex * 0.001,
          0,
          Math.sin(longitude) * faceIndex * 0.001,
        );
        face.renderOrder = 10 + index;
        earth.add(face);

        const separatorMaterial = new THREE.LineBasicMaterial({
          color: "#FFFDF9",
          opacity: index === layers.length - 1 ? 0.58 : 0.4,
          transparent: true,
        });
        const separator = new THREE.Line(
          createCutArcGeometry(radius, Math.max(32, Math.round(faceSegments * 0.75))),
          separatorMaterial,
        );
        separator.rotation.y = longitude - Math.PI;
        separator.renderOrder = 20 + index;
        earth.add(separator);
      });

      renderedLayers.push({ baseColor, materials, title: layer.title });
    });

    let animationFrame = 0;
    let visible = true;
    let scrollImpulse = 0;
    let lastScrollY = window.scrollY;
    let dragging = false;
    let dragPointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let dragPitch = 0;
    let dragYaw = 0;
    let pitchVelocity = 0;
    let yawVelocity = 0;
    const clock = new THREE.Clock();

    const onScroll = () => {
      if (reducedMotionRef.current) {
        lastScrollY = window.scrollY;
        return;
      }
      if (!visible) {
        lastScrollY = window.scrollY;
        return;
      }
      const delta = THREE.MathUtils.clamp(window.scrollY - lastScrollY, -64, 64);
      scrollImpulse = THREE.MathUtils.clamp(scrollImpulse + delta * 0.0011, -0.075, 0.075);
      lastScrollY = window.scrollY;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragPointerId = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      pitchVelocity = 0;
      yawVelocity = 0;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || dragPointerId !== event.pointerId) return;
      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;

      const yawDelta = deltaX * 0.0065;
      const pitchDelta = deltaY * 0.0045;
      dragYaw = THREE.MathUtils.clamp(dragYaw + yawDelta, -0.48, 0.48);
      dragPitch = THREE.MathUtils.clamp(dragPitch + pitchDelta, -0.24, 0.24);
      yawVelocity = yawDelta;
      pitchVelocity = pitchDelta;
    };

    const stopDragging = (event: PointerEvent) => {
      if (dragPointerId !== event.pointerId) return;
      dragging = false;
      dragPointerId = null;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      renderer.domElement.style.cursor = "grab";
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      onUnavailableRef.current();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", stopDragging);
    renderer.domElement.addEventListener("pointercancel", stopDragging);

    const resize = () => {
      const { height, width } = mount.getBoundingClientRect();
      if (!height || !width) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    }, { rootMargin: "120px" });
    intersectionObserver.observe(mount);

    const animate = () => {
      const highlighted = highlightedTitleRef.current;
      const active = activeTitleRef.current;
      const reduceMotion = reducedMotionRef.current;
      const elapsed = clock.getElapsedTime();

      if (reduceMotion) {
        earth.rotation.set(BASE_ROTATION.x, BASE_ROTATION.y, BASE_ROTATION.z);
        scrollImpulse = 0;
      } else {
        scrollImpulse *= 0.91;
        if (!dragging) {
          dragYaw = THREE.MathUtils.clamp(dragYaw + yawVelocity, -0.48, 0.48);
          dragPitch = THREE.MathUtils.clamp(dragPitch + pitchVelocity, -0.24, 0.24);
          yawVelocity *= 0.86;
          pitchVelocity *= 0.86;
          dragYaw *= 0.996;
          dragPitch *= 0.996;
        }
        const targetX = BASE_ROTATION.x + Math.sin(elapsed * 0.46) * 0.026 + scrollImpulse * 0.42 + dragPitch;
        const targetY = BASE_ROTATION.y + Math.sin(elapsed * 0.31) * 0.054 + scrollImpulse * 1.35 + dragYaw;
        const targetZ = BASE_ROTATION.z + Math.cos(elapsed * 0.38) * 0.018 - dragYaw * 0.045;
        earth.rotation.x = THREE.MathUtils.lerp(earth.rotation.x, targetX, 0.075);
        earth.rotation.y = THREE.MathUtils.lerp(earth.rotation.y, targetY, 0.075);
        earth.rotation.z = THREE.MathUtils.lerp(earth.rotation.z, targetZ, 0.075);
      }

      renderedLayers.forEach(({ baseColor, materials, title }) => {
        const emphasized = title === highlighted || title === active;
        const selected = title === active;
        const targetColor = emphasized
          ? baseColor.clone().lerp(new THREE.Color("#FFFDF9"), selected ? 0.13 : 0.075)
          : baseColor;
        const targetEmissive = selected ? 0.14 : emphasized ? 0.085 : 0.03;

        materials.forEach((material) => {
          material.color.lerp(targetColor, reduceMotion ? 1 : 0.12);
          material.emissiveIntensity = reduceMotion
            ? targetEmissive
            : THREE.MathUtils.lerp(material.emissiveIntensity, targetEmissive, 0.12);
        });
      });

      if (visible) renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animate();
    onReadyRef.current();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", onScroll);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", stopDragging);
      renderer.domElement.removeEventListener("pointercancel", stopDragging);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      onHoverRef.current(null);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [layers]);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
