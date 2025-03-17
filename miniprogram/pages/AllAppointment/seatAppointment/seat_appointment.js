Page({
  data: {
    activeFloor: 0,
    areaExpanded: [],
    floors: []
  },
  onLoad() {
    this.fetchResourceData();
  },

  async fetchResourceData() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getSeatData',
      });
      console.log("res如下！！！！！！",res.result.floors);
      if (res.result.error) throw new Error(res.result.error);
      
      // 更新数据并初始化区域展开状态
      this.setData({
        floors: res.result.floors,
        areaExpanded: res.result.floors[0].areas.map(() => false) // 默认折叠所有区域
      });
    } catch (err) {
      console.error('获取数据失败:', err);
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    }
  },
  switchFloor(e) {
    this.setData({
      activeFloor: e.currentTarget.dataset.index,
      areaExpanded: [] // 切换楼层时重置展开状态
    });
  },

  toggleArea(e) {
    const { floor, area } = e.currentTarget.dataset;
    const key = `areaExpanded[${area}]`;
    this.setData({
      [key]: !this.data.areaExpanded[area]
    });
  },

  bookSeat(e) {
    const { seatid, status } = e.currentTarget.dataset;
    if (status !== 'available') return;
    
    // 调用预约接口
    wx.showModal({
      title: '确认预约',
      content: `确定要预约 ${seatid} 号座位吗？`,
      success: (res) => {
        if (res.confirm) {
          // 调用预约接口
        }
      }
    })
  }
})