# Vercel 部署指南

## 部署步骤

1. **安装 Vercel CLI**（如果还没有）
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   vercel
   ```

4. **生产环境部署**
   ```bash
   vercel --prod
   ```

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量（如果需要）：

- `NODE_ENV=production`
- `CRYPTOCOMPARE_API_KEY=32a4a0ad3f972271ffdfc992ba2a63b0a9fa9e17558836cb6dff452f187233cb`
- `COINMARKETCAP_API_KEY=931662f2eaa4447685061867557d06e6`

## 项目结构

- `server/` - 后端 Express 服务器（Node.js）
- `client/` - 前端 React 应用（Vite）
- `vercel.json` - Vercel 配置文件

## 构建说明

项目使用 monorepo 结构：
- 后端构建输出：`server/dist/`
- 前端构建输出：`client/dist/`

构建命令：`npm run build`

## API 路由

所有 `/api/*` 请求会被路由到 `server/dist/index.js`

## 注意事项

1. 确保所有依赖都已安装
2. 确保 TypeScript 编译没有错误
3. 确保构建输出目录正确

