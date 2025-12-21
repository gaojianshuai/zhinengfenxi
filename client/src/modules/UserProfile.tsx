import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface User {
  id: string;
  email: string;
  username: string;
  portfolio: PortfolioItem[];
  favorites: string[];
  priceAlerts: PriceAlert[];
}

interface PortfolioItem {
  coinId: string;
  symbol: string;
  amount: number;
  avgPrice: number;
  addedAt: number;
}

interface PriceAlert {
  coinId: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  enabled: boolean;
  createdAt: number;
}

interface CoinOverview {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"portfolio" | "favorites" | "alerts">("portfolio");
  const [coins, setCoins] = useState<CoinOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newPortfolioItem, setNewPortfolioItem] = useState({ coinId: "", amount: "", avgPrice: "" });
  const [newAlert, setNewAlert] = useState({ coinId: "", targetPrice: "", condition: "above" as "above" | "below" });

  useEffect(() => {
    loadUserData();
    loadCoins();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (err) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadCoins = async () => {
    try {
      const response = await axios.get("/api/overview");
      setCoins(response.data);
    } catch (err) {
      console.error("加载币种列表失败");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    navigate("/auth");
  };

  const addPortfolioItem = async () => {
    if (!newPortfolioItem.coinId || !newPortfolioItem.amount || !newPortfolioItem.avgPrice) {
      alert("请填写所有字段");
      return;
    }

    const coin = coins.find(c => c.id === newPortfolioItem.coinId);
    if (!coin) return;

    const token = localStorage.getItem("auth_token");
    const updatedPortfolio = [
      ...(user?.portfolio || []),
      {
        coinId: newPortfolioItem.coinId,
        symbol: coin.symbol,
        amount: parseFloat(newPortfolioItem.amount),
        avgPrice: parseFloat(newPortfolioItem.avgPrice),
        addedAt: Date.now()
      }
    ];

    try {
      await axios.put("/api/user/portfolio", { portfolio: updatedPortfolio }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => prev ? { ...prev, portfolio: updatedPortfolio } : null);
      setShowAddPortfolio(false);
      setNewPortfolioItem({ coinId: "", amount: "", avgPrice: "" });
    } catch (err) {
      alert("添加失败，请稍后重试");
    }
  };

  const removePortfolioItem = async (index: number) => {
    const token = localStorage.getItem("auth_token");
    const updatedPortfolio = user?.portfolio.filter((_, i) => i !== index) || [];

    try {
      await axios.put("/api/user/portfolio", { portfolio: updatedPortfolio }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => prev ? { ...prev, portfolio: updatedPortfolio } : null);
    } catch (err) {
      alert("删除失败，请稍后重试");
    }
  };

  const toggleFavorite = async (coinId: string) => {
    const token = localStorage.getItem("auth_token");
    const favorites = user?.favorites || [];
    const updatedFavorites = favorites.includes(coinId)
      ? favorites.filter(id => id !== coinId)
      : [...favorites, coinId];

    try {
      await axios.put("/api/user/favorites", { favorites: updatedFavorites }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => prev ? { ...prev, favorites: updatedFavorites } : null);
    } catch (err) {
      alert("操作失败，请稍后重试");
    }
  };

  const addPriceAlert = async () => {
    if (!newAlert.coinId || !newAlert.targetPrice) {
      alert("请填写所有字段");
      return;
    }

    const coin = coins.find(c => c.id === newAlert.coinId);
    if (!coin) return;

    const token = localStorage.getItem("auth_token");
    const updatedAlerts = [
      ...(user?.priceAlerts || []),
      {
        coinId: newAlert.coinId,
        symbol: coin.symbol,
        targetPrice: parseFloat(newAlert.targetPrice),
        condition: newAlert.condition,
        enabled: true,
        createdAt: Date.now()
      }
    ];

    try {
      await axios.put("/api/user/price-alerts", { alerts: updatedAlerts }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => prev ? { ...prev, priceAlerts: updatedAlerts } : null);
      setShowAddAlert(false);
      setNewAlert({ coinId: "", targetPrice: "", condition: "above" });
    } catch (err) {
      alert("添加失败，请稍后重试");
    }
  };

  const toggleAlert = async (index: number) => {
    const token = localStorage.getItem("auth_token");
    const updatedAlerts = user?.priceAlerts.map((alert, i) =>
      i === index ? { ...alert, enabled: !alert.enabled } : alert
    ) || [];

    try {
      await axios.put("/api/user/price-alerts", { alerts: updatedAlerts }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => prev ? { ...prev, priceAlerts: updatedAlerts } : null);
    } catch (err) {
      alert("操作失败，请稍后重试");
    }
  };

  const removeAlert = async (index: number) => {
    const token = localStorage.getItem("auth_token");
    const updatedAlerts = user?.priceAlerts.filter((_, i) => i !== index) || [];

    try {
      await axios.put("/api/user/price-alerts", { alerts: updatedAlerts }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(prev => prev ? { ...prev, priceAlerts: updatedAlerts } : null);
    } catch (err) {
      alert("删除失败，请稍后重试");
    }
  };

  if (loading) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ color: "#94a3b8", fontSize: "18px" }}>加载中...</div>
      </div>
    );
  }

  // 计算投资组合总价值
  const portfolioValue = user?.portfolio.reduce((sum, item) => {
    const coin = coins.find(c => c.id === item.coinId);
    if (coin) {
      return sum + item.amount * coin.current_price;
    }
    return sum + item.amount * item.avgPrice;
  }, 0) || 0;

  const portfolioCost = user?.portfolio.reduce((sum, item) => sum + item.amount * item.avgPrice, 0) || 0;
  const portfolioProfit = portfolioValue - portfolioCost;
  const portfolioProfitPercent = portfolioCost > 0 ? (portfolioProfit / portfolioCost) * 100 : 0;

  return (
    <div className="app" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* 头部 */}
      <header style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 style={{
              color: "#f1f5f9",
              fontSize: "32px",
              fontWeight: "700",
              marginBottom: "8px",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              个人中心
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "16px", margin: 0 }}>
              欢迎，{user?.username || user?.email}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
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
              返回首页
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "12px",
                padding: "10px 20px",
                color: "#f87171",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* 投资组合概览 */}
      {activeTab === "portfolio" && (
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>总资产</div>
              <div style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: "700" }}>
                ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>总成本</div>
              <div style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "600" }}>
                ${portfolioCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>盈亏</div>
              <div style={{
                color: portfolioProfit >= 0 ? "#22c55e" : "#ef4444",
                fontSize: "24px",
                fontWeight: "600"
              }}>
                {portfolioProfit >= 0 ? "+" : ""}${portfolioProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>收益率</div>
              <div style={{
                color: portfolioProfitPercent >= 0 ? "#22c55e" : "#ef4444",
                fontSize: "24px",
                fontWeight: "600"
              }}>
                {portfolioProfitPercent >= 0 ? "+" : ""}{portfolioProfitPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 标签页 */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "24px",
        borderBottom: "1px solid rgba(148, 163, 184, 0.1)"
      }}>
        {[
          { id: "portfolio", label: "投资组合" },
          { id: "favorites", label: "收藏币种" },
          { id: "alerts", label: "价格提醒" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "12px 24px",
              background: activeTab === tab.id ? "rgba(59, 130, 246, 0.15)" : "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === tab.id ? "#60a5fa" : "#94a3b8",
              fontSize: "16px",
              fontWeight: activeTab === tab.id ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 投资组合内容 */}
      {activeTab === "portfolio" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", margin: 0 }}>
              我的投资组合
            </h2>
            <button
              onClick={() => setShowAddPortfolio(true)}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none",
                borderRadius: "12px",
                padding: "10px 20px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              + 添加资产
            </button>
          </div>

          {user?.portfolio.length === 0 ? (
            <div style={{
              background: "rgba(30, 41, 59, 0.8)",
              borderRadius: "16px",
              padding: "60px 20px",
              textAlign: "center",
              color: "#94a3b8"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
              <div style={{ fontSize: "18px", marginBottom: "8px", color: "#f1f5f9" }}>还没有投资组合</div>
              <div style={{ fontSize: "14px" }}>点击"添加资产"开始记录您的投资</div>
            </div>
          ) : (
            <div style={{
              background: "rgba(30, 41, 59, 0.8)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid rgba(148, 163, 184, 0.1)"
            }}>
              {user?.portfolio.map((item, index) => {
                const coin = coins.find(c => c.id === item.coinId);
                const currentPrice = coin?.current_price || item.avgPrice;
                const value = item.amount * currentPrice;
                const profit = value - (item.amount * item.avgPrice);
                const profitPercent = ((currentPrice - item.avgPrice) / item.avgPrice) * 100;

                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "20px",
                      background: "rgba(15, 23, 42, 0.8)",
                      borderRadius: "12px",
                      marginBottom: "12px",
                      border: "1px solid rgba(148, 163, 184, 0.1)"
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px"
                        }}>
                          {coin?.symbol.toUpperCase().charAt(0) || "?"}
                        </div>
                        <div>
                          <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600" }}>
                            {coin?.name || item.symbol.toUpperCase()}
                          </div>
                          <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                            {item.amount.toFixed(4)} {item.symbol.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: "20px" }}>
                      <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>
                        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{
                        color: profit >= 0 ? "#22c55e" : "#ef4444",
                        fontSize: "14px"
                      }}>
                        {profit >= 0 ? "+" : ""}${profit.toFixed(2)} ({profitPercent >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%)
                      </div>
                    </div>
                    <button
                      onClick={() => removePortfolioItem(index)}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        color: "#f87171",
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      删除
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 收藏币种内容 */}
      {activeTab === "favorites" && (
        <div>
          <h2 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
            我的收藏
          </h2>
          {user?.favorites.length === 0 ? (
            <div style={{
              background: "rgba(30, 41, 59, 0.8)",
              borderRadius: "16px",
              padding: "60px 20px",
              textAlign: "center",
              color: "#94a3b8"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>⭐</div>
              <div style={{ fontSize: "18px", marginBottom: "8px", color: "#f1f5f9" }}>还没有收藏的币种</div>
              <div style={{ fontSize: "14px" }}>在首页点击币种卡片上的收藏按钮即可收藏</div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px"
            }}>
              {coins.filter(c => user?.favorites.includes(c.id)).map(coin => (
                <div
                  key={coin.id}
                  onClick={() => navigate(`/coins/${coin.id}`)}
                  style={{
                    background: "rgba(30, 41, 59, 0.8)",
                    borderRadius: "16px",
                    padding: "20px",
                    border: "1px solid rgba(148, 163, 184, 0.1)",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 130, 246, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.1)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "4px" }}>
                        {coin.name}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "14px" }}>{coin.symbol.toUpperCase()}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(coin.id);
                      }}
                      style={{
                        background: "rgba(251, 191, 36, 0.1)",
                        border: "1px solid rgba(251, 191, 36, 0.3)",
                        borderRadius: "8px",
                        padding: "6px",
                        color: "#fbbf24",
                        fontSize: "18px",
                        cursor: "pointer"
                      }}
                    >
                      ⭐
                    </button>
                  </div>
                  <div style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
                    ${coin.current_price.toLocaleString()}
                  </div>
                  <div style={{
                    color: coin.price_change_percentage_24h >= 0 ? "#22c55e" : "#ef4444",
                    fontSize: "14px"
                  }}>
                    {coin.price_change_percentage_24h >= 0 ? "+" : ""}{coin.price_change_percentage_24h.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 价格提醒内容 */}
      {activeTab === "alerts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", margin: 0 }}>
              价格提醒
            </h2>
            <button
              onClick={() => setShowAddAlert(true)}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none",
                borderRadius: "12px",
                padding: "10px 20px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              + 添加提醒
            </button>
          </div>

          {user?.priceAlerts.length === 0 ? (
            <div style={{
              background: "rgba(30, 41, 59, 0.8)",
              borderRadius: "16px",
              padding: "60px 20px",
              textAlign: "center",
              color: "#94a3b8"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔔</div>
              <div style={{ fontSize: "18px", marginBottom: "8px", color: "#f1f5f9" }}>还没有价格提醒</div>
              <div style={{ fontSize: "14px" }}>点击"添加提醒"设置价格提醒</div>
            </div>
          ) : (
            <div style={{
              background: "rgba(30, 41, 59, 0.8)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid rgba(148, 163, 184, 0.1)"
            }}>
              {user?.priceAlerts.map((alert, index) => {
                const coin = coins.find(c => c.id === alert.coinId);
                const currentPrice = coin?.current_price || 0;
                const isTriggered = alert.condition === "above"
                  ? currentPrice >= alert.targetPrice
                  : currentPrice <= alert.targetPrice;

                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "20px",
                      background: "rgba(15, 23, 42, 0.8)",
                      borderRadius: "12px",
                      marginBottom: "12px",
                      border: "1px solid rgba(148, 163, 184, 0.1)"
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px"
                        }}>
                          {alert.symbol.toUpperCase().charAt(0)}
                        </div>
                        <div>
                          <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600" }}>
                            {coin?.name || alert.symbol.toUpperCase()}
                          </div>
                          <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                            当价格 {alert.condition === "above" ? "高于" : "低于"} ${alert.targetPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
                        当前价格: ${currentPrice.toLocaleString()}
                        {isTriggered && alert.enabled && (
                          <span style={{ color: "#22c55e", marginLeft: "8px" }}>✓ 已触发</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => toggleAlert(index)}
                        style={{
                          background: alert.enabled ? "rgba(34, 197, 94, 0.1)" : "rgba(148, 163, 184, 0.1)",
                          border: `1px solid ${alert.enabled ? "rgba(34, 197, 94, 0.3)" : "rgba(148, 163, 184, 0.3)"}`,
                          borderRadius: "8px",
                          padding: "8px 12px",
                          color: alert.enabled ? "#22c55e" : "#94a3b8",
                          fontSize: "14px",
                          cursor: "pointer"
                        }}
                      >
                        {alert.enabled ? "启用" : "禁用"}
                      </button>
                      <button
                        onClick={() => removeAlert(index)}
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          color: "#f87171",
                          fontSize: "14px",
                          cursor: "pointer"
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 添加投资组合模态框 */}
      {showAddPortfolio && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}
        onClick={() => setShowAddPortfolio(false)}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              border: "1px solid rgba(148, 163, 184, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
              添加资产
            </h3>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#e2e8f0", fontSize: "14px", marginBottom: "8px" }}>
                选择币种
              </label>
              <select
                value={newPortfolioItem.coinId}
                onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, coinId: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  fontSize: "14px"
                }}
              >
                <option value="">请选择币种</option>
                {coins.map(coin => (
                  <option key={coin.id} value={coin.id}>{coin.name} ({coin.symbol.toUpperCase()})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#e2e8f0", fontSize: "14px", marginBottom: "8px" }}>
                数量
              </label>
              <input
                type="number"
                value={newPortfolioItem.amount}
                onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.0000"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  fontSize: "14px"
                }}
              />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", color: "#e2e8f0", fontSize: "14px", marginBottom: "8px" }}>
                平均成本价 (USD)
              </label>
              <input
                type="number"
                value={newPortfolioItem.avgPrice}
                onChange={(e) => setNewPortfolioItem(prev => ({ ...prev, avgPrice: e.target.value }))}
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  fontSize: "14px"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowAddPortfolio(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  borderRadius: "8px",
                  color: "#94a3b8",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                取消
              </button>
              <button
                onClick={addPortfolioItem}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加价格提醒模态框 */}
      {showAddAlert && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}
        onClick={() => setShowAddAlert(false)}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              border: "1px solid rgba(148, 163, 184, 0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
              添加价格提醒
            </h3>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#e2e8f0", fontSize: "14px", marginBottom: "8px" }}>
                选择币种
              </label>
              <select
                value={newAlert.coinId}
                onChange={(e) => setNewAlert(prev => ({ ...prev, coinId: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  fontSize: "14px"
                }}
              >
                <option value="">请选择币种</option>
                {coins.map(coin => (
                  <option key={coin.id} value={coin.id}>{coin.name} ({coin.symbol.toUpperCase()})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#e2e8f0", fontSize: "14px", marginBottom: "8px" }}>
                提醒条件
              </label>
              <select
                value={newAlert.condition}
                onChange={(e) => setNewAlert(prev => ({ ...prev, condition: e.target.value as "above" | "below" }))}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  fontSize: "14px"
                }}
              >
                <option value="above">价格高于</option>
                <option value="below">价格低于</option>
              </select>
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", color: "#e2e8f0", fontSize: "14px", marginBottom: "8px" }}>
                目标价格 (USD)
              </label>
              <input
                type="number"
                value={newAlert.targetPrice}
                onChange={(e) => setNewAlert(prev => ({ ...prev, targetPrice: e.target.value }))}
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "8px",
                  color: "#f1f5f9",
                  fontSize: "14px"
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowAddAlert(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  borderRadius: "8px",
                  color: "#94a3b8",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                取消
              </button>
              <button
                onClick={addPriceAlert}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
