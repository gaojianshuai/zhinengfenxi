import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface CandlestickData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  height?: number;
}

// 使用Line绘制K线的影线，使用Bar绘制实体
export function CandlestickChart({ data, height = 400 }: CandlestickChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div style={{
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: "8px",
        padding: "12px",
        color: "#f1f5f9"
      }}>
        <p style={{ margin: "0 0 8px 0", fontWeight: "600" }}>{data.time}</p>
        <p style={{ margin: "4px 0", color: "#94a3b8" }}>开盘: <span style={{ color: "#f1f5f9" }}>${data.open.toFixed(4)}</span></p>
        <p style={{ margin: "4px 0", color: "#94a3b8" }}>最高: <span style={{ color: "#22c55e" }}>${data.high.toFixed(4)}</span></p>
        <p style={{ margin: "4px 0", color: "#94a3b8" }}>最低: <span style={{ color: "#ef4444" }}>${data.low.toFixed(4)}</span></p>
        <p style={{ margin: "4px 0", color: "#94a3b8" }}>收盘: <span style={{ color: data.close >= data.open ? "#22c55e" : "#ef4444" }}>${data.close.toFixed(4)}</span></p>
        <p style={{ margin: "4px 0", color: "#94a3b8" }}>成交量: <span style={{ color: "#f1f5f9" }}>${(data.volume / 1e9).toFixed(2)}B</span></p>
      </div>
    );
  };

  // 转换数据，添加用于绘制K线的辅助字段
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      // 用于绘制上影线
      highLine: [d.high, Math.max(d.open, d.close)],
      // 用于绘制下影线
      lowLine: [Math.min(d.open, d.close), d.low],
      // 用于绘制实体
      bodyTop: Math.max(d.open, d.close),
      bodyBottom: Math.min(d.open, d.close),
      isUp: d.close >= d.open
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
        <XAxis
          dataKey="time"
          stroke="#94a3b8"
          style={{ fontSize: "12px" }}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: "12px" }}
          domain={["dataMin", "dataMax"]}
          tickFormatter={(value) => `$${value.toFixed(2)}`}
        />
        <Tooltip content={<CustomTooltip />} />
        
        {/* 绘制K线 - 简化版本：使用high/low/close来显示 */}
        {/* 最高价和最低价范围 */}
        <Line
          type="monotone"
          dataKey="high"
          stroke="#94a3b8"
          strokeWidth={1}
          dot={false}
          connectNulls={false}
          strokeDasharray="2 2"
        />
        <Line
          type="monotone"
          dataKey="low"
          stroke="#94a3b8"
          strokeWidth={1}
          dot={false}
          connectNulls={false}
          strokeDasharray="2 2"
        />
        {/* 收盘价线（主要显示，颜色根据涨跌） */}
        <Line
          type="monotone"
          dataKey="close"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={(props: any) => {
            const { payload } = props;
            return (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill={payload.isUp ? "#22c55e" : "#ef4444"}
                stroke={payload.isUp ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

