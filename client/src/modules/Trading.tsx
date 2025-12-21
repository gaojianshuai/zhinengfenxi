import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import axios from "axios";

interface Position {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  amount: number;
  avgPrice: number;
  currentPrice: number;
  profit: number;
  profitPercent: number;
  timestamp: number;
}

interface Trade {
  id: string;
  type: "buy" | "sell";
  coinId: string;
  coinName: string;
  coinSymbol: string;
  amount: number;
  price: number;
  total: number;
  timestamp: number;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  params: Record<string, any>;
  backtestResults?: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    trades: number;
  };
}

// localStorage键名
const TRADING_BALANCE_KEY = 'trading_balance';
const TRADING_POSITIONS_KEY = 'trading_positions';
const TRADING_HISTORY_KEY = 'trading_history';

export function Trading() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"simulate" | "realtime" | "backtest">("simulate");
  
  // 从localStorage加载数据，如果没有则使用默认值
  const loadBalance = (): number => {
    try {
      const saved = localStorage.getItem(TRADING_BALANCE_KEY);
      return saved ? parseFloat(saved) : 100000;
    } catch {
      return 100000;
    }
  };

  const loadPositions = (): Position[] => {
    try {
      const saved = localStorage.getItem(TRADING_POSITIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const loadTradeHistory = (): Trade[] => {
    try {
      const saved = localStorage.getItem(TRADING_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [balance, setBalance] = useState(loadBalance);
  const [positions, setPositions] = useState<Position[]>(loadPositions);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>(loadTradeHistory);
  const [selectedCoin, setSelectedCoin] = useState<{ id: string; name: string; symbol: string; price: number } | null>(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [backtestRunning, setBacktestRunning] = useState(false);
  const [coins, setCoins] = useState<any[]>([]);

  // 保存余额到localStorage
  useEffect(() => {
    localStorage.setItem(TRADING_BALANCE_KEY, balance.toString());
  }, [balance]);

  // 保存持仓到localStorage
  useEffect(() => {
    localStorage.setItem(TRADING_POSITIONS_KEY, JSON.stringify(positions));
  }, [positions]);

  // 保存交易历史到localStorage
  useEffect(() => {
    localStorage.setItem(TRADING_HISTORY_KEY, JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  // 加载币种列表并更新持仓的当前价格
  useEffect(() => {
    axios.get("/api/overview").then(res => {
      if (Array.isArray(res.data)) {
        setCoins(res.data);
        // 更新持仓的当前价格
        setPositions(prevPositions => 
          prevPositions.map(pos => {
            const coin = res.data.find((c: any) => c.id === pos.coinId);
            if (coin) {
              const currentPrice = coin.current_price;
              return {
                ...pos,
                currentPrice,
                profit: (currentPrice - pos.avgPrice) * pos.amount,
                profitPercent: ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100
              };
            }
            return pos;
          })
        );
      }
    });
  }, []);

  // 计算总资产
  const totalAssets = balance + positions.reduce((sum, pos) => sum + pos.amount * pos.currentPrice, 0);
  const totalProfit = positions.reduce((sum, pos) => sum + pos.profit, 0);
  const totalProfitPercent = balance > 0 ? (totalProfit / (totalAssets - totalProfit)) * 100 : 0;

  // 执行交易
  const executeTrade = () => {
    if (!selectedCoin || !tradeAmount || !tradePrice) {
      alert("请填写完整的交易信息");
      return;
    }

    const amount = parseFloat(tradeAmount);
    const price = parseFloat(tradePrice);
    const total = amount * price;

    let newBalance = balance;
    let newPositions = [...positions];

    if (tradeType === "buy") {
      if (total > balance) {
        alert("余额不足");
        return;
      }
      newBalance = balance - total;

      // 检查是否已有持仓
      const existingPosition = positions.find(p => p.coinId === selectedCoin.id);
      if (existingPosition) {
        // 更新持仓
        const newAmount = existingPosition.amount + amount;
        const newAvgPrice = (existingPosition.avgPrice * existingPosition.amount + price * amount) / newAmount;
        newPositions = positions.map(p =>
          p.coinId === selectedCoin.id
            ? {
                ...p,
                amount: newAmount,
                avgPrice: newAvgPrice,
                currentPrice: selectedCoin.price,
                profit: (selectedCoin.price - newAvgPrice) * newAmount,
                profitPercent: ((selectedCoin.price - newAvgPrice) / newAvgPrice) * 100
              }
            : { ...p, currentPrice: coins.find(c => c.id === p.coinId)?.current_price || p.currentPrice }
        );
      } else {
        // 新建持仓
        const newPosition: Position = {
          id: `pos_${Date.now()}`,
          coinId: selectedCoin.id,
          coinName: selectedCoin.name,
          coinSymbol: selectedCoin.symbol,
          amount,
          avgPrice: price,
          currentPrice: selectedCoin.price,
          profit: (selectedCoin.price - price) * amount,
          profitPercent: ((selectedCoin.price - price) / price) * 100,
          timestamp: Date.now()
        };
        newPositions = [...positions, newPosition];
      }
    } else {
      // 卖出
      const existingPosition = positions.find(p => p.coinId === selectedCoin.id);
      if (!existingPosition || existingPosition.amount < amount) {
        alert("持仓不足");
        return;
      }

      newBalance = balance + total;

      if (existingPosition.amount === amount) {
        // 全部卖出
        newPositions = positions.filter(p => p.coinId !== selectedCoin.id);
      } else {
        // 部分卖出
        newPositions = positions.map(p =>
          p.coinId === selectedCoin.id
            ? {
                ...p,
                amount: p.amount - amount,
                currentPrice: selectedCoin.price,
                profit: (selectedCoin.price - p.avgPrice) * (p.amount - amount),
                profitPercent: ((selectedCoin.price - p.avgPrice) / p.avgPrice) * 100
              }
            : p
        );
      }
    }

    // 更新状态
    setBalance(newBalance);
    setPositions(newPositions);
    // 立即保存到localStorage
    localStorage.setItem(TRADING_BALANCE_KEY, newBalance.toString());
    localStorage.setItem(TRADING_POSITIONS_KEY, JSON.stringify(newPositions));

    // 记录交易历史
    const newTrade: Trade = {
      id: `trade_${Date.now()}`,
      type: tradeType,
      coinId: selectedCoin.id,
      coinName: selectedCoin.name,
      coinSymbol: selectedCoin.symbol,
      amount,
      price,
      total,
      timestamp: Date.now()
    };
    const updatedHistory = [newTrade, ...tradeHistory];
    setTradeHistory(updatedHistory);
    // 立即保存到localStorage
    localStorage.setItem(TRADING_HISTORY_KEY, JSON.stringify(updatedHistory));

    // 清空表单
    setTradeAmount("");
    setTradePrice("");
  };

  // 快速选择币种
  const selectCoin = (coin: any) => {
    setSelectedCoin({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      price: coin.current_price
    });
    setTradePrice(coin.current_price.toString());
  };

  // 运行回测
  const runBacktest = async () => {
    if (!selectedStrategy) {
      alert("请选择策略");
      return;
    }

    setBacktestRunning(true);
    // 模拟回测过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = {
      totalReturn: Math.random() * 100 - 20,
      sharpeRatio: Math.random() * 2 + 0.5,
      maxDrawdown: Math.random() * 30 + 10,
      winRate: Math.random() * 40 + 50,
      trades: Math.floor(Math.random() * 100) + 50
    };

    setStrategies(strategies.map(s =>
      s.id === selectedStrategy.id
        ? { ...s, backtestResults: results }
        : s
    ));

    setBacktestRunning(false);
  };

  // 生成回测图表数据
  const generateBacktestData = () => {
    const data = [];
    let value = 100000;
    for (let i = 0; i < 30; i++) {
      value *= (1 + (Math.random() - 0.45) * 0.02);
      data.push({
        date: `Day ${i + 1}`,
        value: value,
        benchmark: 100000 * (1 + 0.001 * i)
      });
    }
    return data;
  };

  const backtestData = generateBacktestData();

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
              background: "linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              交易中心
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "16px", margin: 0 }}>
              模拟交易 · 实盘交易 · 策略回测
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

      {/* 资产概览 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "32px"
      }}>
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>总资产</div>
          <div style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: "700" }}>
            ${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>可用余额</div>
          <div style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: "700" }}>
            ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>总盈亏</div>
          <div style={{
            color: totalProfit >= 0 ? "#22c55e" : "#ef4444",
            fontSize: "28px",
            fontWeight: "700"
          }}>
            {totalProfit >= 0 ? "+" : ""}${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div style={{
            color: totalProfitPercent >= 0 ? "#22c55e" : "#ef4444",
            fontSize: "14px",
            marginTop: "4px"
          }}>
            {totalProfitPercent >= 0 ? "+" : ""}{totalProfitPercent.toFixed(2)}%
          </div>
        </div>
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>持仓数量</div>
          <div style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: "700" }}>
            {positions.length}
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "24px",
        borderBottom: "2px solid rgba(148, 163, 184, 0.1)",
        paddingBottom: "12px"
      }}>
        {[
          { id: "simulate", label: "模拟交易", icon: "🎮" },
          { id: "realtime", label: "实盘交易", icon: "⚡" },
          { id: "backtest", label: "策略回测", icon: "📊" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab.id
                ? "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)"
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
              transition: "all 0.3s ease"
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 模拟交易 */}
      {activeTab === "simulate" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* 交易面板 */}
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
              交易面板
            </h3>

            {/* 交易类型切换 */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              <button
                onClick={() => setTradeType("buy")}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: tradeType === "buy"
                    ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                    : "rgba(148, 163, 184, 0.1)",
                  border: "none",
                  borderRadius: "10px",
                  color: tradeType === "buy" ? "white" : "#94a3b8",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                买入
              </button>
              <button
                onClick={() => setTradeType("sell")}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: tradeType === "sell"
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : "rgba(148, 163, 184, 0.1)",
                  border: "none",
                  borderRadius: "10px",
                  color: tradeType === "sell" ? "white" : "#94a3b8",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
              >
                卖出
              </button>
            </div>

            {/* 币种选择 */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>
                选择币种
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
                {coins.slice(0, 20).map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => selectCoin(coin)}
                    style={{
                      padding: "8px",
                      background: selectedCoin?.id === coin.id
                        ? "rgba(59, 130, 246, 0.2)"
                        : "transparent",
                      border: selectedCoin?.id === coin.id
                        ? "1px solid rgba(59, 130, 246, 0.5)"
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

            {/* 交易表单 */}
            {selectedCoin && (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>
                    当前价格
                  </label>
                  <div style={{
                    padding: "12px",
                    background: "rgba(15, 23, 42, 0.8)",
                    borderRadius: "8px",
                    color: "#f1f5f9",
                    fontSize: "18px",
                    fontWeight: "600"
                  }}>
                    ${selectedCoin.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>
                    交易价格
                  </label>
                  <input
                    type="number"
                    value={tradePrice}
                    onChange={(e) => setTradePrice(e.target.value)}
                    placeholder="输入价格"
                    step="0.0001"
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                      fontSize: "16px"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>
                    交易数量
                  </label>
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="输入数量"
                    step="0.0001"
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: "8px",
                      color: "#f1f5f9",
                      fontSize: "16px"
                    }}
                  />
                </div>

                {tradeAmount && tradePrice && (
                  <div style={{
                    padding: "12px",
                    background: "rgba(59, 130, 246, 0.1)",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    border: "1px solid rgba(59, 130, 246, 0.2)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "14px" }}>
                      <span>交易总额</span>
                      <span style={{ color: "#60a5fa", fontWeight: "600" }}>
                        ${(parseFloat(tradeAmount || "0") * parseFloat(tradePrice || "0")).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={executeTrade}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: tradeType === "buy"
                      ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    border: "none",
                    borderRadius: "10px",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: tradeType === "buy"
                      ? "0 4px 12px rgba(34, 197, 94, 0.3)"
                      : "0 4px 12px rgba(239, 68, 68, 0.3)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = tradeType === "buy"
                      ? "0 6px 16px rgba(34, 197, 94, 0.4)"
                      : "0 6px 16px rgba(239, 68, 68, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = tradeType === "buy"
                      ? "0 4px 12px rgba(34, 197, 94, 0.3)"
                      : "0 4px 12px rgba(239, 68, 68, 0.3)";
                  }}
                >
                  {tradeType === "buy" ? "买入" : "卖出"} {selectedCoin.symbol.toUpperCase()}
                </button>
              </>
            )}
          </div>

          {/* 持仓列表 */}
          <div style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
              我的持仓
            </h3>
            {positions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                暂无持仓
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {positions.map((pos) => (
                  <div
                    key={pos.id}
                    style={{
                      padding: "16px",
                      background: "rgba(15, 23, 42, 0.8)",
                      borderRadius: "12px",
                      border: "1px solid rgba(148, 163, 184, 0.1)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                      <div>
                        <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
                          {pos.coinName} ({pos.coinSymbol.toUpperCase()})
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                          持仓: {pos.amount.toFixed(4)} | 均价: ${pos.avgPrice.toFixed(4)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          color: pos.profit >= 0 ? "#22c55e" : "#ef4444",
                          fontSize: "16px",
                          fontWeight: "600"
                        }}>
                          {pos.profit >= 0 ? "+" : ""}${pos.profit.toFixed(2)}
                        </div>
                        <div style={{
                          color: pos.profitPercent >= 0 ? "#22c55e" : "#ef4444",
                          fontSize: "12px"
                        }}>
                          {pos.profitPercent >= 0 ? "+" : ""}{pos.profitPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                        当前价格: ${pos.currentPrice.toFixed(4)}
                      </div>
                      <button
                        onClick={() => {
                          selectCoin({ id: pos.coinId, name: pos.coinName, symbol: pos.coinSymbol, current_price: pos.currentPrice });
                          setTradeType("sell");
                          setTradeAmount(pos.amount.toString());
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(239, 68, 68, 0.2)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "6px",
                          color: "#f87171",
                          fontSize: "12px",
                          cursor: "pointer"
                        }}
                      >
                        卖出
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 实盘交易 */}
      {activeTab === "realtime" && (
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
            实盘交易接口
          </h3>
          <div style={{
            padding: "40px",
            textAlign: "center",
            background: "rgba(15, 23, 42, 0.8)",
            borderRadius: "12px",
            border: "2px dashed rgba(148, 163, 184, 0.2)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔐</div>
            <h4 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
              连接交易所
            </h4>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "24px" }}>
              实盘交易需要连接交易所API，请配置您的API密钥
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              {["Binance", "Coinbase", "OKX", "Kraken"].map((exchange) => (
                <button
                  key={exchange}
                  style={{
                    padding: "12px 24px",
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "10px",
                    color: "#60a5fa",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  }}
                >
                  连接 {exchange}
                </button>
              ))}
            </div>
            <div style={{
              marginTop: "24px",
              padding: "16px",
              background: "rgba(239, 68, 68, 0.1)",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.2)"
            }}>
              <p style={{ color: "#f87171", fontSize: "12px", margin: 0 }}>
                ⚠️ 警告：实盘交易涉及真实资金，请确保API密钥安全，建议使用只读权限的API密钥进行测试
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 策略回测 */}
      {activeTab === "backtest" && (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "24px",
            marginBottom: "24px"
          }}>
            {/* 策略列表 */}
            <div style={{
              background: "rgba(30, 41, 59, 0.8)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid rgba(148, 163, 184, 0.1)"
            }}>
              <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
                交易策略
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { id: "1", name: "移动平均线策略", description: "基于MA5和MA20交叉" },
                  { id: "2", name: "RSI超买超卖", description: "RSI < 30买入，RSI > 70卖出" },
                  { id: "3", name: "MACD策略", description: "MACD金叉买入，死叉卖出" },
                  { id: "4", name: "布林带策略", description: "价格触及下轨买入，上轨卖出" }
                ].map((strategy) => (
                  <div
                    key={strategy.id}
                    onClick={() => setSelectedStrategy(strategy as Strategy)}
                    style={{
                      padding: "16px",
                      background: selectedStrategy?.id === strategy.id
                        ? "rgba(59, 130, 246, 0.2)"
                        : "rgba(15, 23, 42, 0.8)",
                      borderRadius: "12px",
                      border: selectedStrategy?.id === strategy.id
                        ? "1px solid rgba(59, 130, 246, 0.5)"
                        : "1px solid rgba(148, 163, 184, 0.1)",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
                      {strategy.name}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                      {strategy.description}
                    </div>
                  </div>
                ))}
              </div>
              {selectedStrategy && (
                <button
                  onClick={runBacktest}
                  disabled={backtestRunning}
                  style={{
                    width: "100%",
                    marginTop: "20px",
                    padding: "12px",
                    background: backtestRunning
                      ? "rgba(148, 163, 184, 0.2)"
                      : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    border: "none",
                    borderRadius: "10px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: backtestRunning ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  {backtestRunning ? "回测中..." : "运行回测"}
                </button>
              )}
            </div>

            {/* 回测结果 */}
            <div style={{
              background: "rgba(30, 41, 59, 0.8)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid rgba(148, 163, 184, 0.1)"
            }}>
              <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
                回测结果
              </h3>
              {selectedStrategy?.backtestResults ? (
                <>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "16px",
                    marginBottom: "24px"
                  }}>
                    {[
                      { label: "总收益率", value: `${selectedStrategy.backtestResults.totalReturn.toFixed(2)}%`, color: "#22c55e" },
                      { label: "夏普比率", value: selectedStrategy.backtestResults.sharpeRatio.toFixed(2), color: "#3b82f6" },
                      { label: "最大回撤", value: `${selectedStrategy.backtestResults.maxDrawdown.toFixed(2)}%`, color: "#ef4444" },
                      { label: "胜率", value: `${selectedStrategy.backtestResults.winRate.toFixed(2)}%`, color: "#f59e0b" }
                    ].map((stat, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "16px",
                          background: "rgba(15, 23, 42, 0.8)",
                          borderRadius: "12px",
                          border: "1px solid rgba(148, 163, 184, 0.1)"
                        }}
                      >
                        <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px" }}>
                          {stat.label}
                        </div>
                        <div style={{ color: stat.color, fontSize: "24px", fontWeight: "700" }}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>
                      回测周期: 30天 | 交易次数: {selectedStrategy.backtestResults.trades}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={backtestData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15, 23, 42, 0.95)",
                          border: "1px solid rgba(148, 163, 184, 0.2)",
                          borderRadius: "8px",
                          color: "#f1f5f9"
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="url(#colorGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="benchmark"
                        stroke="#94a3b8"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        fill="transparent"
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div style={{
                  padding: "60px",
                  textAlign: "center",
                  color: "#94a3b8"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
                  <p>请选择策略并运行回测</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 交易历史 */}
      <div style={{
        background: "rgba(30, 41, 59, 0.8)",
        borderRadius: "16px",
        padding: "24px",
        marginTop: "24px",
        border: "1px solid rgba(148, 163, 184, 0.1)"
      }}>
        <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
          交易历史
        </h3>
        {tradeHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            暂无交易记录
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>时间</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>类型</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>币种</th>
                  <th style={{ padding: "12px", textAlign: "right", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>数量</th>
                  <th style={{ padding: "12px", textAlign: "right", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>价格</th>
                  <th style={{ padding: "12px", textAlign: "right", color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>总额</th>
                </tr>
              </thead>
              <tbody>
                {tradeHistory.map((trade) => (
                  <tr
                    key={trade.id}
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
                      {new Date(trade.timestamp).toLocaleString("zh-CN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: trade.type === "buy"
                          ? "rgba(34, 197, 94, 0.2)"
                          : "rgba(239, 68, 68, 0.2)",
                        color: trade.type === "buy" ? "#22c55e" : "#ef4444"
                      }}>
                        {trade.type === "buy" ? "买入" : "卖出"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>
                      {trade.coinName} ({trade.coinSymbol.toUpperCase()})
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#cbd5e1", fontSize: "14px" }}>
                      {trade.amount.toFixed(4)}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#cbd5e1", fontSize: "14px" }}>
                      ${trade.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#f1f5f9", fontSize: "14px", fontWeight: "600" }}>
                      ${trade.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 资产曲线图 */}
      {positions.length > 0 && (
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          marginTop: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
            资产曲线
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={generateAssetCurveData()}>
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
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// 生成资产曲线数据
function generateAssetCurveData() {
  const data = [];
  let value = 100000;
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    value *= (1 + (Math.random() - 0.45) * 0.02);
    data.push({
      date: new Date(now - i * 24 * 60 * 60 * 1000).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
      value: value
    });
  }
  return data;
}