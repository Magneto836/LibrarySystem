const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { avatarUrl, nickname } = event;

  // 验证参数是否齐全
  if (!avatarUrl || !nickname) {
    return { error: '缺少必要参数' };
  }

  const db = cloud.database();
  const serverDate = db.serverDate();

  try {
    // 使用 where 查询代替 doc().get()，避免因文档不存在而抛出错误
    const queryResult = await db.collection('users')
      .where({ _id: OPENID })
      .get();

    let user = null;
    if (queryResult.data.length > 0) {
      // 用户存在，更新信息
      user = queryResult.data[0];
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
            root: 'normal',
            createTime: serverDate,
            updateTime: serverDate,
            isBanned: false // 默认未封禁
          }
        });
      user = { isBanned: false };
    }
    console.log("isBannde",user.isBanned);
    // 返回用户信息，包括是否被封禁
    return {
      openid: OPENID,
      isBanned: user.isBanned
    };
  } catch (error) {
    console.error('云函数执行失败:', error);
    return { error: '登录失败，请重试' };
  }
};