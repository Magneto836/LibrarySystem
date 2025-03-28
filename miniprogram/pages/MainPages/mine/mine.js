const app = getApp();

Page({
  data: {
    userInfo: null, // 用户信息
    showAdminInput: false, // 管理员登录输入框显示状态
    inputPassword: '', // 管理员密码输入
    isAdmin: false, // 是否为管理员
    truePassword :''
  },

  onLoad() {
    // 初始化用户信息
    this.setData({
      userInfo: wx.getStorageSync('userInfo') || {}
    });
    
    // 验证用户角色
    this.checkUserRole();
  },

  // 验证用户角色
  async checkUserRole() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkUserRole',
        data: {
          userId: this.data.userInfo.openid || ''
        }
      });
      
      if (result.result && result.result.isAdmin) {
        this.setData({
          isAdmin: true,
          truePassword:result.result.password
        });
      }
    } catch (err) {
      console.error('Error checking user role:', err);
    }
  },

  // 显示管理员密码输入框
  showAdminLogin() {
    this.setData({ showAdminInput: true });
  },

  // 输入管理员密码
  onAdminPasswordInput(e) {
    this.setData({ inputPassword: e.detail.value });
  },

  // 管理员登录验证
handleAdminLogin() {
     if(this.data.isAdmin && this.data.truePassword == this.data.inputPassword ){
       console.log("成功");
     }
     else {
      wx.showToast({ title: '密码错误或您不是管理员', icon: 'none' });
     }
  },

  // 头像点击修改
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      success: async (res) => {
        const avatarUrl = res.tempFilePaths[0];
        
        // 更新本地用户信息
        this.updateLocalUserInfo({ avatarUrl });
        
        // 更新数据库中的用户信息
        await this.updateUserInfo({ avatarUrl });
      }
    });
  },

  // 昵称修改
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: async (res) => {
        if (res.confirm && res.content) {
          // 更新本地用户信息
          this.updateLocalUserInfo({ nickname: res.content });
          
          // 更新数据库中的用户信息
          await this.updateUserInfo({ nickname: res.content });
        }
      }
    });
  },

  // 更新本地用户信息
  updateLocalUserInfo(updates) {
    const newUserInfo = { ...this.data.userInfo, ...updates };
    this.setData({ userInfo: newUserInfo });
    wx.setStorageSync('userInfo', newUserInfo);
    getApp().globalData.userInfo = newUserInfo;
  },

  // 更新数据库中的用户信息
  async updateUserInfo(updates) {
    try {
      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          userId: this.data.userInfo.openid,
          updates: updates
        }
      });
    } catch (err) {
      console.error('Error updating user info:', err);
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  // 跳转预约记录
  goToAppointments() {
    wx.navigateTo({ url: '/pages/myAppointment/myAppointment' });
  },
  cancelAdminLogin() {
    this.setData({ showAdminInput: false });
  }
});