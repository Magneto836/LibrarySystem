// cloud/functions/updateResourceStatus/index.js
//没用
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const { resourceType, id, status, duration } = event;

  try {
    // 验证参数是否完整
    console.log("1111111resouceType",resourceType,"id",id,"satus",status,"duration",duration);
    if (!resourceType || !id || !status||!duration) {
      return { error: '缺少必要参数' };
    }

    // 定义资源集合名称
    const collectionName = resourceType; // 资源类型直接作为集合名称

    // 更新资源状态
    await db.collection(collectionName).where({ _id: id }).update({
      data: {
        status: status,
        updatedAt: new Date() // 更新时间戳
      }
    });

    console.log(`资源 ${id} 的状态已更新为 ${status}`);

    // 如果有持续时间，则设置定时任务恢复状态
    if (duration && status === 'occupied') {
      setTimeout(async () => {
        try {
          await db.collection(collectionName).where({ _id: id }).update({
            data: {
              status: 'available',
              updatedAt: new Date()
            }
          });
          console.log(`资源 ${id} 的状态已恢复为 available`);
        } catch (err) {
          console.error('恢复状态失败:', err);
        }
      }, duration * 60 * 1000); // 持续时间转换为毫秒
    }

    return { success: true };
  } catch (err) {
    console.error('更新状态失败:', err);
    return { error: '更新状态失败' };
  }
};