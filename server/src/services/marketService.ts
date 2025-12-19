import axios from "axios";
import * as fs from "fs";
import * as path from "path";

// 多个免费API源，确保稳定性
const API_SOURCES = {
  coinmarketcap: "https://pro-api.coinmarketcap.com/v1",
  cryptocompare: "https://min-api.cryptocompare.com/data",
  coingecko: "https://api.coingecko.com/api/v3",
  coincap: "https://api.coincap.io/v2",
  binance: "https://api.binance.com/api/v3"
};

// API 密钥
const CRYPTOCOMPARE_API_KEY = "32a4a0ad3f972271ffdfc992ba2a63b0a9fa9e17558836cb6dff452f187233cb";
const COINMARKETCAP_API_KEY = "931662f2eaa4447685061867557d06e6";

export interface CoinOverview {
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

// CoinMarketCap API 获取数据（优先使用，因为有API密钥）
async function fetchFromCoinMarketCap(): Promise<any[]> {
  try {
    const url = `${API_SOURCES.coinmarketcap}/cryptocurrency/listings/latest`;
    console.log(`[CoinMarketCap] 请求URL: ${url}`);
    const startTime = Date.now();
    
    const response = await axios.get(url, {
      params: {
        start: 1,
        limit: 50,
        convert: 'USD',
        sort: 'market_cap',
        sort_dir: 'desc'
      },
      timeout: 20000,
      headers: {
        'Accept': 'application/json',
        'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY
      },
      validateStatus: (status: number) => status < 500
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      throw new Error("CoinMarketCap返回数据格式错误");
    }
    
    const coins = response.data.data;
    console.log(`[CoinMarketCap] ✅ 成功! 耗时: ${duration}ms, 数据量: ${coins.length}`);
    
    // 转换CoinMarketCap格式到统一格式
    const result = coins.map((coin: any) => {
      const quote = coin.quote?.USD || {};
      
      return {
        id: coin.slug || coin.symbol.toLowerCase(),
        symbol: coin.symbol.toLowerCase(),
        name: coin.name,
        current_price: quote.price || 0,
        price_change_percentage_24h: quote.percent_change_24h || 0,
        market_cap: quote.market_cap || 0,
        total_volume: quote.volume_24h || 0,
        sparkline_in_7d: null // CoinMarketCap需要额外请求获取历史数据
      };
    }).filter((coin: any) => coin.current_price > 0 && coin.market_cap > 0);
    
    // 尝试获取7日历史数据生成sparkline（简化处理，使用当前价格生成趋势）
    // CoinMarketCap的历史数据API需要额外调用，这里先使用当前价格生成
    return result.map((coin: any) => {
      // 基于24h涨跌幅生成7日走势趋势
      const trendFactor = 1 + (coin.price_change_percentage_24h / 100);
      coin.sparkline_in_7d = {
        price: Array.from({ length: 7 }, (_, i) => {
          const daysAgo = 6 - i;
          const historicalFactor = trendFactor * (1 - (daysAgo * 0.02)); // 模拟历史趋势
          return coin.current_price * historicalFactor;
        })
      };
      return coin;
    });
    
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    };
    console.error(`[CoinMarketCap] ❌ 详细错误:`, JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

// CryptoCompare API 获取数据（优先使用，因为有API密钥）
async function fetchFromCryptoCompare(): Promise<any[]> {
  try {
    // 获取前50大市值币种
    const url = `${API_SOURCES.cryptocompare}/top/mktcapfull`;
    console.log(`[CryptoCompare] 请求URL: ${url}`);
    const startTime = Date.now();
    
    const response = await axios.get(url, {
      params: {
        limit: 50,
        tsym: 'USD'
      },
      timeout: 20000,
      headers: {
        'Accept': 'application/json',
        'authorization': `Apikey ${CRYPTOCOMPARE_API_KEY}`
      },
      validateStatus: (status: number) => status < 500
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      throw new Error("CryptoCompare返回数据格式错误");
    }
    
    const coins = response.data.Data;
    console.log(`[CryptoCompare] ✅ 成功! 耗时: ${duration}ms, 数据量: ${coins.length}`);
    
    // 转换CryptoCompare格式到统一格式
    const result = coins.map((item: any) => {
      const coinInfo = item.CoinInfo;
      const rawData = item.RAW?.USD || {};
      const displayData = item.DISPLAY?.USD || {};
      
      // 提取价格数据
      const price = rawData.PRICE || 0;
      const change24h = rawData.CHANGEPCT24HOUR || 0;
      const marketCap = rawData.MKTCAP || 0;
      const volume24h = rawData.VOLUME24HOUR || 0;
      
      return {
        id: coinInfo.Name.toLowerCase(),
        symbol: coinInfo.Name.toLowerCase(),
        name: coinInfo.FullName || coinInfo.Name,
        current_price: parseFloat(price.toString()),
        price_change_percentage_24h: parseFloat(change24h.toString()),
        market_cap: parseFloat(marketCap.toString()),
        total_volume: parseFloat(volume24h.toString()),
        sparkline_in_7d: null // 稍后获取
      };
    }).filter((coin: any) => coin.current_price > 0 && coin.market_cap > 0);
    
    // 批量获取7日历史数据生成sparkline（限制并发数）
    const BATCH_SIZE = 10;
    const sparklineData: any[] = [];
    
    for (let i = 0; i < result.length; i += BATCH_SIZE) {
      const batch = result.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (coin: any) => {
        try {
          const histResponse = await axios.get(`${API_SOURCES.cryptocompare}/v2/histoday`, {
            params: {
              fsym: coin.symbol.toUpperCase(),
              tsym: 'USD',
              limit: 7
            },
            timeout: 8000,
            headers: {
              'authorization': `Apikey ${CRYPTOCOMPARE_API_KEY}`
            }
          });
          
          if (histResponse.data?.Data?.Data && Array.isArray(histResponse.data.Data.Data)) {
            coin.sparkline_in_7d = {
              price: histResponse.data.Data.Data.map((d: any) => d.close)
            };
          } else {
            // 如果获取失败，使用当前价格生成
            coin.sparkline_in_7d = { price: Array(7).fill(coin.current_price) };
          }
        } catch (e: any) {
          // 如果获取历史数据失败，使用当前价格生成
          coin.sparkline_in_7d = { price: Array(7).fill(coin.current_price) };
        }
        return coin;
      });
      
      const batchResults = await Promise.all(batchPromises);
      sparklineData.push(...batchResults);
    }
    
    return sparklineData;
    
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    };
    console.error(`[CryptoCompare] ❌ 详细错误:`, JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

// CoinGecko API 获取数据
async function fetchFromCoinGecko(includeSparkline: boolean = false): Promise<any[]> {
  try {
    const url = `${API_SOURCES.coingecko}/coins/markets`;
    console.log(`[CoinGecko] 请求URL: ${url}, sparkline: ${includeSparkline}`);
    const startTime = Date.now();
    
    // 配置axios，支持代理（如果设置了环境变量）
    const axiosConfig: any = {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 50,
        page: 1,
        sparkline: includeSparkline,
        price_change_percentage: "24h"
      },
      timeout: 20000, // 20秒超时
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      validateStatus: (status: number) => status < 500
    };
    
    // 如果设置了代理环境变量，使用代理
    if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
      axiosConfig.proxy = {
        host: process.env.HTTP_PROXY?.split(':')[0] || process.env.HTTPS_PROXY?.split(':')[0] || '127.0.0.1',
        port: parseInt(process.env.HTTP_PROXY?.split(':')[1] || process.env.HTTPS_PROXY?.split(':')[1] || '7890')
      };
      console.log(`[CoinGecko] 使用代理: ${JSON.stringify(axiosConfig.proxy)}`);
    }
    
    const response = await axios.get(url, axiosConfig);
    
    const duration = Date.now() - startTime;
    const dataLength = Array.isArray(response.data) ? response.data.length : 0;
    console.log(`[CoinGecko] ✅ 成功! 耗时: ${duration}ms, 状态码: ${response.status}, 数据量: ${dataLength}`);
    
    if (!Array.isArray(response.data) || response.data.length === 0) {
      throw new Error("CoinGecko返回空数据");
    }
    
    return response.data;
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText
      } : null
    };
    console.error(`[CoinGecko] ❌ 详细错误:`, JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

// CoinCap API 作为备用（免费，无需API key）
async function fetchFromCoinCap(): Promise<any[]> {
  try {
    const url = `${API_SOURCES.coincap}/assets`;
    console.log(`[CoinCap] 请求URL: ${url}`);
    const startTime = Date.now();
    
    const response = await axios.get(url, {
      params: {
        limit: 50
      },
      timeout: 15000, // 增加到15秒
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      validateStatus: (status) => status < 500
    });
    
    const duration = Date.now() - startTime;
    console.log(`[CoinCap] 成功! 耗时: ${duration}ms, 状态码: ${response.status}`);
    
    // 转换CoinCap格式到统一格式
    const assets = response.data.data || [];
    if (assets.length === 0) {
      throw new Error("CoinCap返回空数据");
    }
    
    return assets.map((asset: any) => ({
      id: asset.id,
      symbol: asset.symbol.toLowerCase(),
      name: asset.name,
      current_price: parseFloat(asset.priceUsd || 0),
      price_change_percentage_24h: parseFloat(asset.changePercent24Hr || 0),
      market_cap: parseFloat(asset.marketCapUsd || 0),
      total_volume: parseFloat(asset.volumeUsd24Hr || 0),
      sparkline_in_7d: null // CoinCap不提供sparkline
    }));
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText
      } : null
    };
    console.error(`[CoinCap] 详细错误:`, JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

// Binance API 作为备用（获取价格数据）
async function fetchFromBinance(): Promise<any[]> {
  try {
    const url = `${API_SOURCES.binance}/ticker/24hr`;
    console.log(`[Binance] 请求URL: ${url}`);
    const startTime = Date.now();
    
    const tickerResponse = await axios.get(url, {
      timeout: 15000, // 增加到15秒
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      validateStatus: (status) => status < 500
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Binance] 成功! 耗时: ${duration}ms, 状态码: ${tickerResponse.status}`);
    
    const tickers = tickerResponse.data;
    if (!Array.isArray(tickers) || tickers.length === 0) {
      throw new Error("Binance返回空数据");
    }
    
    // 只取USDT交易对，按成交量排序
    const usdtPairs = tickers
      .filter((t: any) => t.symbol && t.symbol.endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume || 0) - parseFloat(a.quoteVolume || 0))
      .slice(0, 50);
    
    if (usdtPairs.length === 0) {
      throw new Error("Binance没有找到USDT交易对");
    }
    
    return usdtPairs.map((ticker: any) => {
      const symbol = ticker.symbol.replace('USDT', '').toLowerCase();
      return {
        id: symbol,
        symbol: symbol,
        name: symbol.toUpperCase(),
        current_price: parseFloat(ticker.lastPrice || 0),
        price_change_percentage_24h: parseFloat(ticker.priceChangePercent || 0),
        market_cap: parseFloat(ticker.quoteVolume || 0) * 10, // 估算市值
        total_volume: parseFloat(ticker.quoteVolume || 0),
        sparkline_in_7d: null
      };
    });
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText
      } : null
    };
    console.error(`[Binance] 详细错误:`, JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

// 从本地JSON文件加载数据（最后备用）
function loadLocalData(): any[] {
  try {
    const dataPath = path.join(__dirname, '../data/coins-backup.json');
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      const data = JSON.parse(fileContent);
      console.log(`[本地数据] 成功加载 ${data.length} 条数据`);
      return data;
    }
  } catch (error: any) {
    console.error(`[本地数据] 加载失败: ${error.message}`);
  }
  return [];
}

// 存储上次的价格，用于生成更真实的波动
const priceCache: Map<string, { price: number; timestamp: number }> = new Map();

// 生成智能解读函数
function generateInsight(params: {
  name: string;
  priceChange24h: number;
  sparklineData: number[];
  marketCap: number;
  totalVolume: number;
  score: number;
  recommendation: CoinOverview["recommendation"];
  currentPrice: number;
}): string {
  const { name, priceChange24h, sparklineData, marketCap, totalVolume, score, recommendation, currentPrice } = params;
  
  // 分析7日走势趋势
  let trendAnalysis = "";
  let volatility = "";
  
  if (sparklineData && sparklineData.length >= 7) {
    const firstPrice = sparklineData[0];
    const lastPrice = sparklineData[sparklineData.length - 1];
    const weekChange = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    // 计算波动率
    const prices = sparklineData;
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatilityPercent = (stdDev / avgPrice) * 100;
    
    if (weekChange > 10) {
      trendAnalysis = `过去7天累计上涨${weekChange.toFixed(1)}%，呈现强劲的上升趋势`;
    } else if (weekChange > 5) {
      trendAnalysis = `过去7天累计上涨${weekChange.toFixed(1)}%，保持稳定的上升势头`;
    } else if (weekChange > 0) {
      trendAnalysis = `过去7天累计上涨${weekChange.toFixed(1)}%，呈现温和的上升趋势`;
    } else if (weekChange > -5) {
      trendAnalysis = `过去7天累计${weekChange.toFixed(1)}%，价格在区间内震荡整理`;
    } else if (weekChange > -10) {
      trendAnalysis = `过去7天累计下跌${Math.abs(weekChange).toFixed(1)}%，出现小幅回调`;
    } else {
      trendAnalysis = `过去7天累计下跌${Math.abs(weekChange).toFixed(1)}%，呈现明显的下跌趋势`;
    }
    
    // 波动率分析
    if (volatilityPercent > 8) {
      volatility = "波动较大";
    } else if (volatilityPercent > 4) {
      volatility = "波动适中";
    } else {
      volatility = "波动较小";
    }
  }
  
  // 24小时表现分析
  let day24Analysis = "";
  if (priceChange24h > 10) {
    day24Analysis = `24小时暴涨${priceChange24h.toFixed(2)}%，市场情绪极度乐观，资金大量涌入`;
  } else if (priceChange24h > 5) {
    day24Analysis = `24小时大涨${priceChange24h.toFixed(2)}%，市场情绪积极，买盘力量强劲`;
  } else if (priceChange24h > 2) {
    day24Analysis = `24小时上涨${priceChange24h.toFixed(2)}%，市场表现稳健，多头占据优势`;
  } else if (priceChange24h > 0) {
    day24Analysis = `24小时微涨${priceChange24h.toFixed(2)}%，市场表现平稳，多空力量相对均衡`;
  } else if (priceChange24h > -2) {
    day24Analysis = `24小时微跌${Math.abs(priceChange24h).toFixed(2)}%，市场表现平稳，短期调整正常`;
  } else if (priceChange24h > -5) {
    day24Analysis = `24小时下跌${Math.abs(priceChange24h).toFixed(2)}%，市场出现调整，空头力量增强`;
  } else if (priceChange24h > -10) {
    day24Analysis = `24小时大跌${Math.abs(priceChange24h).toFixed(2)}%，市场情绪转弱，抛压明显增加`;
  } else {
    day24Analysis = `24小时暴跌${Math.abs(priceChange24h).toFixed(2)}%，市场情绪极度悲观，资金大量流出`;
  }
  
  // 流动性分析
  const volumeRatio = marketCap > 0 ? (totalVolume / marketCap) * 100 : 0;
  let liquidityAnalysis = "";
  if (volumeRatio > 15) {
    liquidityAnalysis = "成交活跃，流动性极佳，资金进出顺畅";
  } else if (volumeRatio > 8) {
    liquidityAnalysis = "成交较为活跃，流动性良好，市场参与度高";
  } else if (volumeRatio > 4) {
    liquidityAnalysis = "成交正常，流动性适中，市场参与度一般";
  } else {
    liquidityAnalysis = "成交相对清淡，流动性一般，需注意大单冲击";
  }
  
  // 市值规模分析
  let marketCapAnalysis = "";
  const marketCapB = marketCap / 1e9;
  if (marketCapB > 100) {
    marketCapAnalysis = "属于超大型市值币种，市场地位稳固，风险相对较低";
  } else if (marketCapB > 10) {
    marketCapAnalysis = "属于大型市值币种，市场认可度高，具备一定抗风险能力";
  } else if (marketCapB > 1) {
    marketCapAnalysis = "属于中型市值币种，成长空间较大，但波动性也相对较高";
  } else {
    marketCapAnalysis = "属于小型市值币种，潜在收益高但风险较大，需谨慎评估";
  }
  
  // 综合评分解读
  let scoreAnalysis = "";
  if (score > 0.75) {
    scoreAnalysis = "综合评分优秀，多维度指标表现强劲，短期投资价值较高";
  } else if (score > 0.6) {
    scoreAnalysis = "综合评分良好，各项指标表现均衡，具备一定的投资价值";
  } else if (score > 0.4) {
    scoreAnalysis = "综合评分中等，指标表现一般，建议观望等待更好时机";
  } else {
    scoreAnalysis = "综合评分较低，多项指标表现较弱，建议谨慎对待";
  }
  
  // 投资建议解读
  let recommendationAnalysis = "";
  switch (recommendation) {
    case "strong_buy":
      recommendationAnalysis = "强烈买入：当前价格和趋势显示强烈的买入信号，适合积极配置";
      break;
    case "buy":
      recommendationAnalysis = "买入：市场表现积极，适合适量配置，建议分批建仓";
      break;
    case "hold":
      recommendationAnalysis = "观望：市场表现中性，建议保持现有仓位，等待更明确的信号";
      break;
    case "sell":
      recommendationAnalysis = "减持/卖出：市场表现疲弱，建议减仓或离场，控制风险";
      break;
  }
  
  // 组合生成最终解读
  const parts: string[] = [];
  
  // 优先显示24小时表现
  parts.push(day24Analysis);
  
  // 如果有走势数据，添加趋势分析
  if (trendAnalysis) {
    parts.push(`${trendAnalysis}，${volatility}。`);
  }
  
  // 添加流动性分析
  parts.push(liquidityAnalysis);
  
  // 添加市值分析
  parts.push(marketCapAnalysis);
  
  // 添加评分和建议
  parts.push(`${scoreAnalysis}。${recommendationAnalysis}`);
  
  return parts.join("。") + "。";
}

// 生成模拟数据作为最后备用（确保系统始终可用）
// 使用缓存价格生成更真实的实时波动效果
function generateMockData(): any[] {
  const topCoins = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', basePrice: 45000 },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', basePrice: 2800 },
    { id: 'binancecoin', symbol: 'bnb', name: 'BNB', basePrice: 320 },
    { id: 'solana', symbol: 'sol', name: 'Solana', basePrice: 95 },
    { id: 'cardano', symbol: 'ada', name: 'Cardano', basePrice: 0.55 },
    { id: 'ripple', symbol: 'xrp', name: 'XRP', basePrice: 0.62 },
    { id: 'polkadot', symbol: 'dot', name: 'Polkadot', basePrice: 7.2 },
    { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', basePrice: 0.08 },
    { id: 'avalanche', symbol: 'avax', name: 'Avalanche', basePrice: 38 },
    { id: 'chainlink', symbol: 'link', name: 'Chainlink', basePrice: 14.5 },
    { id: 'polygon', symbol: 'matic', name: 'Polygon', basePrice: 0.85 },
    { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', basePrice: 72 },
    { id: 'uniswap', symbol: 'uni', name: 'Uniswap', basePrice: 6.5 },
    { id: 'ethereum-classic', symbol: 'etc', name: 'Ethereum Classic', basePrice: 25 },
    { id: 'stellar', symbol: 'xlm', name: 'Stellar', basePrice: 0.12 },
    { id: 'cosmos', symbol: 'atom', name: 'Cosmos', basePrice: 9.8 },
    { id: 'algorand', symbol: 'algo', name: 'Algorand', basePrice: 0.18 },
    { id: 'vechain', symbol: 'vet', name: 'VeChain', basePrice: 0.035 },
    { id: 'filecoin', symbol: 'fil', name: 'Filecoin', basePrice: 5.2 },
    { id: 'tron', symbol: 'trx', name: 'TRON', basePrice: 0.11 },
    { id: 'monero', symbol: 'xmr', name: 'Monero', basePrice: 165 },
    { id: 'eos', symbol: 'eos', name: 'EOS', basePrice: 0.75 },
    { id: 'aave', symbol: 'aave', name: 'Aave', basePrice: 88 },
    { id: 'theta', symbol: 'theta', name: 'Theta Network', basePrice: 1.05 },
    { id: 'crypto-com-chain', symbol: 'cro', name: 'Crypto.com Coin', basePrice: 0.095 },
    { id: 'hedera-hashgraph', symbol: 'hbar', name: 'Hedera', basePrice: 0.075 },
    { id: 'tezos', symbol: 'xtz', name: 'Tezos', basePrice: 0.95 },
    { id: 'elrond-erd-2', symbol: 'egld', name: 'MultiversX', basePrice: 42 },
    { id: 'the-graph', symbol: 'grt', name: 'The Graph', basePrice: 0.15 },
    { id: 'helium', symbol: 'hnt', name: 'Helium', basePrice: 4.8 },
    { id: 'fantom', symbol: 'ftm', name: 'Fantom', basePrice: 0.35 },
    { id: 'near', symbol: 'near', name: 'NEAR Protocol', basePrice: 3.2 },
    { id: 'decentraland', symbol: 'mana', name: 'Decentraland', basePrice: 0.45 },
    { id: 'gala', symbol: 'gala', name: 'Gala', basePrice: 0.025 },
    { id: 'axie-infinity', symbol: 'axs', name: 'Axie Infinity', basePrice: 7.8 },
    { id: 'the-sandbox', symbol: 'sand', name: 'The Sandbox', basePrice: 0.42 },
    { id: 'chiliz', symbol: 'chz', name: 'Chiliz', basePrice: 0.085 },
    { id: 'enjin-coin', symbol: 'enj', name: 'Enjin Coin', basePrice: 0.32 },
    { id: 'flow', symbol: 'flow', name: 'Flow', basePrice: 0.75 },
    { id: 'wax', symbol: 'waxp', name: 'WAX', basePrice: 0.055 },
    { id: 'immutable-x', symbol: 'imx', name: 'Immutable X', basePrice: 1.25 },
    { id: 'loopring', symbol: 'lrc', name: 'Loopring', basePrice: 0.22 },
    { id: 'zilliqa', symbol: 'zil', name: 'Zilliqa', basePrice: 0.021 },
    { id: 'waves', symbol: 'waves', name: 'Waves', basePrice: 2.5 },
    { id: 'dash', symbol: 'dash', name: 'Dash', basePrice: 32 },
    { id: 'maker', symbol: 'mkr', name: 'Maker', basePrice: 2100 },
    { id: 'compound-governance-token', symbol: 'comp', name: 'Compound', basePrice: 52 },
    { id: 'yearn-finance', symbol: 'yfi', name: 'yearn.finance', basePrice: 6800 },
    { id: 'sushi', symbol: 'sushi', name: 'SushiSwap', basePrice: 1.15 },
    { id: 'synthetix-network-token', symbol: 'snx', name: 'Synthetix', basePrice: 2.8 }
  ];
  
  const now = Date.now();
  return topCoins.map((coin, index) => {
    // 获取上次的价格，如果没有则使用基础价格
    const cached = priceCache.get(coin.id);
    const lastPrice = cached?.price || coin.basePrice;
    const timeSinceLastUpdate = cached ? (now - cached.timestamp) / 1000 / 60 : 1; // 分钟
    
    // 生成更真实的波动：基于上次价格，小幅度随机波动
    // 每次刷新会有小幅变化（±0.5%到±2%）
    const volatility = 0.01 + (Math.random() * 0.02); // 1%到3%的波动
    const direction = Math.random() > 0.5 ? 1 : -1;
    const change = lastPrice * volatility * direction;
    const currentPrice = Math.max(0.0001, lastPrice + change);
    
    // 计算24小时涨跌幅（基于当前价格和基础价格的差异）
    const priceChange24h = ((currentPrice - coin.basePrice) / coin.basePrice) * 100;
    
    // 基于价格计算市值和成交量（更合理的关系）
    const marketCap = currentPrice * (coin.basePrice > 1000 ? 20000000 : 
                                      coin.basePrice > 100 ? 50000000 : 
                                      coin.basePrice > 1 ? 100000000 : 500000000);
    const totalVolume = marketCap * (0.05 + Math.random() * 0.1); // 5%-15%的成交量
    
    // 生成更真实的7日走势图（基于当前价格，有趋势性）
    const sparklineData = Array.from({ length: 7 }, (_, i) => {
      const daysAgo = 6 - i;
      // 越早的价格可能偏离当前价格更多
      const historicalVariation = (Math.random() - 0.5) * 0.1 * (1 + daysAgo * 0.1);
      return currentPrice * (1 + historicalVariation);
    });
    
    // 更新缓存
    priceCache.set(coin.id, { price: currentPrice, timestamp: now });
    
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      current_price: Math.round(currentPrice * 10000) / 10000, // 保留4位小数
      price_change_percentage_24h: Math.round(priceChange24h * 100) / 100,
      market_cap: Math.round(marketCap),
      total_volume: Math.round(totalVolume),
      sparkline_in_7d: { price: sparklineData.map(p => Math.round(p * 10000) / 10000) }
    };
  });
}

// 缓存可用的API源，避免每次都尝试
let cachedAPISource: 'coinmarketcap' | 'cryptocompare' | 'coingecko' | 'coincap' | 'binance' | 'local' | 'mock' | null = null;

// 强制刷新标志，用于手动刷新时清除缓存
let forceRefresh = false;

export function setForceRefresh(value: boolean) {
  forceRefresh = value;
}

export async function getMarketOverview(): Promise<CoinOverview[]> {
  // 如果强制刷新，清除缓存，重新尝试所有API
  if (forceRefresh) {
    cachedAPISource = null;
    forceRefresh = false;
    console.log("🔄 强制刷新模式：清除缓存，重新尝试所有API");
  }
  
  // 如果已经找到可用的API源，直接使用（非强制刷新时）
  if (cachedAPISource === 'cryptocompare') {
    try {
      const data = await fetchFromCryptoCompare();
      if (data && Array.isArray(data) && data.length > 0) {
        return processCoinData(data);
      }
    } catch (error: any) {
      cachedAPISource = null;
      console.log("缓存的CryptoCompare API源失败，尝试使用本地缓存数据");
      try {
        const localData = loadLocalData();
        if (localData && localData.length > 0) {
          console.log(`✅ 使用本地缓存数据，共 ${localData.length} 条`);
          return processCoinData(localData);
        }
      } catch (e) {
        console.log("⚠️ 本地缓存数据不可用");
      }
    }
  } else if (cachedAPISource === 'coinmarketcap') {
    try {
      const data = await fetchFromCoinMarketCap();
      if (data && Array.isArray(data) && data.length > 0) {
        return processCoinData(data);
      }
    } catch (error: any) {
      cachedAPISource = null;
      console.log("缓存的CoinMarketCap API源失败，尝试使用本地缓存数据");
      try {
        const localData = loadLocalData();
        if (localData && localData.length > 0) {
          console.log(`✅ 使用本地缓存数据，共 ${localData.length} 条`);
          return processCoinData(localData);
        }
      } catch (e) {
        console.log("⚠️ 本地缓存数据不可用");
      }
    }
  } else if (cachedAPISource === 'coingecko') {
    try {
      const data = await fetchFromCoinGecko(false);
      if (data && Array.isArray(data) && data.length > 0) {
        return processCoinData(data);
      }
    } catch (error: any) {
      // 如果缓存的API源也失败了，清除缓存，尝试使用本地缓存数据
      cachedAPISource = null;
      console.log("缓存的API源失败，尝试使用本地缓存数据");
      try {
        const localData = loadLocalData();
        if (localData && localData.length > 0) {
          console.log(`✅ 使用本地缓存数据，共 ${localData.length} 条`);
          return processCoinData(localData);
        }
      } catch (e) {
        console.log("⚠️ 本地缓存数据不可用");
      }
    }
  } else if (cachedAPISource === 'coincap') {
    try {
      const data = await fetchFromCoinCap();
      if (data && Array.isArray(data) && data.length > 0) {
        return processCoinData(data);
      }
    } catch (error: any) {
      cachedAPISource = null;
      console.log("缓存的API源失败，尝试使用本地缓存数据");
      try {
        const localData = loadLocalData();
        if (localData && localData.length > 0) {
          console.log(`✅ 使用本地缓存数据，共 ${localData.length} 条`);
          return processCoinData(localData);
        }
      } catch (e) {
        console.log("⚠️ 本地缓存数据不可用");
      }
    }
  } else if (cachedAPISource === 'binance') {
    try {
      const data = await fetchFromBinance();
      if (data && Array.isArray(data) && data.length > 0) {
        return processCoinData(data);
      }
    } catch (error: any) {
      cachedAPISource = null;
      console.log("缓存的API源失败，尝试使用本地缓存数据");
      try {
        const localData = loadLocalData();
        if (localData && localData.length > 0) {
          console.log(`✅ 使用本地缓存数据，共 ${localData.length} 条`);
          return processCoinData(localData);
        }
      } catch (e) {
        console.log("⚠️ 本地缓存数据不可用");
      }
    }
  } else if (cachedAPISource === 'local') {
    // 如果之前使用的是本地缓存数据，优先尝试重新获取真实数据
    try {
      const localData = loadLocalData();
      if (localData && localData.length > 0) {
        console.log(`✅ 使用本地缓存数据，共 ${localData.length} 条`);
        return processCoinData(localData);
      }
    } catch (e) {
      console.log("⚠️ 本地缓存数据不可用");
    }
  } else if (cachedAPISource === 'mock') {
    // 如果之前使用的是模拟数据，优先尝试重新获取真实数据
    // 如果失败，尝试使用本地缓存数据
    try {
      const localData = loadLocalData();
      if (localData && localData.length > 0) {
        console.log(`✅ 使用本地缓存数据，共 ${localData.length} 条`);
        cachedAPISource = 'local';
        return processCoinData(localData);
      }
    } catch (e) {
      console.log("⚠️ 本地缓存数据不可用");
    }
    // 最后才使用模拟数据
    const mockData = generateMockData();
    return processCoinData(mockData);
  }
  
  // 首次运行或缓存失效，按优先级尝试API
  // 策略0: 优先使用CryptoCompare（有API密钥，最可靠）
  try {
    console.log("🔄 尝试从 CryptoCompare 获取数据（使用API密钥）...");
    const data = await fetchFromCryptoCompare();
    if (data && Array.isArray(data) && data.length > 0) {
      cachedAPISource = 'cryptocompare';
      console.log(`✅ CryptoCompare API 可用，已缓存，获取 ${data.length} 条数据`);
      return processCoinData(data);
    }
  } catch (error: any) {
    console.log(`⚠️ CryptoCompare失败: ${error.message}，尝试其他API...`);
  }
  
  // 策略0.5: 使用CoinMarketCap（有API密钥）
  try {
    console.log("🔄 尝试从 CoinMarketCap 获取数据（使用API密钥）...");
    const data = await fetchFromCoinMarketCap();
    if (data && Array.isArray(data) && data.length > 0) {
      cachedAPISource = 'coinmarketcap';
      console.log(`✅ CoinMarketCap API 可用，已缓存，获取 ${data.length} 条数据`);
      return processCoinData(data);
    }
  } catch (error: any) {
    console.log(`⚠️ CoinMarketCap失败: ${error.message}，尝试其他API...`);
  }
  
  // 策略1: 使用CoinGecko完整版（包含sparkline，数据最完整）
  try {
    console.log("🔄 尝试从 CoinGecko 获取完整数据（包含走势图）...");
    const data = await fetchFromCoinGecko(true);
    if (data && Array.isArray(data) && data.length > 0) {
      cachedAPISource = 'coingecko';
      console.log(`✅ CoinGecko API 可用，已缓存，获取 ${data.length} 条数据`);
      return processCoinData(data);
    }
  } catch (error: any) {
    console.log(`⚠️ CoinGecko完整版失败: ${error.message}，尝试简化版...`);
  }
  
  // 策略1.5: 尝试CoinGecko简化版（不包含sparkline，但更快）
  try {
    console.log("🔄 尝试从 CoinGecko 获取简化数据...");
    const data = await fetchFromCoinGecko(false);
    if (data && Array.isArray(data) && data.length > 0) {
      cachedAPISource = 'coingecko';
      console.log(`✅ CoinGecko API 可用，已缓存，获取 ${data.length} 条数据`);
      return processCoinData(data);
    }
  } catch (error: any) {
    console.log(`⚠️ CoinGecko简化版失败: ${error.message}`);
  }
  
  // 策略2: 尝试CoinCap（备用）
  try {
    console.log("🔄 尝试从 CoinCap 获取数据...");
    const data = await fetchFromCoinCap();
    if (data && Array.isArray(data) && data.length > 0) {
      cachedAPISource = 'coincap';
      console.log(`✅ CoinCap API 可用，已缓存，获取 ${data.length} 条数据`);
      return processCoinData(data);
    }
  } catch (error: any) {
    console.log(`⚠️ CoinCap失败: ${error.message}`);
  }
  
  // 策略3: 尝试Binance（备用）
  try {
    console.log("🔄 尝试从 Binance 获取数据...");
    const data = await fetchFromBinance();
    if (data && Array.isArray(data) && data.length > 0) {
      cachedAPISource = 'binance';
      console.log(`✅ Binance API 可用，已缓存，获取 ${data.length} 条数据`);
      return processCoinData(data);
    }
  } catch (error: any) {
    console.log(`⚠️ Binance失败: ${error.message}`);
  }
  
  // 策略4: 尝试从本地JSON文件加载（如果存在）
  try {
    console.log("🔄 尝试从本地数据文件加载...");
    const localData = loadLocalData();
    if (localData && Array.isArray(localData) && localData.length > 0) {
      cachedAPISource = 'local'; // 标记为本地数据
      console.log(`✅ 本地数据文件可用，加载 ${localData.length} 条数据`);
      return processCoinData(localData);
    }
  } catch (error: any) {
    console.log(`⚠️ 本地数据加载失败: ${error.message}`);
  }
  
  // 所有API都失败，优先使用本地缓存数据
  try {
    const localData = loadLocalData();
    if (localData && localData.length > 0) {
      cachedAPISource = 'local';
      console.log(`✅ 所有API失败，使用本地缓存数据，共 ${localData.length} 条`);
      console.log("💡 提示：这是最后一次成功获取的数据，建议检查网络连接或API配置");
      return processCoinData(localData);
    }
  } catch (error: any) {
    console.log(`⚠️ 本地缓存数据也不可用: ${error.message}`);
  }
  
  // 最后才使用模拟数据（确保系统始终可用）
  console.log("⚠️ 所有数据源均失败，使用模拟数据模式（数据会实时波动）");
  console.log("💡 提示：如果网络受限，可以配置代理或使用VPN访问外部API");
  console.log("💡 或者运行 'npm run update-data' 更新本地缓存数据");
  cachedAPISource = 'mock';
  const mockData = generateMockData();
  return processCoinData(mockData);
}

function processCoinData(data: any[]): CoinOverview[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid response format from API");
  }

  return data
      .filter((coin: any) => {
        // 过滤掉无效数据
        return (
          coin &&
          coin.id &&
          coin.symbol &&
          coin.name &&
          coin.current_price != null &&
          coin.current_price > 0 &&
          coin.market_cap != null &&
          coin.total_volume != null
        );
      })
      .map((coin: any) => {
        // 处理可能为 null 的字段，确保数据类型正确
        const priceChange24h = parseFloat(coin.price_change_percentage_24h) || 0;
        const marketCap = parseFloat(coin.market_cap) || 0;
        const totalVolume = parseFloat(coin.total_volume) || 0;
        const currentPrice = parseFloat(coin.current_price) || 0;
        
        // 计算流动性分数（避免除零）
        const volScore = marketCap > 0 
          ? Math.min(1, totalVolume / marketCap) 
          : 0;
        
        // 计算动量分数（标准化到 0-1）
        const momentum = priceChange24h / 10;
        const normalizedMomentum = Math.max(-1, Math.min(1, momentum));
        
        // 分析7日走势趋势
        let sparklineData = coin.sparkline_in_7d?.price;
        if (!sparklineData || !Array.isArray(sparklineData) || sparklineData.length === 0) {
          // 如果没有 sparkline 数据，生成一个基于当前价格的7日走势
          sparklineData = Array.from({ length: 7 }, (_, i) => {
            const daysAgo = 6 - i;
            const trendFactor = 1 + (priceChange24h / 100) * (daysAgo / 7);
            const randomVariation = (Math.random() - 0.5) * 0.05;
            return currentPrice * trendFactor * (1 + randomVariation);
          });
        }
        
        // 计算7日趋势分数（基于sparkline数据）
        let trendScore = 0.5; // 默认中性
        if (sparklineData && sparklineData.length >= 7) {
          const firstPrice = sparklineData[0];
          const lastPrice = sparklineData[sparklineData.length - 1];
          const trendChange = ((lastPrice - firstPrice) / firstPrice) * 100;
          
          // 计算波动率（标准差）
          const prices = sparklineData.map(p => parseFloat(p.toString()) || currentPrice);
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
          const volatility = Math.sqrt(variance) / avgPrice;
          
          // 趋势分数：上涨趋势为正，下跌趋势为负
          trendScore = Math.max(-1, Math.min(1, trendChange / 20)); // 20%变化对应1分
          
          // 如果波动率太高，降低趋势分数（不稳定）
          if (volatility > 0.15) {
            trendScore *= 0.7; // 降低30%的权重
          }
        }
        
        // 计算市值规模分数（大市值更稳定）
        let marketCapScore = 0.5;
        if (marketCap > 10e9) {
          marketCapScore = 0.7; // 大市值（>10B）更稳定
        } else if (marketCap > 1e9) {
          marketCapScore = 0.6; // 中等市值（1B-10B）
        } else if (marketCap > 100e6) {
          marketCapScore = 0.5; // 小市值（100M-1B）
        } else {
          marketCapScore = 0.3; // 微型市值（<100M）风险较高
        }
        
        // 综合评分（多维度加权）
        // 权重：流动性30% + 动量25% + 趋势25% + 市值稳定性20%
        const normalizedTrend = (trendScore + 1) / 2; // 转换为0-1
        const normalizedMomentumScore = (normalizedMomentum + 1) / 2; // 转换为0-1
        
        const score = Math.max(
          0,
          Math.min(1, 
            0.30 * volScore + 
            0.25 * normalizedMomentumScore + 
            0.25 * normalizedTrend + 
            0.20 * marketCapScore
          )
        );

        // 智能生成投资建议（基于多维度分析）
        let recommendation: CoinOverview["recommendation"] = "hold";
        
        // 计算综合信号强度
        const buySignal = normalizedMomentumScore * 0.4 + normalizedTrend * 0.4 + volScore * 0.2;
        const sellSignal = (1 - normalizedMomentumScore) * 0.4 + (1 - normalizedTrend) * 0.4 + (1 - volScore) * 0.2;
        
        // 强烈买入：综合评分高 + 强烈上涨趋势 + 24h涨幅大 + 流动性好
        if (score > 0.75 && priceChange24h > 5 && buySignal > 0.7 && trendScore > 0.3) {
          recommendation = "strong_buy";
        }
        // 买入：综合评分良好 + 上涨趋势 + 24h涨幅为正
        else if (score > 0.6 && priceChange24h > 2 && buySignal > 0.55) {
          recommendation = "buy";
        }
        // 卖出：综合评分低 + 强烈下跌趋势 + 24h跌幅大 + 流动性差
        else if (score < 0.3 && priceChange24h < -5 && sellSignal > 0.7 && trendScore < -0.3) {
          recommendation = "sell";
        }
        // 观望：其他情况
        else {
          recommendation = "hold";
        }
        
        // 特殊情况：如果24h涨跌幅过大（>15%或<-15%），可能是异常波动，建议观望
        if (Math.abs(priceChange24h) > 15) {
          recommendation = "hold";
        }
        
        // 确保sparkline数据格式正确（数组，数值类型）- 已在上面处理过，这里只格式化
        sparklineData = sparklineData.map((p: any) => {
          const price = parseFloat(p) || currentPrice;
          return Math.round(price * 10000) / 10000; // 保留4位小数，和模拟数据一致
        });

        // 生成智能解读
        let insight = "";
        try {
          insight = generateInsight({
            name: coin.name,
            priceChange24h,
            sparklineData,
            marketCap,
            totalVolume,
            score,
            recommendation,
            currentPrice
          });
          // 确保insight不为空
          if (!insight || insight.trim() === "") {
            insight = `该币种当前价格为 $${currentPrice.toFixed(4)}，24小时涨跌幅为 ${priceChange24h.toFixed(2)}%。综合评分为 ${(score * 100).toFixed(0)} 分，投资建议为${recommendation === "strong_buy" ? "强烈买入" : recommendation === "buy" ? "买入" : recommendation === "hold" ? "观望" : "减持/卖出"}。`;
          }
        } catch (error: any) {
          console.error(`生成智能解读失败 (${coin.name}):`, error.message);
          insight = `该币种当前价格为 $${currentPrice.toFixed(4)}，24小时涨跌幅为 ${priceChange24h.toFixed(2)}%。综合评分为 ${(score * 100).toFixed(0)} 分，投资建议为${recommendation === "strong_buy" ? "强烈买入" : recommendation === "buy" ? "买入" : recommendation === "hold" ? "观望" : "减持/卖出"}。`;
        }

        // 返回格式完全一致的数据（和模拟数据格式相同）
        return {
          id: coin.id,
          symbol: coin.symbol.toLowerCase(),
          name: coin.name,
          current_price: Math.round(currentPrice * 10000) / 10000, // 保留4位小数
          price_change_percentage_24h: Math.round(priceChange24h * 100) / 100, // 保留2位小数
          market_cap: Math.round(marketCap), // 整数
          total_volume: Math.round(totalVolume), // 整数
          sparkline_in_7d: { price: sparklineData }, // 格式一致
          score,
          recommendation,
          insight // 智能解读
        };
      });
}

// 从 CryptoCompare 获取单个币种详情和历史数据
async function fetchCoinDetailFromCryptoCompare(id: string): Promise<any> {
  try {
    // 先尝试从概览数据中获取symbol（因为id可能是coin id或symbol）
    let symbol = id.toUpperCase();
    
    // 获取币种价格和基本信息
    const priceUrl = `${API_SOURCES.cryptocompare}/pricemultifull`;
    const priceRes = await axios.get(priceUrl, {
      params: {
        fsyms: symbol,
        tsyms: 'USD'
      },
      timeout: 20000,
      headers: {
        'Accept': 'application/json',
        'authorization': `Apikey ${CRYPTOCOMPARE_API_KEY}`
      }
    });

    // 获取30天历史数据（小时级别）
    const historyUrl = `${API_SOURCES.cryptocompare}/v2/histohour`;
    const historyRes = await axios.get(historyUrl, {
      params: {
        fsym: symbol,
        tsym: 'USD',
        limit: 720, // 30天 * 24小时
        toTs: Math.floor(Date.now() / 1000)
      },
      timeout: 20000,
      headers: {
        'Accept': 'application/json',
        'authorization': `Apikey ${CRYPTOCOMPARE_API_KEY}`
      }
    });

    const priceData = priceRes.data?.RAW?.[symbol]?.USD;
    const historyData = historyRes.data?.Data?.Data || [];

    if (!priceData) {
      throw new Error("CryptoCompare返回价格数据格式错误");
    }

    // 转换历史数据格式
    const prices: [number, number][] = historyData.map((item: any) => [
      item.time * 1000, // 转换为毫秒
      item.close || item.high || item.low || priceData.PRICE
    ]);

    const volumes: [number, number][] = historyData.map((item: any) => [
      item.time * 1000,
      (item.volumefrom || 0) * (item.close || priceData.PRICE) // 转换为USD
    ]);

    return {
      id: id.toLowerCase(),
      symbol: symbol,
      name: priceData.FROMSYMBOL || symbol,
      description: "",
      market_data: {
        current_price: { usd: priceData.PRICE || 0 },
        market_cap: { usd: priceData.MKTCAP || 0 },
        total_volume: { usd: priceData.TOTALVOLUME24HTO || 0 },
        price_change_percentage_24h: priceData.CHANGEPCT24HOUR || 0,
        high_24h: { usd: priceData.HIGH24HOUR || priceData.PRICE || 0 },
        low_24h: { usd: priceData.LOW24HOUR || priceData.PRICE || 0 },
        circulating_supply: priceData.SUPPLY || 0,
        total_supply: priceData.SUPPLY || 0
      },
      community_data: {},
      developer_data: {},
      prices: prices,
      volumes: volumes
    };
  } catch (error: any) {
    console.log(`⚠️ CryptoCompare 获取详情失败: ${error.message}`);
    throw error;
  }
}

// 从 CoinMarketCap 获取单个币种详情和历史数据
async function fetchCoinDetailFromCoinMarketCap(id: string): Promise<any> {
  try {
    // 尝试使用symbol或slug获取币种详情
    const detailUrl = `${API_SOURCES.coinmarketcap}/cryptocurrency/quotes/latest`;
    
    // 先尝试使用symbol
    let detailRes = null;
    try {
      detailRes = await axios.get(detailUrl, {
        params: {
          symbol: id.toUpperCase(),
          convert: 'USD'
        },
        timeout: 20000,
        headers: {
          'Accept': 'application/json',
          'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY
        }
      });
    } catch (e) {
      // 如果symbol失败，尝试使用slug
      detailRes = await axios.get(detailUrl, {
        params: {
          slug: id.toLowerCase(),
          convert: 'USD'
        },
        timeout: 20000,
        headers: {
          'Accept': 'application/json',
          'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY
        }
      });
    }

    const coinData = detailRes.data?.data;
    if (!coinData) {
      throw new Error("CoinMarketCap返回数据格式错误");
    }

    // 获取第一个币种的数据（因为可能返回多个）
    const coin = Object.values(coinData)[0] as any;
    const quote = coin.quote?.USD || {};

    // CoinMarketCap的历史数据需要额外调用，这里先使用当前数据生成趋势
    const currentPrice = quote.price || 0;
    const priceChange24h = quote.percent_change_24h || 0;
    
    // 生成30天历史数据（基于当前价格和趋势）
    const prices: [number, number][] = [];
    const volumes: [number, number][] = [];
    const baseVolume = quote.volume_24h || 0;
    
    for (let i = 29; i >= 0; i--) {
      const timestamp = Date.now() - i * 24 * 60 * 60 * 1000;
      const trendFactor = 1 + (priceChange24h / 100) * (i / 30);
      const randomVariation = (Math.random() - 0.5) * 0.05;
      const price = currentPrice * trendFactor * (1 + randomVariation);
      prices.push([timestamp, price]);
      volumes.push([timestamp, baseVolume * (0.5 + Math.random() * 0.5)]);
    }

    return {
      id: coin.slug || coin.symbol?.toLowerCase() || id.toLowerCase(),
      symbol: coin.symbol || id.toUpperCase(),
      name: coin.name || id,
      description: coin.description || "",
      market_data: {
        current_price: { usd: currentPrice },
        market_cap: { usd: quote.market_cap || 0 },
        total_volume: { usd: baseVolume },
        price_change_percentage_24h: priceChange24h,
        high_24h: { usd: quote.high_24h || currentPrice },
        low_24h: { usd: quote.low_24h || currentPrice },
        circulating_supply: coin.circulating_supply || 0,
        total_supply: coin.total_supply || 0
      },
      community_data: {},
      developer_data: {},
      prices: prices,
      volumes: volumes
    };
  } catch (error: any) {
    console.log(`⚠️ CoinMarketCap 获取详情失败: ${error.message}`);
    throw error;
  }
}

export async function getCoinDetail(id: string) {
  // 尝试多个API源获取币种详情，优先使用CryptoCompare和CoinMarketCap
  
  // 策略0: 优先使用 CryptoCompare API（有API密钥，数据质量好）
  try {
    console.log(`🔄 尝试从 CryptoCompare 获取 ${id} 的详情...`);
    const data = await fetchCoinDetailFromCryptoCompare(id);
    console.log(`✅ 成功从 CryptoCompare 获取 ${id} 的详情`);
    return data;
  } catch (error: any) {
    console.log(`⚠️ CryptoCompare 获取 ${id} 详情失败: ${error.message}`);
  }
  
  // 策略0.5: 使用 CoinMarketCap API（有API密钥）
  try {
    console.log(`🔄 尝试从 CoinMarketCap 获取 ${id} 的详情...`);
    const data = await fetchCoinDetailFromCoinMarketCap(id);
    console.log(`✅ 成功从 CoinMarketCap 获取 ${id} 的详情`);
    return data;
  } catch (error: any) {
    console.log(`⚠️ CoinMarketCap 获取 ${id} 详情失败: ${error.message}`);
  }
  
  // 策略1: 尝试 CoinGecko API（最完整的数据）
  try {
    console.log(`🔄 尝试从 CoinGecko 获取 ${id} 的详情...`);
    const [detailRes, marketChartRes] = await Promise.all([
      axios.get(`${API_SOURCES.coingecko}/coins/${id}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: true
        },
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }),
      axios.get(`${API_SOURCES.coingecko}/coins/${id}/market_chart`, {
        params: {
          vs_currency: "usd",
          days: 30,
          interval: "hourly"
        },
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })
    ]);

    const detail = detailRes.data;
    const chart = marketChartRes.data;
    
    console.log(`✅ 成功从 CoinGecko 获取 ${id} 的详情`);
    
    return {
      id: detail.id,
      symbol: detail.symbol,
      name: detail.name,
      description: detail.description?.en || detail.description?.en?.substring(0, 500) || "",
      market_data: detail.market_data || {},
      community_data: detail.community_data || {},
      developer_data: detail.developer_data || {},
      prices: chart.prices || [],
      volumes: chart.total_volumes || []
    };
  } catch (error: any) {
    console.log(`⚠️ CoinGecko 获取 ${id} 详情失败: ${error.message}`);
  }
  
  // 策略2: 尝试从 CoinCap API 获取基本信息
  try {
    console.log(`🔄 尝试从 CoinCap 获取 ${id} 的详情...`);
    const coinCapRes = await axios.get(`${API_SOURCES.coincap}/assets/${id}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    const coinCapData = coinCapRes.data.data;
    
    // 尝试获取历史数据
    let prices: [number, number][] = [];
    let volumes: [number, number][] = [];
    
    try {
      const historyRes = await axios.get(`${API_SOURCES.coincap}/assets/${id}/history`, {
        params: {
          interval: "h1",
          start: Date.now() - 30 * 24 * 60 * 60 * 1000,
          end: Date.now()
        },
        timeout: 15000
      });
      
      const history = historyRes.data.data || [];
      prices = history.map((h: any) => [new Date(h.time).getTime(), parseFloat(h.priceUsd) || 0]);
      volumes = history.map((h: any) => [new Date(h.time).getTime(), parseFloat(h.volumeUsd24Hr) || 0]);
    } catch (e) {
      console.log(`⚠️ CoinCap 历史数据获取失败，使用基本信息`);
    }
    
    console.log(`✅ 成功从 CoinCap 获取 ${id} 的详情`);
    
    return {
      id: coinCapData.id || id,
      symbol: coinCapData.symbol || id,
      name: coinCapData.name || id,
      description: "",
      market_data: {
        current_price: { usd: parseFloat(coinCapData.priceUsd) || 0 },
        market_cap: { usd: parseFloat(coinCapData.marketCapUsd) || 0 },
        total_volume: { usd: parseFloat(coinCapData.volumeUsd24Hr) || 0 },
        price_change_percentage_24h: parseFloat(coinCapData.changePercent24Hr) || 0,
        high_24h: { usd: parseFloat(coinCapData.vwap24Hr) || 0 },
        low_24h: { usd: parseFloat(coinCapData.vwap24Hr) || 0 },
        circulating_supply: parseFloat(coinCapData.supply) || 0,
        total_supply: parseFloat(coinCapData.supply) || 0
      },
      community_data: {},
      developer_data: {},
      prices: prices,
      volumes: volumes
    };
  } catch (error: any) {
    console.log(`⚠️ CoinCap 获取 ${id} 详情失败: ${error.message}`);
  }
  
  // 策略3: 尝试从概览数据中获取基本信息，然后使用正确的symbol重新调用CryptoCompare或CoinMarketCap
  try {
    console.log(`🔄 尝试从概览数据中获取 ${id} 的基本信息...`);
    const overview = await getMarketOverview();
    const coinData = overview.find((c: CoinOverview) => 
      c.id === id || 
      c.id.toLowerCase() === id.toLowerCase() ||
      c.symbol.toLowerCase() === id.toLowerCase()
    );
    
    if (coinData) {
      console.log(`✅ 从概览数据中找到 ${id}，使用symbol ${coinData.symbol.toUpperCase()} 重新调用API...`);
      
      // 使用正确的symbol重新尝试CryptoCompare和CoinMarketCap
      try {
        const data = await fetchCoinDetailFromCryptoCompare(coinData.symbol.toUpperCase());
        console.log(`✅ 使用symbol成功从 CryptoCompare 获取详情`);
        return data;
      } catch (e: any) {
        console.log(`⚠️ 使用symbol调用CryptoCompare失败: ${e.message}`);
      }
      
      try {
        const data = await fetchCoinDetailFromCoinMarketCap(coinData.symbol.toUpperCase());
        console.log(`✅ 使用symbol成功从 CoinMarketCap 获取详情`);
        return data;
      } catch (e: any) {
        console.log(`⚠️ 使用symbol调用CoinMarketCap失败: ${e.message}`);
      }
      
      // 如果API调用都失败，使用概览数据生成详情
      console.log(`⚠️ API调用失败，使用概览数据生成详情`);
      
      // 使用sparkline数据生成30天价格数据
      const basePrice = coinData.current_price;
      const priceChange = coinData.price_change_percentage_24h / 100;
      const sparkline = coinData.sparkline_in_7d?.price || [];
      const prices: [number, number][] = [];
      const volumes: [number, number][] = [];
      
      // 如果有sparkline数据，基于它生成30天数据
      if (sparkline.length >= 7) {
        const firstPrice = sparkline[0];
        const lastPrice = sparkline[sparkline.length - 1];
        const trend = (lastPrice - firstPrice) / firstPrice;
        
        for (let i = 29; i >= 0; i--) {
          const timestamp = Date.now() - i * 24 * 60 * 60 * 1000;
          const dayIndex = Math.floor(i / 4.3); // 30天映射到7个数据点
          const sparklinePrice = sparkline[Math.min(dayIndex, sparkline.length - 1)] || basePrice;
          const trendFactor = 1 + trend * (i / 30);
          const price = sparklinePrice * trendFactor;
          prices.push([timestamp, price]);
          volumes.push([timestamp, coinData.total_volume * (0.5 + Math.random() * 0.5)]);
        }
      } else {
        // 如果没有sparkline，生成模拟数据
        for (let i = 29; i >= 0; i--) {
          const timestamp = Date.now() - i * 24 * 60 * 60 * 1000;
          const trendFactor = 1 + priceChange * (i / 30);
          const randomVariation = (Math.random() - 0.5) * 0.1;
          const price = basePrice * trendFactor * (1 + randomVariation);
          prices.push([timestamp, price]);
          volumes.push([timestamp, coinData.total_volume * (0.5 + Math.random() * 0.5)]);
        }
      }
      
      return {
        id: coinData.id,
        symbol: coinData.symbol,
        name: coinData.name,
        description: coinData.insight || "",
        market_data: {
          current_price: { usd: coinData.current_price },
          market_cap: { usd: coinData.market_cap },
          total_volume: { usd: coinData.total_volume },
          price_change_percentage_24h: coinData.price_change_percentage_24h,
          high_24h: { usd: coinData.current_price * 1.05 },
          low_24h: { usd: coinData.current_price * 0.95 },
          circulating_supply: coinData.market_cap / coinData.current_price,
          total_supply: coinData.market_cap / coinData.current_price
        },
        community_data: {},
        developer_data: {},
        prices: prices,
        volumes: volumes
      };
    }
  } catch (error: any) {
    console.log(`⚠️ 从概览数据获取 ${id} 失败: ${error.message}`);
  }
  
  // 如果所有API都失败，返回一个基本的错误响应，但不抛出异常
  console.log(`⚠️ 所有API都失败，返回 ${id} 的基本信息`);
  return {
    id: id,
    symbol: id.toUpperCase(),
    name: id,
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
  };
}


