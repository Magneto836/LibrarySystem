// cloud/functions/getAppointmentRecordsByUserId/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { userId } = event;

  try {
    // 获取用户的所有预约记录
    const recordsSnapshot = await db.collection('appointments')
      .where({
        userId: userId
      })
      .orderBy('startTime', 'desc')
      .get();

    // 提前准备一个数组，用于存储不同类型的资源
    const resources = {
      seats: [],
      discussionAreas: [],
      phoneBooths: []
    };

    // 提取所有需要查询的资源ID，按类型分组
    const resourceIdsByType = {
      seats: [],
      discussionAreas: [],
      phoneBooths: []
    };

    recordsSnapshot.data.forEach(record => {
      if (record.resourceType === 'seats') {
        resourceIdsByType.seats.push(record.resourceId);
      } else if (record.resourceType === 'discussion_areas') {
        resourceIdsByType.discussionAreas.push(record.resourceId);
      } else if (record.resourceType === 'phone_booths') {
        resourceIdsByType.phoneBooths.push(record.resourceId);
      }
    });

    // 查询每个资源表，获取详细信息
    if (resourceIdsByType.seats.length > 0) {
      const seatsSnapshot = await db.collection('all_seat')
        .where({
          _id: _.in(resourceIdsByType.seats)
        })
        .get();
      seatsSnapshot.data.forEach(seat => {
        resources.seats.push({
          ...seat,
          appointments: recordsSnapshot.data.filter(record => 
            record.resourceType === 'seats' && record.resourceId === seat._id
          )
        });
      });
    }

    if (resourceIdsByType.discussionAreas.length > 0) {
      const discussionAreasSnapshot = await db.collection('discussion_areas')
        .where({
          _id: _.in(resourceIdsByType.discussionAreas)
        })
        .get();
      discussionAreasSnapshot.data.forEach(area => {
        resources.discussionAreas.push({
          ...area,
          appointments: recordsSnapshot.data.filter(record => 
            record.resourceType === 'discussion_areas' && record.resourceId === area._id
          )
        });
      });
    }

    if (resourceIdsByType.phoneBooths.length > 0) {
      const phoneBoothsSnapshot = await db.collection('phone_booths')
        .where({
          _id: _.in(resourceIdsByType.phoneBooths)
        })
        .get();
      phoneBoothsSnapshot.data.forEach(booth => {
        resources.phoneBooths.push({
          ...booth,
          appointments: recordsSnapshot.data.filter(record => 
            record.resourceType === 'phone_booths' && record.resourceId === booth._id
          )
        });
      });
    }

    return {
      resources
    };
  } catch (error) {
    console.error('获取记录失败:', error);
    throw error;
  }
};