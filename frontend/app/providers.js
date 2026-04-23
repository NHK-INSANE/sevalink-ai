"use client";
import { NotificationProvider } from "./context/NotificationContext";
import MiniChat from "./components/MiniChat";

export function Providers({ children }) {
  return (
    <NotificationProvider>
      {children}
      <MiniChat />
    </NotificationProvider>
  );
}
