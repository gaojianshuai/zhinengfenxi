import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  timestamp: number;
  blockNumber: number;
  token?: string;
}

interface WalletInfo {
  address: string;
  balance: number;
  transactionCount: number;
  firstSeen: number;
  tags?: string[];
}

interface ChainStats {
  totalTransactions: number;
  totalVolume: number;
  activeAddresses: number;
  averageGasPrice: number;
}

export function BlockchainData() {
  const [activeTab, setActiveTab] = useState<"analysis" | "transfers" | "wallet">("analysis");
  const [walletAddress, setWalletAddress] = useState("");
  const [trackedWallet, setTrackedWallet] = useState<WalletInfo | null>(null);
  const [largeTransfers, setLargeTransfers] = useState<Transaction[]>([]);
  const [chainStats, setChainStats] = useState<ChainStats>({
    totalTransactions: 0,
    totalVolume: 0,
    activeAddresses: 0,
    averageGasPrice: 0
  });

  // 模拟数据生成
  useEffect(() => {
    // 生成链上统计数据
    const generateStats = () => {
      setChainStats({
        totalTransactions: Math.floor(Math.random() * 1000000) + 500000,
        totalVolume: Math.random() * 1000000000 + 500000000,
        activeAddresses: Math.floor(Math.random() * 50000) + 25000,
        averageGasPrice: Math.random() * 50 + 20
      });
    };

    // 生成大额转账数据
    const generateLargeTransfers = () => {
      const transfers: Transaction[] = [];
      const tokens = ["ETH", "BTC", "USDT", "USDC"];
      for (let i = 0; i < 20; i++) {
        transfers.push({
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          from: `0x${Math.random().toString(16).substr(2, 40)}`,
          to: `0x${Math.random().toString(16).substr(2, 40)}`,
          value: Math.random() * 10000 + 1000,
          timestamp: Date.now() - i * 3600000,
          blockNumber: 18000000 + i * 100,
          token: tokens[Math.floor(Math.random() * tokens.length)]
        });
      }
      setLargeTransfers(transfers.sort((a, b) => b.value - a.value));
    };

    generateStats();
    generateLargeTransfers();
    
    const interval = setInterval(() => {
      generateStats();
      generateLargeTransfers();
    }, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, []);

  // 追踪钱包地址
  const trackWallet = () => {
    if (!walletAddress.trim()) {
      alert("请输入钱包地址");
      return;
    }

    // 模拟获取钱包信息
    const wallet: WalletInfo = {
      address: walletAddress,
      balance: Math.random() * 100 + 10,
      transactionCount: Math.floor(Math.random() * 1000) + 100,
      firstSeen: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
      tags: Math.random() > 0.5 ? ["交易所", "大户"] : []
    };

    setTrackedWallet(wallet);
  };

  // 格式化地址
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // 生成链上数据图表数据
  const generateChartData = () => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      data.push({
        time: `${i}:00`,
        transactions: Math.floor(Math.random() * 50000) + 20000,
        volume: Math.random() * 50000000 + 20000000,
        addresses: Math.floor(Math.random() * 5000) + 2000
      });
    }
    return data;
  };

  const chartData = generateChartData();

  return (
    <div className="app" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ 
          color: "#f1f5f9", 
          fontSize: "32px", 
          fontWeight: "700", 
          marginBottom: "8px",
          background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          区块链数据分析
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "16px", margin: 0 }}>
          实时监控链上数据、大额转账和钱包活动
        </p>
      </header>

      {/* 标签页 */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "24px",
        borderBottom: "2px solid rgba(148, 163, 184, 0.1)",
        paddingBottom: "12px"
      }}>
        {[
          { id: "analysis", label: "链上数据分析", icon: "📊" },
          { id: "transfers", label: "大额转账监控", icon: "💸" },
          { id: "wallet", label: "钱包地址追踪", icon: "🔍" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab.id 
                ? "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)"
                : "transparent",
              border: activeTab === tab.id 
                ? "1px solid rgba(59, 130, 246, 0.3)"
                : "1px solid transparent",
              borderRadius: "10px",
              color: activeTab === tab.id ? "#60a5fa" : "#94a3b8",
              fontSize: "15px",
              fontWeight: activeTab === tab.id ? "600" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
              outline: "none"
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

      {/* 链上数据分析 */}
      {activeTab === "analysis" && (
        <div>
          {/* 统计卡片 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "32px"
          }}>
            {[
              { label: "总交易数", value: chainStats.totalTransactions.toLocaleString(), icon: "📈", color: "#3b82f6" },
              { label: "总交易量", value: `$${(chainStats.totalVolume / 1e9).toFixed(2)}B`, icon: "💰", color: "#22c55e" },
              { label: "活跃地址", value: chainStats.activeAddresses.toLocaleString(), icon: "👥", color: "#f59e0b" },
              { label: "平均Gas价格", value: `${chainStats.averageGasPrice.toFixed(2)} Gwei`, icon: "⛽", color: "#ef4444" }
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  background: "rgba(30, 41, 59, 0.8)",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid rgba(148, 163, 184, 0.1)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "100px",
                  height: "100px",
                  background: `${stat.color}15`,
                  borderRadius: "50%"
                }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>{stat.label}</div>
                    <div style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: "700" }}>{stat.value}</div>
                  </div>
                  <div style={{
                    fontSize: "32px",
                    width: "56px",
                    height: "56px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${stat.color}20`,
                    borderRadius: "12px"
                  }}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 图表 */}
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "24px" }}>
              24小时链上活动趋势
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <YAxis yAxisId="left" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "8px",
                    color: "#f1f5f9"
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="transactions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="交易数"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="volume"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="交易量"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 大额转账监控 */}
      {activeTab === "transfers" && (
        <div>
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", margin: 0 }}>
                大额转账监控
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  style={{
                    padding: "8px 12px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    cursor: "pointer"
                  }}
                >
                  <option>全部代币</option>
                  <option>ETH</option>
                  <option>BTC</option>
                  <option>USDT</option>
                  <option>USDC</option>
                </select>
                <input
                  type="number"
                  placeholder="最小金额"
                  style={{
                    padding: "8px 12px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "14px",
                    width: "150px"
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>时间</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>交易哈希</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>发送方</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>接收方</th>
                    <th style={{ padding: "12px", textAlign: "right", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>金额</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>代币</th>
                  </tr>
                </thead>
                <tbody>
                  {largeTransfers.map((transfer, index) => (
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
                      <td style={{ padding: "12px", color: "#cbd5e1", fontSize: "14px" }}>
                        {formatTime(transfer.timestamp)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <a
                          href={`#${transfer.hash}`}
                          style={{
                            color: "#60a5fa",
                            textDecoration: "none",
                            fontSize: "14px",
                            fontFamily: "monospace"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = "none";
                          }}
                        >
                          {formatAddress(transfer.hash)}
                        </a>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ color: "#cbd5e1", fontSize: "14px", fontFamily: "monospace" }}>
                          {formatAddress(transfer.from)}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ color: "#cbd5e1", fontSize: "14px", fontFamily: "monospace" }}>
                          {formatAddress(transfer.to)}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <span style={{ color: "#22c55e", fontSize: "14px", fontWeight: "600" }}>
                          ${transfer.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          background: "rgba(59, 130, 246, 0.2)",
                          color: "#60a5fa",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {transfer.token}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 钱包地址追踪 */}
      {activeTab === "wallet" && (
        <div>
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
              钱包地址追踪
            </h3>
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="输入钱包地址 (0x...)"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "10px",
                  color: "#f1f5f9",
                  fontSize: "14px",
                  fontFamily: "monospace"
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    trackWallet();
                  }
                }}
              />
              <button
                onClick={trackWallet}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                }}
              >
                追踪
              </button>
            </div>

            {trackedWallet && (
              <div style={{
                background: "rgba(15, 23, 42, 0.8)",
                borderRadius: "12px",
                padding: "24px",
                border: "1px solid rgba(59, 130, 246, 0.2)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "20px" }}>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>钱包地址</div>
                    <div style={{ color: "#f1f5f9", fontSize: "18px", fontFamily: "monospace", fontWeight: "600" }}>
                      {trackedWallet.address}
                    </div>
                  </div>
                  {trackedWallet.tags && trackedWallet.tags.length > 0 && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      {trackedWallet.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            background: "rgba(59, 130, 246, 0.2)",
                            color: "#60a5fa",
                            padding: "4px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px"
                }}>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>余额</div>
                    <div style={{ color: "#22c55e", fontSize: "24px", fontWeight: "700" }}>
                      {trackedWallet.balance.toFixed(4)} ETH
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>交易次数</div>
                    <div style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700" }}>
                      {trackedWallet.transactionCount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>首次出现</div>
                    <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600" }}>
                      {formatTime(trackedWallet.firstSeen)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

