const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 确保使用当前环境
});
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 查询 users 集合
    const users = await db.collection('users').get();

    // 检查是否有数据
    if (!users || !users.data || users.data.length === 0) {
      return { error: '未找到用户数据' };
    }

    // 返回用户数据
    return { users: users.data };
  } catch (err) {
    console.error('获取用户列表失败:', err);
    return { error: err.message };
  }
};