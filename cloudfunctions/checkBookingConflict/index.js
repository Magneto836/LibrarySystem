// 新建 cloud/functions/checkBookingConflict/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { resourceId, endTime } = event;
  const localEndTime = new Date(endTime);
  try {
    // 查询时间段重叠的预约
    console.log("resourceId",resourceId);
    console.log("endTime",localEndTime);
    const conflictRes = await db.collection('appointments')
      .where({
        resourceId:resourceId,
        endTime: localEndTime
      })
      .get();

    return { 
      hasConflict: conflictRes.data.length > 0,
    };
  } catch (err) {
    console.error('冲突检测失败:', err);
    return { error: '系统繁忙，请稍后重试' };
  }
};