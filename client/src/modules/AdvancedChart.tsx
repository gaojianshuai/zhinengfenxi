import { useState, useMemo, useRef, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Customized
} from "recharts";
import { CandlestickChart } from "./CandlestickChart";

interface OHLCData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorData {
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma30?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  rsi?: number;
}

interface ChartData extends OHLCData, IndicatorData {}

interface AdvancedChartProps {
  data: ChartData[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

// K线数据转换函数 - 将OHLC数据转换为适合Recharts的格式
function transformCandlestickData(data: ChartData[]) {
  return data.map((d) => ({
    ...d,
    // 为了绘制K线，我们需要计算相对于最低价的位置
    bodyTop: Math.max(d.open, d.close),
    bodyBottom: Math.min(d.open, d.close),
    bodyHeight: Math.abs(d.close - d.open),
    isUp: d.close >= d.open,
    wickTop: d.high,
    wickBottom: d.low
  }));
}

// 计算移动平均线
function calculateMA(data: ChartData[], period: number): number[] {
  const ma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ma.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0);
      ma.push(sum / period);
    }
  }
  return ma;
}

// 计算MACD
function calculateMACD(data: ChartData[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12: number[] = [];
  const ema26: number[] = [];
  const macd: number[] = [];
  const signal: number[] = [];
  const histogram: number[] = [];

  // 计算EMA12和EMA26
  let ema12Sum = 0;
  let ema26Sum = 0;
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema12Sum = data[i].close;
      ema26Sum = data[i].close;
    } else {
      ema12Sum = (data[i].close * 2 / 13) + (ema12Sum * 11 / 13);
      ema26Sum = (data[i].close * 2 / 27) + (ema26Sum * 25 / 27);
    }
    ema12.push(ema12Sum);
    ema26.push(ema26Sum);
    macd.push(ema12Sum - ema26Sum);
  }

  // 计算信号线（MACD的9日EMA）
  let signalSum = 0;
  for (let i = 0; i < macd.length; i++) {
    if (i === 0) {
      signalSum = macd[i];
    } else {
      signalSum = (macd[i] * 2 / 10) + (signalSum * 8 / 10);
    }
    signal.push(signalSum);
    histogram.push(macd[i] - signalSum);
  }

  return { macd, signal, histogram };
}

// 计算RSI
function calculateRSI(data: ChartData[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      rsi.push(50);
    } else {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
  }

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(50);
    } else {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }

  return rsi;
}

// 从价格数据生成OHLC数据
function generateOHLCData(prices: [number, number][], volumes: [number, number][]): ChartData[] {
  const result: ChartData[] = [];
  const interval = 24 * 60 * 60 * 1000; // 1天间隔

  for (let i = 0; i < prices.length; i++) {
    const [timestamp, price] = prices[i];
    const volume = volumes[i] ? (Array.isArray(volumes[i]) ? volumes[i][1] : volumes[i]) : 0;

    // 如果没有足够的数据点，使用当前价格作为OHLC
    if (i === 0 || prices.length < 2) {
      result.push({
        time: new Date(timestamp).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit" }),
        timestamp,
        open: price,
        high: price * 1.02,
        low: price * 0.98,
        close: price,
        volume: volume || 0
      });
    } else {
      // 使用前后价格生成OHLC
      const prevPrice = prices[i - 1][1];
      const nextPrice = i < prices.length - 1 ? prices[i + 1][1] : price;
      const high = Math.max(prevPrice, price, nextPrice) * (1 + Math.random() * 0.01);
      const low = Math.min(prevPrice, price, nextPrice) * (1 - Math.random() * 0.01);
      const open = prevPrice;
      const close = price;

      result.push({
        time: new Date(timestamp).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit" }),
        timestamp,
        open,
        high,
        low,
        close,
        volume: volume || 0
      });
    }
  }

  return result;
}

