// 云函数代码
exports.main = async (event, context) => {
  const { recordId } = event;

  // 验证参数
  if (!recordId) {
    return {
      code: 400,
      message: '参数不完整，请提供 recordId'
    };
  }

  try {
    // 获取数据库引用
    const cloud = require('wx-server-sdk');
    cloud.init();
    const db = cloud.database();
    const collection = db.collection('appointments'); // 预约记录集合

    // 删除指定的预约记录
    await collection.doc(recordId).remove();

    return {
      code: 200,
      message: '取消预约成功'
    };
  } catch (error) {
    console.error('取消预约失败:', error);
    return {
      code: 500,
      message: '取消预约失败，请重试'
    };
  }
};