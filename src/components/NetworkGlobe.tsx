"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import type { ChapterConnection, ChapterLocation } from "@/data/network";

type Tooltip = {
  name: string;
  state?: string;
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

type Coordinate = [number, number];
type Polygon = Coordinate[][];

type LandFeatureCollection = {
  features: Array<{
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: Polygon | Polygon[];
    } | null;
  }>;
};

function toSpherePoint(lat: number, lng: number, radius = GLOBE_RADIUS) {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lng);

  return new THREE.Vector3(
    radius * Math.cos(latitude) * Math.cos(longitude),
    radius * Math.sin(latitude),
    // This longitude convention keeps west-to-east geography left-to-right
    // from the North America-facing camera.
    -radius * Math.cos(latitude) * Math.sin(longitude),
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
    opacity: 0.035,
  });

  for (let latitude = -45; latitude <= 45; latitude += 45) {
    const points = Array.from({ length: 97 }, (_, index) => toSpherePoint(latitude, -180 + index * 3, GLOBE_RADIUS + 0.006));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  for (let longitude = -135; longitude <= 180; longitude += 45) {
    const points = Array.from({ length: 61 }, (_, index) => toSpherePoint(-90 + index * 3, longitude, GLOBE_RADIUS + 0.006));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
}

function unwrapRing(ring: Coordinate[]) {
  let previousLongitude = ring[0]?.[0] ?? 0;

  return ring.map(([longitude, latitude], index) => {
    let unwrappedLongitude = longitude;

    if (index > 0) {
      while (unwrappedLongitude - previousLongitude > 180) unwrappedLongitude -= 360;
      while (unwrappedLongitude - previousLongitude < -180) unwrappedLongitude += 360;
    }

    previousLongitude = unwrappedLongitude;
    return new THREE.Vector2(unwrappedLongitude, latitude);
  });
}

function addLandmasses(group: THREE.Group) {
  const land = feature(
    landTopology as never,
    landTopology.objects.land as never,
  ) as unknown as LandFeatureCollection;
  const positions: number[] = [];
  const coastlineMaterial = new THREE.LineBasicMaterial({
    color: "#B5A9B7",
    transparent: true,
    opacity: 0.18,
  });

  land.features.forEach(({ geometry }) => {
    if (!geometry) return;
    const polygons = geometry.type === "Polygon"
      ? [geometry.coordinates as Polygon]
      : geometry.coordinates as Polygon[];

    polygons.forEach(([outerRing, ...holeRings]) => {
      if (!outerRing || outerRing.length < 4) return;

      const outer = unwrapRing(outerRing);
      const holes = holeRings.map(unwrapRing);
      const points = [...outer, ...holes.flat()];
      const faces = THREE.ShapeUtils.triangulateShape(outer, holes);

      faces.forEach(([first, second, third]) => {
        [first, second, third].forEach((index) => {
          const point = points[index];
          if (!point) return;
          const spherePoint = toSpherePoint(point.y, point.x, GLOBE_RADIUS + 0.014);
          positions.push(spherePoint.x, spherePoint.y, spherePoint.z);
        });
      });

      const coastline = outer.map((point) => toSpherePoint(point.y, point.x, GLOBE_RADIUS + 0.021));
      group.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(coastline),
        coastlineMaterial,
      ));
    });
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  group.add(new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: "#867889",
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  ));
}

export default function NetworkGlobe({ locations, connections }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const compactViewport = window.matchMedia("(max-width: 639px)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(compactViewport ? 52 : 45, 1, 0.1, 100);
    const northAmericaView = toSpherePoint(15, -75, compactViewport ? 6.6 : 5.8);
    camera.position.copy(northAmericaView);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compactViewport ? 1.25 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const globeSweep = new THREE.Group();
    scene.add(globeSweep);

    const globe = new THREE.Group();
    globe.position.set(compactViewport ? 0.2 : 1.65, compactViewport ? -0.45 : -1.5, 0);
    globeSweep.add(globe);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, compactViewport ? 56 : 72, compactViewport ? 56 : 72),
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
    addLandmasses(globe);
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
      const glowScale = isHub ? 0.18 : 0.12;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity: isHub ? 0.46 : 0.22,
        depthWrite: false,
      }));
      glow.position.copy(point.clone().multiplyScalar(1.025));
      glow.scale.setScalar(glowScale);
      globe.add(glow);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(isHub ? 0.046 : 0.034, 16, 16),
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
      const angularDistance = start.clone().normalize().angleTo(end.clone().normalize());
      const arcLift = 0.012 + Math.min(0.12, angularDistance * 0.23);
      const middle = start.clone().add(end).normalize().multiplyScalar(GLOBE_RADIUS + arcLift);
      const curve = new THREE.CatmullRomCurve3([start, middle, end]);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(compactViewport ? 56 : 80)),
        new THREE.LineBasicMaterial({ color: CHAPTER_COLOR, transparent: true, opacity: 0.27 }),
      );
      globe.add(line);

      if (angularDistance > 0.2) {
        const pulse = new THREE.Mesh(
          new THREE.SphereGeometry(0.009, 10, 10),
          new THREE.MeshBasicMaterial({ color: "#FFF5EC", transparent: true, opacity: 0.5 }),
        );
        globe.add(pulse);
        curves.push({ curve, pulse, phase: index * 0.5 });
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragStart = new THREE.Vector2();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    let activeLocation = "";
    let isDragging = false;
    let animationFrame = 0;
    const clock = new THREE.Clock();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const clearTooltip = () => {
      activeLocation = "";
      renderer.domElement.style.cursor = "grab";
      setTooltip(null);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (isDragging) {
        globe.rotateOnWorldAxis(worldUp, (event.clientX - dragStart.x) * 0.006);
        globe.rotateOnWorldAxis(cameraRight, (event.clientY - dragStart.y) * 0.006);
        dragStart.set(event.clientX, event.clientY);
        return;
      }

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
        state: location.type === "chapter" ? location.state : undefined,
        subtitle: location.subtitle,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      isDragging = true;
      dragStart.set(event.clientX, event.clientY);
      activeLocation = "";
      setTooltip(null);
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      renderer.domElement.style.cursor = "grab";
    };

    const onPointerLeave = () => {
      if (!isDragging) clearTooltip();
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const render = () => {
      const elapsed = clock.getElapsedTime();
      const motionElapsed = reducedMotion ? 0 : elapsed;
      if (!reducedMotion && !isDragging) {
        globeSweep.rotation.y = Math.sin(elapsed * 0.24) * (compactViewport ? 0.28 : 0.38);
        globeSweep.rotation.z = Math.sin(elapsed * 0.16) * 0.025;
      }
      hubGlows.forEach(({ sprite, scale }) => {
        const pulse = 1 + Math.sin(motionElapsed * 2) * 0.11;
        sprite.scale.setScalar(scale * pulse);
      });
      curves.forEach(({ curve, pulse, phase }) => {
        pulse.position.copy(curve.getPoint((motionElapsed * 0.055 + phase) % 1));
      });
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
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
          <p className="font-semibold">{tooltip.state ? `${tooltip.name}, ${tooltip.state}` : tooltip.name}</p>
          {tooltip.subtitle && <p className="mt-0.5 text-[10px] uppercase tracking-[0.13em] text-n-orange">{tooltip.subtitle}</p>}
        </div>
      )}
    </div>
  );
}
