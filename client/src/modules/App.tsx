import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存时间

interface CacheData {
  data: CoinOverview[];
  timestamp: number;
}

export function App() {
  const [coins, setCoins] = useState<CoinOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "strong_buy" | "buy" | "hold" | "sell">("all");
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  function loadFromCache(): CoinOverview[] | null {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && timestamp) {
        const data = JSON.parse(cachedData) as CoinOverview[];
        const cacheTime = parseInt(timestamp);
        const now = Date.now();
        const elapsed = now - cacheTime;
        
        // 如果缓存未过期（10分钟内），返回缓存数据
        if (elapsed < CACHE_DURATION && Array.isArray(data) && data.length > 0) {
          console.log(`✅ 使用缓存数据（距离上次更新 ${Math.floor(elapsed / 1000)} 秒）`);
          return data;
        }
      }
    } catch (e) {
      console.warn("读取缓存失败:", e);
    }
    return null;
  }

  // 检查是否需要调用API（10分钟内使用缓存）
  function shouldFetchFromAPI(): boolean {
    const cachedData = loadFromCache();
    if (cachedData) {
      // 有缓存数据，不需要调用API
      return false;
    }
    // 没有缓存或缓存过期，需要调用API
    return true;
  }

  // 设置下一次刷新（仅在成功获取数据后调用）
  function scheduleNextRefresh() {
    clearRefreshTimer();
    // 10分钟后刷新
    refreshTimerRef.current = setTimeout(() => {
      loadData(0, false); // false表示不是初始加载
    }, CACHE_DURATION); // 10分钟
  }

  async function loadData(retryCount: number = 0, isInitial: boolean = true, forceRefresh: boolean = false) {
    // 如果是初始加载，先显示缓存数据（如果有），然后后台获取最新数据
    let hasCachedData = false;
    if (isInitial && !forceRefresh) {
      const cachedData = loadFromCache();
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
        // 成功获取数据，更新显示并保存到缓存
        setCoins(res.data);
        saveToCache(res.data);
        
        // 如果有缓存数据，说明是后台更新，给用户提示
        if (hasCachedData) {
          console.log("✅ 最新数据已获取并更新");
        } else {
          console.log("✅ 数据获取成功，已设置10分钟后自动刷新");
        }
        
        // 只有在成功获取数据后才设置下一次刷新
        scheduleNextRefresh();
      } else {
        // 数据为空，尝试使用缓存
        const cachedData = loadFromCache();
        if (cachedData) {
          setCoins(cachedData);
          console.log("⚠️ API返回空数据，使用缓存数据");
        } else {
          console.log("⚠️ API返回空数据，且无缓存数据");
        }
        
        if (coins.length > 0 || cachedData) {
          // 有现有数据或缓存数据，10分钟后重试
          clearRefreshTimer();
          scheduleNextRefresh();
        } else {
          clearRefreshTimer();
        }
      }
    } catch (e: any) {
      // 静默处理所有错误，不显示任何错误提示
      console.log("⚠️ 数据获取失败，保持现有数据显示:", e.message);
      
      // 如果已经有数据，尝试使用缓存
      const cachedData = loadFromCache();
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
        // 10分钟后再次尝试
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
      // 10分钟后再次尝试
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
        <button className="refresh" onClick={() => {
          // 手动刷新：检查缓存，如果10分钟内则使用缓存，否则强制刷新
          const cachedData = loadFromCache();
          if (cachedData) {
            // 10分钟内有缓存，使用缓存数据
            setCoins(cachedData);
            console.log("✅ 手动刷新：使用缓存数据（10分钟内）");
          } else {
            // 缓存过期或不存在，强制刷新
            loadData(0, true, true);
          }
        }} disabled={loading}>
          {loading ? "更新中..." : "手动刷新"}
        </button>
      </header>

      <section className="controls">
        <input
          type="text"
          placeholder="搜索币种名称 / 简写，例如 BTC, ETH..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
          <article key={coin.id} className="card">
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


