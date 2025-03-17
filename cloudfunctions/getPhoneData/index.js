// cloud/functions/getResourceData/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

const _ = db.command;
exports.main = async (event, context) => {

  try {
    const now = new Date();
    const booths = await db.collection('phone_booths').get();

    // 动态计算状态
    const phoneData = booths.data.map(booth => {  
      return {
        ...booth,  
      };
    });

    return { phoneData };
  } catch (err) {
    console.error('获取数据失败:', err);
    return { error: '获取数据失败' };
  }
};