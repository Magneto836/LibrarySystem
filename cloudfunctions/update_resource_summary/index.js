// 云函数入口文件
// 更新 resource_summary 数据表，用于资源占用情况展示 
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();

  try {
    // 初始化汇总数据
    const summaryData = {};

    // 查询 all_seat 表的数据
    const allSeatResult = await db.collection('all_seat').count();
    summaryData.seat = {
      resource_type: 'seat',
      total_count: allSeatResult.total,
      occupied_count: await getOccupiedCount('all_seat', { status: db.command.in(['occupied', 'adminOccupied']) })
    };

    // 查询 phone_booth 表的数据
    const phoneBoothResult = await db.collection('phone_booths').count();
    summaryData.phone_booth = {
      resource_type: 'phone_booth',
      total_count: phoneBoothResult.total,
      occupied_count: await getOccupiedCount('phone_booths', { status: db.command.in(['occupied', 'adminOccupied']) })
    };

    // 查询 discussion_area 表的数据
    const discussionAreaResult = await db.collection('discussion_areas').count();
    summaryData.discussion_area = {
      resource_type: 'discussion_area',
      total_count: discussionAreaResult.total,
      occupied_count: await getOccupiedCount('discussion_areas', { status: db.command.in(['occupied', 'adminOccupied']) })
    };

    // 将汇总数据写入 resource_summary 表
    const batchUpdatePromises = [];
    for (const key in summaryData) {
      const item = summaryData[key];
      batchUpdatePromises.push(
        db.collection('resource_summary')
          .where({ resource_type: item.resource_type })
          .get()
          .then(res => {
            if (res.data.length > 0) {
              // 如果记录已存在，则更新
              return db.collection('resource_summary').doc(res.data[0]._id).update({
                data: {
                  total_count: item.total_count,
                  occupied_count: item.occupied_count
                }
              });
            } else {
              // 如果记录不存在，则插入
              return db.collection('resource_summary').add({
                data: item
              });
            }
          })
      );
    }

    await Promise.all(batchUpdatePromises);

    console.log('资源汇总数据更新成功');
    return { success: true };

  } catch (err) {
    console.error('更新资源汇总数据失败:', err);
    return { error: '更新失败' };
  }
};

// 辅助函数：获取指定条件下的占用数量
async function getOccupiedCount(collectionName, condition) {
  const db = cloud.database();
  const result = await db.collection(collectionName).where(condition).count();
  return result.total;
}