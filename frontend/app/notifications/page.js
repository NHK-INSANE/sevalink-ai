"use client";
import { useContext } from "react";
import Navbar from "../components/Navbar";
import PageWrapper from "../components/PageWrapper";
import { NotificationContext } from "../context/NotificationContext";

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useContext(NotificationContext);

  const getIcon = (type) => {
    switch(type) {
      case "sos": return "🔴";
      case "request": return "🟡";
      case "assignment": return "🟢";
      case "connection_request": return "🔵";
      default: return "🔔";
    }
  };

  return (
    <div className="min-h-screen bg-[#080B14] text-white">
      <Navbar />
      <PageWrapper className="pt-[120px] pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex justify-between items-end border-b border-white/5 pb-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-widest text-white">Operational Alerts</h1>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Global tactical awareness system</p>
            </div>
            {notifications.some(n => !n.isRead) && (
              <button 
                onClick={markAllAsRead}
                className="px-6 py-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest shadow-lg"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="py-32 text-center bg-[#0f172a]/20 border border-dashed border-white/5 rounded-[2.5rem]">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 opacity-50">🔔</div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No active alerts recorded</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n._id}
                  onClick={() => !n.isRead && markAsRead(n._id)}
                  className={`flex items-start gap-5 p-6 rounded-3xl border border-white/5 transition-all ${!n.isRead ? "bg-white/10 shadow-xl cursor-pointer hover:bg-white/[0.15]" : "bg-[#0f172a]/40 opacity-70"}`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl shrink-0">
                    {getIcon(n.type)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-base ${!n.isRead ? "font-black text-white" : "font-bold text-gray-300"}`}>
                        {n.message}
                      </h4>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 shrink-0 ml-4">
                        {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {n.data && n.data.sosId && (
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest pt-1">SOS ID: {n.data.sosId}</p>
                    )}
                  </div>
                  
                  {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] mt-2 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
