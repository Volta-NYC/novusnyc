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

type LayerMeshes = {
  edge: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  face: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  hitArea: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  index: number;
  label: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  title: string;
};

const EARTH_RADIUS = 2.3;
const MODEL_RADII = [0.66, 1.15, 1.75, EARTH_RADIUS] as const;
const BASE_ROTATION = { x: -0.12, y: 0.3, z: -0.055 };

function drawArcText(
  context: CanvasRenderingContext2D,
  text: string,
  radius: number,
  centerAngle: number,
  direction: 1 | -1,
  font: string,
  color: string,
  tracking: number,
) {
  const characters = [...text];
  context.font = font;
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const widths = characters.map((character) => context.measureText(character).width + tracking);
  const totalAngle = widths.reduce((sum, width) => sum + width / radius, 0);
  let angle = centerAngle - direction * totalAngle / 2;

  characters.forEach((character, index) => {
    const characterAngle = widths[index] / radius;
    const middleAngle = angle + direction * characterAngle / 2;
    context.save();
    context.translate(
      512 + Math.cos(middleAngle) * radius,
      512 + Math.sin(middleAngle) * radius,
    );
    context.rotate(direction === 1 ? middleAngle + Math.PI / 2 : middleAngle - Math.PI / 2);
    context.fillText(character, 0, 0);
    context.restore();
    angle += direction * characterAngle;
  });
}

