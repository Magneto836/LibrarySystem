// cloud/functions/updateAppointments/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

async function updateResourceStatus(resourceType, collectionName) {
  const now = new Date();

  try {
    // 查找需要激活的预约
    const pendingAppointments = await db.collection('appointments')
      .where({
        status: 'pending',
        startTime: _.lte(now),
        resourceType: resourceType
      })
      .get();
      console.log("hahah",pendingAppointments);
    // 更新为 active
    for (const appointment of pendingAppointments.data) {
      await db.runTransaction(async transaction => {
        await transaction.collection('appointments').doc(appointment._id).update({
          data: { status: 'active' }
        });

        await transaction.collection(collectionName).doc(appointment.resourceId).update({
          data: { status: 'occupied' }
        });
      });
    }

    // 查找需要结束的预约
    const activeAppointments = await db.collection('appointments')
      .where({
        status: 'active',
        endTime: _.lte(now),
        resourceType: resourceType
      })
      .get();

    // 更新为 completed
    for (const appointment of activeAppointments.data) {
      await db.runTransaction(async transaction => {
        await transaction.collection('appointments').doc(appointment._id).update({
          data: { status: 'completed' }
        });

        await transaction.collection(collectionName).doc(appointment.resourceId).update({
          data: { status: 'available' }
        });
      });
    }
  } catch (err) {
    console.error(`更新 ${resourceType} 状态失败:`, err);
    throw err;
  }
}

exports.main = async (event, context) => {
  try {
    // 更新 all_seat
    await updateResourceStatus('seats', 'all_seat');
    // 更新 phone_booths
    await updateResourceStatus('phone_booths', 'phone_booths');
    // 更新 discussion_areas
    await updateResourceStatus('discussion_areas', 'discussion_areas');

    return { success: true };
  } catch (err) {
    console.error('定时任务失败:', err);
    return { error: '定时任务失败' };
  }
};