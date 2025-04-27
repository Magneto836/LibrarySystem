// 云函数：获取用户消息
exports.main = async (event, context) => {
  const { userId } = event;

  try {
    const cloud = require('wx-server-sdk');
    cloud.init();
    const db = cloud.database();

    // 查询用户的消息
    const result = await db.collection('message')
      .where({
        userId: userId,
      })
      .orderBy('createTime', 'desc')
      .get();

    return {
      result: {
        messages: result.data,
      },
    };
  } catch (err) {
    console.error('Error fetching messages:', err);
    return { error: err.message };
  }
};