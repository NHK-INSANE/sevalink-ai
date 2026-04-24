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
        headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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

    socketRef.current.on("notification", (data) => {
      toast(data.message, {
        icon: data.type === "ai_assignment" ? "🤖" : "🔔",
        duration: 5000,
        style: { 
          borderRadius: "12px", 
          background: data.type === "ai_assignment" ? "#1e1b4b" : "#1e293b", 
          color: "#fff",
          border: data.type === "ai_assignment" ? "1px solid rgba(99, 102, 241, 0.2)" : "none"
        },
      });
      // Optionally refresh notifications if needed
      fetchNotifications();
    });

    socketRef.current.on("new-notification", (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      toast(`🔔 ${notif.message}`, {
        icon: "✨",
        style: { borderRadius: "12px", background: "#1e293b", color: "#fff" },
      });
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
