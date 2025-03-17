Page({
  data: {
    resourceStatusList: [], // 存储所有资源的状态
    typeMapping: { // 定义类型映射
      seat: '座位',
      phone_booth: '电话亭',
      discussion_area: '讨论区'
    }
  },
  onChooseBtnTap(e) {
    // 确保没有逻辑错误或异常中断
    try {
      wx.switchTab({
        url: '/pages/MainPages/appointment_main/appointment_main',
  
      });
    } catch (error) {
      console.error('跳转失败:', error);
    }
  },

  onLoad(options) {
    this.getResourceStatus();
  },

  async getResourceStatus() {
    wx.cloud.callFunction({
      name: 'get_resource_summary', // 调用云函数
      success: (res) => {
        
        this.setData({
          resourceStatusList: res.result.map(item => ({
            ...item,
            type: this.data.typeMapping[item.type] || item.type 
          }))
        });
       
      },
      fail: (err) => {
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      }
    });
  },
  refreshResourceStatus() {
    wx.showLoading({
      title: '正在刷新...',
    });
    this.getResourceStatus().then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    });
  }

});