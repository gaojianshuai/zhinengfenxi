import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

interface Transaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasPrice: string;
  timestamp: number;
  status: "success" | "pending" | "failed";
  token?: string;
  tokenSymbol?: string;
}

interface AddressInfo {
  address: string;
  balance: string;
  transactionCount: number;
  firstSeen: number;
  tags?: string[];
  type: "wallet" | "contract";
}

interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  transactions: number;
  gasUsed: number;
  gasLimit: number;
}

export function BlockchainExplorer() {
  const navigate = useNavigate();
  const { type, query } = useParams<{ type?: string; query?: string }>();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(query || searchParams.get("q") || "");
  const [searchType, setSearchType] = useState<"auto" | "tx" | "address" | "block">("auto");
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // 加载最近搜索记录
  useEffect(() => {
    const stored = localStorage.getItem("recent_searches");
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // 保存搜索记录
  const saveSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
  };

  // 检测搜索类型
  const detectSearchType = (query: string): "tx" | "address" | "block" => {
    if (!query) return "tx";
    
    // 交易hash: 0x开头，66字符
    if (query.startsWith("0x") && query.length === 66) {
      return "tx";
    }
    
    // 地址: 0x开头，42字符
    if (query.startsWith("0x") && query.length === 42) {
      return "address";
    }
    
    // 区块号: 纯数字
    if (/^\d+$/.test(query)) {
      return "block";
    }
    
    return "tx";
  };

  // 搜索功能
  const handleSearch = async (inputValue?: string) => {
    const searchValue = inputValue || searchInput.trim();
    if (!searchValue) {
      setError("请输入搜索内容");
      return;
    }

    const detectedType = searchType === "auto" ? detectSearchType(searchValue) : searchType;
    setLoading(true);
    setError(null);
    setTransaction(null);
    setAddressInfo(null);
    setBlockInfo(null);

    try {
      // 调用真实API（使用相对路径，通过vite代理）
      if (detectedType === "tx") {
        // 查询交易信息
        const response = await axios.get(`/api/blockchain/tx/${searchValue}`);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        setTransaction(response.data);
        saveSearch(searchValue);
      } else if (detectedType === "address") {
        // 查询地址信息
        const response = await axios.get(`/api/blockchain/address/${searchValue}`);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        setAddressInfo(response.data);
        saveSearch(searchValue);
      } else if (detectedType === "block") {
        // 查询区块信息
        const response = await axios.get(`/api/blockchain/block/${searchValue}`);
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        setBlockInfo(response.data);
        saveSearch(searchValue);
      } else {
        // 尝试搜索币种
        try {
          const response = await axios.get(`/api/blockchain/search/${searchValue}`);
          if (response.data && response.data.type === "coin") {
            // 如果找到币种，跳转到币种详情页
            navigate(`/coins/${response.data.symbol.toLowerCase()}`);
            return;
          }
        } catch (e) {
          // 币种搜索失败，继续显示错误
        }
        setError("未找到相关信息，请检查输入是否正确");
      }
    } catch (e: any) {
      console.error("搜索失败:", e);
      if (e.response?.data?.error) {
        setError(e.response.data.error);
      } else if (e.message) {
        setError(e.message);
      } else {
        setError("搜索失败，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  };

  // 格式化地址
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // 格式化相对时间
  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return formatTime(timestamp);
  };

  // 初始化时如果有query参数，自动搜索
  useEffect(() => {
    const q = query || searchParams.get("q") || "";
    if (q) {
      setSearchInput(q);
      const detectedType = detectSearchType(q);
      setSearchType(detectedType);
      // 延迟执行搜索，确保组件已完全加载
      const timer = setTimeout(() => {
        handleSearch(q);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [query]);

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
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              多链浏览器
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "16px", margin: 0 }}>
              查询交易、地址、区块信息
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

      {/* 搜索框 */}
      <div style={{
        background: "rgba(30, 41, 59, 0.8)",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "24px",
        border: "1px solid rgba(148, 163, 184, 0.1)"
      }}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <div style={{ flex: 1, display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="输入交易哈希、地址或区块号..."
              style={{
                flex: 1,
                padding: "14px 20px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "12px",
                color: "#f1f5f9",
                fontSize: "16px",
                fontFamily: "monospace"
              }}
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              style={{
                padding: "14px 16px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "12px",
                color: "#f1f5f9",
                fontSize: "14px",
                cursor: "pointer"
              }}
            >
              <option value="auto">自动识别</option>
              <option value="tx">交易哈希</option>
              <option value="address">地址</option>
              <option value="block">区块号</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: "14px 32px",
                background: loading
                  ? "rgba(148, 163, 184, 0.2)"
                  : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: loading ? "none" : "0 4px 12px rgba(59, 130, 246, 0.3)"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(59, 130, 246, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                }
              }}
            >
              {loading ? "搜索中..." : "搜索"}
            </button>
          </div>
        </div>

        {/* 最近搜索 */}
        {recentSearches.length > 0 && (
          <div>
            <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>最近搜索</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {recentSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchInput(search);
                    handleSearch();
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "8px",
                    color: "#60a5fa",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  }}
                >
                  {formatAddress(search)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
          color: "#f87171",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}

      {/* 交易详情 */}
      {transaction && (
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
            <h2 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "600", margin: 0 }}>
              交易详情
            </h2>
            <span style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              background: transaction.status === "success"
                ? "rgba(34, 197, 94, 0.2)"
                : transaction.status === "pending"
                ? "rgba(251, 191, 36, 0.2)"
                : "rgba(239, 68, 68, 0.2)",
              color: transaction.status === "success"
                ? "#22c55e"
                : transaction.status === "pending"
                ? "#fbbf24"
                : "#ef4444"
            }}>
              {transaction.status === "success" ? "成功" : transaction.status === "pending" ? "待确认" : "失败"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>交易哈希</div>
              <div style={{
                color: "#f1f5f9",
                fontSize: "16px",
                fontFamily: "monospace",
                wordBreak: "break-all",
                background: "rgba(15, 23, 42, 0.8)",
                padding: "12px",
                borderRadius: "8px"
              }}>
                {transaction.hash}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>区块号</div>
              <div style={{
                color: "#60a5fa",
                fontSize: "18px",
                fontWeight: "600",
                cursor: "pointer"
              }}
              onClick={() => {
                setSearchInput(transaction.blockNumber.toString());
                setSearchType("block");
                handleSearch();
              }}
              >
                #{transaction.blockNumber.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>时间</div>
              <div style={{ color: "#f1f5f9", fontSize: "16px" }}>
                {formatTime(transaction.timestamp)}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
                {formatRelativeTime(transaction.timestamp)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>发送方</div>
              <div
                style={{
                  color: "#60a5fa",
                  fontSize: "16px",
                  fontFamily: "monospace",
                  cursor: "pointer",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  borderRadius: "8px",
                  transition: "all 0.2s ease"
                }}
                onClick={() => {
                  setSearchInput(transaction.from);
                  setSearchType("address");
                  handleSearch();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(15, 23, 42, 0.8)";
                }}
              >
                {transaction.from}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>接收方</div>
              <div
                style={{
                  color: "#60a5fa",
                  fontSize: "16px",
                  fontFamily: "monospace",
                  cursor: "pointer",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  borderRadius: "8px",
                  transition: "all 0.2s ease"
                }}
                onClick={() => {
                  setSearchInput(transaction.to);
                  setSearchType("address");
                  handleSearch();
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(15, 23, 42, 0.8)";
                }}
              >
                {transaction.to}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>金额</div>
              <div style={{ color: "#22c55e", fontSize: "20px", fontWeight: "600" }}>
                {transaction.value} {transaction.tokenSymbol || "ETH"}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>Gas Used</div>
              <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600" }}>
                {transaction.gasUsed.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>Gas Price</div>
              <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600" }}>
                {transaction.gasPrice} Gwei
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>交易费用</div>
              <div style={{ color: "#f59e0b", fontSize: "18px", fontWeight: "600" }}>
                {(parseInt(transaction.gasPrice) * transaction.gasUsed / 1e9).toFixed(6)} ETH
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 地址详情 */}
      {addressInfo && (
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
            <h2 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "600", margin: 0 }}>
              地址信息
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {addressInfo.tags && addressInfo.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: "rgba(59, 130, 246, 0.2)",
                    color: "#60a5fa"
                  }}
                >
                  {tag}
                </span>
              ))}
              <span style={{
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "500",
                background: addressInfo.type === "contract"
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(148, 163, 184, 0.2)",
                color: addressInfo.type === "contract" ? "#a78bfa" : "#94a3b8"
              }}>
                {addressInfo.type === "contract" ? "合约" : "钱包"}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>地址</div>
            <div style={{
              color: "#f1f5f9",
              fontSize: "18px",
              fontFamily: "monospace",
              wordBreak: "break-all",
              background: "rgba(15, 23, 42, 0.8)",
              padding: "12px",
              borderRadius: "8px"
            }}>
              {addressInfo.address}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>余额</div>
              <div style={{ color: "#22c55e", fontSize: "24px", fontWeight: "700" }}>
                {addressInfo.balance} ETH
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>交易次数</div>
              <div style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700" }}>
                {addressInfo.transactionCount.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>首次出现</div>
              <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600" }}>
                {formatTime(addressInfo.firstSeen)}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
                {formatRelativeTime(addressInfo.firstSeen)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 区块详情 */}
      {blockInfo && (
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid rgba(148, 163, 184, 0.1)"
        }}>
          <h2 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
            区块信息
          </h2>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>区块哈希</div>
            <div style={{
              color: "#f1f5f9",
              fontSize: "18px",
              fontFamily: "monospace",
              wordBreak: "break-all",
              background: "rgba(15, 23, 42, 0.8)",
              padding: "12px",
              borderRadius: "8px"
            }}>
              {blockInfo.hash}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>区块号</div>
              <div style={{ color: "#60a5fa", fontSize: "24px", fontWeight: "700" }}>
                #{blockInfo.number.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>时间</div>
              <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "600" }}>
                {formatTime(blockInfo.timestamp)}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
                {formatRelativeTime(blockInfo.timestamp)}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>交易数</div>
              <div style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700" }}>
                {blockInfo.transactions.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "8px" }}>Gas使用率</div>
              <div style={{ color: "#f59e0b", fontSize: "24px", fontWeight: "700" }}>
                {((blockInfo.gasUsed / blockInfo.gasLimit) * 100).toFixed(2)}%
              </div>
              <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
                {blockInfo.gasUsed.toLocaleString()} / {blockInfo.gasLimit.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && !transaction && !addressInfo && !blockInfo && (
        <div style={{
          textAlign: "center",
          padding: "80px 20px",
          color: "#94a3b8"
        }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔍</div>
          <h3 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>
            开始搜索
          </h3>
          <p style={{ fontSize: "14px", margin: 0 }}>
            输入交易哈希、地址或区块号进行查询
          </p>
        </div>
      )}
    </div>
  );
}

