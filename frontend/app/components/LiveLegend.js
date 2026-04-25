export default function LiveLegend({ showCount = false, stats = {} }) {
  const data = [
    { label: "Critical", color: "text-red-500", count: stats.critical || 0 },
    { label: "High", color: "text-orange-400", count: stats.high || 0 },
    { label: "Medium", color: "text-yellow-400", count: stats.medium || 0 },
    { label: "Low", color: "text-green-500", count: stats.low || 0 },
    { label: "NGOs", color: "text-blue-500", count: stats.ngos || 0 },
  ];

  return (
    <div className="flex justify-start items-center mb-4 w-full gap-6">
      <span className="text-sm text-green-400 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Live
      </span>

      <div className="bg-white text-black px-3 py-1.5 rounded-md text-[10px] font-bold flex gap-3 shadow-sm uppercase tracking-wider">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`text-[8px] ${item.color}`}>●</span>
            <span>{item.label}</span>
            {showCount && <span className="text-gray-400 ml-0.5">{item.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
