const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 获取所有讨论区数据
    const disAreasRes = await db.collection('discussion_areas').get();
    const disAreas = disAreasRes.data || [];

    // 按 cardName (floor-area) 分组
    const cardsMap = {};
    disAreas.forEach(disArea => {
      const cardName = `${disArea.floor}-${disArea.area}`;
      if (!cardsMap[cardName]) {
        cardsMap[cardName] = {
          id: disArea._id,
          floor: disArea.floor,
          areaName: disArea.area,
          cardName,
          totalDisAreas: 0,
          availableDisAreas: 0,
          discussionAreas: []
        };
      }
      cardsMap[cardName].totalDisAreas++;
      if (disArea.status === 'available') {
        cardsMap[cardName].availableDisAreas++;
      }
      cardsMap[cardName].discussionAreas.push(disArea);
    });

    // 转换为数组
    const cards = Object.values(cardsMap);

    return { cards };
  } catch (err) {
    console.error('获取数据失败:', err);
    return { error: '获取数据失败', details: err.message };
  }
};