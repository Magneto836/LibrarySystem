// cloudfunctions/get_resource_summary/index.js
const cloud = require('wx-server-sdk');
cloud.init();

// 设置缓存有效期为 3 秒
const CACHE_EXPIRATION = 3 * 1000;

let resourceCache = null;
let cacheTimestamp = 0;

exports.main = async (event, context) => {
  const db = cloud.database();

  // 检查缓存是否有效
  if (resourceCache && Date.now() - cacheTimestamp < CACHE_EXPIRATION) {
    console.log('使用缓存数据');
    return resourceCache;
  }

  try {
    // 查询所有资源状态
    const result = await db.collection('resource_summary').get();

    // 更新缓存
    resourceCache = result.data.map(item => ({
      type: item.resource_type,
      occupied_count:item.occupied_count,
      totalCount: item.total_count
    }));
    cacheTimestamp = Date.now();

    return resourceCache;
  } catch (err) {
    console.error(err);
    return { error: '查询失败' };
  }
};

/*

// 不使用缓存
exports.main = async (event, context) => {
  const db = cloud.database();
  try {
    // 查询所有资源状态
    const result = await db.collection('resource_summary').get();
    console.log('数据库查询结果:', result);
    // 整理数据：计算每种资源的空闲数量
    const resourceStatusList = result.data.map(item => ({
      type: item.resource_type, // 资源类型
      occupied_count: item.occupied_count, // 空闲数量
      totalCount: item.total_count // 总数量
    }));

    return resourceStatusList; // 返回资源状态列表
  } catch (err) {
    console.error(err);
    return { error: '查询失败' };
  }
};

*/



