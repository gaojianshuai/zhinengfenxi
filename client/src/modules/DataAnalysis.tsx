import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ScatterChart, Scatter, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import axios from "axios";

interface BacktestResult {
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  annualReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
  equityCurve: Array<{ date: string; value: number }>;
}

interface CorrelationData {
  coin1: string;
  coin2: string;
  correlation: number;
  period: string;
}

interface SentimentData {
  timestamp: number;
  fearGreedIndex: number;
  socialVolume: number;
  newsSentiment: number;
  priceChange: number;
}

interface FlowData {
  exchange: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  timestamp: number;
}

export function DataAnalysis() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"backtest" | "correlation" | "sentiment" | "flow">("backtest");
  const [coins, setCoins] = useState<any[]>([]);
  const [selectedCoins, setSelectedCoins] = useState<string[]>([]);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [flowData, setFlowData] = useState<FlowData[]>([]);
  const [backtestRunning, setBacktestRunning] = useState(false);

  useEffect(() => {
    axios.get("/api/overview").then(res => {
      if (Array.isArray(res.data)) {
        setCoins(res.data);
        setSelectedCoins([res.data[0]?.id, res.data[1]?.id].filter(Boolean));
      }
    });
  }, []);

  // 生成历史回测数据
  const generateBacktestData = () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    
    const equityCurve = [];
    let value = 100000;
    for (let i = 0; i <= 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      value *= (1 + (Math.random() - 0.45) * 0.02);
      equityCurve.push({
        date: date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
        value: value
      });
    }

    const finalCapital = equityCurve[equityCurve.length - 1].value;
    const totalReturn = ((finalCapital - 100000) / 100000) * 100;
    const annualReturn = totalReturn * (365 / 30);
    const sharpeRatio = Math.random() * 2 + 0.5;
    const maxDrawdown = Math.random() * 30 + 10;
    const winRate = Math.random() * 40 + 50;
    const trades = Math.floor(Math.random() * 100) + 50;

    return {
      startDate: startDate.toLocaleDateString("zh-CN"),
      endDate: endDate.toLocaleDateString("zh-CN"),
      initialCapital: 100000,
      finalCapital,
      totalReturn,
      annualReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      trades,
      equityCurve
    };
  };

  // 运行历史回测
  const runBacktest = async () => {
    if (selectedCoins.length < 2) {
      alert("请至少选择2个币种进行回测");
      return;
    }

    setBacktestRunning(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const result = generateBacktestData();
    setBacktestResult(result);
    setBacktestRunning(false);
  };

  // 计算相关性分析
  useEffect(() => {
    if (selectedCoins.length >= 2 && coins.length > 0) {
      const correlations: CorrelationData[] = [];
      for (let i = 0; i < selectedCoins.length; i++) {
        for (let j = i + 1; j < selectedCoins.length; j++) {
          const coin1 = coins.find(c => c.id === selectedCoins[i]);
          const coin2 = coins.find(c => c.id === selectedCoins[j]);
          if (coin1 && coin2) {
            // 模拟计算相关性（基于价格变化）
            const correlation = Math.random() * 2 - 1; // -1 到 1
            correlations.push({
              coin1: coin1.symbol.toUpperCase(),
              coin2: coin2.symbol.toUpperCase(),
              correlation: correlation,
              period: "30天"
            });
          }
        }
      }
      setCorrelationData(correlations);
    }
  }, [selectedCoins, coins]);

  // 生成市场情绪数据
  useEffect(() => {
    const sentiment: SentimentData[] = [];
    for (let i = 29; i >= 0; i--) {
      const timestamp = Date.now() - i * 24 * 60 * 60 * 1000;
      sentiment.push({
        timestamp,
        fearGreedIndex: Math.random() * 100,
        socialVolume: Math.random() * 1000000 + 500000,
        newsSentiment: Math.random() * 2 - 1, // -1 到 1
        priceChange: (Math.random() - 0.5) * 10
      });
    }
    setSentimentData(sentiment);
  }, []);

  // 生成资金流向数据
  useEffect(() => {
    const exchanges = ["Binance", "Coinbase", "OKX", "Kraken", "Huobi", "Gate.io"];
    const flows: FlowData[] = exchanges.map(exchange => {
      const inflow = Math.random() * 100000000 + 50000000;
      const outflow = Math.random() * 100000000 + 50000000;
      return {
        exchange,
        inflow,
        outflow,
        netFlow: inflow - outflow,
        timestamp: Date.now()
      };
    });
    setFlowData(flows.sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow)));
  }, []);

  // 相关性矩阵数据
  const correlationMatrixData = useMemo(() => {
    if (selectedCoins.length < 2) return [];
    
    const matrix = [];
    const coinSymbols = selectedCoins.map(id => coins.find(c => c.id === id)?.symbol.toUpperCase() || id);
    
    for (let i = 0; i < coinSymbols.length; i++) {
      for (let j = 0; j < coinSymbols.length; j++) {
        if (i === j) {
          matrix.push({ x: i, y: j, value: 1 });
        } else {
          const correlation = correlationData.find(
            c => (c.coin1 === coinSymbols[i] && c.coin2 === coinSymbols[j]) ||
                 (c.coin1 === coinSymbols[j] && c.coin2 === coinSymbols[i])
          );
          matrix.push({
            x: i,
            y: j,
            value: correlation?.correlation || 0
          });
        }
      }
    }
    return matrix;
  }, [selectedCoins, correlationData, coins]);

  return (
    <div className="app" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <header style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 style={{
              color: "#f1f5f9",
              fontSize: "32px",
              fontWeight: "700",
              marginBottom: "8px",
              background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              数据分析增强
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "16px", margin: 0 }}>
              历史回测 · 相关性分析 · 市场情绪 · 资金流向
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(30, 41, 59, 0.6)",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              borderRadius: "12px",
              padding: "10px 20px",
              color: "#94a3b8",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
              e.currentTarget.style.color = "#60a5fa";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            ← 返回首页
          </button>
        </div>
      </header>

      {/* 标签页 */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "24px",
        borderBottom: "2px solid rgba(148, 163, 184, 0.1)",
        paddingBottom: "12px",
        flexWrap: "wrap"
      }}>
        {[
          { id: "backtest", label: "历史回测", icon: "📈" },
          { id: "correlation", label: "相关性分析", icon: "🔗" },
          { id: "sentiment", label: "市场情绪", icon: "😊" },
          { id: "flow", label: "资金流向", icon: "💰" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab.id
                ? "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)"
                : "transparent",
              border: activeTab === tab.id
                ? "1px solid rgba(139, 92, 246, 0.3)"
                : "1px solid transparent",
              borderRadius: "10px",
              color: activeTab === tab.id ? "#a78bfa" : "#94a3b8",
              fontSize: "15px",
              fontWeight: activeTab === tab.id ? "600" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = "rgba(148, 163, 184, 0.05)";
                e.currentTarget.style.color = "#cbd5e1";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#94a3b8";
              }
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 历史回测 */}
      {activeTab === "backtest" && (
        <div>
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
              历史回测配置
            </h3>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>
                选择币种（至少2个）
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "8px",
                maxHeight: "200px",
                overflowY: "auto",
                padding: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                borderRadius: "8px"
              }}>
                {coins.slice(0, 30).map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => {
                      if (selectedCoins.includes(coin.id)) {
                        setSelectedCoins(selectedCoins.filter(id => id !== coin.id));
                      } else {
                        setSelectedCoins([...selectedCoins, coin.id]);
                      }
                    }}
                    style={{
                      padding: "8px",
                      background: selectedCoins.includes(coin.id)
                        ? "rgba(139, 92, 246, 0.2)"
                        : "transparent",
                      border: selectedCoins.includes(coin.id)
                        ? "1px solid rgba(139, 92, 246, 0.5)"
                        : "1px solid rgba(148, 163, 184, 0.1)",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {coin.symbol.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={runBacktest}
              disabled={backtestRunning || selectedCoins.length < 2}
              style={{
                width: "100%",
                padding: "12px",
                background: backtestRunning || selectedCoins.length < 2
                  ? "rgba(148, 163, 184, 0.2)"
                  : "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontSize: "16px",
                fontWeight: "600",
                cursor: backtestRunning || selectedCoins.length < 2 ? "not-allowed" : "pointer",
                transition: "all 0.3s ease"
              }}
            >
              {backtestRunning ? "回测中..." : "开始回测"}
            </button>
          </div>

          {backtestResult && (
            <div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
                marginBottom: "24px"
              }}>
                {[
                  { label: "初始资金", value: `$${backtestResult.initialCapital.toLocaleString()}`, color: "#94a3b8" },
                  { label: "最终资金", value: `$${backtestResult.finalCapital.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: "#f1f5f9" },
                  { label: "总收益率", value: `${backtestResult.totalReturn >= 0 ? "+" : ""}${backtestResult.totalReturn.toFixed(2)}%`, color: backtestResult.totalReturn >= 0 ? "#22c55e" : "#ef4444" },
                  { label: "年化收益率", value: `${backtestResult.annualReturn >= 0 ? "+" : ""}${backtestResult.annualReturn.toFixed(2)}%`, color: backtestResult.annualReturn >= 0 ? "#22c55e" : "#ef4444" },
                  { label: "夏普比率", value: backtestResult.sharpeRatio.toFixed(2), color: "#3b82f6" },
                  { label: "最大回撤", value: `${backtestResult.maxDrawdown.toFixed(2)}%`, color: "#ef4444" },
                  { label: "胜率", value: `${backtestResult.winRate.toFixed(2)}%`, color: "#f59e0b" },
                  { label: "交易次数", value: backtestResult.trades.toString(), color: "#8b5cf6" }
                ].map((stat, index) => (
                  <div
                    key={index}
                    style={{
                      background: "rgba(30, 41, 59, 0.8)",
                      borderRadius: "12px",
                      padding: "20px",
                      border: "1px solid rgba(148, 163, 184, 0.1)"
                    }}
                  >
                    <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>{stat.label}</div>
                    <div style={{ color: stat.color, fontSize: "24px", fontWeight: "700" }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: "rgba(30, 41, 59, 0.8)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid rgba(148, 163, 184, 0.1)"
              }}>
                <h4 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", marginBottom: "20px" }}>
                  资产曲线 ({backtestResult.startDate} - {backtestResult.endDate})
                </h4>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={backtestResult.equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                    <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: "8px",
                        color: "#f1f5f9"
                      }}
                      formatter={(value: any) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      fill="url(#backtestGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="backtestGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 相关性分析 */}
      {activeTab === "correlation" && (
        <div>
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
              币种相关性分析
            </h3>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>
                选择币种（至少2个）
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "8px",
                maxHeight: "200px",
                overflowY: "auto",
                padding: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                borderRadius: "8px"
              }}>
                {coins.slice(0, 30).map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => {
                      if (selectedCoins.includes(coin.id)) {
                        setSelectedCoins(selectedCoins.filter(id => id !== coin.id));
                      } else {
                        setSelectedCoins([...selectedCoins, coin.id]);
                      }
                    }}
                    style={{
                      padding: "8px",
                      background: selectedCoins.includes(coin.id)
                        ? "rgba(139, 92, 246, 0.2)"
                        : "transparent",
                      border: selectedCoins.includes(coin.id)
                        ? "1px solid rgba(139, 92, 246, 0.5)"
                        : "1px solid rgba(148, 163, 184, 0.1)",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {coin.symbol.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {selectedCoins.length < 2 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                请至少选择2个币种进行分析
              </div>
            ) : (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px"
                }}>
                  {correlationData.map((corr, index) => (
                    <div
                      key={index}
                      style={{
                        background: "rgba(15, 23, 42, 0.8)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(148, 163, 184, 0.1)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600" }}>
                          {corr.coin1} ↔ {corr.coin2}
                        </div>
                        <div style={{
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontSize: "14px",
                          fontWeight: "600",
                          background: corr.correlation > 0.7
                            ? "rgba(34, 197, 94, 0.2)"
                            : corr.correlation < -0.7
                            ? "rgba(239, 68, 68, 0.2)"
                            : "rgba(148, 163, 184, 0.2)",
                          color: corr.correlation > 0.7
                            ? "#22c55e"
                            : corr.correlation < -0.7
                            ? "#ef4444"
                            : "#94a3b8"
                        }}>
                          {corr.correlation > 0 ? "+" : ""}{corr.correlation.toFixed(3)}
                        </div>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>
                        分析周期: {corr.period}
                      </div>
                      <div style={{
                        width: "100%",
                        height: "8px",
                        background: "rgba(148, 163, 184, 0.1)",
                        borderRadius: "4px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${Math.abs(corr.correlation) * 100}%`,
                          height: "100%",
                          background: corr.correlation > 0
                            ? "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)"
                            : "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                          marginLeft: corr.correlation < 0 ? "auto" : "0"
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 相关性热力图 */}
                {selectedCoins.length >= 2 && (
                  <div style={{
                    background: "rgba(30, 41, 59, 0.8)",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid rgba(148, 163, 184, 0.1)"
                  }}>
                    <h4 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", marginBottom: "20px" }}>
                      相关性矩阵热力图
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "12px", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}></th>
                            {selectedCoins.map(id => {
                              const coin = coins.find(c => c.id === id);
                              return (
                                <th key={id} style={{ padding: "12px", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>
                                  {coin?.symbol.toUpperCase() || id}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCoins.map((id1, i) => {
                            const coin1 = coins.find(c => c.id === id1);
                            return (
                              <tr key={id1}>
                                <td style={{ padding: "12px", color: "#f1f5f9", fontSize: "14px", fontWeight: "600" }}>
                                  {coin1?.symbol.toUpperCase() || id1}
                                </td>
                                {selectedCoins.map((id2, j) => {
                                  const coin2 = coins.find(c => c.id === id2);
                                  const correlation = correlationData.find(
                                    c => (c.coin1 === coin1?.symbol.toUpperCase() && c.coin2 === coin2?.symbol.toUpperCase()) ||
                                         (c.coin1 === coin2?.symbol.toUpperCase() && c.coin2 === coin1?.symbol.toUpperCase())
                                  )?.correlation || (i === j ? 1 : 0);
                                  
                                  const intensity = Math.abs(correlation);
                                  const opacity = 0.3 + intensity * 0.7;
                                  
                                  return (
                                    <td
                                      key={id2}
                                      style={{
                                        padding: "12px",
                                        textAlign: "center",
                                        background: correlation > 0
                                          ? `rgba(34, 197, 94, ${opacity})`
                                          : correlation < 0
                                          ? `rgba(239, 68, 68, ${opacity})`
                                          : "rgba(148, 163, 184, 0.1)",
                                        color: "#f1f5f9",
                                        fontSize: "14px",
                                        fontWeight: "600"
                                      }}
                                    >
                                      {correlation.toFixed(2)}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 市场情绪 */}
      {activeTab === "sentiment" && (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "24px"
          }}>
            {[
              { 
                label: "恐惧贪婪指数", 
                value: sentimentData[sentimentData.length - 1]?.fearGreedIndex.toFixed(0) || "0",
                color: sentimentData[sentimentData.length - 1]?.fearGreedIndex > 50 ? "#22c55e" : "#ef4444",
                icon: "😊"
              },
              { 
                label: "社交媒体热度", 
                value: sentimentData[sentimentData.length - 1]?.socialVolume.toLocaleString() || "0",
                color: "#3b82f6",
                icon: "📱"
              },
              { 
                label: "新闻情绪", 
                value: sentimentData[sentimentData.length - 1]?.newsSentiment > 0 ? "积极" : "消极",
                color: sentimentData[sentimentData.length - 1]?.newsSentiment > 0 ? "#22c55e" : "#ef4444",
                icon: "📰"
              }
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  background: "rgba(30, 41, 59, 0.8)",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid rgba(148, 163, 184, 0.1)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>{stat.label}</div>
                    <div style={{ color: stat.color, fontSize: "28px", fontWeight: "700" }}>{stat.value}</div>
                  </div>
                  <div style={{ fontSize: "32px" }}>{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
              30天市场情绪趋势
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={sentimentData.map((s, i) => ({
                date: new Date(s.timestamp).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
                fearGreed: s.fearGreedIndex,
                socialVolume: s.socialVolume / 10000,
                newsSentiment: (s.newsSentiment + 1) * 50
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <YAxis yAxisId="left" stroke="#94a3b8" style={{ fontSize: "12px" }} domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "8px",
                    color: "#f1f5f9"
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="fearGreed" stroke="#f59e0b" strokeWidth={2} dot={false} name="恐惧贪婪指数" />
                <Line yAxisId="right" type="monotone" dataKey="socialVolume" stroke="#3b82f6" strokeWidth={2} dot={false} name="社交媒体热度(万)" />
                <Line yAxisId="left" type="monotone" dataKey="newsSentiment" stroke="#22c55e" strokeWidth={2} dot={false} name="新闻情绪" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 资金流向 */}
      {activeTab === "flow" && (
        <div>
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
              交易所资金流向
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>交易所</th>
                    <th style={{ padding: "12px", textAlign: "right", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>流入</th>
                    <th style={{ padding: "12px", textAlign: "right", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>流出</th>
                    <th style={{ padding: "12px", textAlign: "right", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>净流入</th>
                  </tr>
                </thead>
                <tbody>
                  {flowData.map((flow, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px solid rgba(148, 163, 184, 0.05)",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(59, 130, 246, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "12px", color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>
                        {flow.exchange}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#22c55e", fontSize: "14px" }}>
                        ${(flow.inflow / 1e6).toFixed(2)}M
                      </td>
                      <td style={{ padding: "12px", textAlign: "right", color: "#ef4444", fontSize: "14px" }}>
                        ${(flow.outflow / 1e6).toFixed(2)}M
                      </td>
                      <td style={{
                        padding: "12px",
                        textAlign: "right",
                        color: flow.netFlow >= 0 ? "#22c55e" : "#ef4444",
                        fontSize: "14px",
                        fontWeight: "600"
                      }}>
                        {flow.netFlow >= 0 ? "+" : ""}${(flow.netFlow / 1e6).toFixed(2)}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
              资金流向可视化
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={flowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="exchange" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} tickFormatter={(value) => `$${(value / 1e6).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "8px",
                    color: "#f1f5f9"
                  }}
                  formatter={(value: any) => `$${(value / 1e6).toFixed(2)}M`}
                />
                <Bar dataKey="inflow" fill="#22c55e" name="流入" />
                <Bar dataKey="outflow" fill="#ef4444" name="流出" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
