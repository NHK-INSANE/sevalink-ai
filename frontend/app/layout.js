import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import CursorGlow from "./components/CursorGlow";
import React from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "SevaLink AI — Neural Crisis Management",
  description: "Advanced AI-powered tactical platform for real-time crisis response and personnel coordination.",
};

// Step 15: Error Boundary Fallback UI
function GlobalErrorFallback({ error, reset }) {
  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center text-4xl mb-6 border border-red-500/20">🚨</div>
      <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Neural Link Disconnected</h2>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest max-w-md leading-relaxed mb-8">
        The system encountered a fatal exception. Error code: {error?.digest || "CRIT-FAIL"}.
        Tactical data has been cached. Attempting to re-synchronize link...
      </p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-10 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform"
      >
        Re-Initialize Link
      </button>
    </div>
  );
}

// Custom Error Boundary Component (Step 15)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Neural Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) return <GlobalErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased min-h-screen transition duration-300 bg-[#080B14]`}>
        <CursorGlow />
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
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
