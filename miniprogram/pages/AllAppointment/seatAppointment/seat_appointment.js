// pages/SeatAppointment/seat_appointment.js
Page({
  data: {
    isLoading:true ,
    activeFloor: 0,
    areaExpanded: [],
    floors: [],
    dateIndex: 0,
    isSubmitting: false,
    timeSlots: [],
    activeTime: null,
    selectedTimeSlot: '',
    selectedDate: '',
    isModalVisible: false,
    currentSeatId: '',
    currentSeatStatus: '',
    refreshTimer: null
  },

  onLoad() {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    this.setData({ timeSlots: this.generateTimeSlots(currentTime) });
    this.setData({ isLoading: true });
    this.fetchSeatDataFromCloud();
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

  selectTimeSlot(e) {
    const selectedIndex = e.detail.value;
    const selectedTimeSlot = this.data.timeSlots[selectedIndex];
    const startTime = selectedTimeSlot.split('——')[0];
    this.setData({ selectedTimeSlot, startTime });
  },

  selectDate(e) {
    const index = e.detail.value;
    const selectedDate = this.data.dateOptions[index];
    const isToday = selectedDate === this.data.today;

    this.setData({
      selectedDate,
      timeSlots: this.generateTimeSlots(
        isToday ? new Date().toTimeString().substr(0, 5) : null,
        isToday
      )
    });
  },

  generateTimeSlots(currentTime, isToday) {
    const slots = [];
    let currentTotalMinutes = 0;
  
    if (isToday) {
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      currentTotalMinutes = currentHour * 60 + currentMinute;
    }
  
    // 时间范围从7点到23点
    const startHour = 7;
    const endHour = 23;
  
    // 四个小时为一组
    for (let hour = startHour; hour < endHour; hour += 4) {
      const startHourStr = hour.toString().padStart(2, '0');
      const startMinuteStr = '00';
      const startTime = `${startHourStr}:${startMinuteStr}`;
  
      let endHourStr;
      let endMinuteStr;
  
      if (hour + 4 > endHour) {
        // 如果超过23点，结束时间设为23:00
        endHourStr = endHour.toString().padStart(2, '0');
        endMinuteStr = '00';
      } else {
        endHourStr = (hour + 4).toString().padStart(2, '0');
        endMinuteStr = '00';
      }
  
      const endTime = `${endHourStr}:${endMinuteStr}`;
  
      if (isToday) {
        const slotStartTotalMinutes = hour * 60;
        if (slotStartTotalMinutes >= currentTotalMinutes-240) {
          slots.push(`${startTime}——${endTime}`);
        }
      } else {
        slots.push(`${startTime}——${endTime}`);
      }
    }
  
    return slots;
  },

  

  async confirmBooking() {
    const { selectedDate, startTime, currentSeatId } = this.data;

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

    try {
      const conflictCheck = await wx.cloud.callFunction({
        name: 'checkBookingConflict',
        data: {
          resourceId: currentSeatId,
          endTime: endDateTime.toISOString()
        }
      });

      if (conflictCheck.result.hasConflict) {
        wx.showToast({ title: '该时段已被预约', icon: 'none' });
        this.setData({ isSubmitting: false });
        return;
      }

      await wx.cloud.callFunction({
        name: 'createAppointment',
        data: {
          resourceType: 'seats',
          resourceId: currentSeatId,
          startTime: startDateTime.toISOString(),
          duration: 240
        }
      });
      await wx.cloud.callFunction({
        name: 'checkAppointments'
      });
      await wx.cloud.callFunction({
        name:'update_resource_summary'
      });
      wx.showToast({
        title: '预约成功！',
        icon: 'success'
      });

      this.setData({
        isModalVisible: false,
        isSubmitting: false
      });

      this.fetchSeatDataFromCloud();
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

  toggleArea(e) {
    const { floor, area } = e.currentTarget.dataset;
    const currentExpanded = this.data.areaExpanded;

    const newExpanded = [...currentExpanded];

    if (newExpanded[area]) {
      newExpanded[area] = false;
    } else {
      newExpanded.fill(false);
      newExpanded[area] = true;
    }
    
    this.setData({
      areaExpanded: newExpanded
    });
  },

  switchFloor(e) {
    this.setData({
      activeFloor: e.currentTarget.dataset.index,
      areaExpanded: []
    });
  },

  bookSeat(e) {
    const { seatid, status, id } = e.currentTarget.dataset;
    this.setData({
      isModalVisible: true,
      currentSeatId: id
    });
  },

  async fetchSeatDataFromCloud() {
    try {
      const result = await wx.cloud.callFunction({ name: 'getSeatData' });
      if (result.result && result.result.error) {
        throw new Error(result.result.error);
      }

      if (result.result && !result.result.error) {
        const { floors } = result.result;
            
        this.setData({
          floors,
          areaExpanded: Array(floors[0].areas.length).fill(false)
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }finally{
      this.setData({ isLoading: false });
    }
  },

  startAutoRefresh() {
    if (!this.data.refreshTimer) {
      this.data.refreshTimer = setInterval(() => {
        this.fetchSeatDataFromCloud();
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