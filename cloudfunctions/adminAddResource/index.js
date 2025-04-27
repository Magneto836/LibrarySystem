const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

// 资源类型与集合名称的映射
const resourceCollectionMap = {
  'seats': 'all_seat',
  'phone_booths': 'phone_booths',
  'discussion_areas': 'discussion_areas'
};

// 资源类型与字段的映射
const resourceFieldsMap = {
  'seats': ['floor', 'area'],
  'phone_booths': ['location'],
  'discussion_areas': ['floor', 'area', 'capacity']
};

exports.main = async (event, context) => {
  try {
    const { resourceType } = event;

    // 检查资源类型是否有效
    if (!resourceCollectionMap[resourceType]) {
      return { error: '无效的资源类型' };
    }

    // 获取对应的集合名称
    const collectionName = resourceCollectionMap[resourceType];

    // 获取该资源类型需要的字段
    const requiredFields = resourceFieldsMap[resourceType];

    // 检查输入字段是否完整
    for (const field of requiredFields) {
      if (!event[field]) {
        return { error: `缺少必要字段: ${field}` };
      }
    }

    // 如果是讨论区，生成 topicId
    let topicId = null;
    if (resourceType === 'discussion_areas') {
      // 查询该区域已有的讨论区数量
      const { area,floor } = event;
      const existingAreas = await db.collection(collectionName)
        .where({ area: area,floor:floor })
        .get();

      // 计算新的 topicId
      const count = existingAreas.data.length;
      topicId = `${area}-${count + 1}`;
    }
    let seatId = null;
    if (resourceType === 'seats') {
      // 查询该楼层和区域已有的座位
      const { area, floor } = event;
      const existingSeats = await db.collection(collectionName)
        .where({ area: area, floor: floor })
        .get();

      // 提取所有 seatId 并找到最大的一个
      const seatIds = existingSeats.data.map(seat => seat.seatId);
      let maxSeatId = 0;
      if (seatIds.length > 0) {
        maxSeatId = Math.max(...seatIds.map(id => parseInt(id.slice(1))));
      }

      // 生成新的 seatId
      seatId = `${area}${String(maxSeatId + 1).padStart(3, '0')}`;
    }

// 如果是电话亭，生成 boothId
let boothId = null;
if (resourceType === 'phone_booths') {
  // 查询该 location 下已有的电话亭
  const { location } = event;
  const existingBooths = await db.collection(collectionName)
    .where({ location: location })
    .get();

  // 提取所有 boothId 并找到最大的一个
  const boothIds = existingBooths.data.map(booth => parseInt(booth.boothId));
  let maxBoothId = 0;
  if (boothIds.length > 0) {
    maxBoothId = Math.max(...boothIds);
  }

  // 生成新的 boothId
  boothId = maxBoothId + 1;
}


    // 添加新资源
    await db.collection(collectionName).add({
      data: {
        floor: event.floor,
        area: event.area,
        ...(resourceType === 'discussion_areas' && { capacity: event.capacity }),
        ...(resourceType === 'discussion_areas' && { topicId }),
        ...(resourceType === 'seats' && { seatId }),
        ...(resourceType === 'seats' && { capacity: 1 }), // 座位容量默认为 1
        ...(resourceType === 'phone_booths' && { boothId }),
        ...(resourceType === 'phone_booths' && { location: event.location }),
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return { success: true };
  } catch (err) {
    console.error('添加资源失败:', err);
    return { error: '添加资源失败', details: err.message };
  }
};