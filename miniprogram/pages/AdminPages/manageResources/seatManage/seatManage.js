Page({
  data: {
    isLoading: true,
    activeFloor: 0,
    areaExpanded: [],
    floors: [],
    isActionModalVisible: false,
    actionModalTitle: '',
    actionModalMessage: '',
    currentAction: null, // 'toggleStatus' 或 'delete'
    currentId: null,
    currentStatus: null,
    selectedSeatId: null,
    selectedSeatStatus: null,
    isAddSeatModalVisible: false,
    floorInput: '',
    areaInput: ''

  },

  onLoad() {
    this.fetchSeatDataFromCloud();
  },

  async fetchSeatDataFromCloud() {
    try {
      this.setData({ isLoading: true });
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
    } finally {
      this.setData({ isLoading: false });
    }
  },

  switchFloor(e) {
    this.setData({
      activeFloor: e.currentTarget.dataset.index,
      areaExpanded: []
    });
  },

  toggleArea(e) {
    const { area } = e.currentTarget.dataset;
    const { areaExpanded } = this.data;
    const newExpanded = [...areaExpanded];

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

  selectSeat(e) {
    const { id, status } = e.currentTarget.dataset;
    const { selectedSeatId } = this.data;

    if (selectedSeatId === id) {
      this.setData({
        selectedSeatId: null,
        selectedSeatStatus: null
      });
    } else {
      this.setData({
        selectedSeatId: id,
        selectedSeatStatus: status
      });
    }
  },

  toggleStatus() {
    if (!this.data.selectedSeatId) return;
    this.showActionModal('toggleStatus', this.data.selectedSeatId, this.data.selectedSeatStatus);
  },

  deleteSeat() {
    if (!this.data.selectedSeatId) return;
    this.showActionModal('delete', this.data.selectedSeatId);
  },

  showActionModal(action, id, status) {
    let title, message;

    if (action === 'toggleStatus') {
      title = status === 'adminOccupied' ? '启用座位' : '停用座位';
      message = `确定要${status === 'adminOccupied' ? '启用' : '停用'}该座位吗？`;
    } else if (action === 'delete') {
      title = '删除座位';
      message = '确定要删除该座位吗？此操作不可撤销。';
    }

    this.setData({
      isActionModalVisible: true,
      actionModalTitle: title,
      actionModalMessage: message,
      currentAction: action,
      currentId: id,
      currentStatus: status
    });
  },

  async confirmAction() {
    const { currentAction, currentId, currentStatus } = this.data;

    try {
      if (currentAction === 'toggleStatus') {
        const newStatus = currentStatus === 'available' ? 'adminOccupied' : 'available';
        await wx.cloud.callFunction({
          name: 'adminUpdateResourceStatus',
          data: {
            id: currentId,
            status: newStatus,
            resourceType: "seats"
          }
        });
        wx.showToast({ title: '操作成功！', icon: 'success' });
      } else if (currentAction === 'delete') {
        await wx.cloud.callFunction({
          name: 'adminDeleteResource',
          data: { 
            id: currentId,
            resourceType: "seats"
          }
        });
        wx.showToast({ title: '删除成功！', icon: 'success' });
      }

      this.setData({ isActionModalVisible: false });
      this.fetchSeatDataFromCloud();
    } catch (error) {
      console.error('操作失败:', error);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  cancelAction() {
    this.setData({ 
      isActionModalVisible: false,
      selectedSeatId: null,
      selectedSeatStatus: null
    });
  },

  addSeat() {
    this.setData({
      isAddSeatModalVisible: true,
      floorInput: '',
      areaInput: '',
    });
  },

  onFloorInput(e) {
    const value = e.detail.value;
    if (/^\d+$/.test(value) || value === '') {
      this.setData({ floorInput: value });
    } else {
      wx.showToast({ title: '楼层只能是数字', icon: 'none' });
    }
  },

  onAreaInput(e) {
    const value = e.detail.value;
    if (/^[A-Z]+$/.test(value) || value === '') {
      this.setData({ areaInput: value });
    } else {
      wx.showToast({ title: '区域只能是大写字母', icon: 'none' });
    }
  },

  confirmAddSeat() {
    const { floorInput, areaInput } = this.data;

    if (!floorInput || !areaInput) {
      wx.showToast({ title: '请输入完整信息', icon: 'none' });
      return;
    }

    try {
      wx.cloud.callFunction({
        name: 'adminAddResource',
        data: {
          floor: parseInt(floorInput),
          area: areaInput,
          resourceType: 'seats'
        }
      }).then(() => {
        wx.showToast({ title: '添加成功！', icon: 'success' });
        this.setData({ isAddSeatModalVisible: false });
        this.fetchSeatDataFromCloud();
      }).catch((error) => {
        console.error('添加座位失败:', error);
        wx.showToast({ title: '添加失败，请重试', icon: 'none' });
      });
    } catch (error) {
      console.error('添加座位失败:', error);
      wx.showToast({ title: '添加失败，请重试', icon: 'none' });
    }
  },

  cancelAddSeat() {
    this.setData({ isAddSeatModalVisible: false });
  },

});