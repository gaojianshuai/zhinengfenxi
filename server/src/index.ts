import express from "express";
import cors from "cors";
import axios from "axios";
import { getMarketOverview, getCoinDetail } from "./services/marketService";
import {
  registerUser,
  loginUser,
  getUserById,
  updatePortfolio,
  updateFavorites,
  updatePriceAlerts,
  verifyToken
} from "./services/userService";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // 支持JSON请求体

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

// 区块链浏览器API端点
// 查询交易信息
app.get("/api/blockchain/tx/:hash", async (req, res) => {
  try {
    const hash = req.params.hash;
    if (!hash || !hash.startsWith("0x") || hash.length !== 66) {
      return res.status(400).json({ error: "无效的交易哈希格式" });
    }

    // 使用Etherscan API查询交易
    const etherscanUrl = "https://api.etherscan.io/api";
    const response = await axios.get(etherscanUrl, {
      params: {
        module: "proxy",
        action: "eth_getTransactionByHash",
        txhash: hash,
        apikey: "YourApiKeyToken" // 免费API，可以不加key，但有限制
      },
      timeout: 10000
    });

    if (response.data.error) {
      throw new Error(response.data.error.message || "查询失败");
    }

    const tx = response.data.result;
    if (!tx || tx === null) {
      return res.status(404).json({ error: "交易未找到" });
    }

    // 获取交易回执以获取gasUsed和状态
    const receiptResponse = await axios.get(etherscanUrl, {
      params: {
        module: "proxy",
        action: "eth_getTransactionReceipt",
        txhash: hash,
        apikey: "YourApiKeyToken"
      },
      timeout: 10000
    });

    const receipt = receiptResponse.data.result;
    const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : 0;
    const status = receipt && receipt.status ? (parseInt(receipt.status, 16) === 1 ? "success" : "failed") : "pending";

    // 获取区块信息以获取时间戳
    let timestamp = Date.now();
    if (tx.blockNumber) {
      try {
        const blockResponse = await axios.get(etherscanUrl, {
          params: {
            module: "proxy",
            action: "eth_getBlockByNumber",
            tag: tx.blockNumber,
            boolean: "true",
            apikey: "YourApiKeyToken"
          },
          timeout: 10000
        });
        if (blockResponse.data.result && blockResponse.data.result.timestamp) {
          timestamp = parseInt(blockResponse.data.result.timestamp, 16) * 1000;
        }
      } catch (e) {
        console.log("获取区块时间戳失败，使用当前时间");
      }
    }

    // 转换数据格式
    const value = tx.value ? (parseInt(tx.value, 16) / 1e18).toFixed(6) : "0";
    const gasPrice = tx.gasPrice ? (parseInt(tx.gasPrice, 16) / 1e9).toFixed(0) : "0";

    res.json({
      hash: tx.hash,
      blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : 0,
      from: tx.from,
      to: tx.to || "",
      value: value,
      gasUsed: gasUsed,
      gasPrice: gasPrice,
      timestamp: timestamp,
      status: status,
      token: "ETH",
      tokenSymbol: "ETH"
    });
  } catch (err: any) {
    console.error("查询交易失败:", err.message);
    res.status(500).json({ error: err.message || "查询交易失败，请稍后重试" });
  }
});

// 查询地址信息
app.get("/api/blockchain/address/:address", async (req, res) => {
  try {
    const address = req.params.address;
    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return res.status(400).json({ error: "无效的地址格式" });
    }

    // 使用Etherscan API查询地址余额和交易
    const etherscanUrl = "https://api.etherscan.io/api";
    
    const [balanceResponse, txListResponse] = await Promise.all([
      axios.get(etherscanUrl, {
        params: {
          module: "account",
          action: "balance",
          address: address,
          tag: "latest",
          apikey: "YourApiKeyToken"
        },
        timeout: 10000
      }),
      axios.get(etherscanUrl, {
        params: {
          module: "account",
          action: "txlist",
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 1,
          sort: "asc",
          apikey: "YourApiKeyToken"
        },
        timeout: 10000
      })
    ]);

    if (balanceResponse.data.status !== "1" && balanceResponse.data.message !== "OK") {
      throw new Error(balanceResponse.data.message || "查询失败");
    }

    const balance = balanceResponse.data.result ? (parseInt(balanceResponse.data.result, 10) / 1e18).toFixed(6) : "0";
    const transactions = txListResponse.data.result || [];
    const transactionCount = transactions.length;
    const firstSeen = transactions.length > 0 ? parseInt(transactions[0].timeStamp) * 1000 : Date.now();

    // 检查是否是合约地址
    const codeResponse = await axios.get(etherscanUrl, {
      params: {
        module: "proxy",
        action: "eth_getCode",
        address: address,
        tag: "latest",
        apikey: "YourApiKeyToken"
      },
      timeout: 10000
    });

    const isContract = codeResponse.data.result && codeResponse.data.result !== "0x";

    // 简单的标签识别（可以根据需要扩展）
    const tags: string[] = [];
    if (parseFloat(balance) > 1000) {
      tags.push("大户");
    }
    if (transactionCount > 10000) {
      tags.push("活跃地址");
    }

    res.json({
      address: address,
      balance: balance,
      transactionCount: transactionCount,
      firstSeen: firstSeen,
      tags: tags,
      type: isContract ? "contract" : "wallet"
    });
  } catch (err: any) {
    console.error("查询地址失败:", err.message);
    res.status(500).json({ error: err.message || "查询地址失败，请稍后重试" });
  }
});

