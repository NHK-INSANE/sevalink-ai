"use client";
import React, { Component } from "react";

// Step 15: Error Boundary Fallback UI
function GlobalErrorFallback({ error }) {
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

export default class ClientErrorBoundary extends Component {
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
