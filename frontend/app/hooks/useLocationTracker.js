"use client";
import { useEffect } from "react";
import { socket } from "../../lib/socket";
import { getUser } from "../utils/auth";

/**
 * useLocationTracker - Background hook to stream user location for real-time tracking
 */
export function useLocationTracker() {
  useEffect(() => {
    const user = getUser();
    if (!user) return;

    // Only track "Helpers" or "NGOs" (Operational roles)
    const isOperational = ["volunteer", "worker", "ngo"].includes(user.role?.toLowerCase());
    if (!isOperational) return;

    console.log("📍 Location Tracker Active for:", user.name);

    let watchId;

    const startTracking = () => {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          
          socket.emit("update_location", {
            userId: user.id || user._id,
            name: user.name,
            role: user.role,
            lat: latitude,
            lng: longitude,
            time: new Date()
          });
        },
        (err) => {
          console.error("Location tracking error:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    };

    startTracking();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);
}
