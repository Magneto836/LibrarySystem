Page({
  data: {
    avatarUrl: '',
    nickname: ''
  },

  // 处理头像选择
  handleChooseAvatar(e) {
    if (!e.detail.avatarUrl) return;
    this.setData({ avatarUrl: e.detail.avatarUrl });
  },

  // 处理昵称输入
  onNicknameChange(e) {
    this.setData({
      nickname: this.cleanSpecialChars(e.detail.value)
    });
  },

  // 特殊字符过滤方法
  cleanSpecialChars(str) {
    return str
      .replace(/[\u200b\u200c\u200d\ufffc]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  // 提交验证
  async handleSubmit() {
    const { avatarUrl, nickname } = this.data;
    if (!nickname.trim()) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在登录中...', mask: true });

    try {
      // 调用云函数并传递用户信息
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: {
          avatarUrl,
          nickname
        }
      });
     
      // 检查用户是否被封禁
      if (result.result && result.result.isBanned) {
        wx.hideLoading();
        wx.showToast({
          title: '该用户已被封禁，无法登录，请联系管理员进行解封',
          icon: 'none'
        });
        return;
      }

      const openid = result.result.openid;

      // 将用户信息组合成对象
      const userInfo = {
        openid,
        avatarUrl,
        nickname
      };

      // 存储到本地存储（使用 JSON 字符串存储对象）
      wx.setStorageSync('userInfo', userInfo); 

      // 存储到全局变量（根据需要选择存储方式）
      getApp().globalData.userInfo = userInfo; // 推荐存储完整对象

      wx.hideLoading();
      wx.reLaunch({ url: '/pages/MainPages/home/home' });
    } catch (error) {
      wx.hideLoading();
      console.error('完整错误:', error);
      wx.showToast({
        title: error.errMsg.includes('permission') 
          ? '权限错误，请联系管理员' 
          : '操作失败，请重试',
        icon: 'none'
      });
    }
  }
});