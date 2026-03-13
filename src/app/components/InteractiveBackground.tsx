"use client";

import React, { useEffect, useRef } from "react";

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initGrid();
    };

    // 그리드 설정
    const gridSize = 40;
    let points: { x: number; y: number; originalX: number; originalY: number }[] = [];

    const initGrid = () => {
      points = [];
      for (let x = 0; x <= width + gridSize; x += gridSize) {
        for (let y = 0; y <= height + gridSize; y += gridSize) {
          points.push({ x, y, originalX: x, originalY: y });
        }
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    resize();

    mouseX = width / 2;
    mouseY = height / 2;
    targetMouseX = mouseX;
    targetMouseY = mouseY;

    const render = () => {
      mouseX += (targetMouseX - mouseX) * 0.1;
      mouseY += (targetMouseY - mouseY) * 0.1;

      // 1. 완전히 어두운 배경 (가장자리 흰색 방지)
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      // 2. 마우스 주변 조명 효과 (은은하게)
      const lightGradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 400);
      lightGradient.addColorStop(0, "rgba(40, 80, 255, 0.15)");
      lightGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = lightGradient;
      ctx.fillRect(0, 0, width, height);

      // 3. 입체적인 그리드 그리기
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 0.5;

      const cols = Math.floor(width / gridSize) + 2;
      const rows = Math.floor(height / gridSize) + 2;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        // 마우스 거리에 따른 포인트 왜곡 (입체감)
        const dx = mouseX - p.originalX;
        const dy = mouseY - p.originalY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 400; // 왜곡 영향 범위 확대 (300 -> 400)

        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          p.x = p.originalX - dx * force * 0.4; // 왜곡 강도 강화 (0.2 -> 0.4)
          p.y = p.originalY - dy * force * 0.4;
        } else {
          p.x = p.originalX;
          p.y = p.originalY;
        }
      }

      // 선 그리기 (가로/세로)
      for (let col = 0; col < cols; col++) {
        ctx.beginPath();
        for (let row = 0; row < rows; row++) {
          const p = points[col * rows + row];
          if (!p) continue;
          if (row === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      for (let row = 0; row < rows; row++) {
        ctx.beginPath();
        for (let col = 0; col < cols; col++) {
          const p = points[col * rows + row];
          if (!p) continue;
          if (col === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // 4. 교차점 점 찍기
      points.forEach(p => {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 250) { // 조명 범위 확대 (200 -> 250)
          const opacity = 1 - dist / 250;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); // 포인트 크기 아주 약간 확대
          ctx.fillStyle = `rgba(140, 180, 255, ${opacity * 0.8})`; // 밝기 강화 (0.5 -> 0.8)
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none bg-black"
    />
  );
}
