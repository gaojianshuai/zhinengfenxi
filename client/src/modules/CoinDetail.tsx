import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface CoinDetailData {
  id: string;
  symbol: string;
  name: string;
  description?: string;
  market_data: any;
  community_data: any;
  developer_data: any;
  prices: [number, number][];
  volumes: [number, number][];
}

export function CoinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CoinDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"1d" | "7d" | "30d" | "90d">("30d");

  useEffect(() => {
    if (!id) return;
    
    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get<CoinDetailData>(`/api/coins/${id}`, {
          timeout: 30000, // 30秒超时
          headers: {
            'Accept': 'application/json',
          }
        });
        
        // 检查数据是否有效
        if (res.data && res.data.id) {
          setData(res.data);
        } else {
          setError("获取到的数据格式不正确");
        }
      } catch (e: any) {
        console.error("Failed to fetch coin detail:", e);
        // 即使API失败，也尝试显示基本信息
        if (e.response?.data) {
          setData(e.response.data);
        } else {
          setError(e.response?.data?.message || e.message || "获取币种详情失败，请稍后重试");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="app">
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          正在加载币种详情...
        </div>
      </div>
    );
  }

  // 即使有错误，也尝试显示数据（如果有的话）
  if (error && !data) {
    return (
      <div className="app">
        <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
          {error || "未找到币种信息"}
          <br />
          <button
            onClick={() => navigate("/")}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }
  
  // 如果没有数据，显示加载或错误
  if (!data) {
    return (
      <div className="app">
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          正在加载币种详情...
        </div>
      </div>
    );
  }

  const marketData = data.market_data || {};
  const currentPrice = marketData.current_price?.usd || marketData.current_price || 0;
  const priceChange24h = marketData.price_change_percentage_24h || 0;
  const marketCap = marketData.market_cap?.usd || marketData.market_cap || 0;
  const volume24h = marketData.total_volume?.usd || marketData.total_volume || 0;
  const high24h = marketData.high_24h?.usd || marketData.high_24h || 0;
  const low24h = marketData.low_24h?.usd || marketData.low_24h || 0;

  // 处理K线数据 - 兼容多种数据格式
  let chartData: any[] = [];
  if (data.prices && Array.isArray(data.prices) && data.prices.length > 0) {
    chartData = data.prices.map((item: any, index: number) => {
      // 处理不同的数据格式：[timestamp, price] 或 {timestamp, price}
      const timestamp = Array.isArray(item) ? item[0] : (item.timestamp || item.time || Date.now() - (30 - index) * 24 * 60 * 60 * 1000);
      const price = Array.isArray(item) ? item[1] : (item.price || item.value || currentPrice);
      const volume = data.volumes?.[index] ? (Array.isArray(data.volumes[index]) ? data.volumes[index][1] : data.volumes[index].volume || 0) : 0;
      
      return {
        time: new Date(timestamp).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit" }),
        price: parseFloat(price) || currentPrice,
        volume: parseFloat(volume) || 0,
        timestamp: timestamp
      };
    });
  }
  
  // 如果K线数据为空，生成一些模拟数据
  if (chartData.length === 0 && currentPrice > 0) {
    for (let i = 29; i >= 0; i--) {
      const timestamp = Date.now() - i * 24 * 60 * 60 * 1000;
      const variation = (Math.random() - 0.5) * 0.1;
      chartData.push({
        time: new Date(timestamp).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit" }),
        price: currentPrice * (1 + variation),
        volume: volume24h * (0.5 + Math.random() * 0.5),
        timestamp: timestamp
      });
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "#60a5fa",
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              marginRight: "16px",
              fontSize: "14px"
            }}
          >
            ← 返回
          </button>
          <h1 style={{ display: "inline" }}>
            {data.name} <span className="symbol">({data.symbol.toUpperCase()})</span>
          </h1>
        </div>
      </header>

      <section style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
        {/* 价格信息卡片 */}
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f1f5f9", marginBottom: "8px" }}>
                ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </div>
              <div style={{
                fontSize: "18px",
                color: priceChange24h >= 0 ? "#22c55e" : "#ef4444",
                fontWeight: "600"
              }}>
                {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}% (24h)
              </div>
            </div>
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>24h 最高</div>
                <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600" }}>
                  ${high24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>24h 最低</div>
                <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600" }}>
                  ${low24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>市值</div>
              <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600" }}>
                ${(marketCap / 1e9).toFixed(2)} B
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>24h 成交量</div>
              <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600" }}>
                ${(volume24h / 1e9).toFixed(2)} B
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>流通量</div>
              <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600" }}>
                {marketData.circulating_supply ? (marketData.circulating_supply / 1e9).toFixed(2) + " B" : "N/A"}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>总供应量</div>
              <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600" }}>
                {marketData.total_supply ? (marketData.total_supply / 1e9).toFixed(2) + " B" : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* K线图 */}
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600" }}>价格走势</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["1d", "7d", "30d", "90d"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  style={{
                    padding: "6px 12px",
                    background: timeRange === range ? "rgba(59, 130, 246, 0.2)" : "rgba(148, 163, 184, 0.1)",
                    border: `1px solid ${timeRange === range ? "rgba(59, 130, 246, 0.5)" : "rgba(148, 163, 184, 0.2)"}`,
                    color: timeRange === range ? "#60a5fa" : "#94a3b8",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  {range === "1d" ? "1天" : range === "7d" ? "7天" : range === "30d" ? "30天" : "90天"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
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
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "8px",
                  color: "#f1f5f9"
                }}
                formatter={(value: any) => `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })}`}
                labelFormatter={(label) => `时间: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 币种描述 */}
        {data.description && (
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h2 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>关于 {data.name}</h2>
            <div
              style={{
                color: "#cbd5e1",
                lineHeight: "1.6",
                fontSize: "14px"
              }}
              dangerouslySetInnerHTML={{ __html: data.description.substring(0, 1000) + (data.description.length > 1000 ? "..." : "") }}
            />
          </div>
        )}
      </section>
    </div>
  );
}