function createLayerLabelTexture(layer: CoreValuesSceneLayer, index: number, renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const textRadii = [112, 202, 324, 432] as const;
  const layerSizes = [28, 29, 31, 33] as const;
  const valueSizes = [29, 32, 34, 37] as const;
  const textRadius = textRadii[index];
  const textColor = layer.text;

  context.shadowColor = textColor === "#FFFFFF" ? "rgba(45,40,46,0.36)" : "rgba(255,255,255,0.25)";
  context.shadowBlur = 2;
  drawArcText(
    context,
    layer.layer.toUpperCase(),
    textRadius,
    -Math.PI / 2,
    1,
    `700 ${layerSizes[index]}px DM Sans, Arial, sans-serif`,
    textColor,
    index === 0 ? 5 : 6,
  );
  context.shadowBlur = 1;
  drawArcText(
    context,
    layer.title,
    textRadius,
    Math.PI / 2,
    -1,
    `700 ${valueSizes[index]}px Space Grotesk, Arial, sans-serif`,
    textColor,
    index === 0 ? 1.5 : 2,
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function createSoftShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, "rgba(45, 40, 46, 0.3)");
  gradient.addColorStop(0.46, "rgba(45, 40, 46, 0.14)");
  gradient.addColorStop(1, "rgba(45, 40, 46, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  return new THREE.CanvasTexture(canvas);
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
  const cleanupRef = useRef<(() => void) | null>(null);
  const activeTitleRef = useRef(activeTitle);
  const highlightedTitleRef = useRef(highlightedTitle);
  const onHoverRef = useRef(onHover);
  const onReadyRef = useRef(onReady);
  const onSelectRef = useRef(onSelect);
  const onUnavailableRef = useRef(onUnavailable);
  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => { activeTitleRef.current = activeTitle; }, [activeTitle]);
  useEffect(() => { highlightedTitleRef.current = highlightedTitle; }, [highlightedTitle]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onUnavailableRef.current = onUnavailable; }, [onUnavailable]);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let startScene = () => {};
    const fontReady = "fonts" in document ? document.fonts.ready : Promise.resolve();

    fontReady.then(() => {
      if (!disposed) startScene();
    });

    startScene = () => {

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
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.style.width = "100%";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(compactViewport ? 37 : 34, 1, 0.1, 50);
    camera.position.set(0, 0, compactViewport ? 8.2 : 7.9);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight("#FFF9F2", "#3B2738", 1.65));
    const keyLight = new THREE.DirectionalLight("#FFF4E8", 2.1);
    keyLight.position.set(-3.8, 5.4, 6.8);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight("#BEA2BA", 0.9);
    rimLight.position.set(4.8, 1.2, -3.2);
    scene.add(rimLight);

    const shadowTexture = createSoftShadowTexture();
    const shadow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: shadowTexture,
      color: "#2D282E",
      depthWrite: false,
      opacity: 0.45,
      transparent: true,
    }));
    shadow.position.set(0.38, -1.78, -1.6);
    shadow.scale.set(5.1, 1.15, 1);
    scene.add(shadow);

    const earth = new THREE.Group();
    earth.rotation.set(BASE_ROTATION.x, BASE_ROTATION.y, BASE_ROTATION.z);
    scene.add(earth);

    const segments = compactViewport ? 56 : 80;
    const radialSegments = compactViewport ? 72 : 112;
    const layerMeshes: LayerMeshes[] = [];
    const disposableTextures: THREE.Texture[] = [shadowTexture];

    layers.forEach((layer, index) => {
      const radius = MODEL_RADII[index];
      const innerRadius = index === 0 ? 0 : MODEL_RADII[index - 1];
      const hemisphereGeometry = new THREE.SphereGeometry(
        radius,
        segments,
        Math.max(32, Math.round(segments * 0.7)),
        Math.PI,
        Math.PI,
      );
      const hemisphereMaterial = new THREE.MeshStandardMaterial({
        color: layer.color,
        metalness: 0,
        roughness: 0.72,
        side: THREE.DoubleSide,
      });
      const hemisphere = new THREE.Mesh(hemisphereGeometry, hemisphereMaterial);
      hemisphere.renderOrder = index;
      earth.add(hemisphere);

      const faceGeometry = index === 0
        ? new THREE.CircleGeometry(radius, radialSegments)
        : new THREE.RingGeometry(innerRadius, radius, radialSegments);
      const faceMaterial = new THREE.MeshStandardMaterial({
        color: layer.color,
        emissive: layer.color,
        emissiveIntensity: 0.045,
        metalness: 0,
        roughness: 0.8,
        side: THREE.DoubleSide,
      });
      const face = new THREE.Mesh(faceGeometry, faceMaterial);
      face.position.z = 0.012 + index * 0.002;
      face.renderOrder = 10 + index;
      earth.add(face);

      const edge = new THREE.Mesh(
        new THREE.TorusGeometry(radius, index === layers.length - 1 ? 0.025 : 0.018, 8, radialSegments),
        new THREE.MeshBasicMaterial({
          color: "#FFFDF9",
          opacity: index === layers.length - 1 ? 0.68 : 0.48,
          transparent: true,
        }),
      );
      edge.position.z = 0.035 + index * 0.002;
      edge.renderOrder = 20 + index;
      earth.add(edge);

      const labelTexture = createLayerLabelTexture(layer, index, renderer);
      disposableTextures.push(labelTexture);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(EARTH_RADIUS * 2, EARTH_RADIUS * 2),
        new THREE.MeshBasicMaterial({
          alphaTest: 0.08,
          depthWrite: false,
          map: labelTexture,
          side: THREE.DoubleSide,
          transparent: true,
        }),
      );
      label.position.z = 0.052 + index * 0.002;
      label.renderOrder = 30 + index;
      earth.add(label);

      const hitGeometry = index === 0
        ? new THREE.CircleGeometry(radius, Math.max(48, radialSegments / 2))
        : new THREE.RingGeometry(innerRadius, radius, Math.max(48, radialSegments / 2));
      const hitArea = new THREE.Mesh(
        hitGeometry,
        new THREE.MeshBasicMaterial({
          depthWrite: false,
          opacity: 0,
          side: THREE.DoubleSide,
          transparent: true,
        }),
      );
      hitArea.position.z = 0.08 + index * 0.002;
      hitArea.userData.layerIndex = index;
      hitArea.renderOrder = 40 + index;
      earth.add(hitArea);

      layerMeshes.push({ edge, face, hitArea, index, label, title: layer.title });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragStart = new THREE.Vector2();
    const dragRotation = new THREE.Vector2(BASE_ROTATION.y, BASE_ROTATION.x);
    const targetRotation = new THREE.Vector2(BASE_ROTATION.y, BASE_ROTATION.x);
    let hoveredIndex = -1;
    let dragging = false;
    let dragDistance = 0;
    let visible = true;
    let animationFrame = 0;

    const setPointerFromEvent = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    };

    const getHitIndex = (event: PointerEvent) => {
      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(layerMeshes.map((item) => item.hitArea), false)[0];
      return hit ? Number(hit.object.userData.layerIndex) : -1;
    };

    const updateHover = (index: number) => {
      if (hoveredIndex === index) return;
      hoveredIndex = index;
      renderer.domElement.style.cursor = index >= 0 ? "pointer" : "grab";
      onHoverRef.current(index >= 0 ? layers[index].title : null);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragDistance = 0;
      dragStart.set(event.clientX, event.clientY);
      dragRotation.copy(targetRotation);
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        const deltaX = event.clientX - dragStart.x;
        const deltaY = event.clientY - dragStart.y;
        dragDistance = Math.hypot(deltaX, deltaY);
        if (dragDistance > 5 && !reducedMotionRef.current) {
          targetRotation.x = THREE.MathUtils.clamp(dragRotation.x + deltaX * 0.0028, 0.12, 0.5);
          targetRotation.y = THREE.MathUtils.clamp(dragRotation.y + deltaY * 0.0023, -0.25, 0.08);
          updateHover(-1);
          renderer.domElement.style.cursor = "grabbing";
        }
        return;
      }

      updateHover(getHitIndex(event));
      if (!reducedMotionRef.current && hoveredIndex < 0) {
        setPointerFromEvent(event);
        targetRotation.x = BASE_ROTATION.y + pointer.x * 0.045;
        targetRotation.y = BASE_ROTATION.x - pointer.y * 0.035;
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const wasClick = dragDistance < 6;
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      if (wasClick) {
        const index = getHitIndex(event);
        if (index >= 0) onSelectRef.current(layers[index].title);
      }
      renderer.domElement.style.cursor = hoveredIndex >= 0 ? "pointer" : "grab";
    };

    const onPointerCancel = (event: PointerEvent) => {
      dragging = false;
      dragDistance = 0;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      updateHover(-1);
      renderer.domElement.style.cursor = "grab";
    };

    const onPointerLeave = () => {
      dragging = false;
      updateHover(-1);
      if (!reducedMotionRef.current) {
        targetRotation.set(BASE_ROTATION.y, BASE_ROTATION.x);
      }
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      onUnavailableRef.current();
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerCancel);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

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
      earth.rotation.y = THREE.MathUtils.lerp(earth.rotation.y, targetRotation.x, reducedMotionRef.current ? 1 : 0.075);
      earth.rotation.x = THREE.MathUtils.lerp(earth.rotation.x, targetRotation.y, reducedMotionRef.current ? 1 : 0.075);

      layerMeshes.forEach(({ edge, face, label, title }) => {
        const emphasized = title === highlighted || title === active;
        const selected = title === active;
        const targetZ = selected ? 0.105 : emphasized ? 0.066 : 0.012;
        const nextZ = reducedMotionRef.current ? targetZ : THREE.MathUtils.lerp(face.position.z, targetZ, 0.12);
        face.position.z = nextZ;
        label.position.z = nextZ + 0.04;
        edge.position.z = nextZ + 0.025;
        edge.material.opacity = THREE.MathUtils.lerp(edge.material.opacity, emphasized ? 0.94 : 0.48, 0.12);
        face.material.emissive.set(layers.find((layer) => layer.title === title)?.color ?? "#000000");
        face.material.emissiveIntensity = THREE.MathUtils.lerp(face.material.emissiveIntensity, emphasized ? 0.12 : 0.045, 0.12);
      });

      if (visible) renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();
    renderer.domElement.style.cursor = "grab";
    onReadyRef.current();

    const destroyScene = () => {
      window.cancelAnimationFrame(animationFrame);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      onHoverRef.current(null);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.Sprite) object.material.dispose();
      });
      disposableTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    cleanupRef.current = destroyScene;
    };

    return () => {
      disposed = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [layers]);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
