const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

// 资源类型与集合名称的映射
const resourceCollectionMap = {
  'seats': 'all_seat',
  'phone_booths': 'phone_booths',
  'discussion_areas': 'discussion_areas'
};

// 资源类型与消息代码的映射
const resourceTypeToCodeMap = {
  'seats': 11,
  'phone_booths': 12,
  'discussion_areas': 13
};

exports.main = async (event, context) => {
  try {
    const { id, resourceType } = event;

    // 检查资源类型是否有效
    if (!resourceCollectionMap[resourceType]) {
      return { error: '无效的资源类型' };
    }

    // 查询 appointments 表中 resourceId 与当前资源 ID 匹配且 status 为 active 或 pending 的记录
    const appointmentSnapshot = await db.collection('appointments').where({
      resourceId: id,
      status: db.command.in(['active', 'pending'])
    }).get();

    // 如果有符合条件的预约记录，准备消息记录
    const messageRecords = [];
    if (appointmentSnapshot.data.length > 0) {
      appointmentSnapshot.data.forEach(appointment => {
        const code = resourceTypeToCodeMap[appointment.resourceType] || 0;
        messageRecords.push({
          code: code,
          userId: appointment.userId,
          createTime: db.serverDate()
        });
      });

      // 批量插入消息记录
      await db.collection('message').add({
        data: messageRecords
      });
    }

    // 删除 appointments 表中符合条件的记录
    await db.collection('appointments').where({
      resourceId: id,
      status: db.command.in(['active', 'pending'])
    }).remove();

    // 获取对应的集合名称
    const collectionName = resourceCollectionMap[resourceType];

    // 删除资源
    await db.collection(collectionName).doc(id).remove();

    return { success: true };
  } catch (err) {
    console.error('删除资源或相关预约记录失败:', err);
    return { error: '删除资源或相关预约记录失败', details: err.message };
  }
};