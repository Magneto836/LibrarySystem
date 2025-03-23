Page({
  data: {
    sectionHeights: [0, 0, 0], // 存储三个区域的高度
    baseHeight: 0, // 基础高度
    itemHeight: 260, // 单条记录高度
    maxHeight: 800, // 最大高度
    ifExpanded:[false,false,false],
    // 用于存储所有预约记录
    allRecords: []
  },

  onLoad() {
    
    this.fetchRecords();

  },
  calculateHeights() {
    const counts = [
      this.data.allRecords.filter(item => item.resourceDetails.type === 'seats').length,
      this.data.allRecords.filter(item => item.resourceDetails.type === 'discussion_areas').length,
      this.data.allRecords.filter(item => item.resourceDetails.type === 'phone_booths').length
    ];
    
    const heights = counts.map(count => {
      const calcHeight = this.data.baseHeight + count * this.data.itemHeight;
      return Math.min(calcHeight, this.data.maxHeight);
    });
  
    this.setData({ sectionHeights: heights });
  },
  toggleSection(e) {

    const sectionIndex = e.currentTarget.dataset.sectionIndex;
    const currentExpanded = this.data.ifExpanded[sectionIndex];
    const newExpanded = [...this.data.ifExpanded];

    if (currentExpanded) {
      newExpanded[sectionIndex] = false;
    } else {
      newExpanded.fill(false);
      newExpanded[sectionIndex] = true;
    }

    this.setData({ ifExpanded: newExpanded }, () => {
      this.calculateHeights(); // 重新计算高度
    });


  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return [
        date.getFullYear(),
        (date.getMonth() + 1).toString().padStart(2, '0'),
        date.getDate().toString().padStart(2, '0')
      ].join('-') + ' ' + [
        date.getHours().toString().padStart(2, '0'),
        date.getMinutes().toString().padStart(2, '0')
      ].join(':');
    } catch (e) {
      console.error('时间格式化错误:', e);
      return '时间无效';
    }
  },
 
  
   
  // 获取记录样式
  getRecordStyle(status) {
    let style = '';
    if (status === 'active') {
      style = 'background-color: #e8f5e9;';
    } else if (status === 'pending') {
      style = 'background-color: #fff3e0;';
    } else if (status === 'completed') {
      style = 'background-color: #f5f5f5;';
    }
    return style;
  },

  // 获取所有记录
  async fetchRecords() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 获取用户ID
      const userId = wx.getStorageSync('userId');

      if (!userId) {
        wx.hideLoading();
        wx.showToast({ title: '用户未登录', icon: 'none' });
        return;
      }

      // 调用云函数获取记录
      const result = await wx.cloud.callFunction({
        name: 'getAppointmentRecordsByUserId',
        data: {
          userId
        }
      });

      // 提取所有预约记录
      const allRecords = [];
      if (result.result && result.result.resources) {
        // 将 seats 的预约记录展开
        result.result.resources.seats.forEach(seat => {
          seat.appointments.forEach(appointment => {
            allRecords.push({
              ...appointment,
              resourceDetails: {
                floor: seat.floor,
                number: seat.seatId,
                type: 'seats'
              }
            });
          });
        });

        // 将 discussionAreas 的预约记录展开
        console.log("discussionAreas",result.result.resources);
        result.result.resources.discussionAreas.forEach(area => {
          area.appointments.forEach(appointment => {
            allRecords.push({
              ...appointment,
              resourceDetails: {
                floor: area.floor,

                number: area.topicId,
                type: 'discussion_areas'
              }
            });
          });
        });

        // 将 phoneBooths 的预约记录展开
        result.result.resources.phoneBooths.forEach(booth => {
          booth.appointments.forEach(appointment => {
            allRecords.push({
              ...appointment,
              resourceDetails: {
                floor: booth.floor,
                number: booth.boothId,
                location:booth.location,
                type: 'phone_booths'
              }
            });
          });
        });
      }
      allRecords.forEach(item=>{
        item.startTime = this.formatTime(item.startTime);
        item.endTime = this.formatTime(item.endTime);

      })
      this.calculateHeights();
      // 更新数据
      this.setData({
        allRecords
      });

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('获取记录失败:', error);
      wx.showToast({ title: '获取记录失败，请重试', icon: 'none' });
    }
  },

  // 取消预约
  async cancelReservation(e) {
    const recordId = e.currentTarget.dataset.id;
    const record = e.currentTarget.dataset.record;

    try {
      wx.showModal({
        title: '确认取消',
        content: '确定要取消该预约吗？',
        success: async (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '取消中...' });

            await wx.cloud.callFunction({
              name: 'cancelReservation',
              data: {
                recordId,
                resourceId: record.resourceId,
                resourceType: record.resourceType
              }
            });

            wx.hideLoading();
            wx.showToast({ title: '取消成功', icon: 'success' });

            // 刷新记录
            this.fetchRecords();
          }
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('取消预约失败:', error);
      wx.showToast({ title: '取消预约失败，请重试', icon: 'none' });
    }
  }
});