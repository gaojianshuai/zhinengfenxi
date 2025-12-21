import { useState, useEffect } from "react";
import { useNotificationService, PriceAlert } from "./NotificationService";

interface NotificationSettingsProps {
  onClose?: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const {
    settings,
    priceAlerts,
    updateSettings,
    addPriceAlert,
    removePriceAlert,
    updatePriceAlert,
    requestNotificationPermission
  } = useNotificationService();

  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlert, setNewAlert] = useState<Partial<PriceAlert>>({
    coinId: "",
    coinName: "",
    coinSymbol: "",
    type: "above",
    price: 0,
    enabled: true
  });

  const handleAddAlert = () => {
    if (!newAlert.coinId || !newAlert.coinName || !newAlert.price) {
      alert("请填写完整的预警信息");
      return;
    }

    addPriceAlert({
      coinId: newAlert.coinId,
      coinName: newAlert.coinName,
      coinSymbol: newAlert.coinSymbol || newAlert.coinId,
      type: newAlert.type || "above",
      price: newAlert.price,
      enabled: newAlert.enabled !== false
    });

    setNewAlert({
      coinId: "",
      coinName: "",
      coinSymbol: "",
      type: "above",
      price: 0,
      enabled: true
    });
    setShowAddAlert(false);
  };

  return (
    <div style={{
      background: "rgba(30, 41, 59, 0.95)",
      borderRadius: "16px",
      padding: "24px",
      maxWidth: "800px",
      margin: "0 auto",
      border: "1px solid rgba(148, 163, 184, 0.1)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "600", margin: 0 }}>通知设置</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* 通知总开关 */}
      <div style={{
        background: "rgba(148, 163, 184, 0.05)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", margin: "0 0 4px 0" }}>启用通知</h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>开启后可以接收价格预警、投资建议更新等通知</p>
          </div>
          <label style={{ position: "relative", display: "inline-block", width: "52px", height: "28px" }}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => {
                updateSettings({ enabled: e.target.checked });
                if (e.target.checked) {
                  requestNotificationPermission();
                }
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: "absolute",
              cursor: "pointer",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: settings.enabled ? "#3b82f6" : "#64748b",
              borderRadius: "28px",
              transition: "0.3s"
            }}>
              <span style={{
                position: "absolute",
                content: '""',
                height: "20px",
                width: "20px",
                left: "4px",
                bottom: "4px",
                background: "white",
                borderRadius: "50%",
                transition: "0.3s",
                transform: settings.enabled ? "translateX(24px)" : "translateX(0)"
              }} />
            </span>
          </label>
        </div>
      </div>

      {/* 通知类型设置 */}
      <div style={{
        background: "rgba(148, 163, 184, 0.05)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px"
      }}>
        <h3 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0" }}>通知类型</h3>
        
        {[
          { key: "priceAlerts", label: "价格预警", desc: "当币种价格达到设定阈值时通知" },
          { key: "recommendationAlerts", label: "投资建议更新", desc: "当币种投资建议发生变化时通知" },
          { key: "eventAlerts", label: "重大事件通知", desc: "接收市场重大事件和公告通知" }
        ].map((item) => (
          <label key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", cursor: "pointer" }}>
            <div>
              <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "500" }}>{item.label}</div>
              <div style={{ color: "#94a3b8", fontSize: "14px" }}>{item.desc}</div>
            </div>
            <input
              type="checkbox"
              checked={settings[item.key as keyof typeof settings] as boolean}
              onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
              disabled={!settings.enabled}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
          </label>
        ))}
      </div>

      {/* 声音设置 */}
      <div style={{
        background: "rgba(148, 163, 184, 0.05)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px"
      }}>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <div>
            <div style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "500" }}>声音提醒</div>
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>收到通知时播放提示音</div>
          </div>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            disabled={!settings.enabled}
            style={{ width: "20px", height: "20px", cursor: "pointer" }}
          />
        </label>
      </div>

      {/* 价格预警列表 */}
      <div style={{
        background: "rgba(148, 163, 184, 0.05)",
        borderRadius: "12px",
        padding: "20px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", margin: 0 }}>价格预警</h3>
          <button
            onClick={() => setShowAddAlert(true)}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            + 添加预警
          </button>
        </div>

        {/* 添加预警表单 */}
        {showAddAlert && (
          <div style={{
            background: "rgba(15, 23, 42, 0.8)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px",
            border: "1px solid rgba(148, 163, 184, 0.2)"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>币种ID</label>
                <input
                  type="text"
                  value={newAlert.coinId || ""}
                  onChange={(e) => setNewAlert({ ...newAlert, coinId: e.target.value })}
                  placeholder="例如: bitcoin"
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>币种名称</label>
                <input
                  type="text"
                  value={newAlert.coinName || ""}
                  onChange={(e) => setNewAlert({ ...newAlert, coinName: e.target.value })}
                  placeholder="例如: Bitcoin"
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>预警类型</label>
                <select
                  value={newAlert.type || "above"}
                  onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as "above" | "below" })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                >
                  <option value="above">价格高于</option>
                  <option value="below">价格低于</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "14px", marginBottom: "4px" }}>价格阈值</label>
                <input
                  type="number"
                  value={newAlert.price || ""}
                  onChange={(e) => setNewAlert({ ...newAlert, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "6px",
                    color: "#f1f5f9",
                    fontSize: "14px"
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <button
                  onClick={handleAddAlert}
                  style={{
                    flex: 1,
                    background: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  添加
                </button>
                <button
                  onClick={() => {
                    setShowAddAlert(false);
                    setNewAlert({
                      coinId: "",
                      coinName: "",
                      coinSymbol: "",
                      type: "above",
                      price: 0,
                      enabled: true
                    });
                  }}
                  style={{
                    flex: 1,
                    background: "rgba(148, 163, 184, 0.2)",
                    color: "#94a3b8",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 预警列表 */}
        {priceAlerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            暂无价格预警，点击"添加预警"创建
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {priceAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ color: "#f1f5f9", fontSize: "16px", fontWeight: "500" }}>
                      {alert.coinName} ({alert.coinSymbol.toUpperCase()})
                    </span>
                    {alert.triggered && (
                      <span style={{
                        background: "#ef4444",
                        color: "white",
                        fontSize: "12px",
                        padding: "2px 8px",
                        borderRadius: "4px"
                      }}>
                        已触发
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                    价格{alert.type === "above" ? "高于" : "低于"} ${alert.price.toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={alert.enabled}
                      onChange={(e) => updatePriceAlert(alert.id, { enabled: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                  </label>
                  <button
                    onClick={() => removePriceAlert(alert.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "4px 8px",
                      fontSize: "14px"
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

