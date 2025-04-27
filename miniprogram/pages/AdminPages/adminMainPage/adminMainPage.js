Page({
  data: {
    currentDate: '',
    adminName:'',
  },

  onLoad() {

    this.setData({
      adminName: wx.getStorageSync('userInfo').nickname,
      currentDate: this.formatDate(new Date())
    });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  },

  navigateToDiscussion() {
    wx.navigateTo({
      url: '/pages/AdminPages/manageResources/disAreaManage/disAreaManage',
    });
  },

  navigateToSeats() {
    wx.navigateTo({
      url: '/pages/AdminPages/manageResources/seatManage/seatManage',
    });
  },

  navigateToPhoneBooths() {
    wx.navigateTo({
      url: '/pages/AdminPages/manageResources/phoneManage/phoneManage',
    });
  },

  navigateToUsers() {
    wx.navigateTo({
      url: '/pages/AdminPages/manageUsers/usersManage',
    });
  }
});