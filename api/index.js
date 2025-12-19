// Vercel serverless function for API routes
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Import compiled server code
let getMarketOverview, getCoinDetail, setForceRefresh;

// Lazy load server code
async function loadServerCode() {
  if (!getMarketOverview) {
    const marketService = require("../server/dist/services/marketService");
    getMarketOverview = marketService.getMarketOverview;
    getCoinDetail = marketService.getCoinDetail;
    setForceRefresh = marketService.setForceRefresh;
  }
}

app.get("/api/overview", async (req, res) => {
  try {
    await loadServerCode();
    
    // 设置响应超时
    res.setTimeout(20000);
    
    // 检查是否有强制刷新参数
    const isForceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
    
    if (isForceRefresh && setForceRefresh) {
      setForceRefresh(true);
      console.log("🔄 收到强制刷新请求，清除缓存，重新获取最新数据");
    }
    
    const startTime = Date.now();
    const data = await getMarketOverview();
    const duration = Date.now() - startTime;
    
    if (!data || data.length === 0) {
      console.log("⚠️ 数据为空，这不应该发生");
      return res.json([]);
    }
    
    console.log(`✅ 成功获取 ${data.length} 条数据，耗时 ${duration}ms`);
    res.json(data);
  } catch (err) {
    console.error("API Error:", err);
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

app.get("/api/diagnose", async (_req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // 测试各个API
  const apis = [
    { name: "CoinGecko", url: "https://api.coingecko.com/api/v3/ping" },
    { name: "CoinCap", url: "https://api.coincap.io/v2/assets?limit=1" },
    { name: "Binance", url: "https://api.binance.com/api/v3/ping" }
  ];
  
  for (const api of apis) {
    try {
      const start = Date.now();
      await axios.get(api.url, { timeout: 5000 });
      const duration = Date.now() - start;
      results.tests.push({
        name: api.name,
        status: "success",
        duration: `${duration}ms`,
        message: "连接正常"
      });
    } catch (error) {
      results.tests.push({
        name: api.name,
        status: "failed",
        error: error.message,
        code: error.code,
        details: error.response ? `HTTP ${error.response.status}` : "网络错误"
      });
    }
  }
  
  res.json(results);
});

app.get("/api/coins/:id", async (req, res) => {
  try {
    await loadServerCode();
    const data = await getCoinDetail(req.params.id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch coin detail" });
  }
});

module.exports = app;

