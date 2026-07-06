// Gráfico de pastel puro CSS (conic-gradient) con leyenda.
export default function PieChart({ data, size = 170 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  let acc = 0;
  const stops = data.map((d) => {
    const from = (acc / total) * 360;
    acc += d.value;
    const to = (acc / total) * 360;
    return `${d.color} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`;
  });

  return (
    <div className="flex items-center gap-5 flex-wrap justify-center">
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${stops.join(", ")})`,
          border: "4px solid #0A1322",
          boxShadow: "0 10px 35px rgba(0,0,0,0.45)",
        }}
      />
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
            <span style={{ color: "#D6DEED" }}>
              {d.emoji} {d.label}
            </span>
            <span style={{ color: "#7D8BA6" }}>· {Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
