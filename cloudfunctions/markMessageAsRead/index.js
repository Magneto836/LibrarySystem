// 云函数：标记消息为已读
exports.main = async (event, context) => {
  const { messageId } = event;

  try {
    const cloud = require('wx-server-sdk');
    cloud.init();
    const db = cloud.database();

    // 更新消息状态为已读
    console.log("messageId哈啊哈哈哈啊哈哈哈",messageId);
    await db.collection('message')
      .doc(messageId)
      .update({
        data: {
          isRead: true,
          readTimestamp: Date.now(),
        },
      });

    return { success: true };
  } catch (err) {
    console.error('Error marking message as read:', err);
    return { error: err.message };
  }
};