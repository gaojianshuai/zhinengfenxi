import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: number;
  portfolio: PortfolioItem[];
  favorites: string[];
  priceAlerts: PriceAlert[];
}

export interface PortfolioItem {
  coinId: string;
  symbol: string;
  amount: number;
  avgPrice: number;
  addedAt: number;
}

export interface PriceAlert {
  coinId: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  enabled: boolean;
  createdAt: number;
}

const USERS_FILE = path.join(__dirname, "../data/users.json");

// 初始化用户数据文件
function initUsersFile() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }
}

// 读取用户数据
function readUsers(): User[] {
  initUsersFile();
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// 保存用户数据
function saveUsers(users: User[]) {
  initUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 生成密码哈希（简单实现，生产环境应使用bcrypt）
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "crypto-intel-salt").digest("hex");
}

// 验证密码
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// 生成JWT token（简化版，生产环境应使用jsonwebtoken库）
function generateToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天过期
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// 验证token
export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    if (payload.exp && payload.exp > Date.now()) {
      return { userId: payload.userId };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 注册用户
export function registerUser(email: string, username: string, password: string): { user: Omit<User, "passwordHash">; token: string } | null {
  const users = readUsers();
  
  // 检查邮箱是否已存在
  if (users.some(u => u.email === email)) {
    throw new Error("邮箱已被注册");
  }
  
  // 检查用户名是否已存在
  if (users.some(u => u.username === username)) {
    throw new Error("用户名已被使用");
  }
  
  // 创建新用户
  const newUser: User = {
    id: crypto.randomUUID(),
    email,
    username,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
    portfolio: [],
    favorites: [],
    priceAlerts: []
  };
  
  users.push(newUser);
  saveUsers(users);
  
  const { passwordHash, ...userWithoutPassword } = newUser;
  const token = generateToken(newUser.id);
  
  return { user: userWithoutPassword, token };
}

// 登录用户
export function loginUser(email: string, password: string): { user: Omit<User, "passwordHash">; token: string } | null {
  const users = readUsers();
  const user = users.find(u => u.email === email);
  
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("邮箱或密码错误");
  }
  
  const { passwordHash, ...userWithoutPassword } = user;
  const token = generateToken(user.id);
  
  return { user: userWithoutPassword, token };
}

// 根据ID获取用户
export function getUserById(userId: string): Omit<User, "passwordHash"> | null {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// 更新用户投资组合
export function updatePortfolio(userId: string, portfolio: PortfolioItem[]): boolean {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return false;
  
  users[userIndex].portfolio = portfolio;
  saveUsers(users);
  return true;
}

// 更新用户收藏
export function updateFavorites(userId: string, favorites: string[]): boolean {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return false;
  
  users[userIndex].favorites = favorites;
  saveUsers(users);
  return true;
}

// 更新价格提醒
export function updatePriceAlerts(userId: string, alerts: PriceAlert[]): boolean {
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return false;
  
  users[userIndex].priceAlerts = alerts;
  saveUsers(users);
  return true;
}

