"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const marketService_1 = require("./services/marketService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.get("/api/overview", async (req, res) => {
    try {
        // 设置响应超时
        res.setTimeout(20000); // 20秒超时，给足够时间尝试多个API
        // 检查是否有强制刷新参数
        const isForceRefresh = req.query.force === 'true' || req.query.refresh === 'true';
        if (isForceRefresh) {
            const { setForceRefresh } = await Promise.resolve().then(() => __importStar(require("./services/marketService")));
            setForceRefresh(true);
            console.log("🔄 收到强制刷新请求，清除缓存，重新获取最新数据");
        }
        const startTime = Date.now();
        // getMarketOverview 保证始终返回数据（即使所有API失败，也会返回模拟数据）
        const data = await (0, marketService_1.getMarketOverview)();
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
    }
    catch (err) {
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
    const results = {
        timestamp: new Date().toISOString(),
        tests: []
    };
    // 测试1: CoinGecko
    try {
        const start = Date.now();
        const response = await axios_1.default.get("https://api.coingecko.com/api/v3/ping", { timeout: 5000 });
        const duration = Date.now() - start;
        results.tests.push({
            name: "CoinGecko",
            status: "success",
            duration: `${duration}ms`,
            message: "连接正常"
        });
    }
    catch (error) {
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
        const response = await axios_1.default.get("https://api.coincap.io/v2/assets?limit=1", { timeout: 5000 });
        const duration = Date.now() - start;
        results.tests.push({
            name: "CoinCap",
            status: "success",
            duration: `${duration}ms`,
            message: "连接正常"
        });
    }
    catch (error) {
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
        const response = await axios_1.default.get("https://api.binance.com/api/v3/ping", { timeout: 5000 });
        const duration = Date.now() - start;
        results.tests.push({
            name: "Binance",
            status: "success",
            duration: `${duration}ms`,
            message: "连接正常"
        });
    }
    catch (error) {
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
        const data = await (0, marketService_1.getCoinDetail)(req.params.id);
        res.json(data);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch coin detail" });
    }
});
app.listen(PORT, () => {
    console.log(`Crypto intel server running on http://localhost:${PORT}`);
});
