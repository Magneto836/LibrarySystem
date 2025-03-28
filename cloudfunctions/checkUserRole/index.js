// cloudfunctions/checkUserRole/index.js
exports.main = async (event, context) => {
  const { userId } = event;
  const cloud = require('wx-server-sdk');
  cloud.init();
  const db = cloud.database();
  
  try {
    const userSnapshot = await db.collection('users').doc(userId).get();
    const user = userSnapshot.data;
    
    if (user.role === 'root') {
      return {
        isAdmin: true,
        password: user.password,

      };
    } else {
      return { isAdmin: false };
    }
  } catch (err) {
    console.error('Error checking user role:', err);
    return { error: err.message };
  }
};