export function AdvancedChart({ data: rawData, timeRange, onTimeRangeChange }: AdvancedChartProps) {
  const [chartType, setChartType] = useState<"candlestick" | "line">("candlestick");
  const [showIndicators, setShowIndicators] = useState({
    ma5: false,
    ma10: false,
    ma20: true,
    ma30: false,
    macd: false,
    rsi: false
  });
  const [annotations, setAnnotations] = useState<Array<{ x: number; y: number; type: "marker" | "line"; label?: string }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // 处理原始数据，生成OHLC数据
  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // 如果数据已经是OHLC格式，直接使用
    if (rawData[0].open !== undefined) {
      return rawData as ChartData[];
    }

    // 否则从价格数据生成OHLC
    const prices: [number, number][] = rawData.map((d: any) => [
      d.timestamp || Date.now(),
      d.price || d.close || 0
    ]);
    const volumes: [number, number][] = rawData.map((d: any) => [
      d.timestamp || Date.now(),
      d.volume || 0
    ]);

    return generateOHLCData(prices, volumes);
  }, [rawData]);

  // 计算技术指标
  const chartData = useMemo(() => {
    if (processedData.length === 0) return [];

    const ma5 = calculateMA(processedData, 5);
    const ma10 = calculateMA(processedData, 10);
    const ma20 = calculateMA(processedData, 20);
    const ma30 = calculateMA(processedData, 30);
    const { macd, signal, histogram } = calculateMACD(processedData);
    const rsi = calculateRSI(processedData);

    return processedData.map((d, i) => ({
      ...d,
      ma5: ma5[i],
      ma10: ma10[i],
      ma20: ma20[i],
      ma30: ma30[i],
      macd: macd[i],
      signal: signal[i],
      histogram: histogram[i],
      rsi: rsi[i]
    }));
  }, [processedData]);

  // 时间周期选项
  const timeRanges = [
    { value: "1m", label: "1分钟" },
    { value: "5m", label: "5分钟" },
    { value: "15m", label: "15分钟" },
    { value: "1h", label: "1小时" },
    { value: "4h", label: "4小时" },
    { value: "1d", label: "1天" },
    { value: "1w", label: "1周" },
    { value: "1M", label: "1月" }
  ];

  // 自定义Tooltip
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
        {chartType === "candlestick" && (
          <>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>开盘: <span style={{ color: "#f1f5f9" }}>${data.open.toFixed(4)}</span></p>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>最高: <span style={{ color: "#22c55e" }}>${data.high.toFixed(4)}</span></p>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>最低: <span style={{ color: "#ef4444" }}>${data.low.toFixed(4)}</span></p>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>收盘: <span style={{ color: data.close >= data.open ? "#22c55e" : "#ef4444" }}>${data.close.toFixed(4)}</span></p>
          </>
        )}
        {showIndicators.ma5 && data.ma5 && <p style={{ margin: "4px 0", color: "#94a3b8" }}>MA5: <span style={{ color: "#f1f5f9" }}>${data.ma5.toFixed(4)}</span></p>}
        {showIndicators.ma10 && data.ma10 && <p style={{ margin: "4px 0", color: "#94a3b8" }}>MA10: <span style={{ color: "#f1f5f9" }}>${data.ma10.toFixed(4)}</span></p>}
        {showIndicators.ma20 && data.ma20 && <p style={{ margin: "4px 0", color: "#94a3b8" }}>MA20: <span style={{ color: "#f1f5f9" }}>${data.ma20.toFixed(4)}</span></p>}
        {showIndicators.ma30 && data.ma30 && <p style={{ margin: "4px 0", color: "#94a3b8" }}>MA30: <span style={{ color: "#f1f5f9" }}>${data.ma30.toFixed(4)}</span></p>}
        {showIndicators.macd && data.macd && (
          <>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>MACD: <span style={{ color: "#f1f5f9" }}>{data.macd.toFixed(4)}</span></p>
            <p style={{ margin: "4px 0", color: "#94a3b8" }}>Signal: <span style={{ color: "#f1f5f9" }}>{data.signal.toFixed(4)}</span></p>
          </>
        )}
        {showIndicators.rsi && data.rsi && <p style={{ margin: "4px 0", color: "#94a3b8" }}>RSI: <span style={{ color: data.rsi > 70 ? "#ef4444" : data.rsi < 30 ? "#22c55e" : "#f1f5f9" }}>{data.rsi.toFixed(2)}</span></p>}
        <p style={{ margin: "4px 0", color: "#94a3b8" }}>成交量: <span style={{ color: "#f1f5f9" }}>${(data.volume / 1e9).toFixed(2)}B</span></p>
      </div>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      {/* 控制面板 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <h2 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", margin: 0 }}>高级图表</h2>
        
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* 图表类型切换 */}
          <div style={{ display: "flex", gap: "4px", background: "rgba(148, 163, 184, 0.1)", borderRadius: "6px", padding: "2px" }}>
            <button
              onClick={() => setChartType("candlestick")}
              style={{
                padding: "6px 12px",
                background: chartType === "candlestick" ? "rgba(59, 130, 246, 0.2)" : "transparent",
                border: "none",
                color: chartType === "candlestick" ? "#60a5fa" : "#94a3b8",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              K线
            </button>
            <button
              onClick={() => setChartType("line")}
              style={{
                padding: "6px 12px",
                background: chartType === "line" ? "rgba(59, 130, 246, 0.2)" : "transparent",
                border: "none",
                color: chartType === "line" ? "#60a5fa" : "#94a3b8",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              折线
            </button>
          </div>

          {/* 时间周期切换 */}
          <div style={{ display: "flex", gap: "4px", background: "rgba(148, 163, 184, 0.1)", borderRadius: "6px", padding: "2px" }}>
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => onTimeRangeChange(range.value)}
                style={{
                  padding: "6px 12px",
                  background: timeRange === range.value ? "rgba(59, 130, 246, 0.2)" : "transparent",
                  border: "none",
                  color: timeRange === range.value ? "#60a5fa" : "#94a3b8",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 技术指标控制 */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginBottom: "16px",
        flexWrap: "wrap",
        padding: "12px",
        background: "rgba(148, 163, 184, 0.05)",
        borderRadius: "8px"
      }}>
        <span style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "32px" }}>技术指标:</span>
        {[
          { key: "ma5", label: "MA5", color: "#fbbf24" },
          { key: "ma10", label: "MA10", color: "#f59e0b" },
          { key: "ma20", label: "MA20", color: "#3b82f6" },
          { key: "ma30", label: "MA30", color: "#8b5cf6" },
          { key: "macd", label: "MACD", color: "#ec4899" },
          { key: "rsi", label: "RSI", color: "#14b8a6" }
        ].map((indicator) => (
          <label key={indicator.key} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showIndicators[indicator.key as keyof typeof showIndicators]}
              onChange={(e) => setShowIndicators({ ...showIndicators, [indicator.key]: e.target.checked })}
              style={{ cursor: "pointer" }}
            />
            <span style={{ color: "#cbd5e1", fontSize: "14px" }}>
              <span style={{ color: indicator.color, marginRight: "4px" }}>●</span>
              {indicator.label}
            </span>
          </label>
        ))}
      </div>

      {/* 主图表 */}
      <div ref={chartRef} style={{ position: "relative" }}>
        {chartType === "candlestick" ? (
          <CandlestickChart data={chartData} height={500} />
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                style={{ fontSize: "12px" }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="price"
                stroke="#94a3b8"
                style={{ fontSize: "12px" }}
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* 折线图 */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />

            {/* 移动平均线 */}
            {showIndicators.ma5 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ma5"
                stroke="#fbbf24"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
              />
            )}
            {showIndicators.ma10 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ma10"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
              />
            )}
            {showIndicators.ma20 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ma20"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
              />
            )}
            {showIndicators.ma30 && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="ma30"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
              />
            )}

            {/* RSI参考线 */}
            {showIndicators.rsi && (
              <>
                <ReferenceLine yAxisId="rsi" y={70} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine yAxisId="rsi" y={30} stroke="#22c55e" strokeDasharray="3 3" />
              </>
            )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* MACD子图 */}
        {showIndicators.macd && (
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "16px", marginBottom: "12px" }}>MACD</h3>
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="histogram" fill="#ec4899" />
                <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* RSI子图 */}
        {showIndicators.rsi && (
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "16px", marginBottom: "12px" }}>RSI</h3>
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label="超买" />
                <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label="超卖" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="rsi" stroke="#14b8a6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

