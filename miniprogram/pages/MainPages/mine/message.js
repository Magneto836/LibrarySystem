const app = getApp();

Page({
  data: {
    messages: [], // 消息列表
    userInfo: null, // 用户信息
    isLoading: true, // 是否正在加载
  },

  onLoad() {
    this.setData({
      userInfo: wx.getStorageSync('userInfo') || {},
    });
    this.loadMessages();
  },

  // 加载消息
  async loadMessages() {
    try {
      wx.showLoading({ title: '加载中...' });
      this.setData({ isLoading: true });

      const result = await wx.cloud.callFunction({
        name: 'getMessage',
        data: {
          userId: this.data.userInfo.openid,
        },
      });

      if (result.result && result.result.result.messages) {
        const messages = result.result.result.messages.map(item => {
          // 格式化 createTime
          const formattedCreateTime = this.formatDate(item.createTime);
          console.log("格式",formattedCreateTime);
          // 根据 code 生成消息内容
          let content = '';
          switch (item.code) {
            case 11:
              content = '您之前预约使用的座位被管理员回收了，请重新预约，给您带来不便请您谅解';
              break;
            case 12:
              content = '您之前预约使用的电话亭被管理员回收了，请重新预约，给您带来不便请您谅解';
              break;
            case 13:
              content = '您之前预约使用的讨论区被管理员回收了，请重新预约，给您带来不便请您谅解';
              break;
            default:
              content = '系统消息';
          }

          return {
            ...item,
            content,
            title: '预约资源回收通知',
            formattedCreateTime, // 存储格式化后的时间
          };
        });

        this.setData({ messages });
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      wx.showToast({ title: '加载消息失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ isLoading: false });
    }
  },

  // 格式化时间
  formatDate(date) {
    console.log("时间为", date); // 确保这一行会打印
    if (date instanceof Date) {
      // 如果是 Date 对象，直接使用
    } else if (typeof date === 'string') {
      // 如果是字符串，转换为 Date 对象
      date = new Date(date);
    } else {
      console.error('Invalid date format:', date);
      return '';
    }

    return `${date.getFullYear()}-${this.padZero(date.getMonth() + 1)}-${this.padZero(date.getDate())} ${this.padZero(date.getHours())}:${this.padZero(date.getMinutes())}`;
  },

  padZero(num) {
    return num < 10 ? `0${num}` : num;
  },

  // 标记消息为已读
  markAsRead(e) {
    console.log("已读啦", e.currentTarget.dataset);
    const messageId = e.currentTarget.dataset.id;
    if (!messageId) {
      console.error('messageId is undefined');
      return;
    }

    wx.cloud.callFunction({
      name: 'markMessageAsRead',
      data: {
        messageId,
      },
    }).then(() => {
      this.loadMessages(); // 刷新消息列表
    }).catch(err => {
      console.error('Error marking message as read:', err);
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMessages().then(() => {
      wx.stopPullDownRefresh();
    });
  },
});