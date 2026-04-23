"use client";
import { useEffect, useRef, useState } from "react";

export default function CursorGlow() {
  const glowRef = useRef(null);
  const dotRef  = useRef(null);
  const [visible, setVisible] = useState(false);
  const pos = useRef({ x: 0, y: 0 });
  const dotPos = useRef({ x: 0, y: 0 });
  const raf = useRef(null);

  useEffect(() => {
    const move = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
    };
    const leave = () => setVisible(false);
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseleave", leave);

    const animate = () => {
      // Large glow follows cursor with slight lag
      if (glowRef.current) {
        glowRef.current.style.background = `radial-gradient(700px at ${pos.current.x}px ${pos.current.y}px, rgba(99,102,241,0.13), transparent 75%)`;
      }
      // Small dot follows with lerp
      dotPos.current.x += (pos.current.x - dotPos.current.x) * 0.18;
      dotPos.current.y += (pos.current.y - dotPos.current.y) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotPos.current.x - 4}px, ${dotPos.current.y - 4}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      {/* Full-page spotlight */}
      <div
        ref={glowRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
      {/* Dot cursor */}
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(129,140,248,0.9)",
          zIndex: 9999,
          pointerEvents: "none",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          boxShadow: "0 0 12px rgba(99,102,241,0.8)",
          willChange: "transform",
        }}
      />
    </>
  );
}
