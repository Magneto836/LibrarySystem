Page({
  data: {
    isLoading: true,
    locations: [],
    expandedCards: [],
    selectedBoothId: null,
    selectedBoothStatus: null,
    isActionModalVisible: false,
    actionModalTitle: '',
    actionModalMessage: '',
    currentAction: null, // 'toggleStatus' 或 'delete'
    isAddModalVisible: false,
    newBoothData: {
      location: ''
    },
    refreshTimer: null
  },

  onLoad() {
    this.fetchPhoneDataFromCloud();
    this.startAutoRefresh();
  },

  onUnload() {
    this.clearAutoRefresh();
  },

  async fetchPhoneDataFromCloud() {
    try {
      this.setData({ isLoading: true });
      const result = await wx.cloud.callFunction({ name: 'getPhoneData' });
      
      if (result.result && !result.result.error) {
        const processedData = this.processBoothData(result.result.phoneData);
        this.setData({
          locations: processedData,
          expandedCards: Array(processedData.length).fill(false),
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  processBoothData(rawData) {
    return rawData.reduce((acc, current) => {
      const existing = acc.find(l => l.name === current.location);
      const booth = {
        _id: current._id,
        boothId: current.boothId,
        status: current.status,
        createdAt: current.createdAt
      };
  
      if (existing) {
        existing.booths.push(booth);
        existing.usingCount = existing.booths.filter(b => b.status !== 'available').length;
        existing.freeCount = existing.booths.filter(b => b.status === 'available').length;
      } else {
        acc.push({
          name: current.location,
          booths: [booth],
          usingCount: booth.status !== 'available' ? 1 : 0,
          freeCount: booth.status === 'available' ? 1 : 0
        });
      }
      return acc;
    }, []).map(location => {
      // 对每个位置的电话亭按 boothId 排序（按数字升序）
      const sortedBooths = location.booths.sort((a, b) => {
        return a.boothId - b.boothId; // 数字排序
      });
      return { ...location, booths: sortedBooths };
    });
  },

  toggleCard(e) {
    const index = e.currentTarget.dataset.index;
    const newExpanded = [...this.data.expandedCards];
    newExpanded[index] = !newExpanded[index];
    this.setData({ expandedCards: newExpanded });
  },

  selectBooth(e) {
    const { id, status } = e.currentTarget.dataset;
    const { selectedBoothId } = this.data;

    // 如果点击的是已选中的电话亭，则取消选中
    if (selectedBoothId === id) {
      this.setData({
        selectedBoothId: null,
        selectedBoothStatus: null
      });
    } else {
      this.setData({
        selectedBoothId: id,
        selectedBoothStatus: status
      });
    }
  },

  async toggleBoothStatus() {
    const { selectedBoothId, selectedBoothStatus } = this.data;
    if (!selectedBoothId) return;

    this.showActionModal(
      'toggleStatus',
      selectedBoothId,
      `确认${selectedBoothStatus === 'adminOccupied' ? '启用' : '停用'}该电话亭？`
    );
  },

  async deleteBooth() {
    const { selectedBoothId } = this.data;
    if (!selectedBoothId) return;

    this.showActionModal('delete', selectedBoothId, '确认删除该电话亭？');
  },

  showActionModal(action, id, message) {
    this.setData({
      isActionModalVisible: true,
      currentAction: action,
      selectedBoothId: id,
      actionModalTitle: action === 'delete' ? '删除确认' : '状态变更',
      actionModalMessage: message
    });
  },

  async confirmAction() {
    try {
      if (this.data.currentAction === 'toggleStatus') {
        await wx.cloud.callFunction({
          name: 'adminUpdateResourceStatus',
          data: {
            resourceType: 'phone_booths',
            id: this.data.selectedBoothId,
            status: this.data.selectedBoothStatus === 'available' ? 'adminOccupied' : 'available'
          }
        });
        wx.showToast({ title: '操作成功！', icon: 'success' });
      } else if (this.data.currentAction === 'delete') {
        await wx.cloud.callFunction({
          name: 'adminDeleteResource',
          data: {
            resourceType: 'phone_booths',
            id: this.data.selectedBoothId
          }
        });
        wx.showToast({ title: '删除成功！', icon: 'success' });
      }
      this.fetchPhoneDataFromCloud();
    } catch (error) {
      console.error('操作失败:', error);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isActionModalVisible: false });
    }
  },

  cancelAction() {
    this.setData({ isActionModalVisible: false });
  },

  cancelAdd() {
    this.setData({ isAddModalVisible: false });
  },

  showAddModal() {
    this.setData({ isAddModalVisible: true });
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      newBoothData: {
        ...this.data.newBoothData,
        [field]: e.detail.value
      }
    });
  },

  async confirmAdd() {
    const { location } = this.data.newBoothData;
    try {
      await wx.cloud.callFunction({
        name: 'adminAddResource',
        data: {
          resourceType: 'phone_booths',
          location
        }
      });
      this.fetchPhoneDataFromCloud();
      this.setData({ isAddModalVisible: false });
      wx.showToast({ title: '添加成功！', icon: 'success' });
    } catch (error) {
      console.error('添加失败:', error);
      wx.showToast({ title: '添加失败，请重试', icon: 'none' });
    }
  },

  startAutoRefresh() {
    this.data.refreshTimer = setInterval(() => {
      this.fetchPhoneDataFromCloud();
    }, 300000); // 5分钟自动刷新
  },

  clearAutoRefresh() {
    clearInterval(this.data.refreshTimer);
  }
});