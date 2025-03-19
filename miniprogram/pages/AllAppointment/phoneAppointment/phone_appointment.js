

// pages/AllAppointment/phone_appointment.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isExpanded: [],    // 如果有新区域
    locations:[],
    dateIndex: 0,
    isSubmitting:false,
  
  // 时间段配置（09:00-15:00 每半小时）
  timeSlots: [],
  activeTime: null,
  selectedTimeSlot:'',
    selectedDate: '', // 选中的日期
    isModalVisible: false, // 控制模态框的显示
    currentId:'',//_id 
    refreshTime:null  //定时器ID
  },
  
 
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {


    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    this.setData({ timeSlots: this.generateTimeSlots(currentTime) });

    this.fetchPhoneDataFromCloud();
    const [today, tomorrow] = this.getDates();
  
    this.setData({
      today,
      tomorrow,
      dateOptions: this.getDates() // 日期选项
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.startAutoRefresh();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    this.clearAutoRefresh();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    this.clearAutoRefresh();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },
  bookBooth(e) {
    const location = e.currentTarget.dataset.location; // 当前地点名称
    const boothId = e.currentTarget.dataset.booth;     // 当前电话亭编号
    const _id = e.currentTarget.dataset._id;
    // 获取当前电话亭的状态
    const booth = this.data.locations.find(loc => loc.name === location)?.booths.find(b => b.boothId === boothId);

    // 显示日期和时间选择器
    this.setData({
      isModalVisible: true,
      currentId:_id
    });
  },
// 在 Page 函数内部添加公共方法
getDates() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return [today, tomorrow];
},


  selectTimeSlot(e) {
    const selectedIndex = e.detail.value;
    const selectedTimeSlot = this.data.timeSlots[selectedIndex];
    const startTime = selectedTimeSlot.split('——')[0];
    this.setData({ selectedTimeSlot,startTime });
  },
  selectDate(e) {
    const index = e.detail.value;
  const selectedDate = this.data.dateOptions[index];
  const isToday = selectedDate === this.data.today;

  this.setData({ 
    selectedDate,
    timeSlots: this.generateTimeSlots(
      isToday ? new Date().toTimeString().substr(0,5) : null,
      isToday
    )
  });
  },



  generateTimeSlots(currentTime,isToday) {

      const slots = [];
      let currentTotalMinutes = 0;

      if (isToday) {
        const [currentHour, currentMinute] = currentTime.split(':').map(Number);
        currentTotalMinutes = currentHour * 60 + currentMinute;
      }
      for (let hour = 9; hour < 19; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
  
    
          const startHour = hour.toString().padStart(2,'0');
          const startMinute = minute.toString().padStart(2,'0');
          const startTime = `${startHour}:${startMinute}`;
    
          // 计算结束时间
          let endHour = hour;
          let endMinute = minute + 30;
          if (endMinute === 60) {
            endMinute = '00';
            endHour = (hour + 1).toString().padStart(2,'0');
          } else {
            endMinute = endMinute.toString().padStart(2,'0');
          }
          const endTime = `${endHour}:${endMinute}`;
    
          // 将时间段添加到slots数组中
          if (isToday) {
            const slotStartTotalMinutes = hour * 60 + minute;
            if (slotStartTotalMinutes >= currentTotalMinutes - 30) {
              slots.push(`${startTime}——${endTime}`);
            }
          } else {
            slots.push(`${startTime}——${endTime}`);
          }
        }
      }
      return slots;
    
  },

  async confirmBooking() {
    const { selectedDate, startTime, currentId } = this.data;
  
    if (!selectedDate || !startTime) {
      wx.showToast({
        title: '请选择日期和使用时间',
        icon: 'none'
      });
      return;
    }
    this.setData({ isSubmitting: true });
    // 将日期和时间合并为一个完整的日期时间字符串
    const dateTimeStr = `${selectedDate}T${startTime}:00`;
    // 创建 Date 对象
    const startDateTime = new Date(dateTimeStr);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000)
    try {
      const conflictCheck = await wx.cloud.callFunction({
        name: 'checkBookingConflict', 
        data: {
          resourceId: currentId,
          endTime: endDateTime.toISOString()
        }
      });
      console.log("conflictCheck.result",conflictCheck.result);
      if (conflictCheck.result.hasConflict) {
        wx.showToast({ title: '该时段已被预约', icon: 'none' });
        this.setData({ isSubmitting: false });
        return;
      }

      await wx.cloud.callFunction({
        name: 'createAppointment',
        data: {
          resourceType: 'phone_booths',
          resourceId: currentId,
          startTime: startDateTime.toISOString(), // 使用 ISO 格式发送时间
          duration: 30 // 假设每个预约时段为30分钟，请根据实际情况调整
        }
      });
      await wx.cloud.callFunction({
        name: 'checkAppointments'
      });
      await wx.cloud.callFunction({
        name:'update_resource_summary'
      });
  
      // 更新页面数据
      this.setData({
        isModalVisible: false, // 隐藏模态框
        isSubmitting: false 
      });
  
      // 弹出预约成功提示
      wx.showToast({
        title: '预约成功！',
        icon: 'success'
      });
      this.fetchPhoneDataFromCloud(); // 刷新数据
  
    } catch (error) {
      console.error('更新数据库失败:', error);
      wx.showToast({
        title: '预约失败，请重试',
        icon: 'none'
      });
      this.setData({isSubmitting:false});
    }
  },

  cancelBooking() {
    this.setData({ isModalVisible: false }); // 隐藏模态框
  },

  toggleCard(e) {
    const index = e.currentTarget.dataset.index;
    const newExpanded = [...this.data.isExpanded]; // 复制当前展开状态数组
  
    // 1. 切换当前卡片的状态（展开/收起）
    newExpanded[index] = !newExpanded[index];
  
    // 2. 如果当前卡片被设为展开（true），则关闭其他所有卡片
    if (newExpanded[index]) {
      newExpanded.fill(false); // 其他卡片全部设为 false
      newExpanded[index] = true; // 仅当前卡片设为 true
    }
  
    this.setData({ isExpanded: newExpanded });
  },
  async fetchPhoneDataFromCloud() {
    try {

      const result = await wx.cloud.callFunction({ name: 'getPhoneData' });
      if(result.result&&result.result.error){
        throw new Error(result.result.error);
      }
      if (result.result && !result.result.error) {
        const { phoneData } = result.result;


        const groupedData = phoneData.reduce((acc, current) => {
          const locationName = current.location;
          const existingLocation = acc.find(loc => loc.name === locationName);
          const booth = {
          boothId: current.boothId, // 保持 boothId 字段名与前端代码一致
          status: current.status,
          _id: current._id,
          createdAt: current.createdAt,
          updatedAt: current.updatedAt
        };

        if (existingLocation) {
          existingLocation.booths.push(booth);
        } else {
          acc.push({
            name: locationName,
            booths: [booth]
          });
        }
        return acc;
      }, []);
      const newIsExpanded = Array(groupedData.length).fill(false);

        this.setData({
          locations:groupedData,
          isExpanded: newIsExpanded
        });

    }} catch (error) {
      console.error('加载数据失败:', error);
    }
  },
  startAutoRefresh(){
    if (!this.data.refreshTimer) { // 防止重复设置定时器
      this.data.refreshTimer = setInterval(() => {
        this.fetchPhoneDataFromCloud();

      }, 3 * 60 * 1000); // 3分钟间隔
    }
  },
  clearAutoRefresh() {
    if (this.data.refreshTimer) {
      clearInterval(this.data.refreshTimer);
      this.setData({ refreshTimer: null });
    }
  }

})

