## 数字货币智能分析平台

**特性概览**

- **实时行情总览**：智能多API源切换（CoinGecko → CoinCap → Binance），支持前 50 大市值币种的价格、24h 涨跌幅、市值、成交额和 7 日走势。
- **智能评分与投资建议**：基于流动性、成交额/市值比、短期涨跌幅等计算 0–100 分的综合评分，并给出「强烈买入 / 买入 / 观望 / 减持」建议。
- **专业大屏风格 UI**：暗色专业交易风格，卡片化布局，自适应 PC 与平板/手机。
- **自动定时刷新**：每 60 秒自动拉取最新数据，也可手动一键刷新。
- **高可用性保障**：多API源自动切换 + 模拟数据备用，确保系统始终可用。

### 一键本地启动

1. 在项目根目录执行（仅需一次，会自动安装所有依赖）：

```bash
npm install
```

2. 一键启动前后端（推荐方式）：

```bash
npm run dev
```

这个命令会同时启动：
- 后端服务：`http://localhost:4000`
- 前端页面：`http://localhost:5173`

3. 浏览器访问：

- **前端页面**：`http://localhost:5173`（会自动代理 API 请求到后端）
- **后端 API**：`http://localhost:4000/api/overview`（可直接测试）

### 其他命令

- **生产模式构建**：
```bash
npm run build
npm start
```

- **Windows 一键启动脚本**：双击 `start-all.bat`（会自动安装依赖并启动）

### API 数据源说明

系统采用**智能多源切换**策略，按以下顺序尝试：

1. **CryptoCompare API**（优先源1）- 使用API密钥，最可靠，包含完整数据和7日走势图 ⭐⭐⭐
2. **CoinMarketCap API**（优先源2）- 使用API密钥，可靠，包含完整数据和7日走势图 ⭐⭐
3. **CoinGecko API**（主源）- 完整数据，包含7日走势图
4. **CoinGecko API**（简化版）- 不包含走势图，提高速度
5. **CoinCap API**（备用源1）- 免费，无需API key
6. **Binance API**（备用源2）- 交易所实时数据
7. **本地数据文件**（备用源3）- `server/data/coins-backup.json`
8. **模拟数据**（最后备用）- 确保系统始终可用

**CryptoCompare API** 和 **CoinMarketCap API** 已配置API密钥，优先使用，提供最稳定的实时数据。

### 故障排查

如果遇到数据加载失败：
1. 确保后端服务已启动（检查 `http://localhost:4000/api/health` 是否返回 `{"status":"ok"}`）
2. 检查网络连接（系统会自动尝试多个API源）
3. 查看浏览器控制台和终端错误信息
4. 点击页面上的"重试"按钮
5. 如果所有API都失败，系统会自动使用模拟数据模式（确保功能可用）

### 网络问题解决

如果所有外部API都超时失败（常见于企业网络或受限环境）：

**方案1：配置代理（推荐）**

在启动服务前设置代理环境变量：

```bash
# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:7890"
$env:HTTPS_PROXY="http://127.0.0.1:7890"
npm run dev

# Windows CMD
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890
npm run dev

# Linux/Mac
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
npm run dev
```

**方案2：使用VPN**
- 连接VPN后，外部API应该可以正常访问

**方案3：使用本地数据文件（推荐）**

如果网络受限无法访问外部API，可以使用本地数据文件：

1. **手动更新数据**（需要能访问一次API）：
```bash
cd server
npm run update-data
```

2. **手动编辑数据文件**：
   - 编辑 `server/data/coins-backup.json`
   - 格式参考文件中的示例
   - 保存后重启服务即可使用

3. **系统会自动使用本地数据**：
   - 如果所有API都失败，系统会自动尝试加载本地数据文件
   - 如果本地文件存在且有数据，会优先使用本地数据

**方案4：使用模拟数据模式**
- 如果所有API和本地文件都失败，系统会自动使用模拟数据
- 数据会实时波动，适合演示和测试使用

### 诊断工具

访问 `http://localhost:4000/api/diagnose` 可以测试各个API的连接状态，查看详细的错误信息。

访问 `http://localhost:4000/api/health` 可以检查后端服务状态。

