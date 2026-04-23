"use client";
import { useEffect, useState } from "react";

export default function CursorGlow() {
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const move = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const leave = () => setVisible(false);
    
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
    
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[100] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        background: `radial-gradient(300px at ${pos.x}px ${pos.y}px, rgba(124,58,237,0.15), transparent)`
      }}
    />
  );
}
