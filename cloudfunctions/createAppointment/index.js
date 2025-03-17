// cloud/functions/createAppointment/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const { resourceId, startTime, duration, resourceType } = event;
  const wxContext = cloud.getWXContext();
  
  // 计算结束时间
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60000);

  try {
    // 插入预约记录
    await db.collection('appointments').add({
      data: {
        resourceId,
        resourceType,
        status: 'pending',
        startTime: start,
        endTime: end,
        duration,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return { success: true };
  } catch (err) {
    console.error('创建预约失败:', err);
    return { error: '创建预约失败' };
  }
};