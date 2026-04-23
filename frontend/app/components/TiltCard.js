"use client";
import { useRef } from "react";
import { motion } from "framer-motion";

export default function TiltCard({ children, className = "" }) {
  const ref = useRef();

  const handleMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = ((y / rect.height) - 0.5) * -10;
    const rotateY = ((x / rect.width) - 0.5) * 10;

    ref.current.style.transform = `
      perspective(1000px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(1.02)
    `;

    // Also update spotlight vars if needed
    ref.current.style.setProperty("--x", `${x}px`);
    ref.current.style.setProperty("--y", `${y}px`);
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.transform =
      "perspective(1000px) rotateX(0) rotateY(0) scale(1)";
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`glass card-hover-effect transition-all duration-300 ease-out ${className}`}
    >
      {children}
    </motion.div>
  );
}
