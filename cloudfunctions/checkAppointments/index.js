// cloud/functions/checkAppointments/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;
exports.main = async (event, context) => {
  const now = new Date();

  try {
    // 查找需要激活的预约（startTime <= now < endTime）
    const pendingAppointments = await db.collection('appointments')
      .where({
        status: 'pending',
        startTime: _.lte(now)
      })
      .get();

    // 更新为 active
    for (const appointment of pendingAppointments.data) {
      await db.runTransaction(async transaction => {
      await transaction.collection('appointments').doc(appointment._id).update({
        data: { status: 'active' }
      });

      await transaction.collection('phone_booths').doc( appointment.resourceId ).update({
        data: { status: 'occupied' }
      });
    });
    }

    // 查找需要结束的预约（endTime <= now）
    const activeAppointments = await db.collection('appointments')
      .where({
        status: 'active',
        endTime: _.lte(now)
      })
      .get();

    // 更新为 completed
    for (const appointment of activeAppointments.data) {
      await db.runTransaction(async transaction => {
      await transaction.collection('appointments').doc(appointment._id).update({
        data: { status: 'completed' }
      });
      await transaction.collection('phone_booths').doc(appointment.resourceId ).update({
        data: { status: 'available' }
      });
    });
    }

    return { success: true };
  } catch (err) {
    console.error('定时任务失败:', err);
    return { error: '定时任务失败' };
  }
};