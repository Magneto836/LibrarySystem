const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { avatarUrl, nickname } = event;

  // 验证参数是否齐全
  if (!avatarUrl || !nickname) {
    throw new Error('缺少必要参数');
  }

  const db = cloud.database();
  const serverDate = db.serverDate();

  try {
    // 检查用户是否存在
    const userDoc = await db.collection('users').doc(OPENID).get();

    if (userDoc.data) {
      // 更新用户信息
      await db.collection('users').doc(OPENID).update({
        data: {
          nickname,
          avatarUrl,
          updateTime: serverDate
        }
      });
    } else {
      // 新增用户
      await db.collection('users').add({
        data: {
          _id: OPENID,
          nickname,
          avatarUrl,
          createTime: serverDate,
          updateTime: serverDate
        }
      });
    }
  } catch (error) {
    throw error;
  }

  return {
    openid: OPENID // 保持原有返回结构
  };
};