import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useNotificationService } from "./NotificationService";
import { NotificationBell } from "./NotificationBell";

interface CoinOverview {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d: { price: number[] };
  score: number;
  recommendation: "strong_buy" | "buy" | "hold" | "sell";
  insight: string; // 智能解读
}

const recommendationLabel: Record<CoinOverview["recommendation"], string> = {
  strong_buy: "强烈买入",
  buy: "买入",
  hold: "观望",
  sell: "减持/卖出"
};

const recommendationColor: Record<CoinOverview["recommendation"], string> = {
  strong_buy: "#16a34a",
  buy: "#22c55e",
  hold: "#f59e0b",
  sell: "#ef4444"
};

// 缓存键名
const CACHE_KEY = 'crypto_data_cache';
const CACHE_TIMESTAMP_KEY = 'crypto_data_timestamp';
const CACHE_DURATION = 2 * 60 * 1000; // 2分钟缓存时间

interface CacheData {
  data: CoinOverview[];
  timestamp: number;
}

export function App() {
  const navigate = useNavigate();
  const [coins, setCoins] = useState<CoinOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "strong_buy" | "buy" | "hold" | "sell">("all");
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 通知服务
  const { checkPriceAlerts, checkRecommendationChanges, sendEventNotification } = useNotificationService();

  // 清除刷新定时器
  function clearRefreshTimer() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  // 保存数据到缓存
  function saveToCache(data: CoinOverview[]) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.warn("保存缓存失败:", e);
    }
  }

  // 从缓存加载数据
  function loadFromCache(allowExpired: boolean = false): CoinOverview[] | null {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && timestamp) {
        const data = JSON.parse(cachedData) as CoinOverview[];
        const cacheTime = parseInt(timestamp);
        const now = Date.now();
        const elapsed = now - cacheTime;
        
        // 如果缓存未过期（2分钟内），返回缓存数据
        if (elapsed < CACHE_DURATION && Array.isArray(data) && data.length > 0) {
          console.log(`✅ 使用缓存数据（距离上次更新 ${Math.floor(elapsed / 1000)} 秒）`);
          return data;
        }
        
        // 如果允许使用过期缓存（返回时使用），即使过期也返回缓存数据
        if (allowExpired && Array.isArray(data) && data.length > 0) {
          console.log(`✅ 使用过期缓存数据（距离上次更新 ${Math.floor(elapsed / 1000)} 秒），后台更新中...`);
          return data;
        }
      }
    } catch (e) {
      console.warn("读取缓存失败:", e);
    }
    return null;
  }

  // 检查是否需要调用API（2分钟内使用缓存）
  function shouldFetchFromAPI(): boolean {
    const cachedData = loadFromCache();
    if (cachedData) {
      // 有缓存数据，不需要调用API
      return false;
    }
    // 没有缓存或缓存过期，需要调用API
    return true;
  }

  // 检查API返回的数据是否是模拟数据
  // 模拟数据的特点：价格接近固定基础价格，变化幅度很小
  function isMockData(data: CoinOverview[]): boolean {
    if (!data || data.length === 0) return false;
    
    // 模拟数据的基础价格映射
    const mockBasePrices: Record<string, number> = {
      'bitcoin': 45000,
      'ethereum': 2800,
      'binancecoin': 320,
      'solana': 95,
      'cardano': 0.55,
      'ripple': 0.62,
      'polkadot': 7.2,
      'dogecoin': 0.08,
      'avalanche': 38,
      'chainlink': 14.5,
    };
    
    // 检查前几个币种的价格是否接近模拟数据的基础价格
    let matchCount = 0;
    const checkCount = Math.min(5, data.length);
    
    for (let i = 0; i < checkCount; i++) {
      const coin = data[i];
      const basePrice = mockBasePrices[coin.id];
      if (basePrice) {
        // 如果价格接近基础价格（差异在5%以内），可能是模拟数据
        const priceDiff = Math.abs(coin.current_price - basePrice) / basePrice;
        if (priceDiff < 0.05) {
          matchCount++;
        }
      }
    }
    
    // 如果大部分币种的价格都接近基础价格，很可能是模拟数据
    return matchCount >= checkCount * 0.6;
  }

  // 比较新数据和缓存数据的质量，决定是否使用新数据
  function shouldUseNewData(newData: CoinOverview[], cachedData: CoinOverview[] | null): boolean {
    // 如果没有缓存数据，直接使用新数据
    if (!cachedData || cachedData.length === 0) {
      return true;
    }
    
    // 如果新数据是模拟数据，不使用新数据
    if (isMockData(newData)) {
      console.log("⚠️ 检测到API返回的数据可能是模拟数据，保留缓存数据");
      return false;
    }
    
    // 检查新数据与缓存数据的差异是否合理
    // 如果价格变化超过50%，可能是异常数据，不使用新数据
    if (cachedData.length > 0 && newData.length > 0) {
      const firstCached = cachedData[0];
      const firstNew = newData.find(c => c.id === firstCached.id);
      if (firstNew) {
        const priceDiff = Math.abs(firstNew.current_price - firstCached.current_price) / firstCached.current_price;
        if (priceDiff > 0.5) {
          console.log("⚠️ 新数据与缓存数据差异过大，可能是异常数据，保留缓存数据");
          return false;
        }
      }
    }
    
    return true;
  }

  // 设置下一次刷新（仅在成功获取数据后调用）
  function scheduleNextRefresh() {
    clearRefreshTimer();
    // 2分钟后刷新
    refreshTimerRef.current = setTimeout(() => {
      loadData(0, false); // false表示不是初始加载
    }, CACHE_DURATION); // 2分钟
  }

  async function loadData(retryCount: number = 0, isInitial: boolean = true, forceRefresh: boolean = false) {
    // 如果是初始加载，先显示缓存数据（如果有），然后后台获取最新数据
    // 返回时也优先显示缓存数据，避免显示虚拟数据
    let hasCachedData = false;
    if (isInitial && !forceRefresh) {
      // 先尝试使用未过期的缓存
      let cachedData = loadFromCache(false);
      // 如果没有未过期的缓存，也使用过期缓存（避免显示虚拟数据）
      if (!cachedData) {
        cachedData = loadFromCache(true);
      }
      if (cachedData) {
        // 立即显示缓存数据，提升用户体验
        setCoins(cachedData);
        hasCachedData = true;
        console.log("✅ 先显示缓存数据，后台获取最新数据...");
        // 继续执行，后台获取最新数据
      }
    }

    try {
      // 只在手动刷新时显示加载状态，自动刷新时静默进行
      // 如果有缓存数据，不显示加载状态（因为已经有数据显示）
      if (isInitial && !hasCachedData) {
        setLoading(true);
      }
      
      // 如果是手动刷新且强制刷新，添加force参数强制获取最新数据
      // 否则不添加force参数（自动刷新时使用后端缓存）
      const url = (isInitial && forceRefresh) ? "/api/overview?force=true" : "/api/overview";
      
      const res = await axios.get<CoinOverview[]>(url, {
        timeout: 20000, // 20秒超时
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (Array.isArray(res.data) && res.data.length > 0) {
        // 检查是否应该使用新数据（避免使用模拟数据）
        let cachedDataForComparison = loadFromCache(false);
        if (!cachedDataForComparison) {
          cachedDataForComparison = loadFromCache(true);
        }
        
        if (shouldUseNewData(res.data, cachedDataForComparison)) {
          // 新数据质量良好，更新显示并保存到缓存
          setCoins(res.data);
          saveToCache(res.data);
          
          // 检查价格预警和投资建议变化
          checkPriceAlerts(res.data);
          checkRecommendationChanges(res.data);
          
          // 如果有缓存数据，说明是后台更新，给用户提示
          if (hasCachedData) {
            console.log("✅ 最新数据已获取并更新");
          } else {
            console.log("✅ 数据获取成功，已设置2分钟后自动刷新");
          }
          
          // 只有在成功获取数据后才设置下一次刷新
          scheduleNextRefresh();
        } else {
          // 新数据质量不佳（可能是模拟数据），保留缓存数据
          if (cachedDataForComparison) {
            setCoins(cachedDataForComparison);
            console.log("⚠️ API返回的数据质量不佳，保留缓存数据");
          } else {
            // 如果没有缓存数据，即使质量不佳也使用新数据（总比没有好）
            setCoins(res.data);
            saveToCache(res.data);
            console.log("⚠️ API返回的数据质量不佳，但无缓存数据，使用新数据");
          }
          scheduleNextRefresh();
        }
      } else {
        // 数据为空，尝试使用缓存（包括过期缓存）
        let cachedData = loadFromCache(false);
        if (!cachedData) {
          cachedData = loadFromCache(true); // 尝试使用过期缓存
        }
        if (cachedData) {
          setCoins(cachedData);
          console.log("⚠️ API返回空数据，使用缓存数据");
        } else {
          console.log("⚠️ API返回空数据，且无缓存数据");
        }
        
        if (coins.length > 0 || cachedData) {
          // 有现有数据或缓存数据，2分钟后重试
          clearRefreshTimer();
          scheduleNextRefresh();
        } else {
          clearRefreshTimer();
        }
      }
    } catch (e: any) {
      // 静默处理所有错误，不显示任何错误提示
      console.log("⚠️ 数据获取失败，保持现有数据显示:", e.message);
      
      // 如果已经有数据，尝试使用缓存（包括过期缓存）
      let cachedData = loadFromCache(false);
      if (!cachedData) {
        cachedData = loadFromCache(true); // 尝试使用过期缓存
      }
      if (cachedData) {
        setCoins(cachedData);
        console.log("⚠️ API请求失败，使用缓存数据");
        clearRefreshTimer();
        scheduleNextRefresh();
        return;
      }
      
      // 如果已经有数据，静默失败，保持现有数据
      if (coins.length > 0) {
        // 已有数据，静默失败，不显示任何错误
        clearRefreshTimer();
        // 2分钟后再次尝试
        scheduleNextRefresh();
        return;
      }
      
      // 如果没有数据且是初始加载，尝试重试（最多2次）
      if (isInitial && retryCount < 2) {
        console.log(`初始加载失败，${3 * (retryCount + 1)}秒后重试 (${retryCount + 1}/2)...`);
        setTimeout(() => {
          loadData(retryCount + 1, isInitial);
        }, 3000 * (retryCount + 1));
        return;
      }
      
      // 如果所有重试都失败，使用模拟数据（确保页面有内容显示）
      if (coins.length === 0) {
        console.log("所有API都失败，使用模拟数据确保页面可用");
        // 这里可以设置一些默认数据，但最好让后端返回模拟数据
        // 前端不显示错误，等待后端返回数据
      }
      
      // 失败时不设置自动刷新，避免频繁失败
      clearRefreshTimer();
      // 2分钟后再次尝试
      scheduleNextRefresh();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 初始加载：总是调用API获取最新数据
    // loadData函数内部会先显示缓存数据（如果有），然后后台获取最新数据
    loadData(0, true, false);
    
    // 组件卸载时清除定时器
    return () => {
      clearRefreshTimer();
    };
  }, []);

  const filtered = coins.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || c.recommendation === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>数字货币智能分析平台</h1>
          <p className="subtitle">实时行情 · 风险评级 · 智能投资建议</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/blockchain")}
            style={{
              background: "rgba(30, 41, 59, 0.6)",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              borderRadius: "12px",
              padding: "10px 20px",
              color: "#94a3b8",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
              e.currentTarget.style.color = "#60a5fa";
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.15)";
            }}
          >
            <span>🔗</span>
            <span>区块链数据</span>
          </button>
          <button
            onClick={() => navigate("/trading")}
            style={{
              background: "rgba(30, 41, 59, 0.6)",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              borderRadius: "12px",
              padding: "10px 20px",
              color: "#94a3b8",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(34, 197, 94, 0.15)";
              e.currentTarget.style.color = "#22c55e";
              e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.15)";
            }}
          >
            <span>📈</span>
            <span>交易中心</span>
          </button>
          <NotificationBell />
          {localStorage.getItem("auth_token") ? (
            <button
              onClick={() => navigate("/profile")}
              style={{
                background: "rgba(30, 41, 59, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                borderRadius: "12px",
                padding: "10px 20px",
                color: "#94a3b8",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
                e.currentTarget.style.color = "#a78bfa";
                e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.15)";
              }}
            >
              <span>👤</span>
              <span>个人中心</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none",
                borderRadius: "12px",
                padding: "10px 20px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
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
              <span>🔐</span>
              <span>登录</span>
            </button>
          )}
          <button className="refresh" onClick={() => {
            // 手动刷新：总是调用API获取最新数据
            console.log("🔄 手动刷新：调用API获取最新数据");
            loadData(0, true, true);
          }} disabled={loading}>
            {loading ? "更新中..." : "手动刷新"}
          </button>
        </div>
      </header>

      <section className="controls">
        <div style={{ display: "flex", gap: "12px", width: "100%", position: "relative" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              placeholder="搜索币种名称 / 简写，例如 BTC, ETH... 或输入交易哈希/地址"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                // 检测是否是区块链地址或hash
                const input = e.target.value.trim();
                if (input.startsWith("0x") && (input.length === 42 || input.length === 66)) {
                  // 是地址或交易hash，显示提示
                }
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  const input = search.trim();
                  // 检测是否是区块链地址或hash
                  if (input.startsWith("0x") && (input.length === 42 || input.length === 66)) {
                    // 跳转到区块链浏览器
                    navigate(`/explorer?q=${encodeURIComponent(input)}`);
                  } else if (/^\d+$/.test(input)) {
                    // 是区块号
                    navigate(`/explorer?q=${encodeURIComponent(input)}`);
                  }
                  // 否则继续币种搜索
                }
              }}
              style={{ width: "100%" }}
            />
            {search.trim() && (search.trim().startsWith("0x") || /^\d+$/.test(search.trim())) && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "4px",
                padding: "8px 12px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "8px",
                color: "#60a5fa",
                fontSize: "12px",
                zIndex: 10,
                cursor: "pointer"
              }}
              onClick={() => navigate(`/explorer?q=${encodeURIComponent(search.trim())}`)}
              >
                按 Enter 搜索区块链信息 →
              </div>
            )}
          </div>
          <button
            onClick={() => navigate("/explorer")}
            style={{
              padding: "12px 20px",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "10px",
              color: "#60a5fa",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
            }}
            title="搜索交易哈希、地址或区块号"
          >
            <span>🔍</span>
            <span>区块链搜索</span>
          </button>
        </div>
        <div className="filters">
          {["all", "strong_buy", "buy", "hold", "sell"].map((key) => (
            <button
              key={key}
              className={filter === key ? "active" : ""}
              onClick={() => setFilter(key as any)}
            >
              {key === "all"
                ? "全部"
                : recommendationLabel[key as CoinOverview["recommendation"]]}
            </button>
          ))}
        </div>
      </section>

      {coins.length > 0 && (
        <div style={{ 
          padding: "8px 16px", 
          marginBottom: "16px", 
          borderRadius: "8px", 
          background: "rgba(34, 197, 94, 0.15)", 
          border: "1px solid rgba(34, 197, 94, 0.3)",
          color: "#86efac",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>✅</span>
          <span>实时数据已加载，共 {coins.length} 个币种</span>
        </div>
      )}

      {loading && coins.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          正在加载实时数据...
        </div>
      )}

      {!loading && filtered.length === 0 && coins.length > 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          没有找到匹配的币种，请尝试其他搜索条件
        </div>
      )}

      <section className="grid">
        {filtered.map((coin) => (
          <article
            key={coin.id}
            className="card"
            onClick={() => navigate(`/coin/${coin.id}`)}
            style={{ cursor: "pointer", transition: "transform 0.2s" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <header className="card-header">
              <div>
                <h2>
                  {coin.name} <span className="symbol">{coin.symbol.toUpperCase()}</span>
                </h2>
                <p className="price">
                  ${coin.current_price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="tag-wrapper">
                <span
                  className="tag"
                  style={{ backgroundColor: recommendationColor[coin.recommendation] }}
                >
                  {recommendationLabel[coin.recommendation]}
                </span>
                <span className="score">综合评分：{(coin.score * 100).toFixed(0)} / 100</span>
              </div>
            </header>

            <div className="card-body">
              <div className="metrics">
                <div>
                  <span>24h 涨跌幅</span>
                  <strong
                    className={
                      coin.price_change_percentage_24h >= 0 ? "up-text" : "down-text"
                    }
                  >
                    {coin.price_change_percentage_24h.toFixed(2)}%
                  </strong>
                </div>
                <div>
                  <span>市值 (USD)</span>
                  <strong>{(coin.market_cap / 1e9).toFixed(2)} B</strong>
                </div>
                <div>
                  <span>24h 成交额 (USD)</span>
                  <strong>{(coin.total_volume / 1e9).toFixed(2)} B</strong>
                </div>
              </div>

              <div className="chart-wrapper">
                {coin.sparkline_in_7d?.price && coin.sparkline_in_7d.price.length > 0 ? (
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart
                      data={coin.sparkline_in_7d.price.map((p, idx) => ({ idx, price: p }))}
                    >
                      <XAxis dataKey="idx" hide />
                      <YAxis domain={["dataMin", "dataMax"]} hide />
                      <Tooltip
                        formatter={(value: any) =>
                          `$${Number(value).toLocaleString(undefined, {
                            maximumFractionDigits: 4
                          })}`
                        }
                        labelFormatter={() => "过去 7 天价格"}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#38bdf8"
                        strokeWidth={1.8}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                    暂无走势数据
                  </div>
                )}
              </div>

              <div className="insight">
                <h3>智能解读</h3>
                <p>{coin.insight || "正在分析市场数据..."}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}


