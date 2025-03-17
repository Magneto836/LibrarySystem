// cloud/functions/fetchAllData/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const MAX_LIMIT = 100; // 单次查询最大数量

exports.main = async (event, context) => {
  const collectionName = event.collectionName || 'all_seat'; // 默认集合名称为'all_seat'
  
  try {
    // 获取集合的总记录数
    const countResult = await db.collection(collectionName).count();
    const total = countResult.total;
    console.log(`集合 ${collectionName} 总记录数:`, total);

    // 计算需要请求的次数
    const batchTimes = Math.ceil(total / MAX_LIMIT);
    // 承载所有读操作的promise数组
    const tasks = [];

    for (let i = 0; i < batchTimes; i++) {
      const promise = db.collection(collectionName)
      .orderBy('floor', 'asc')  // 先按楼层升序（1楼 → 2楼 → 3楼）
  .orderBy('area', 'asc')   // 再按区域字母升序（A → B → C → D）
  .orderBy('seatId', 'asc') // 最后按座位编号升序（001 → 002 → ...）
  .skip(i * MAX_LIMIT)
  .limit(MAX_LIMIT)
  .get();
      tasks.push(promise);
    }

    // 等待所有请求完成
    let allData = [];
    const results = await Promise.all(tasks);
    
    // 合并结果
    results.forEach(res => {
      allData = allData.concat(res.data);
    });

    console.log(`成功获取 ${allData.length} 条记录`);
    return { data: allData };

  } catch (err) {
    console.error('获取数据失败:', err);
    return { error: '获取数据失败', details: err.message };
  }
};