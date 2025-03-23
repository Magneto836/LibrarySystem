// cloud/functions/checkBookingConflict/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { resourceId, endTime, userId, resourceType } = event;
  const localEndTime = new Date(endTime);

  try {
    // 检查用户是否已经预约了该资源类型且状态为 active 或 pending
    const userBookedQuery = await db.collection('appointments')
      .where({
        resourceType: resourceType, // 仅检查当前资源类型
        userId: userId,
        status: _.in(['active', 'pending'])
      })
      .get();

    if (userBookedQuery.data.length > 0) {
      return { status: 0 }; // 用户已预约该资源类型
    }

    // 检查时间段是否冲突
    const timeConflictQuery = await db.collection('appointments')
      .where({
        resourceId: resourceId,
        endTime: localEndTime
      })
      .get();

    if (timeConflictQuery.data.length > 0) {
      return { status: 1 }; // 时间段已被预约
    }

    return { status: 2 }; // 可预约
  } catch (err) {
    console.error('冲突检测失败:', err);
    return { error: '系统繁忙，请稍后重试' };
  }
};