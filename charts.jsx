// charts.jsx — minimal SVG charts (no libs)

function DonutChart({ data, size = 220, thickness = 32 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', fontFamily: 'var(--serif)', fontSize: 14 }}>無資料</div>
    );
  }
  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
  let acc = 0;
  const slices = data.map((d) => {
    const start = acc / total;
    acc += d.value;
    const end = acc / total;
    const a0 = start * Math.PI * 2 - Math.PI / 2;
    const a1 = end * Math.PI * 2 - Math.PI / 2;
    const large = end - start > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return { d, path: `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}` };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill="none" stroke={s.d.color} strokeWidth={thickness} strokeLinecap="butt" />
      ))}
      <circle cx={cx} cy={cy} r={r - thickness / 2 - 2} fill="var(--bg-card)" />
    </svg>
  );
}

function BarChart({ data, height = 220, max }) {
  const m = max || Math.max(...data.map((d) => d.value), 1);
  const barW = 100 / data.length;
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const h = (d.value / m) * (height - 32);
        return (
          <g key={i}>
            <rect
              x={i * barW + barW * 0.18}
              y={height - 24 - h}
              width={barW * 0.64}
              height={h}
              fill={d.color || 'var(--accent)'}
              rx={1.5}
            />
            <text
              x={i * barW + barW * 0.5}
              y={height - 8}
              textAnchor="middle"
              className="axis-label"
              style={{ fontSize: 9 }}
            >{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ series, height = 220, width = 600 }) {
  // series: [{ label, color, points: [{x, y}]}]
  const allYs = series.flatMap((s) => s.points.map((p) => p.y));
  const maxY = Math.max(...allYs, 1) * 1.1;
  const allXs = series.flatMap((s) => s.points.map((p) => p.x));
  const minX = Math.min(...allXs);
  const maxX = Math.max(...allXs);
  const pad = { l: 40, r: 16, t: 16, b: 28 };
  const W = width, H = height;
  const sx = (x) => pad.l + ((x - minX) / Math.max(maxX - minX, 1)) * (W - pad.l - pad.r);
  const sy = (y) => H - pad.b - (y / maxY) * (H - pad.t - pad.b);
  const ticks = 4;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const yv = (maxY / ticks) * i;
        const yp = sy(yv);
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={yp} y2={yp} stroke="var(--line-soft)" strokeDasharray="2 4" />
            <text x={pad.l - 6} y={yp + 3} textAnchor="end" className="axis-label">{Math.round(yv).toLocaleString()}</text>
          </g>
        );
      })}
      {series.map((s, i) => {
        const path = s.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
        return (
          <g key={i}>
            <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {s.points.map((p, j) => (
              <circle key={j} cx={sx(p.x)} cy={sy(p.y)} r="3" fill={s.color} />
            ))}
          </g>
        );
      })}
      {series[0] && series[0].points.map((p, j) => (
        <text key={j} x={sx(p.x)} y={H - pad.b + 14} textAnchor="middle" className="axis-label">{p.label}</text>
      ))}
    </svg>
  );
}

Object.assign(window, { DonutChart, BarChart, LineChart });
