// cloudfunctions/adminLogin/index.js
exports.main = async (event, context) => {
  const { userId, password } = event;
  const cloud = require('wx-server-sdk');
    cloud.init();
  const db = cloud.database();
  
  try {
    const userSnapshot = await db.collection('users').doc(userId).get();
    const user = userSnapshot.data;
    
    if (user.role === 'root' && user.password === password) {
      return { success: true };
    } else {
      return { success: false, message: '密码错误' };
    }
  } catch (err) {
    console.error('Error during admin login:', err);
    return { error: err.message };
  }
};