// 查询区块信息
app.get("/api/blockchain/block/:number", async (req, res) => {
  try {
    const blockNumber = req.params.number;
    if (!/^\d+$/.test(blockNumber)) {
      return res.status(400).json({ error: "无效的区块号格式" });
    }

    // 使用Etherscan API查询区块
    const etherscanUrl = "https://api.etherscan.io/api";
    const response = await axios.get(etherscanUrl, {
      params: {
        module: "proxy",
        action: "eth_getBlockByNumber",
        tag: `0x${parseInt(blockNumber).toString(16)}`,
        boolean: "true",
        apikey: "YourApiKeyToken"
      },
      timeout: 10000
    });

    if (response.data.error) {
      throw new Error(response.data.error.message || "查询失败");
    }

    const block = response.data.result;
    if (!block || block === null) {
      return res.status(404).json({ error: "区块未找到" });
    }

    const timestamp = block.timestamp ? parseInt(block.timestamp, 16) * 1000 : Date.now();
    const transactions = block.transactions ? block.transactions.length : 0;
    const gasUsed = block.gasUsed ? parseInt(block.gasUsed, 16) : 0;
    const gasLimit = block.gasLimit ? parseInt(block.gasLimit, 16) : 0;

    res.json({
      number: parseInt(blockNumber),
      hash: block.hash,
      timestamp: timestamp,
      transactions: transactions,
      gasUsed: gasUsed,
      gasLimit: gasLimit
    });
  } catch (err: any) {
    console.error("查询区块失败:", err.message);
    res.status(500).json({ error: err.message || "查询区块失败，请稍后重试" });
  }
});

// 搜索币种（使用CryptoCompare或CoinMarketCap）
app.get("/api/blockchain/search/:query", async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    
    // 尝试从CryptoCompare获取币种信息
    const CRYPTOCOMPARE_API_KEY = "32a4a0ad3f972271ffdfc992ba2a63b0a9fa9e17558836cb6dff452f187233cb";
    try {
      const response = await axios.get("https://min-api.cryptocompare.com/data/pricemultifull", {
        params: {
          fsyms: query.toUpperCase(),
          tsyms: "USD"
        },
        headers: {
          authorization: `Apikey ${CRYPTOCOMPARE_API_KEY}`
        },
        timeout: 10000
      });

      const data = response.data?.RAW?.[query.toUpperCase()]?.USD;
      if (data) {
        return res.json({
          type: "coin",
          symbol: query.toUpperCase(),
          name: query,
          price: data.PRICE,
          change24h: data.CHANGEPCT24HOUR,
          marketCap: data.MKTCAP,
          volume24h: data.VOLUME24HOURTO
        });
      }
    } catch (e) {
      console.log("CryptoCompare查询失败，尝试CoinMarketCap");
    }

    // 尝试从CoinMarketCap获取币种信息
    const COINMARKETCAP_API_KEY = "931662f2eaa4447685061867557d06e6";
    try {
      const response = await axios.get("https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest", {
        params: {
          symbol: query.toUpperCase(),
          convert: "USD"
        },
        headers: {
          "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY
        },
        timeout: 10000
      });

      const coinData = response.data?.data;
      if (coinData && Object.keys(coinData).length > 0) {
        const coin = Object.values(coinData)[0] as any;
        const quote = coin.quote?.USD || {};
        return res.json({
          type: "coin",
          symbol: coin.symbol,
          name: coin.name,
          price: quote.price,
          change24h: quote.percent_change_24h,
          marketCap: quote.market_cap,
          volume24h: quote.volume_24h
        });
      }
    } catch (e) {
      console.log("CoinMarketCap查询失败");
    }

    res.status(404).json({ error: "未找到相关信息" });
  } catch (err: any) {
    console.error("搜索失败:", err.message);
    res.status(500).json({ error: err.message || "搜索失败，请稍后重试" });
  }
});

// 用户认证中间件
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "未授权，请先登录" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: "Token无效或已过期" });
  }

  (req as any).userId = payload.userId;
  next();
}

// 用户注册
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: "请填写所有必填字段" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: "密码长度至少6位" });
    }
    
    const result = registerUser(email, username, password);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "注册失败" });
  }
});

// 用户登录
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "请填写邮箱和密码" });
    }
    
    const result = loginUser(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || "登录失败" });
  }
});

// 获取当前用户信息
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "获取用户信息失败" });
  }
});

// 更新投资组合
app.put("/api/user/portfolio", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { portfolio } = req.body;
    
    if (!Array.isArray(portfolio)) {
      return res.status(400).json({ error: "投资组合数据格式错误" });
    }
    
    const success = updatePortfolio(userId, portfolio);
    if (success) {
      const user = getUserById(userId);
      res.json({ portfolio: user?.portfolio || [] });
    } else {
      res.status(404).json({ error: "用户不存在" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "更新投资组合失败" });
  }
});

// 更新收藏列表
app.put("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { favorites } = req.body;
    
    if (!Array.isArray(favorites)) {
      return res.status(400).json({ error: "收藏列表数据格式错误" });
    }
    
    const success = updateFavorites(userId, favorites);
    if (success) {
      const user = getUserById(userId);
      res.json({ favorites: user?.favorites || [] });
    } else {
      res.status(404).json({ error: "用户不存在" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "更新收藏列表失败" });
  }
});

// 更新价格提醒
app.put("/api/user/price-alerts", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { alerts } = req.body;
    
    if (!Array.isArray(alerts)) {
      return res.status(400).json({ error: "价格提醒数据格式错误" });
    }
    
    const success = updatePriceAlerts(userId, alerts);
    if (success) {
      const user = getUserById(userId);
      res.json({ alerts: user?.priceAlerts || [] });
    } else {
      res.status(404).json({ error: "用户不存在" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "更新价格提醒失败" });
  }
});

app.listen(PORT, () => {
  console.log(`Crypto intel server running on http://localhost:${PORT}`);
});


