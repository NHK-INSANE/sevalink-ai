"use client";
import { useEffect, useState } from "react";

/**
 * Counter component - animates a number from 0 to value
 */
export default function Counter({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000; // Total duration in ms
    const end = parseInt(value);
    
    if (isNaN(end) || end === 0) {
      setCount(0);
      return;
    }

    const timer = setInterval(() => {
      start += Math.ceil(end / 40); // Standardize the increment
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 25);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}
