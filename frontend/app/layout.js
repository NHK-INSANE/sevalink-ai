import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import CursorGlow from "./components/CursorGlow";
import ClientErrorBoundary from "./components/ClientErrorBoundary";
import React from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "SevaLink AI — Neural Crisis Management",
  description: "Advanced AI-powered tactical platform for real-time crisis response and personnel coordination.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased min-h-screen transition duration-300 bg-[#080B14]`}>
        <CursorGlow />
        <Providers>
          <ClientErrorBoundary>
            {children}
          </ClientErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#0f172a",
                color: "#fff",
                borderRadius: "1rem",
                fontSize: "12px",
                fontWeight: "bold",
                border: "1px solid rgba(255,255,255,0.05)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                padding: "16px 24px",
              },
              success: { style: { borderLeft: "4px solid #22c55e" } },
              error: { style: { borderLeft: "4px solid #ef4444" } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
