const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const { userId, updates } = event;
    await db.collection('users').doc(userId).update({
      data: updates
    });

    return { success: true };
  } catch (err) {
    console.error('更新用户信息失败:', err);
    return { error: err.message };
  }
};