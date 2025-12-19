import express from "express";
import cors from "cors";
import axios from "axios";
import { getMarketOverview, getCoinDetail } from "./services/marketService";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

app.get("/api/overview", async (req, res) => {
  try {
    // 设置响应超时
    res.setTimeout(20000); // 20秒超时，给足够时间尝试多个API
    
    // 检查是否有强制刷新参数
    const isForceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
    
    if (isForceRefresh) {
      const { setForceRefresh } = await import("./services/marketService");
      setForceRefresh(true);
      console.log("🔄 收到强制刷新请求，清除缓存，重新获取最新数据");
    }
    
    const startTime = Date.now();
    // getMarketOverview 保证始终返回数据（即使所有API失败，也会返回模拟数据）
    const data = await getMarketOverview();
    const duration = Date.now() - startTime;
    
    // 确保始终返回数据（getMarketOverview已经保证会返回数据）
    if (!data || data.length === 0) {
      console.log("⚠️ 数据为空，这不应该发生（getMarketOverview应该返回模拟数据）");
      // 如果确实为空，返回空数组（前端会保持现有数据）
      return res.json([]);
    }
    
    console.log(`✅ 成功获取 ${data.length} 条数据，耗时 ${duration}ms`);
    // 始终返回200状态码和数据，不返回错误
    res.json(data);
  } catch (err: any) {
    // 即使出错，getMarketOverview内部也会返回模拟数据，所以这里理论上不应该执行
    // 但为了安全，还是处理一下
    console.error("API Error (这不应该发生，getMarketOverview应该返回模拟数据):", err);
    // 返回空数组，前端会保持现有数据
    res.json([]);
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "API服务正常运行"
  });
});

// 诊断端点：测试各个API的连接性
app.get("/api/diagnose", async (_req, res) => {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // 测试1: CoinGecko
  try {
    const start = Date.now();
    const response = await axios.get("https://api.coingecko.com/api/v3/ping", { timeout: 5000 });
    const duration = Date.now() - start;
    results.tests.push({
      name: "CoinGecko",
      status: "success",
      duration: `${duration}ms`,
      message: "连接正常"
    });
  } catch (error: any) {
    results.tests.push({
      name: "CoinGecko",
      status: "failed",
      error: error.message,
      code: error.code,
      details: error.response ? `HTTP ${error.response.status}` : "网络错误"
    });
  }
  
  // 测试2: CoinCap
  try {
    const start = Date.now();
    const response = await axios.get("https://api.coincap.io/v2/assets?limit=1", { timeout: 5000 });
    const duration = Date.now() - start;
    results.tests.push({
      name: "CoinCap",
      status: "success",
      duration: `${duration}ms`,
      message: "连接正常"
    });
  } catch (error: any) {
    results.tests.push({
      name: "CoinCap",
      status: "failed",
      error: error.message,
      code: error.code,
      details: error.response ? `HTTP ${error.response.status}` : "网络错误"
    });
  }
  
  // 测试3: Binance
  try {
    const start = Date.now();
    const response = await axios.get("https://api.binance.com/api/v3/ping", { timeout: 5000 });
    const duration = Date.now() - start;
    results.tests.push({
      name: "Binance",
      status: "success",
      duration: `${duration}ms`,
      message: "连接正常"
    });
  } catch (error: any) {
    results.tests.push({
      name: "Binance",
      status: "failed",
      error: error.message,
      code: error.code,
      details: error.response ? `HTTP ${error.response.status}` : "网络错误"
    });
  }
  
  res.json(results);
});

app.get("/api/coins/:id", async (req, res) => {
  try {
    const data = await getCoinDetail(req.params.id);
    // 即使数据不完整，也返回数据（前端会处理）
    res.json(data);
  } catch (err: any) {
    console.error("API Error:", err);
    // 即使出错，也尝试返回一个基本的数据结构
    res.json({
      id: req.params.id,
      symbol: req.params.id.toUpperCase(),
      name: req.params.id,
      description: "无法获取币种详细信息，请稍后重试。",
      market_data: {
        current_price: { usd: 0 },
        market_cap: { usd: 0 },
        total_volume: { usd: 0 },
        price_change_percentage_24h: 0,
        high_24h: { usd: 0 },
        low_24h: { usd: 0 },
        circulating_supply: 0,
        total_supply: 0
      },
      community_data: {},
      developer_data: {},
      prices: [],
      volumes: []
    });
  }
});

app.listen(PORT, () => {
  console.log(`Crypto intel server running on http://localhost:${PORT}`);
});


