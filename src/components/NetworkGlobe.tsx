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
const NETWORK_ACCENT = "#F3E28D";

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
    return [unwrappedLongitude, latitude] as Coordinate;
  });
}

function createLandTexture() {
  const land = feature(
    landTopology as never,
    landTopology.objects.land as never,
  ) as unknown as LandFeatureCollection;
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");

  if (!context) return new THREE.CanvasTexture(canvas);

  const project = ([longitude, latitude]: Coordinate, offset = 0) => [
    ((longitude + 180) / 360) * canvas.width + offset,
    ((90 - latitude) / 180) * canvas.height,
  ] as const;

  land.features.forEach(({ geometry }) => {
    if (!geometry) return;
    const polygons = geometry.type === "Polygon"
      ? [geometry.coordinates as Polygon]
      : geometry.coordinates as Polygon[];

    polygons.forEach(([outerRing, ...holeRings]) => {
      if (!outerRing || outerRing.length < 4) return;
      const rings = [outerRing, ...holeRings].map(unwrapRing);

      // Draw each polygon at neighboring world copies so land that crosses the
      // date line stays continuous when the texture wraps around the sphere.
      [-canvas.width, 0, canvas.width].forEach((offset) => {
        context.beginPath();
        rings.forEach((ring) => {
          ring.forEach((point, index) => {
            const [x, y] = project(point, offset);
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          });
          context.closePath();
        });
        context.fillStyle = "#ffffff";
        context.fill("evenodd");
      });
    });
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
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
    const cameraDirection = toSpherePoint(38, -98).normalize();
    const defaultCameraDistance = compactViewport ? 6.6 : 6.4;
    const minCameraDistance = compactViewport ? 5.2 : 4.9;
    const maxCameraDistance = compactViewport ? 9.2 : 8.8;
    let cameraDistance = defaultCameraDistance;
    camera.position.copy(cameraDirection).multiplyScalar(cameraDistance);
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
    globeSweep.add(globe);

    const landTexture = createLandTexture();

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, compactViewport ? 56 : 72, compactViewport ? 56 : 72),
      new THREE.ShaderMaterial({
        uniforms: {
          landMap: { value: landTexture },
          surfaceColor: { value: new THREE.Color("#2D282E") },
          landColor: { value: new THREE.Color("#847589") },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D landMap;
          uniform vec3 surfaceColor;
          uniform vec3 landColor;
          varying vec3 vNormal;
          const float PI = 3.14159265359;
          void main() {
            vec3 normal = normalize(vNormal);
            float longitude = atan(-normal.z, normal.x);
            float latitude = asin(clamp(normal.y, -1.0, 1.0));
            vec2 mapUv = vec2((longitude + PI) / (2.0 * PI), 0.5 + latitude / PI);
            float land = texture2D(landMap, mapUv).r;
            vec3 color = mix(surfaceColor, landColor, land * 0.66);
            gl_FragColor = vec4(color, 0.9);
          }
        `,
        transparent: true,
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
      globe.add(marker);

      // Keep visual nodes compact while making each chapter easy to identify
      // on hover or tap, including in the dense Northeast cluster.
      const hitTarget = new THREE.Mesh(
        new THREE.SphereGeometry(isHub ? 0.11 : 0.085, 12, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hitTarget.position.copy(point.clone().multiplyScalar(1.02));
      hitTarget.userData.location = location;
      globe.add(hitTarget);
      markerTargets.push(hitTarget);

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
          new THREE.MeshBasicMaterial({ color: NETWORK_ACCENT, transparent: true, opacity: 0.5 }),
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
    const activePointers = new Map<number, THREE.Vector2>();
    let activeLocation = "";
    let isDragging = false;
    let dragDistance = 0;
    let pinchDistance = 0;
    let pinchAngle = 0;
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

    const updateCameraDistance = (nextDistance: number) => {
      cameraDistance = THREE.MathUtils.clamp(nextDistance, minCameraDistance, maxCameraDistance);
      camera.position.copy(cameraDirection).multiplyScalar(cameraDistance);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
    };

    const clearTooltip = () => {
      activeLocation = "";
      renderer.domElement.style.cursor = "grab";
      setTooltip(null);
    };

    const updateTooltip = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(markerTargets, false)[0];

      if (!hit) {
        if (activeLocation) clearTooltip();
        return false;
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
      return true;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (activePointers.has(event.pointerId)) {
        activePointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
      }

      if (activePointers.size === 2) {
        const [first, second] = [...activePointers.values()];
        const nextPinchDistance = first.distanceTo(second);
        const nextPinchAngle = Math.atan2(second.y - first.y, second.x - first.x);
        if (pinchDistance > 0) updateCameraDistance(cameraDistance - (nextPinchDistance - pinchDistance) * 0.012);
        if (pinchAngle) {
          const angleDelta = Math.atan2(
            Math.sin(nextPinchAngle - pinchAngle),
            Math.cos(nextPinchAngle - pinchAngle),
          );
          globe.rotateOnWorldAxis(worldUp, angleDelta * 0.9);
        }
        pinchDistance = nextPinchDistance;
        pinchAngle = nextPinchAngle;
        return;
      }

      if (isDragging) {
        const deltaX = event.clientX - dragStart.x;
        const deltaY = event.clientY - dragStart.y;
        dragDistance += Math.hypot(deltaX, deltaY);
        globe.rotateOnWorldAxis(worldUp, deltaX * 0.0045);
        globe.rotateOnWorldAxis(cameraRight, deltaY * 0.0045);
        dragStart.set(event.clientX, event.clientY);
        return;
      }

      updateTooltip(event);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      activePointers.set(event.pointerId, new THREE.Vector2(event.clientX, event.clientY));
      if (activePointers.size === 2) {
        const [first, second] = [...activePointers.values()];
        pinchDistance = first.distanceTo(second);
        pinchAngle = Math.atan2(second.y - first.y, second.x - first.x);
        isDragging = false;
        renderer.domElement.setPointerCapture(event.pointerId);
        renderer.domElement.style.cursor = "zoom-in";
        return;
      }
      isDragging = true;
      dragDistance = 0;
      dragStart.set(event.clientX, event.clientY);
      activeLocation = "";
      setTooltip(null);
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };

    const onPointerUp = (event: PointerEvent) => {
      const wasDragging = isDragging;
      activePointers.delete(event.pointerId);
      isDragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      pinchDistance = activePointers.size === 2
        ? [...activePointers.values()][0].distanceTo([...activePointers.values()][1])
        : 0;
      pinchAngle = activePointers.size === 2
        ? Math.atan2(
          [...activePointers.values()][1].y - [...activePointers.values()][0].y,
          [...activePointers.values()][1].x - [...activePointers.values()][0].x,
        )
        : 0;
      if (activePointers.size === 1) {
        const remainingPointer = [...activePointers.values()][0];
        isDragging = true;
        dragDistance = 0;
        dragStart.copy(remainingPointer);
        return;
      }
      if (wasDragging && dragDistance < 6) updateTooltip(event);
      else renderer.domElement.style.cursor = "grab";
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      updateCameraDistance(cameraDistance + event.deltaY * 0.006);
    };

    const onPointerLeave = () => {
      if (!isDragging) clearTooltip();
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const render = () => {
      const elapsed = clock.getElapsedTime();
      const motionElapsed = reducedMotion ? 0 : elapsed;
      if (!reducedMotion && !isDragging) {
        globeSweep.rotation.y = Math.sin(elapsed * 0.06) * (compactViewport ? 0.1 : 0.14);
        globeSweep.rotation.z = Math.sin(elapsed * 0.05) * 0.008;
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
      renderer.domElement.removeEventListener("wheel", onWheel);
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
      landTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [connections, locations]);

  return (
    <div ref={mountRef} className="network-globe-canvas relative h-[360px] w-full touch-none sm:h-[460px] lg:h-[560px]" aria-hidden="true">
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
