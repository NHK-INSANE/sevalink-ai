"use client";
import { NotificationProvider } from "./context/NotificationContext";
import OpsPanel from "./components/OpsPanel";

export function Providers({ children }) {
  return (
    <NotificationProvider>
      {children}
      <OpsPanel />
    </NotificationProvider>
  );
}
