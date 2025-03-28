Page({
  data: {
    resourceStatusList: [], // 存储所有资源的状态
    formattedStartTime:'' ,
    formattedEndTime:'' ,
    resourceStatus: '',
    resourceNumber : '',
    resourceType :'',
    recentAppointment: false  ,// 用于存储最近的预约记录
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
    this.checkRecentAppointment();
  },

  onShow(options) {
    this.getResourceStatus();
    this.checkRecentAppointment();
  },

async checkRecentAppointment(){
  
  const userId= getApp().globalData.userInfo.openid || wx.getStorageSync('userInfo').openid;
  const result = await wx.cloud.callFunction({
    name: 'getNewestAppointment',
    data: {
      userId: userId
    }
  });
  if (result.result.record) {
    
    const { record } = result.result;

    const resourceDetails = record.resourceDetails;
    const resourceStatus = record.status;
    const formattedStartTime = this.formatDate(record.startTime);
    const formattedEndTime = this.formatDate(record.endTime);
    let resourceNumber = '' ;
    let  resourceType = '' ;
    if(record.resourceType == "phone_booths"){
       resourceType = "电话亭"
       resourceNumber = resourceDetails.location +"-"+ resourceDetails.boothId ;
    }
    else if(record.resourceType == "seats"){
      resourceType = "座位"
      resourceNumber = resourceDetails.floor+"楼" + resourceDetails.seatId;
    } 
    else {
      resourceType = "讨论区"
      resourceNumber = resourceDetails.floor+"楼" + resourceDetails.topicId;
    }
    this.setData({
      formattedStartTime: formattedStartTime,
      formattedEndTime: formattedEndTime,
      resourceNumber: resourceNumber,
      recentAppointment: true,
      resourceStatus:resourceStatus,
      resourceType:resourceType
    });


  } else {
    this.setData({
      recentAppointment: false
    });
  }



},
formatDate(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())} ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
},
padZero(num) {
  return num < 10 ? `0${num}` : num;
},
  async getResourceStatus() {
    wx.cloud.callFunction({ name: 'update_resource_summary' });
    wx.cloud.callFunction({
      name: 'get_resource_summary', // 调用云函数
      success: (res) => {
        // 计算百分比并更新数据
        const resourceStatusList = res.result.map(item => {
          const progressPercentage = (item.occupied_count / item.totalCount) * 100;
          return {
            ...item,
            type: this.data.typeMapping[item.type] || item.type,
            progressPercentage: isNaN(progressPercentage) ? 0 : progressPercentage
          };
        });

        this.setData({
          resourceStatusList
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