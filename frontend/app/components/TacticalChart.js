"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function TacticalChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
        <Tooltip 
          contentStyle={{ 
            background: "#0f172a", 
            border: "1px solid rgba(255,255,255,0.1)", 
            borderRadius: "12px", 
            fontSize: "10px" 
          }} 
        />
        <Area type="monotone" dataKey="cases" stroke="#a855f7" strokeWidth={4} fill="url(#cT)" />
        <XAxis dataKey="day" stroke="#334155" fontSize={10} axisLine={false} tickLine={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
