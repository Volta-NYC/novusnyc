"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const DISPLAY_FRAGMENT_SHADER = `#version 300 es
precision highp float;

out vec4 outputColor;
uniform vec2 resolution;
uniform float time;
uniform sampler2D dye;

float hash(vec2 point) {
  point = fract(point * vec2(123.34, 345.45));
  point += dot(point, point + 34.345);
  return fract(point.x * point.y);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 position = fract(point);
  vec2 smoothPosition = position * position * (3.0 - 2.0 * position);

  return mix(
    mix(hash(cell), hash(cell + vec2(1.0, 0.0)), smoothPosition.x),
    mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), smoothPosition.x),
    smoothPosition.y
  );
}

float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);

  for (int index = 0; index < 5; index++) {
    value += amplitude * noise(point);
    point = rotation * point * 2.03 + 11.7;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / resolution;
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.y;
  float animationTime = time * 0.13;
  vec2 flow = vec2(
    fbm(uv * 0.72 + vec2(animationTime, -animationTime * 0.58)),
    fbm(uv * 0.72 + vec2(-animationTime * 0.74, animationTime))
  );
  float field = fbm(uv * 1.52 + flow * 1.95 + vec2(animationTime * 0.34, -animationTime * 0.27));
  float ribbons = smoothstep(0.4, 0.74, sin((field + uv.y * 0.22 + animationTime * 0.18) * 8.8) * 0.5 + 0.5);
  float filaments = smoothstep(0.56, 0.84, fbm(uv * 3.2 + flow * 0.7 + animationTime * 0.5));

  vec3 ink = vec3(0.035, 0.024, 0.052);
  vec3 lavender = vec3(0.745, 0.635, 0.73);
  vec3 peach = vec3(0.965, 0.718, 0.553);
  vec3 violet = vec3(0.43, 0.23, 0.51);
  float leftGlow = 1.0 - smoothstep(0.22, 1.42, length(uv - vec2(-0.72, 0.35)) - field * 0.34);
  float rightGlow = 1.0 - smoothstep(0.24, 1.48, length(uv - vec2(0.82, -0.23)) + field * 0.28);
  float centerGlow = 1.0 - smoothstep(0.2, 1.22, length(uv - vec2(0.08, -0.76)) - flow.y * 0.35);
  vec3 trail = texture(dye, screenUv + (flow - 0.5) * 0.007).rgb;

  vec3 color = ink;
  color += lavender * leftGlow * 0.45;
  color += peach * rightGlow * 0.37;
  color += violet * centerGlow * 0.42;
  color += mix(lavender, peach, field) * ribbons * 0.075;
  color += mix(lavender, peach, filaments) * filaments * 0.045;
  color += trail * (0.88 + ribbons * 0.34);
  color *= 0.86 + 0.14 * smoothstep(1.4, 0.15, length(uv));

  outputColor = vec4(color, 1.0);
}`;

const SIMULATION_FRAGMENT_SHADER = `#version 300 es
precision highp float;

out vec4 outputColor;
uniform vec2 resolution;
uniform float time;
uniform sampler2D previousDye;
uniform vec2 strokeStart;
uniform vec2 strokeEnd;
uniform float strokeStrength;

float distanceToSegment(vec2 point, vec2 start, vec2 end) {
  vec2 segment = end - start;
  float lengthSquared = max(dot(segment, segment), 0.00001);
  float progress = clamp(dot(point - start, segment) / lengthSquared, 0.0, 1.0);
  return length(point - (start + segment * progress));
}

