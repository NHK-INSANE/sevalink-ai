import { io } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

// Singleton socket instance for global usage
export const socket = io(API_BASE, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
});
