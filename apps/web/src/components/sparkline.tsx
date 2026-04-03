interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = '#0F6E56',
  width = 80,
  height = 24,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const validData = data.map((v) => (isNaN(v) ? 0 : v));
  const max = Math.max(...validData, 0.01);
  const min = Math.min(...validData);
  const range = max - min || 0.01;

  const pad = 2;
  const usableH = height - pad * 2;

  const points = validData
    .map((value, i) => {
      const x = (i / (validData.length - 1)) * width;
      const y = pad + usableH - ((value - min) / range) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
    </svg>
  );
}
