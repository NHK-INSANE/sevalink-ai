import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

// Step 15: Safe socket initialization for SSR/Build compatibility
const isServer = typeof window === "undefined";

export const socket = isServer 
  ? { 
      on: () => {}, 
      off: () => {}, 
      emit: () => {}, 
      connected: false 
    } 
  : io(API_BASE, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