vec2 fluidFlow(vec2 uv, float animationTime) {
  float x = sin(uv.y * 8.4 + animationTime * 1.16) + cos(uv.y * 4.7 - animationTime * 0.68);
  float y = cos(uv.x * 7.6 - animationTime * 1.04) - sin(uv.x * 4.1 + animationTime * 0.72);
  return vec2(x, y) * 0.5;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float animationTime = time * 0.13;
  vec2 flow = fluidFlow(uv, animationTime);
  vec2 segment = strokeEnd - strokeStart;
  float segmentLength = length(segment);
  vec2 direction = segmentLength > 0.0001 ? segment / segmentLength : vec2(0.0);
  vec2 localOffset = uv - strokeEnd;
  float brush = smoothstep(0.052, 0.0, distanceToSegment(uv, strokeStart, strokeEnd)) * strokeStrength;
  vec2 vortex = vec2(-localOffset.y, localOffset.x);
  flow += (vortex * 8.0 + direction * 2.4) * brush;

  vec2 texel = 1.0 / resolution;
  vec3 dye = texture(previousDye, fract(uv - flow * 0.0028)).rgb * 0.986;
  vec3 diffusion = (
    texture(previousDye, uv + vec2(texel.x, 0.0)).rgb +
    texture(previousDye, uv - vec2(texel.x, 0.0)).rgb +
    texture(previousDye, uv + vec2(0.0, texel.y)).rgb +
    texture(previousDye, uv - vec2(0.0, texel.y)).rgb
  ) * 0.25;
  dye = mix(dye, diffusion, 0.075);

  vec3 lavender = vec3(0.745, 0.635, 0.73);
  vec3 peach = vec3(0.965, 0.718, 0.553);
  float colorShift = 0.5 + 0.5 * sin(animationTime * 2.0 + strokeEnd.x * 7.0 - strokeEnd.y * 5.0);
  dye += mix(lavender, peach, colorShift) * brush * (0.24 + strokeStrength * 0.2);

  outputColor = vec4(min(dye, 1.0), 1.0);
}`;

type RenderTarget = {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
};

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function createProgram(gl: WebGL2RenderingContext, fragmentShaderSource: string) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

function createRenderTarget(gl: WebGL2RenderingContext, width: number, height: number): RenderTarget | null {
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const isComplete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;

  if (isComplete) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { framebuffer, texture };
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteTexture(texture);
  gl.deleteFramebuffer(framebuffer);
  return null;
}

export default function NetworkFluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
    if (!gl) {
      canvas.style.display = "none";
      return;
    }

    const displayProgram = createProgram(gl, DISPLAY_FRAGMENT_SHADER);
    const simulationProgram = createProgram(gl, SIMULATION_FRAGMENT_SHADER);
    if (!displayProgram || !simulationProgram) {
      canvas.style.display = "none";
      return;
    }

    const buffer = gl.createBuffer();
    const displayPosition = gl.getAttribLocation(displayProgram, "position");
    const simulationPosition = gl.getAttribLocation(simulationProgram, "position");
    const displayResolution = gl.getUniformLocation(displayProgram, "resolution");
    const displayTime = gl.getUniformLocation(displayProgram, "time");
    const displayDye = gl.getUniformLocation(displayProgram, "dye");
    const simulationResolution = gl.getUniformLocation(simulationProgram, "resolution");
    const simulationTime = gl.getUniformLocation(simulationProgram, "time");
    const simulationDye = gl.getUniformLocation(simulationProgram, "previousDye");
    const strokeStart = gl.getUniformLocation(simulationProgram, "strokeStart");
    const strokeEnd = gl.getUniformLocation(simulationProgram, "strokeEnd");
    const strokeStrength = gl.getUniformLocation(simulationProgram, "strokeStrength");
    if (
      !buffer
      || displayPosition < 0
      || simulationPosition < 0
      || !displayResolution
      || !displayTime
      || !displayDye
      || !simulationResolution
      || !simulationTime
      || !simulationDye
      || !strokeStart
      || !strokeEnd
      || !strokeStrength
    ) {
      gl.deleteProgram(displayProgram);
      gl.deleteProgram(simulationProgram);
      canvas.style.display = "none";
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let readTarget: RenderTarget | null = null;
    let writeTarget: RenderTarget | null = null;
    const strokeStartPoint = { x: 0.5, y: 0.5 };
    const strokeEndPoint = { x: 0.5, y: 0.5 };
    let pointerInside = false;
    let pendingStrokeStrength = 0;

    const deleteTargets = () => {
      [readTarget, writeTarget].forEach((target) => {
        if (!target) return;
        gl.deleteTexture(target.texture);
        gl.deleteFramebuffer(target.framebuffer);
      });
      readTarget = null;
      writeTarget = null;
    };

    const resize = () => {
      const compactViewport = window.matchMedia("(max-width: 639px)").matches;
      const pixelRatio = Math.min(window.devicePixelRatio, compactViewport ? 1.15 : 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
      if (canvas.width === width && canvas.height === height && readTarget && writeTarget) return;

      canvas.width = width;
      canvas.height = height;
      deleteTargets();
      readTarget = createRenderTarget(gl, width, height);
      writeTarget = createRenderTarget(gl, width, height);
      if (!readTarget || !writeTarget) canvas.style.display = "none";
    };

    const setFullscreenAttributes = (position: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const isInside = event.clientX >= bounds.left
        && event.clientX <= bounds.right
        && event.clientY >= bounds.top
        && event.clientY <= bounds.bottom;

      if (!isInside) {
        pointerInside = false;
        pendingStrokeStrength = 0;
        return;
      }

      const nextPoint = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: 1 - (event.clientY - bounds.top) / bounds.height,
      };

      if (!pointerInside) {
        strokeStartPoint.x = nextPoint.x;
        strokeStartPoint.y = nextPoint.y;
      }

      strokeEndPoint.x = nextPoint.x;
      strokeEndPoint.y = nextPoint.y;
      const strokeLength = Math.hypot(strokeEndPoint.x - strokeStartPoint.x, strokeEndPoint.y - strokeStartPoint.y);
      pendingStrokeStrength = Math.min(0.55, Math.max(pendingStrokeStrength, strokeLength * 6));
      pointerInside = true;
    };

    const render = (now: number) => {
      resize();
      if (!readTarget || !writeTarget) return;

      const animationTime = reducedMotion.matches ? 0 : now * 0.001;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(simulationProgram);
      setFullscreenAttributes(simulationPosition);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTarget.texture);
      gl.uniform1i(simulationDye, 0);
      gl.uniform2f(simulationResolution, canvas.width, canvas.height);
      gl.uniform1f(simulationTime, animationTime);
      gl.uniform2f(strokeStart, strokeStartPoint.x, strokeStartPoint.y);
      gl.uniform2f(strokeEnd, strokeEndPoint.x, strokeEndPoint.y);
      gl.uniform1f(strokeStrength, reducedMotion.matches ? 0 : pendingStrokeStrength);
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeTarget.framebuffer);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      const previousReadTarget = readTarget;
      readTarget = writeTarget;
      writeTarget = previousReadTarget;
      strokeStartPoint.x = strokeEndPoint.x;
      strokeStartPoint.y = strokeEndPoint.y;
      pendingStrokeStrength = 0;

      gl.useProgram(displayProgram);
      setFullscreenAttributes(displayPosition);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTarget.texture);
      gl.uniform1i(displayDye, 0);
      gl.uniform2f(displayResolution, canvas.width, canvas.height);
      gl.uniform1f(displayTime, animationTime);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!reducedMotion.matches) animationFrame = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(() => render(performance.now()));
    resizeObserver.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    render(0);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      deleteTargets();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(displayProgram);
      gl.deleteProgram(simulationProgram);
    };
  }, []);

  return <canvas ref={canvasRef} className="network-fluid-background" aria-hidden="true" />;
}
