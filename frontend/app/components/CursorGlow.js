"use client";
import { useEffect, useState } from "react";

export default function CursorGlow() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] opacity-40 transition-opacity duration-300"
      style={{
        background: `radial-gradient(800px at ${pos.x}px ${pos.y}px, rgba(99,102,241,0.15), transparent 80%)`,
      }}
    />
  );
}
