
Page({
  data: {
    users: [],
    isAdmin: false,
    password: '',
    currentUserId: null,
    currentAction: null, // 'makeAdmin', 'revokeAdmin', 'ban', 'unban'
    adminPassword: '', // 存储管理员密码
    userInfo: null, // 当前登录用户信息
    newAdminPassword: '', // 新管理员密码
    isPasswordModalVisible: false, // 管理员密码验证模态框
    isNewPasswordModalVisible: false // 新管理员密码设置模态框
  },

  onLoad() {
    this.setData({
      userInfo: wx.getStorageSync('userInfo') || {}
    });
    this.fetchUsers();
    this.checkAdminStatus();
    this.setData({ adminPassword: wx.getStorageSync('adminPassword') || '' });
    this.dailyChart = null;
    this.weeklyChart = null;
  },

  async fetchUsers() {
    try {
      const result = await wx.cloud.callFunction({ name: 'getAllUsers' });
      if (result.result && !result.result.error) {
        const formattedUsers = result.result.users.map(user => ({
          ...user,
          formattedTime: this.formatDate(user.createTime)
        }));
        this.setData({ users: formattedUsers });
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  checkAdminStatus() {
    const app = getApp();
    this.setData({ isAdmin: app.globalData.isAdmin });
  },

  toggleAdmin(e) {
    const userId = e.currentTarget.dataset.id;
    const isAdmin = e.currentTarget.dataset.isadmin;

    if (userId === this.data.userInfo.openid) {
      wx.showToast({ title: '不能对自己进行此操作', icon: 'none' });
      return;
    }

    this.setData({
      currentUserId: userId,
      currentAction: isAdmin ? 'revokeAdmin' : 'makeAdmin',
      password: '',
      isPasswordModalVisible: true // 显示管理员密码验证模态框
    });
  },

  toggleBan(e) {
    const userId = e.currentTarget.dataset.id;

    if (userId === this.data.userInfo.openid) {
      wx.showToast({ title: '不能对自己进行此操作', icon: 'none' });
      return;
    }

    this.setData({
      currentUserId: userId,
      currentAction: e.currentTarget.dataset.isbanned ? 'unban' : 'ban',
      password: '',
      isPasswordModalVisible: true // 显示管理员密码验证模态框
    });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  async confirmPassword() {
    try {
      if (!this.data.currentUserId || !this.data.currentAction) return;

      if (this.data.password !== this.data.adminPassword) {
        wx.showToast({ title: '密码错误', icon: 'none' });
        return;
      }

      // 如果是设置管理员，显示新密码设置模态框
      if (this.data.currentAction === 'makeAdmin') {
        this.setData({
          isPasswordModalVisible: false,
          isNewPasswordModalVisible: true
        });
      } else {
        // 其他操作直接执行
        await this.executeAction();
      }
    } catch (error) {
      console.error('密码验证失败:', error);
      wx.showToast({ title: '密码验证失败，请重试', icon: 'none' });
    }
  },

  onNewAdminPasswordInput(e) {
    this.setData({ newAdminPassword: e.detail.value });
  },

  async executeAction() {
    try {
      if (!this.data.currentUserId || !this.data.currentAction) return;

      const updateData = {};
      if (this.data.currentAction === 'makeAdmin') {
        if (!this.data.newAdminPassword) {
          wx.showToast({ title: '请为新管理员设置密码', icon: 'none' });
          return;
        }
        updateData.isAdmin = true;
        updateData.password = this.data.newAdminPassword;
      } else if (this.data.currentAction === 'revokeAdmin') {
        updateData.isAdmin = false;
      } else if (this.data.currentAction === 'ban') {
        updateData.isBanned = true;
      } else if (this.data.currentAction === 'unban') {
        updateData.isBanned = false;
      }

      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          userId: this.data.currentUserId,
          updates: updateData
        }
      });

      wx.showToast({ title: '操作成功！', icon: 'success' });
      this.fetchUsers();
      this.resetModals();
    } catch (error) {
      console.error('操作失败:', error);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  cancelPassword() {
    this.resetModals();
  },

  resetModals() {
    this.setData({
      isPasswordModalVisible: false,
      isNewPasswordModalVisible: false,
      password: '',
      newAdminPassword: ''
    });
  },
 
  async showAppointmentStats(e) {
    const userId = e.currentTarget.dataset.id;
    const currentUser = this.data.users.find(u => u._id === userId);
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getAppointmentRecordsByUserId',
        data: { userId }
      });
  
      if (res.result?.resources) {
        const statsData = this.processAppointmentStats(res.result.resources);
        
        // 计算总预约次数（修正部分）
        const total = statsData.weeklyStats.reduce((sum, week) => {
          return sum + week.phoneBooth + week.seat + week.discussionArea;
        }, 0);
        
        this.setData({
          statsData,
          isStatsModalVisible: true,
          currentUserNickname: currentUser?.nickname || '该用户',
          totalAppointments: total
        });
      }
    } catch (err) {
      console.error('获取统计信息失败:', err);
      wx.showToast({ title: '获取数据失败', icon: 'none' });
    }
  },
  processAppointmentStats(resources) {
    const weeklyStats = {};
  
    // 优化类型处理器（添加时区补偿）
    const handleType = (appointments, type) => {
      appointments.forEach(appointment => {
        // 补偿8小时时区差（根据服务器时间设置）
        const adjustedDate = new Date(appointment.startTime);
        adjustedDate.setHours(adjustedDate.getHours() + 8); 
        
        const weekRange = this.getWeekDateRange(adjustedDate);
        
        if (!weeklyStats[weekRange]) {
          weeklyStats[weekRange] = {
            phoneBooth: 0,
            seat: 0,
            discussionArea: 0
          };
        }
        weeklyStats[weekRange][type] += 1;
      });
    };
  
    // 处理各类型数据（保持不变）
    handleType(resources.phoneBooths.flatMap(b => b.appointments), 'phoneBooth');
    handleType(resources.seats.flatMap(s => s.appointments), 'seat');
    handleType(resources.discussionAreas.flatMap(d => d.appointments), 'discussionArea');
  
    // 最终数据结构验证
    console.log("处理后的周统计:", weeklyStats);
    
    return {
      weeklyStats: Object.entries(weeklyStats)
        .map(([dateRange, counts]) => ({
          dateRange,
          ...counts
        }))
        .sort((a, b) => 
          new Date(a.dateRange.split('～')[0]) - 
          new Date(b.dateRange.split('～')[0])
        )
    };
  },
  // 新增日期范围计算方法
  // 修改后的 getWeekDateRange 方法
getWeekDateRange(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=周日,1=周一,...6=周六
  
  // 计算周一首日（修正跨月问题）
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  
  // 计算周日（确保+6天不会跨月错误）
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // 本地化日期格式化方法
  const localDateString = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const date = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  return `${localDateString(monday)}～${localDateString(sunday)}`;
},
  // 关闭统计模态框
  cancelStats() {
    this.setData({
      isStatsModalVisible: false
    });
  }
});