// app.js
App({
  globalData: {
    userInfo: null,
    isAdmin: false
  },
  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
     
        env: "library-0gut28suf23f2870",
        traceUser: true,
      });
    }
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.globalData.userInfo = userInfo;

    // 检查用户角色
    this.checkUserRole();

  },

  async checkUserRole() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkUserRole',
        data: {
          userId: this.globalData.userInfo.openid || ''
        }
      });

      if (result.result && result.result.isAdmin) {
        this.globalData.isAdmin = true;
      }
    } catch (err) {
      console.error('Error checking user role:', err);
    }
  }

});
