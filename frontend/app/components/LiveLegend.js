export default function LiveLegend({ showCount = false }) {
  const data = [
    { label: "Critical", color: "bg-red-500", count: 25 },
    { label: "High", color: "bg-orange-400", count: 20 },
    { label: "Medium", color: "bg-yellow-400", count: 40 },
    { label: "Low", color: "bg-green-500", count: 40 },
    { label: "NGOs", color: "bg-blue-500", count: 20 },
  ];

  return (
    <div className="flex gap-4 items-center bg-white text-black px-4 py-2 rounded-lg shadow-md">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <span className={`w-3 h-3 rounded-full ${item.color}`} />
          <span>{item.label}</span>

          {showCount && (
            <span className="text-gray-500 text-xs">
              {item.count}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
