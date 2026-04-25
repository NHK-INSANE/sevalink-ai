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
    const userId = user._id || user.id;
    socketRef.current.emit("register-user", userId);
    socketRef.current.emit("join", userId);

    const handleNewNotif = (notification) => {
      setNotifications(prev => {
        if (prev.some(n => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
      
      let icon = "🔔";
      const type = notification.type?.toUpperCase();
      if (type === "SOS") icon = "🚨";
      else if (type === "ASSIGN" || type === "ASSIGNMENT") icon = "🟢";
      else if (type === "REQUEST") icon = "🟡";
      else if (type === "AI" || type === "AI_SUGGESTION") icon = "🧠";
      
      toast.success(notification.message || notification.text, { 
        icon, 
        style: { background: "#0f172a", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", fontSize: '12px', fontWeight: 'bold' } 
      });
    };

    socketRef.current.on("new-notification", handleNewNotif);
    socketRef.current.on("notification", handleNewNotif);

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
