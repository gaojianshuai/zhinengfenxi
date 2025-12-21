import { useEffect, useRef, useState } from "react";

export interface NotificationSettings {
  enabled: boolean;
  priceAlerts: boolean;
  recommendationAlerts: boolean;
  eventAlerts: boolean;
  soundEnabled: boolean;
}

export interface PriceAlert {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  type: "above" | "below";
  price: number;
  enabled: boolean;
  triggered: boolean;
}

export interface Notification {
  id: string;
  type: "price" | "recommendation" | "event";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  coinId?: string;
  coinName?: string;
}

const SETTINGS_KEY = "notification_settings";
const PRICE_ALERTS_KEY = "price_alerts";
const NOTIFICATIONS_KEY = "notifications";

// 默认设置
const defaultSettings: NotificationSettings = {
  enabled: true,
  priceAlerts: true,
  recommendationAlerts: true,
  eventAlerts: true,
  soundEnabled: true
};

// 加载设置
export function loadSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn("加载通知设置失败:", e);
  }
  return defaultSettings;
}

// 保存设置
export function saveSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("保存通知设置失败:", e);
  }
}

// 加载价格预警
export function loadPriceAlerts(): PriceAlert[] {
  try {
    const stored = localStorage.getItem(PRICE_ALERTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("加载价格预警失败:", e);
  }
  return [];
}

// 保存价格预警
export function savePriceAlerts(alerts: PriceAlert[]): void {
  try {
    localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.warn("保存价格预警失败:", e);
  }
}

// 加载通知历史
export function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("加载通知历史失败:", e);
  }
  return [];
}

// 保存通知历史
export function saveNotifications(notifications: Notification[]): void {
  try {
    // 只保留最近100条通知
    const limited = notifications.slice(0, 100);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limited));
  } catch (e) {
    console.warn("保存通知历史失败:", e);
  }
}

// 添加通知
export function addNotification(notification: Omit<Notification, "id" | "timestamp" | "read">): void {
  const notifications = loadNotifications();
  const newNotification: Notification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    read: false
  };
  notifications.unshift(newNotification);
  saveNotifications(notifications);
}

// 请求浏览器通知权限
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("浏览器不支持通知功能");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

// 发送浏览器通知
export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options
    });

    // 点击通知时聚焦窗口
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // 5秒后自动关闭
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
}

// 播放通知声音
export function playNotificationSound(): void {
  try {
    // 使用Web Audio API生成简单的提示音
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.warn("播放通知声音失败:", e);
  }
}

// 通知服务Hook
export function useNotificationService() {
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings());
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(loadPriceAlerts());
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications());
  const [unreadCount, setUnreadCount] = useState(0);
  const previousCoinsRef = useRef<Map<string, any>>(new Map());

  // 更新设置
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
  };

  // 添加价格预警
  const addPriceAlert = (alert: Omit<PriceAlert, "id" | "triggered">) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggered: false
    };
    const updated = [...priceAlerts, newAlert];
    setPriceAlerts(updated);
    savePriceAlerts(updated);
  };

  // 删除价格预警
  const removePriceAlert = (id: string) => {
    const updated = priceAlerts.filter(a => a.id !== id);
    setPriceAlerts(updated);
    savePriceAlerts(updated);
  };

  // 更新价格预警
  const updatePriceAlert = (id: string, updates: Partial<PriceAlert>) => {
    const updated = priceAlerts.map(a => a.id === id ? { ...a, ...updates } : a);
    setPriceAlerts(updated);
    savePriceAlerts(updated);
  };

  // 标记通知为已读
  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
    updateUnreadCount();
  };

  // 标记所有通知为已读
  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
    updateUnreadCount();
  };

  // 删除通知
  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
    updateUnreadCount();
  };

  // 清空通知
  const clearNotifications = () => {
    setNotifications([]);
    saveNotifications([]);
    updateUnreadCount();
  };

  // 更新未读数量
  const updateUnreadCount = () => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  };

  // 检查价格预警
  const checkPriceAlerts = (coins: any[]) => {
    if (!settings.enabled || !settings.priceAlerts) return;

    priceAlerts.forEach(alert => {
      if (!alert.enabled || alert.triggered) return;

      const coin = coins.find(c => c.id === alert.coinId || c.symbol.toLowerCase() === alert.coinId.toLowerCase());
      if (!coin) return;

      const currentPrice = coin.current_price;
      let shouldTrigger = false;

      if (alert.type === "above" && currentPrice >= alert.price) {
        shouldTrigger = true;
      } else if (alert.type === "below" && currentPrice <= alert.price) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        // 触发预警
        updatePriceAlert(alert.id, { triggered: true });
        
        const title = `${alert.coinName} (${alert.coinSymbol.toUpperCase()}) 价格预警`;
        const message = `价格已${alert.type === "above" ? "达到或超过" : "降至或低于"} $${alert.price.toLocaleString()}`;
        
        addNotification({
          type: "price",
          title,
          message,
          coinId: alert.coinId,
          coinName: alert.coinName
        });

        if (settings.enabled) {
          sendBrowserNotification(title, { body: message });
        }

        if (settings.soundEnabled) {
          playNotificationSound();
        }
      }
    });
  };

  // 检查投资建议变化
  const checkRecommendationChanges = (coins: any[]) => {
    if (!settings.enabled || !settings.recommendationAlerts) return;

    coins.forEach(coin => {
      const previous = previousCoinsRef.current.get(coin.id);
      
      if (previous && previous.recommendation !== coin.recommendation) {
        const title = `${coin.name} 投资建议更新`;
        const message = `投资建议从"${getRecommendationLabel(previous.recommendation)}"变更为"${getRecommendationLabel(coin.recommendation)}"`;
        
        addNotification({
          type: "recommendation",
          title,
          message,
          coinId: coin.id,
          coinName: coin.name
        });

        if (settings.enabled) {
          sendBrowserNotification(title, { body: message });
        }

        if (settings.soundEnabled) {
          playNotificationSound();
        }
      }

      // 更新缓存
      previousCoinsRef.current.set(coin.id, {
        recommendation: coin.recommendation,
        score: coin.score
      });
    });
  };

  // 获取投资建议标签
  const getRecommendationLabel = (rec: string) => {
    const labels: Record<string, string> = {
      strong_buy: "强烈买入",
      buy: "买入",
      hold: "观望",
      sell: "减持/卖出"
    };
    return labels[rec] || rec;
  };

  // 发送重大事件通知
  const sendEventNotification = (title: string, message: string) => {
    if (!settings.enabled || !settings.eventAlerts) return;

    addNotification({
      type: "event",
      title,
      message
    });

    if (settings.enabled) {
      sendBrowserNotification(title, { body: message });
    }

    if (settings.soundEnabled) {
      playNotificationSound();
    }
  };

  // 初始化时请求通知权限
  useEffect(() => {
    if (settings.enabled) {
      requestNotificationPermission();
    }
  }, [settings.enabled]);

  // 更新未读数量
  useEffect(() => {
    updateUnreadCount();
  }, [notifications]);

  return {
    settings,
    priceAlerts,
    notifications,
    unreadCount,
    updateSettings,
    addPriceAlert,
    removePriceAlert,
    updatePriceAlert,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    checkPriceAlerts,
    checkRecommendationChanges,
    sendEventNotification,
    requestNotificationPermission
  };
}

