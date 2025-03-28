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
    // 使用 where 查询代替 doc().get()，避免因文档不存在而抛出错误
    const queryResult = await db.collection('users')
      .where({ _id: OPENID })
      .get();

    if (queryResult.data.length > 0) {
      // 用户存在，更新信息
      await db.collection('users')
        .doc(OPENID)
        .update({
          data: {
            nickname,
            avatarUrl,
            updateTime: serverDate
          }
        });
    } else {
      // 用户不存在，创建新用户
      await db.collection('users')
        .add({
          data: {
            _id: OPENID,
            nickname,
            avatarUrl,
            root:'normal',
           createTime: serverDate,
            updateTime: serverDate
          }
        });
    }
  } catch (error) {
    // 区分错误类型：用户不存在的错误 vs 其他错误
    if (error.message.includes('document.get:fail document does not exist')) {
      // 此处不会触发，因为已改用 where 查询
      console.log('用户不存在，已自动处理');
    } else {
      // 其他未知错误抛出
      console.error('云函数执行失败:', error);
      throw error;
    }
  }

  return {
    openid: OPENID // 保持原有返回结构
  };
};