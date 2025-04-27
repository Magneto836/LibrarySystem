Page({
  data: {
    isLoading: true,
    filteredCards: [],
    cards: [],
    expandedCards: [],
    currentPage: 1,
    pageSize: 20,
    totalPages: 1,
    selectedDiscussionId: null,
    selectedDiscussionStatus: null,
    isActionModalVisible: false,
    actionModalTitle: '',
    actionModalMessage: '',
    currentAction: null, // 'toggleStatus' 或 'delete'
    currentId: null,
    currentStatus: null
  },

  onLoad() {
    this.fetchDisAreaDataFromCloud();
  },

  async fetchDisAreaDataFromCloud() {
    try {
      this.setData({ isLoading: true });
      const result = await wx.cloud.callFunction({ name: 'getAreaData' });
      
      if (result.result && !result.result.error) {
        const { cards } = result.result;
        const processedCards = cards.map(card => {
          // 对 discussionAreas 按 topicId 排序
          const sortedAreas = [...card.discussionAreas].sort((a, b) => {
            return a.topicId.localeCompare(b.topicId);
          });
  
          const usingCount = sortedAreas.filter(discussion => discussion.status === 'occupied').length;
          const freeCount = sortedAreas.filter(discussion => discussion.status === 'available').length;
  
          return {
            ...card,
            discussionAreas: sortedAreas, // 使用排序后的数组
            usingCount,
            freeCount
          };
        });
  
        this.setData({
          cards: processedCards,
          filteredCards: processedCards,
          expandedCards: Array(processedCards.length).fill(false),
          currentPage: 1
        });
        this.calculateTotalPages();
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  calculateTotalPages() {
    const { filteredCards, pageSize } = this.data;
    const totalItems = filteredCards.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    this.setData({ totalPages });
  },

  toggleCard(e) {
    const { index } = e.currentTarget.dataset;
    const { expandedCards } = this.data;
    const newExpanded = [...expandedCards];
    newExpanded[index] = !newExpanded[index];
    this.setData({ expandedCards: newExpanded });
  },

  selectDiscussion(e) {
    const { id, status } = e.currentTarget.dataset;
    const { selectedDiscussionId } = this.data;

    if (selectedDiscussionId === id) {
      // 如果已选中，则取消选中
      this.setData({
        selectedDiscussionId: null,
        selectedDiscussionStatus: null
      });
    } else {
      this.setData({
        selectedDiscussionId: id,
        selectedDiscussionStatus: status
      });
    }
  },

  toggleStatus() {
    if (!this.data.selectedDiscussionId) return;
    this.showActionModal('toggleStatus', this.data.selectedDiscussionId, this.data.selectedDiscussionStatus);
  },

  deleteDiscussionArea() {
    if (!this.data.selectedDiscussionId) return;
    this.showActionModal('delete', this.data.selectedDiscussionId);
  },

  showActionModal(action, id, status) {
    let title, message;

    if (action === 'toggleStatus') {
      title = status === 'adminOccupied' ? '启用讨论区' : '停用讨论区';
      message = `确定要${status === 'adminOccupied' ? '启用' : '停用'}该讨论区吗？`;
    } else if (action === 'delete') {
      title = '删除讨论区';
      message = '确定要删除该讨论区吗？此操作不可撤销。';
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
            resourceType: "discussion_areas"
          }
        });
        wx.showToast({ title: '操作成功！', icon: 'success' });
      } else if (currentAction === 'delete') {
        console.log("怎么回事");
        await wx.cloud.callFunction({
          name: 'adminDeleteResource',
          data: { id: currentId,
          resourceType:'discussion_areas' }
        });
        wx.showToast({ title: '删除成功！', icon: 'success' });
      }

      this.setData({ isActionModalVisible: false });
      this.fetchDisAreaDataFromCloud();
    } catch (error) {
      console.error('操作失败:', error);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  cancelAction() {
    this.setData({ 
      isActionModalVisible: false,
      selectedDiscussionId: null,
      selectedDiscussionStatus: null
    });
  },

  // 添加资源
  addResource() {
    this.setData({
      isAddResourceModalVisible: true,
      floorInput: '',
      areaInput: '',
      capacity:''
    });
  },
  onFloorInput(e) {
    const value = e.detail.value;
    // 检查输入是否为数字
    if (/^\d+$/.test(value) || value === '') {
      this.setData({ floorInput: value });
    } else {
      wx.showToast({ title: '楼层只能是数字', icon: 'none' });
    }
  },
  onCapInput(e) {
    const value = e.detail.value;
    // 检查输入是否为数字
    if (/^\d+$/.test(value) || value === '') {
      this.setData({ capacity: value });
    } else {
      wx.showToast({ title: '容量只能是数字', icon: 'none' });
    }
  },
  onAreaInput(e) {
    const value = e.detail.value;
    // 检查输入是否为大写字母
    if (/^[A-Z]+$/.test(value) || value === '') {
      this.setData({ areaInput: value });
    } else {
      wx.showToast({ title: '区域只能是大写字母', icon: 'none' });
    }
  },

  confirmAddResource() {
    const { floorInput, areaInput,capacity } = this.data;

    if (!floorInput || !areaInput||!capacity) {
      wx.showToast({ title: '请输入完整信息', icon: 'none' });
      return;
    }
    try {
    
      wx.cloud.callFunction({
        name: 'adminAddResource',
        data: {
          floor: parseInt(floorInput),
          area: areaInput,
          capacity: parseInt(capacity),
          resourceType: 'discussion_areas'
        }
      }).then(() => {
        wx.showToast({ title: '添加成功！', icon: 'success' });
        this.setData({ isAddResourceModalVisible: false });
        this.fetchDisAreaDataFromCloud();
      }).catch((error) => {
        console.error('添加资源失败:', error);
        wx.showToast({ title: '添加失败，请重试', icon: 'none' });
      });
    } catch (error) {
      console.error('添加资源失败:', error);
      wx.showToast({ title: '添加失败，请重试', icon: 'none' });
    }
  },
  cancelAddResource() {
    this.setData({ isAddResourceModalVisible: false });
  }


});