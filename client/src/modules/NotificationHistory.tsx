import { useState } from "react";
import { useNotificationService, Notification } from "./NotificationService";

interface NotificationHistoryProps {
  onClose?: () => void;
}

export function NotificationHistory({ onClose }: NotificationHistoryProps) {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications
  } = useNotificationService();

  const [filter, setFilter] = useState<"all" | "price" | "recommendation" | "event">("all");

  const filteredNotifications = notifications.filter(n => 
    filter === "all" || n.type === filter
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "price":
        return "💰";
      case "recommendation":
        return "📊";
      case "event":
        return "📢";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "price":
        return "#3b82f6";
      case "recommendation":
        return "#22c55e";
      case "event":
        return "#f59e0b";
      default:
        return "#94a3b8";
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{
      background: "rgba(30, 41, 59, 0.95)",
      borderRadius: "16px",
      padding: "24px",
      maxWidth: "800px",
      margin: "0 auto",
      border: "1px solid rgba(148, 163, 184, 0.1)",
      maxHeight: "80vh",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "600", margin: 0 }}>通知历史</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={markAllAsRead}
            style={{
              background: "rgba(59, 130, 246, 0.2)",
              color: "#60a5fa",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            全部已读
          </button>
          <button
            onClick={clearNotifications}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            清空
          </button>
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
      </div>

      {/* 筛选器 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { value: "all", label: "全部" },
          { value: "price", label: "价格预警" },
          { value: "recommendation", label: "投资建议" },
          { value: "event", label: "重大事件" }
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value as any)}
            style={{
              padding: "6px 12px",
              background: filter === item.value ? "rgba(59, 130, 246, 0.2)" : "rgba(148, 163, 184, 0.1)",
              border: `1px solid ${filter === item.value ? "rgba(59, 130, 246, 0.5)" : "rgba(148, 163, 184, 0.2)"}`,
              color: filter === item.value ? "#60a5fa" : "#94a3b8",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 通知列表 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            暂无通知
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              style={{
                background: notification.read ? "rgba(15, 23, 42, 0.8)" : "rgba(59, 130, 246, 0.1)",
                borderRadius: "8px",
                padding: "16px",
                border: `1px solid ${notification.read ? "rgba(148, 163, 184, 0.2)" : "rgba(59, 130, 246, 0.3)"}`,
                cursor: notification.read ? "default" : "pointer",
                transition: "all 0.2s",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                if (!notification.read) {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!notification.read) {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                }
              }}
            >
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{
                  fontSize: "24px",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `${getNotificationColor(notification.type)}20`,
                  borderRadius: "8px",
                  flexShrink: 0
                }}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                    <h3 style={{
                      color: notification.read ? "#94a3b8" : "#f1f5f9",
                      fontSize: "16px",
                      fontWeight: notification.read ? "400" : "600",
                      margin: 0
                    }}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span style={{
                        width: "8px",
                        height: "8px",
                        background: "#3b82f6",
                        borderRadius: "50%",
                        flexShrink: 0,
                        marginTop: "6px"
                      }} />
                    )}
                  </div>
                  <p style={{
                    color: notification.read ? "#64748b" : "#cbd5e1",
                    fontSize: "14px",
                    margin: "0 0 8px 0",
                    lineHeight: "1.5"
                  }}>
                    {notification.message}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b", fontSize: "12px" }}>
                      {formatTime(notification.timestamp)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "4px 8px",
                        fontSize: "12px"
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

