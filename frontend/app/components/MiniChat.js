"use client";
import { useState } from "react";

export default function MiniChat() {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-[1000]"
        title="Team Chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-72 bg-[#111827] text-white rounded-lg shadow-xl border border-gray-700 z-[1000] overflow-hidden flex flex-col transition-all duration-300">
      <div className="p-3 bg-[#1F2937] border-b border-gray-700 font-bold flex justify-between items-center text-sm">
        <span>Team Chat</span>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition">✕</button>
      </div>

      <div className="h-48 overflow-y-auto p-3 text-sm flex flex-col gap-2">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center italic mt-auto mb-auto">No messages yet.</div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="bg-[#374151] p-2 rounded-lg self-end max-w-[80%] break-words">
              {m}
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-gray-700 bg-[#1F2937]">
        <input
          className="w-full p-2 rounded bg-[#374151] text-white text-sm outline-none placeholder-gray-400"
          placeholder="Type..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.value.trim() !== "") {
              setMessages([...messages, e.target.value.trim()]);
              e.target.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}
