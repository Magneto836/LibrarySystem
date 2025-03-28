// cloud/functions/getRecentAppointment/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { userId } = event;

  try {
    // 查询用户的状态为 pending 或 active 的最近（最早）的一条记录
    const snapshot = await db.collection('appointments')
      .where({
        userId: userId,
        status: _.in(['pending', 'active'])
      })
      .orderBy('startTime', 'asc') // 按开始时间升序排列，取最早的一条
      .limit(1)
      .get();

    if (snapshot.data.length > 0) {
      const record = snapshot.data[0];
      // 查询对应资源的详细信息
      let resourceDetails = null;
      if (record.resourceType === 'seats') {
        resourceDetails = await db.collection('all_seat').doc(record.resourceId).get();
      } else if (record.resourceType === 'discussion_areas') {
        resourceDetails = await db.collection('discussion_areas').doc(record.resourceId).get();
      } else if (record.resourceType === 'phone_booths') {
        resourceDetails = await db.collection('phone_booths').doc(record.resourceId).get();
      }

      return {
        record: {
          ...record,
          resourceDetails: resourceDetails.data
        }
      };
    } else {
      return { record: null };
    }
  } catch (error) {
    console.error('获取最近预约记录失败:', error);
    throw error;
  }
};