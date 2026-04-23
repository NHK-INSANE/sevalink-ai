import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "SevaLink AI — Civic Problem Solver",
  description:
    "AI-powered platform to report civic problems, get instant urgency classification, and connect volunteers with real needs.",
  keywords: "civic tech, AI, volunteer, community, crisis response",
};

import { Providers } from "./providers";
import CursorGlow from "./components/CursorGlow";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased min-h-screen transition duration-300`}>
        <CursorGlow />
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#333",
                color: "#fff",
                borderRadius: "10px",
                fontSize: "13px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              },
              success: {
                iconTheme: { primary: "#22c55e", secondary: "#1e1e2e" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#1e1e2e" },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
