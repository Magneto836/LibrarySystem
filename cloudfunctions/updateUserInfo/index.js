// cloudfunctions/updateUserInfo/index.js
exports.main = async (event, context) => {
  const { userId, updates } = event;
  const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
  
  try {
    await db.collection('users').doc(userId).update({
      data: updates
    });
    
    return { success: true };
  } catch (err) {
    console.error('Error updating user info:', err);
    return { error: err.message };
  }
};