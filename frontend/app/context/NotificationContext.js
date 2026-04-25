"use client";
import { createContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getUser } from "../utils/auth";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://sevalink-backend-bmre.onrender.com";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${encodeURIComponent(token)}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  useEffect(() => {
    const user = getUser();
    if (!user) return;

    fetchNotifications();

    socketRef.current = io(API_BASE);
    socketRef.current.emit("register-user", user._id || user.id);

    socketRef.current.on("sos-alert", (data) => {
      setNotifications(prev => [{
        _id: Date.now(),
        type: "sos",
        message: data.message || "🚨 EMERGENCY SOS BROADCAST",
        createdAt: new Date()
      }, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socketRef.current.on("dispatch_alert", (data) => {
      setNotifications(prev => [{
        _id: Date.now(),
        type: "dispatch",
        message: data.message || "📡 NEW MISSION ASSIGNMENT",
        createdAt: new Date()
      }, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socketRef.current.on("pre_alert", (data) => {
      setNotifications(prev => [{
        _id: Date.now(),
        type: "prediction",
        message: data.message,
        createdAt: new Date()
      }, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead,
      refresh: fetchNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
