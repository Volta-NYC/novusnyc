"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ChapterConnection, ChapterLocation } from "@/data/network";

type Tooltip = {
  name: string;
  subtitle?: string;
  x: number;
  y: number;
};

type Props = {
  locations: ChapterLocation[];
  connections: ChapterConnection[];
};

const GLOBE_RADIUS = 2.15;
const HUB_COLOR = "#BEA2BA";
const CHAPTER_COLOR = "#F6B78D";

function toSpherePoint(lat: number, lng: number, radius = GLOBE_RADIUS) {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lng);

  return new THREE.Vector3(
    radius * Math.cos(latitude) * Math.cos(longitude),
    radius * Math.sin(latitude),
    radius * Math.cos(latitude) * Math.sin(longitude),
  );
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.18, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(0.48, "rgba(255, 255, 255, 0.2)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  return new THREE.CanvasTexture(canvas);
}

function addGlobeGrid(group: THREE.Group) {
  const material = new THREE.LineBasicMaterial({
    color: "#F9F5F8",
    transparent: true,
    opacity: 0.09,
  });

  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const points = Array.from({ length: 97 }, (_, index) => toSpherePoint(latitude, -180 + index * 3, GLOBE_RADIUS + 0.006));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  for (let longitude = -150; longitude <= 180; longitude += 30) {
    const points = Array.from({ length: 61 }, (_, index) => toSpherePoint(-90 + index * 3, longitude, GLOBE_RADIUS + 0.006));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
}

export default function NetworkGlobe({ locations, connections }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const northAmericaView = toSpherePoint(40.5, -86, 7.2);
    camera.position.copy(northAmericaView);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.2;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = Math.PI - 0.45;

    const globe = new THREE.Group();
    scene.add(globe);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 72, 72),
      new THREE.MeshPhongMaterial({
        color: "#2D282E",
        emissive: "#1A161B",
        specular: "#BEA2BA",
        shininess: 7,
        transparent: true,
        opacity: 0.88,
      }),
    );
    globe.add(earth);
    addGlobeGrid(globe);

    scene.add(new THREE.HemisphereLight("#F9F5F8", "#171317", 1.25));
    const rimLight = new THREE.DirectionalLight("#BEA2BA", 1.4);
    rimLight.position.set(-4, 3, 5);
    scene.add(rimLight);

    const glowTexture = createGlowTexture();
    const locationsByName = new Map(locations.map((location) => [location.name, location]));
    const markerTargets: THREE.Mesh[] = [];
    const hubGlows: Array<{ sprite: THREE.Sprite; scale: number }> = [];
    const curves: Array<{ curve: THREE.CatmullRomCurve3; pulse: THREE.Mesh; phase: number }> = [];

    locations.forEach((location) => {
      const isHub = location.type === "hub";
      const color = isHub ? HUB_COLOR : CHAPTER_COLOR;
      const point = toSpherePoint(location.lat, location.lng, GLOBE_RADIUS + 0.025);
      const glowScale = isHub ? 0.68 : 0.42;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity: isHub ? 0.65 : 0.4,
        depthWrite: false,
      }));
      glow.position.copy(point.clone().multiplyScalar(1.025));
      glow.scale.setScalar(glowScale);
      globe.add(glow);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(isHub ? 0.095 : 0.067, 20, 20),
        new THREE.MeshBasicMaterial({ color }),
      );
      marker.position.copy(point);
      marker.userData.location = location;
      globe.add(marker);
      markerTargets.push(marker);

      if (isHub) hubGlows.push({ sprite: glow, scale: glowScale });
    });

    connections.forEach(([fromName, toName], index) => {
      const from = locationsByName.get(fromName);
      const to = locationsByName.get(toName);
      if (!from || !to) return;

      const start = toSpherePoint(from.lat, from.lng, GLOBE_RADIUS + 0.035);
      const end = toSpherePoint(to.lat, to.lng, GLOBE_RADIUS + 0.035);
      const middle = start.clone().add(end).normalize().multiplyScalar(GLOBE_RADIUS * 1.28);
      const curve = new THREE.CatmullRomCurve3([start, middle, end]);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)),
        new THREE.LineBasicMaterial({ color: CHAPTER_COLOR, transparent: true, opacity: 0.72 }),
      );
      globe.add(line);

      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 12, 12),
        new THREE.MeshBasicMaterial({ color: "#FFF5EC" }),
      );
      globe.add(pulse);
      curves.push({ curve, pulse, phase: index * 0.5 });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let activeLocation = "";
    let resumeRotationTimeout: number | undefined;
    let animationFrame = 0;
    const clock = new THREE.Clock();

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const pauseRotation = () => {
      if (resumeRotationTimeout) window.clearTimeout(resumeRotationTimeout);
      controls.autoRotate = false;
    };

    const resumeRotation = () => {
      if (reducedMotion) return;
      resumeRotationTimeout = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 1200);
    };

    const clearTooltip = () => {
      activeLocation = "";
      renderer.domElement.style.cursor = "grab";
      setTooltip(null);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(markerTargets, false)[0];

      if (!hit) {
        if (activeLocation) clearTooltip();
        return;
      }

      const location = hit.object.userData.location as ChapterLocation;
      activeLocation = location.name;
      renderer.domElement.style.cursor = "pointer";
      setTooltip({
        name: location.name,
        subtitle: location.subtitle,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", clearTooltip);
    renderer.domElement.addEventListener("pointerdown", pauseRotation);
    renderer.domElement.addEventListener("pointerup", resumeRotation);

    const render = () => {
      const elapsed = clock.getElapsedTime();
      hubGlows.forEach(({ sprite, scale }) => {
        const pulse = 1 + Math.sin(elapsed * 2) * 0.11;
        sprite.scale.setScalar(scale * pulse);
      });
      curves.forEach(({ curve, pulse, phase }) => {
        pulse.position.copy(curve.getPoint((elapsed * 0.055 + phase) % 1));
      });
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (resumeRotationTimeout) window.clearTimeout(resumeRotationTimeout);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", clearTooltip);
      renderer.domElement.removeEventListener("pointerdown", pauseRotation);
      renderer.domElement.removeEventListener("pointerup", resumeRotation);
      controls.dispose();
      globe.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }

        if (object instanceof THREE.Sprite) {
          object.material.dispose();
        }
      });
      glowTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [connections, locations]);

  return (
    <div ref={mountRef} className="network-globe-canvas relative h-[360px] w-full sm:h-[460px] lg:h-[560px]" aria-hidden="true">
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border border-white/20 bg-n-dark/90 px-3 py-2 font-body text-xs text-white shadow-lg backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold">{tooltip.name}</p>
          {tooltip.subtitle && <p className="mt-0.5 text-[10px] uppercase tracking-[0.13em] text-n-orange">{tooltip.subtitle}</p>}
        </div>
      )}
    </div>
  );
}
