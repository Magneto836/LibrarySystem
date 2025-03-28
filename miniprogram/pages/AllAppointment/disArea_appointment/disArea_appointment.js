Page({
  data: {
    isLoading: true,
    cards: [],
    cardsExpanded: [], // 用于记录每个卡片的展开状态
    activeCardIndex: null, // 当前活跃的卡片索引
    dateIndex: 0,
    isSubmitting: false,
    timeSlots: [],
    activeTime: null,
    selectedTimeSlot: '',
    selectedDate: '',
    isModalVisible: false,
    currentDisAreaId: '',
    currentDisAreatStatus: '',
    refreshTimer: null
  },

  onLoad() {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    this.setData({ timeSlots: this.generateTimeSlots(currentTime) });
    this.setData({ isLoading: true });
    this.fetchDisAreaDataFromCloud();
    const [today, tomorrow] = this.getDates();

    this.setData({
      today,
      tomorrow,
      dateOptions: this.getDates()
    });
  },

  onShow() {
    this.startAutoRefresh();
  },

  onHide() {
    this.clearAutoRefresh();
  },

  onUnload() {
    this.clearAutoRefresh();
  },
  getDates() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return [today, tomorrow];
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

  selectTimeSlot(e) {
    const selectedIndex = e.detail.value;
    const selectedTimeSlot = this.data.timeSlots[selectedIndex];
    const startTime = selectedTimeSlot.split('——')[0];
    this.setData({ selectedTimeSlot, startTime });
  },
  generateTimeSlots(currentTime, isToday) {
    const slots = [];
    let currentTotalMinutes = 0;

    if (isToday) {
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      currentTotalMinutes = currentHour * 60 + currentMinute;
    }

    const startHour = 7;
    const endHour = 23;

    for (let hour = startHour; hour < endHour; hour += 4) {
      const startHourStr = hour.toString().padStart(2, '0');
      const startTime = `${startHourStr}:00`;

      let endHourStr;
      if (hour + 4 > endHour) {
        endHourStr = endHour.toString().padStart(2, '0');
      } else {
        endHourStr = (hour + 4).toString().padStart(2, '0');
      }
      const endTime = `${endHourStr}:00`;

      if (isToday) {
        console.log("史今台南");
        const slotStartTotalMinutes = hour * 60;
        if (slotStartTotalMinutes >= currentTotalMinutes - 240) {
          slots.push(`${startTime}——${endTime}`);
        }
      } else {
        slots.push(`${startTime}——${endTime}`);
      }
    }

    return slots;
  },

  async confirmBooking() {
    const { selectedDate, startTime, currentDisAreaId } = this.data;

    if (!selectedDate || !startTime) {
      wx.showToast({
        title: '请选择日期和使用时间',
        icon: 'none'
      });
      return;
    }

    this.setData({ isSubmitting: true });

    const dateTimeStr = `${selectedDate}T${startTime}:00`;
    const startDateTime = new Date(dateTimeStr);
    const endDateTime = new Date(startDateTime.getTime() + 240 * 60 * 1000);

    const userId= getApp().globalData.userInfo.openid || wx.getStorageSync('userInfo').openid;
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    try {
      const conflictCheck = await wx.cloud.callFunction({
        name: 'checkBookingConflict',
        data: {
          resourceId: currentDisAreaId,
          resourceType:"discussion_areas",
          userId:userId,
          endTime: endDateTime.toISOString()
        }
      });

       if (conflictCheck.result.status=== 0) {
        wx.showToast({ title: '您已预约过该资源', icon: 'none' });
        this.setData({ isSubmitting: false });
        return;
      }
     if(conflictCheck.result.status=== 1){
      wx.showToast({ title: '该资源已被预约，请选择其他资源', icon: 'none' });
      this.setData({ isSubmitting: false });
      return;
     }


      await wx.cloud.callFunction({
        name: 'createAppointment',
        data: {
          resourceType: 'discussion_areas',
          resourceId: currentDisAreaId,
          userId:userId,
          startTime: startDateTime.toISOString(),
          duration: 240
        }
      });
      await wx.cloud.callFunction({
        name: 'checkAppointments'
      });
      await wx.cloud.callFunction({
        name: 'update_resource_summary'
      });
      wx.showToast({
        title: '预约成功！',
        icon: 'success'
      });

      this.setData({
        isModalVisible: false,
        isSubmitting: false
      });

      this.fetchDisAreaDataFromCloud();
    } catch (error) {
      console.error('预约失败:', error);
      wx.showToast({
        title: '预约失败，请重试',
        icon: 'none'
      });
      this.setData({ isSubmitting: false });
    }
  },

  cancelBooking() {
    this.setData({ isModalVisible: false });
  },

  toggleCard(e) {
    const cardIndex = e.currentTarget.dataset.index;
    const { cardsExpanded } = this.data;

    // 创建一个新的数组来存储更新后的展开状态
    const newExpanded = [...cardsExpanded];

    // 如果点击的卡片已经是展开状态，则收起它
    if (newExpanded[cardIndex]) {
      newExpanded[cardIndex] = false;
    } else {
      // 如果点击的卡片是收起状态，则收起所有其他卡片并展开它
      newExpanded.fill(false);
      newExpanded[cardIndex] = true;
    }

    this.setData({
      cardsExpanded: newExpanded
    });
  },

  bookDiscussion(e) {
    const { id, status } = e.currentTarget.dataset;
    this.setData({
      isModalVisible: true,
      currentDisAreaId: id
    });
  },

  async fetchDisAreaDataFromCloud() {
    try {
      const result = await wx.cloud.callFunction({ name: 'getAreaData' });
      if (result.result && result.result.error) {
        throw new Error(result.result.error);
      }

      if (result.result && !result.result.error) {
        const { cards } = result.result;
        const processedCards = cards.map(card => {
          const usingCount = card.discussionAreas.filter(discussion => discussion.status === 'occupied').length;
          const freeCount = card.discussionAreas.filter(discussion => discussion.status === 'available').length;

          return {
            ...card,
            usingCount,
            freeCount
          };
        });


        this.setData({
          cards:processedCards,
          cardsExpanded: Array(cards.length).fill(false) // 初始化所有卡片为收起状态
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  startAutoRefresh() {
    if (!this.data.refreshTimer) {
      this.data.refreshTimer = setInterval(() => {
        this.fetchDisAreaDataFromCloud();
      }, 3 * 60 * 1000);
    }
  },

  clearAutoRefresh() {
    if (this.data.refreshTimer) {
      clearInterval(this.data.refreshTimer);
      this.setData({ refreshTimer: null });
    }
  }
});