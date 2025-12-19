// 手动更新本地数据文件的脚本
// 使用方法: node server/scripts/update-local-data.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

async function fetchAndSave() {
  try {
    console.log('开始从 CoinGecko 获取数据...');
    
    const response = await axios.get(`${COINGECKO_API}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 50,
        page: 1,
        sparkline: true,
        price_change_percentage: '24h'
      },
      timeout: 30000
    });
    
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('API返回空数据');
    }
    
    const dataPath = path.join(__dirname, '../data/coins-backup.json');
    fs.writeFileSync(dataPath, JSON.stringify(response.data, null, 2), 'utf-8');
    
    console.log(`✅ 成功获取并保存 ${response.data.length} 条数据到 ${dataPath}`);
    console.log('数据已更新，重启服务后会自动使用本地数据');
    
  } catch (error) {
    console.error('❌ 获取数据失败:', error.message);
    console.error('\n请检查:');
    console.error('1. 网络连接是否正常');
    console.error('2. 是否可以访问 api.coingecko.com');
    console.error('3. 是否需要配置代理');
    console.error('\n如果网络受限，可以手动编辑 server/data/coins-backup.json 文件');
    process.exit(1);
  }
}

fetchAndSave();

