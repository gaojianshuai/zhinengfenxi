import { useState } from "react";
import { useNotificationService } from "./NotificationService";
import { NotificationHistory } from "./NotificationHistory";
import { NotificationSettings } from "./NotificationSettings";

export function NotificationBell() {
  const { unreadCount } = useNotificationService();
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "12px",
        background: "rgba(30, 41, 59, 0.6)",
        borderRadius: "12px",
        padding: "6px 12px",
        border: "1px solid rgba(148, 163, 184, 0.15)",
        backdropFilter: "blur(10px)"
      }}>
        <button
          onClick={() => setShowHistory(true)}
          style={{
            position: "relative",
            background: "transparent",
            border: "none",
            borderRadius: "10px",
            padding: "10px",
            cursor: "pointer",
            color: "#94a3b8",
            fontSize: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            transition: "all 0.3s ease",
            outline: "none"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
            e.currentTarget.style.color = "#60a5fa";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="通知"
        >
          <span style={{ fontSize: "22px" }}>🔔</span>
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "700",
              padding: "2px 6px",
              minWidth: "18px",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
              border: "2px solid rgba(30, 41, 59, 0.8)"
            }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
        
        <div style={{
          width: "1px",
          height: "24px",
          background: "rgba(148, 163, 184, 0.2)"
        }} />
        
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: "transparent",
            border: "none",
            borderRadius: "10px",
            padding: "10px 14px",
            cursor: "pointer",
            color: "#94a3b8",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.3s ease",
            outline: "none"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
            e.currentTarget.style.color = "#60a5fa";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#94a3b8";
          }}
          title="通知设置"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 17.364m12.728 0l-4.243-4.243m-4.242 0L5.636 6.636"></path>
          </svg>
          <span>设置</span>
        </button>
      </div>

      {/* 通知历史弹窗 */}
      {showHistory && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }} onClick={() => setShowHistory(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <NotificationHistory onClose={() => setShowHistory(false)} />
          </div>
        </div>
      )}

      {/* 通知设置弹窗 */}
      {showSettings && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
          overflowY: "auto"
        }} onClick={() => setShowSettings(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <NotificationSettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}
    </>
  );
}

