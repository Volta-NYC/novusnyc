"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

out vec4 outputColor;
uniform vec2 resolution;
uniform float time;

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
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.y;
  float animationTime = time * 0.055;
  vec2 flow = vec2(
    fbm(uv * 0.7 + vec2(animationTime, -animationTime * 0.55)),
    fbm(uv * 0.7 + vec2(-animationTime * 0.7, animationTime))
  );
  float field = fbm(uv * 1.35 + flow * 1.6 + vec2(animationTime * 0.24, -animationTime * 0.18));
  float ribbons = smoothstep(0.42, 0.72, sin((field + uv.y * 0.18) * 8.0) * 0.5 + 0.5);

  vec3 ink = vec3(0.035, 0.024, 0.052);
  vec3 lavender = vec3(0.745, 0.635, 0.73);
  vec3 peach = vec3(0.965, 0.718, 0.553);
  vec3 violet = vec3(0.43, 0.23, 0.51);
  float leftGlow = 1.0 - smoothstep(0.22, 1.42, length(uv - vec2(-0.72, 0.35)) - field * 0.34);
  float rightGlow = 1.0 - smoothstep(0.24, 1.48, length(uv - vec2(0.82, -0.23)) + field * 0.28);
  float centerGlow = 1.0 - smoothstep(0.2, 1.22, length(uv - vec2(0.08, -0.76)) - flow.y * 0.35);

  vec3 color = ink;
  color += lavender * leftGlow * 0.45;
  color += peach * rightGlow * 0.37;
  color += violet * centerGlow * 0.42;
  color += mix(lavender, peach, field) * ribbons * 0.075;
  color *= 0.86 + 0.14 * smoothstep(1.4, 0.15, length(uv));

  outputColor = vec4(color, 1.0);
}`;

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
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

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      canvas.style.display = "none";
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      canvas.style.display = "none";
      return;
    }

    const buffer = gl.createBuffer();
    const position = gl.getAttribLocation(program, "position");
    const resolution = gl.getUniformLocation(program, "resolution");
    const time = gl.getUniformLocation(program, "time");
    if (!buffer || position < 0 || !resolution || !time) {
      gl.deleteProgram(program);
      canvas.style.display = "none";
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const render = (now: number) => {
      resize();
      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, reducedMotion.matches ? 0 : now * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!reducedMotion.matches) animationFrame = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(() => render(performance.now()));
    resizeObserver.observe(canvas);
    render(0);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="network-fluid-background" aria-hidden="true" />;
}
