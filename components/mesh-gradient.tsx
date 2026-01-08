"use client";

import { useEffect, useRef, useCallback } from "react";

// Stripe 风格的 Mesh Gradient 动画背景
// 使用 WebGL 和 GLSL 着色器实现流动渐变效果
// 对角线切割，只显示右上角三角形区域

interface MeshGradientProps {
  className?: string;
}

export function MeshGradient({ className = "" }: MeshGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const initGradient = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
      console.warn("WebGL not supported, falling back to CSS gradient");
      return;
    }

    // 顶点着色器
    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // 片段着色器 - Stripe 风格的流动渐变，对角线切割
    const fragmentShaderSource = `
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      
      // Simplex 2D 噪声
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                        + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        
        // 对角线切割：从左上角到右下角
        // uv.x + uv.y < 1.0 表示左上角三角形区域 (像 Stripe 一样)
        float diagonalLine = uv.x + uv.y;
        
        // 如果在对角线右下方，设为透明
        if (diagonalLine > 1.2) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
          return;
        }
        
        // 多层噪声叠加产生流动效果 (加快速度)
        float noise1 = snoise(vec2(uv.x * 1.5 + u_time * 0.15, uv.y * 1.5 + u_time * 0.12));
        float noise2 = snoise(vec2(uv.x * 2.0 - u_time * 0.18, uv.y * 2.0 + u_time * 0.1));
        float noise3 = snoise(vec2(uv.x * 2.5 + u_time * 0.08, uv.y * 2.5 - u_time * 0.14));
        float noise4 = snoise(vec2(uv.x * 0.8 - u_time * 0.06, uv.y * 0.8 + u_time * 0.09));
        
        // 组合噪声 (增强效果)
        float combinedNoise = (noise1 + noise2 * 0.6 + noise3 * 0.4 + noise4 * 0.3) / 2.3;
        
        // Stripe 风格的颜色 (粉红、橙色、紫色、蓝色的渐变)
        vec3 color1 = vec3(0.976, 0.318, 0.420);  // 粉红 #f95169
        vec3 color2 = vec3(0.988, 0.647, 0.357);  // 橙色 #fca55b
        vec3 color3 = vec3(0.663, 0.318, 0.812);  // 紫色 #a951cf
        vec3 color4 = vec3(0.318, 0.545, 0.918);  // 蓝色 #518bea
        
        // 基于位置和时间混合颜色 (更强的流动效果)
        float flowOffset = sin(u_time * 0.3) * 0.1;
        float t = diagonalLine * 0.7 + combinedNoise * 0.35 + flowOffset;
        t = clamp(t, 0.0, 1.0);
        
        vec3 color;
        if (t < 0.33) {
          color = mix(color1, color2, t * 3.0);
        } else if (t < 0.66) {
          color = mix(color2, color3, (t - 0.33) * 3.0);
        } else {
          color = mix(color3, color4, (t - 0.66) * 3.0);
        }
        
        // 添加波动的亮度变化
        float brightness = 0.92 + combinedNoise * 0.12 + sin(u_time * 0.5 + uv.x * 3.0) * 0.03;
        color *= brightness;
        
        // 边缘柔化 (对角线边缘渐变到透明)
        float edgeSoftness = 1.0 - smoothstep(0.9, 1.2, diagonalLine);
        
        gl_FragColor = vec4(color, edgeSoftness);
      }
    `;

    // 创建着色器
    function createShader(
      gl: WebGLRenderingContext,
      type: number,
      source: string
    ): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    // 创建程序
    function createProgram(
      gl: WebGLRenderingContext,
      vertexShader: WebGLShader,
      fragmentShader: WebGLShader
    ): WebGLProgram | null {
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      return program;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    // 设置顶点缓冲区 (全屏四边形)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    // 启用透明度混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 渲染循环
    startTimeRef.current = performance.now();

    // 捕获非空的 gl 和 canvas 引用（已在上方验证非空）
    const glContext = gl;
    const canvasElement = canvas;

    function render() {
      resizeCanvasIfNeeded();

      glContext.useProgram(program);

      glContext.enableVertexAttribArray(positionLocation);
      glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
      glContext.vertexAttribPointer(positionLocation, 2, glContext.FLOAT, false, 0, 0);

      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      glContext.uniform1f(timeLocation, elapsed);
      glContext.uniform2f(resolutionLocation, canvasElement.width, canvasElement.height);

      glContext.drawArrays(glContext.TRIANGLES, 0, 6);

      animationRef.current = requestAnimationFrame(render);
    }

    function resizeCanvasIfNeeded() {
      const displayWidth = canvasElement.clientWidth;
      const displayHeight = canvasElement.clientHeight;
      if (canvasElement.width !== displayWidth || canvasElement.height !== displayHeight) {
        canvasElement.width = displayWidth;
        canvasElement.height = displayHeight;
        glContext.viewport(0, 0, displayWidth, displayHeight);
      }
    }

    render();

    // 清理函数
    return () => {
      cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  useEffect(() => {
    const cleanup = initGradient();
    return () => {
      if (cleanup) cleanup();
      cancelAnimationFrame(animationRef.current);
    };
  }, [initGradient]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{
        background:
          "linear-gradient(135deg, #8838c7 0%, #3f74f1 33%, #2ecbda 66%, #fa6a9b 100%)",
      }}
    />
  );
}

