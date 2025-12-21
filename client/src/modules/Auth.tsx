import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface AuthState {
  isLogin: boolean;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  error: string | null;
}

export function Auth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    isLogin: true,
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    loading: false,
    error: null
  });

  // 检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, error: null, loading: true }));

    try {
      if (state.isLogin) {
        // 登录
        const response = await axios.post("/api/auth/login", {
          email: state.email,
          password: state.password
        });
        
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/");
      } else {
        // 注册
        if (state.password !== state.confirmPassword) {
          setState(prev => ({ ...prev, error: "两次输入的密码不一致", loading: false }));
          return;
        }
        
        if (state.password.length < 6) {
          setState(prev => ({ ...prev, error: "密码长度至少6位", loading: false }));
          return;
        }
        
        const response = await axios.post("/api/auth/register", {
          email: state.email,
          username: state.username,
          password: state.password
        });
        
        localStorage.setItem("auth_token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/");
      }
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.response?.data?.error || "操作失败，请稍后重试",
        loading: false
      }));
    }
  };

  const toggleMode = () => {
    setState(prev => ({
      ...prev,
      isLogin: !prev.isLogin,
      error: null,
      password: "",
      confirmPassword: ""
    }));
  };

  return (
    <div className="auth-container" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      position: "relative",
      overflow: "hidden",
      padding: "40px 20px"
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: "absolute",
        top: "-50%",
        left: "-50%",
        width: "200%",
        height: "200%",
        background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
        animation: "rotate 20s linear infinite"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-50%",
        right: "-50%",
        width: "200%",
        height: "200%",
        background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
        animation: "rotate 25s linear infinite reverse"
      }} />
      
      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* 主容器 - 居中布局 */}
      <div style={{
        width: "100%",
        maxWidth: "1400px",
        display: "flex",
        gap: "40px",
        alignItems: "center",
        position: "relative",
        zIndex: 1
      }}>
      {/* 左侧介绍区域 */}
      <div className="auth-intro" style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "32px 24px",
        position: "relative",
        zIndex: 1,
        maxWidth: "700px",
        animation: "slideIn 0.8s ease-out"
      }}>
        {/* Logo和标题 */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              boxShadow: "0 8px 24px rgba(59, 130, 246, 0.3)",
              animation: "float 3s ease-in-out infinite"
            }}>
              💎
            </div>
            <div>
              <h1 style={{
                fontSize: "32px",
                fontWeight: "700",
                color: "#f1f5f9",
                margin: 0,
                marginBottom: "4px",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                数字货币智能分析平台
              </h1>
              <p style={{
                color: "#94a3b8",
                fontSize: "14px",
                margin: 0
              }}>
                专业的加密货币市场分析与投资决策工具
              </p>
            </div>
          </div>
          
          {/* 平台背景介绍 - 简化版 */}
          <div style={{
            background: "rgba(30, 41, 59, 0.6)",
            backdropFilter: "blur(10px)",
            borderRadius: "12px",
            padding: "16px",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            marginBottom: "20px"
          }}>
            <p style={{
              color: "#cbd5e1",
              fontSize: "13px",
              lineHeight: "1.6",
              margin: 0
            }}>
              整合<strong style={{ color: "#60a5fa" }}>CryptoCompare</strong>、<strong style={{ color: "#60a5fa" }}>CoinMarketCap</strong>等权威数据源，
              运用<strong style={{ color: "#a78bfa" }}>AI算法</strong>和<strong style={{ color: "#a78bfa" }}>机器学习</strong>，
              提供实时市场洞察、风险评估和投资建议。
            </p>
          </div>
        </div>

        {/* 平台介绍 - 紧凑版 */}
        <div style={{
          background: "rgba(30, 41, 59, 0.6)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          padding: "20px",
          border: "1px solid rgba(148, 163, 184, 0.1)",
          marginBottom: "20px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px"
          }}>
            <div style={{
              width: "3px",
              height: "20px",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              borderRadius: "2px"
            }} />
            <h2 style={{
              color: "#f1f5f9",
              fontSize: "20px",
              fontWeight: "600",
              margin: 0
            }}>
              核心优势
            </h2>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px"
          }}>
            {[
              { icon: "📊", title: "实时数据", desc: "多API源聚合，2分钟刷新" },
              { icon: "🤖", title: "AI分析", desc: "多维度指标智能推荐" },
              { icon: "📈", title: "专业K线", desc: "MA/MACD/RSI技术指标" },
              { icon: "🔔", title: "价格提醒", desc: "智能预警，不错过机会" },
              { icon: "🔗", title: "多链浏览器", desc: "交易查询、地址追踪" },
              { icon: "💼", title: "组合管理", desc: "实时盈亏，收益率分析" }
            ].map((feature, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "12px",
                  background: "rgba(15, 23, 42, 0.5)",
                  borderRadius: "10px",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(15, 23, 42, 0.5)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{
                  fontSize: "24px",
                  lineHeight: "1"
                }}>
                  {feature.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    color: "#f1f5f9",
                    fontSize: "13px",
                    fontWeight: "600",
                    margin: "0 0 2px 0"
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    color: "#94a3b8",
                    fontSize: "11px",
                    margin: 0,
                    lineHeight: "1.4"
                  }}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 技术实力和数据统计 - 合并显示 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "16px",
          marginBottom: "20px"
        }}>
          {/* 技术优势 - 紧凑版 */}
          <div style={{
            background: "rgba(30, 41, 59, 0.6)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid rgba(148, 163, 184, 0.1)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px"
            }}>
              <div style={{
                width: "3px",
                height: "18px",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                borderRadius: "2px"
              }} />
              <h2 style={{
                color: "#f1f5f9",
                fontSize: "18px",
                fontWeight: "600",
                margin: 0
              }}>
                技术实力
              </h2>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px"
            }}>
              {[
                { icon: "🔐", title: "企业级安全", desc: "数据加密传输" },
                { icon: "⚡", title: "高性能架构", desc: "毫秒级响应" },
                { icon: "📡", title: "实时数据流", desc: "零延迟更新" },
                { icon: "🧠", title: "AI驱动", desc: "智能预测分析" }
              ].map((tech, index) => (
                <div
                  key={index}
                  style={{
                    padding: "10px",
                    background: "rgba(15, 23, 42, 0.5)",
                    borderRadius: "10px",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(15, 23, 42, 0.5)";
                  }}
                >
                  <div style={{
                    fontSize: "20px",
                    marginBottom: "6px"
                  }}>
                    {tech.icon}
                  </div>
                  <div style={{
                    color: "#f1f5f9",
                    fontSize: "12px",
                    fontWeight: "600",
                    marginBottom: "2px"
                  }}>
                    {tech.title}
                  </div>
                  <div style={{
                    color: "#94a3b8",
                    fontSize: "10px",
                    lineHeight: "1.3"
                  }}>
                    {tech.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 数据统计 - 紧凑版 */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            {[
              { label: "追踪币种", value: "50+", icon: "💰" },
              { label: "数据源", value: "5+", icon: "🌐" },
              { label: "更新频率", value: "2分钟", icon: "⚡" }
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  background: "rgba(30, 41, 59, 0.6)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "12px",
                  padding: "14px",
                  textAlign: "center",
                  border: "1px solid rgba(148, 163, 184, 0.1)",
                  flex: 1
                }}
              >
                <div style={{
                  fontSize: "20px",
                  marginBottom: "6px"
                }}>
                  {stat.icon}
                </div>
                <div style={{
                  color: "#f1f5f9",
                  fontSize: "20px",
                  fontWeight: "700",
                  marginBottom: "2px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>
                  {stat.value}
                </div>
                <div style={{
                  color: "#94a3b8",
                  fontSize: "11px"
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

        {/* 右侧登录表单 */}
        <div className="auth-form" style={{
          width: "100%",
          maxWidth: "450px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          animation: "slideInRight 0.8s ease-out"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "450px"
          }}>
          {/* 表单标题 */}
          <div style={{
            textAlign: "center",
            marginBottom: "32px"
          }}>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#f1f5f9",
              marginBottom: "8px"
            }}>
              {state.isLogin ? "欢迎回来" : "创建账户"}
            </h2>
            <p style={{
              color: "#94a3b8",
              fontSize: "14px",
              margin: 0
            }}>
              {state.isLogin ? "登录以继续使用专业分析工具" : "立即开始您的智能投资之旅"}
            </p>
          </div>

        {/* 表单卡片 */}
        <div style={{
          background: "rgba(30, 41, 59, 0.8)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          padding: "40px",
          border: "1px solid rgba(148, 163, 184, 0.1)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
        }}>
          {/* 错误提示 */}
          {state.error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "24px",
              color: "#f87171",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>⚠️</span>
              <span>{state.error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 邮箱输入 */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "8px"
              }}>
                邮箱地址
              </label>
              <input
                type="email"
                value={state.email}
                onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
                required
                placeholder="your@email.com"
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "12px",
                  color: "#f1f5f9",
                  fontSize: "16px",
                  outline: "none",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* 用户名输入（仅注册时显示） */}
            {!state.isLogin && (
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px"
                }}>
                  用户名
                </label>
                <input
                  type="text"
                  value={state.username}
                  onChange={(e) => setState(prev => ({ ...prev, username: e.target.value }))}
                  required={!state.isLogin}
                  placeholder="选择一个用户名"
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "12px",
                    color: "#f1f5f9",
                    fontSize: "16px",
                    outline: "none",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.2)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            )}

            {/* 密码输入 */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "8px"
              }}>
                密码
              </label>
              <input
                type="password"
                value={state.password}
                onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
                required
                placeholder={state.isLogin ? "输入您的密码" : "至少6位字符"}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "12px",
                  color: "#f1f5f9",
                  fontSize: "16px",
                  outline: "none",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* 确认密码输入（仅注册时显示） */}
            {!state.isLogin && (
              <div style={{ marginBottom: "24px" }}>
                <label style={{
                  display: "block",
                  color: "#e2e8f0",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px"
                }}>
                  确认密码
                </label>
                <input
                  type="password"
                  value={state.confirmPassword}
                  onChange={(e) => setState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required={!state.isLogin}
                  placeholder="再次输入密码"
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "12px",
                    color: "#f1f5f9",
                    fontSize: "16px",
                    outline: "none",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.2)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={state.loading}
              style={{
                width: "100%",
                padding: "16px",
                background: state.loading
                  ? "rgba(148, 163, 184, 0.3)"
                  : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "none",
                borderRadius: "12px",
                color: "white",
                fontSize: "16px",
                fontWeight: "600",
                cursor: state.loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: state.loading
                  ? "none"
                  : "0 4px 12px rgba(59, 130, 246, 0.3)",
                marginBottom: "24px"
              }}
              onMouseEnter={(e) => {
                if (!state.loading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(59, 130, 246, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!state.loading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                }
              }}
            >
              {state.loading ? "处理中..." : state.isLogin ? "登录" : "注册"}
            </button>

            {/* 切换模式 */}
            <div style={{
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "14px"
            }}>
              {state.isLogin ? "还没有账户？" : "已有账户？"}
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  background: "none",
                  border: "none",
                  color: "#60a5fa",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginLeft: "4px",
                  textDecoration: "underline"
                }}
              >
                {state.isLogin ? "立即注册" : "立即登录"}
              </button>
            </div>
          </form>
        </div>

          {/* 底部说明 */}
          <div style={{
            textAlign: "center",
            marginTop: "24px",
            color: "#64748b",
            fontSize: "12px"
          }}>
            <p style={{ margin: "4px 0" }}>
              安全 · 专业 · 可靠
            </p>
            <p style={{ margin: "4px 0" }}>
              使用本平台即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* 移动端响应式样式 */}
      <style>{`
        @media (max-width: 1200px) {
          .auth-container > div {
            max-width: 1200px !important;
            gap: 40px !important;
          }
        }
        @media (max-width: 1024px) {
          .auth-container {
            padding: 20px !important;
          }
          .auth-container > div {
            flex-direction: column !important;
            gap: 40px !important;
          }
          .auth-intro {
            max-width: 100% !important;
            padding: 30px 20px !important;
          }
          .auth-form {
            max-width: 100% !important;
          }
        }
        @media (max-width: 768px) {
          .auth-container {
            padding: 16px !important;
          }
          .auth-intro {
            padding: 24px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

