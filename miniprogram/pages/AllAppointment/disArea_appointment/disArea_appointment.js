Page({
  data: {
    cards: [], // 存储分组后的卡片数据
    cardsExpanded: [], // 记录每个卡片的展开状态
    activeCardIndex: null // 当前活跃的卡片索引（用于只展开一个卡片）
  },

  onLoad() {
    this.fetchResourceData();
  },

  async fetchResourceData() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getAreaData',
      });
      
      if (res.result && res.result.cards) {
        // 初始化展开状态，所有卡片默认收起
        const cardsExpanded = res.result.cards.map(() => false);
        
        this.setData({
          cards: res.result.cards,
          cardsExpanded: cardsExpanded
        });
      } else {
        throw new Error('数据格式错误');
      }
    } catch (err) {
      console.error('获取数据失败:', err);
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    }
  },

  // 展开/收起卡片
  toggleCard(e) {
    const cardIndex = e.currentTarget.dataset.index;
    const { cardsExpanded } = this.data;

    // 反转当前卡片的展开状态
    cardsExpanded[cardIndex] = !cardsExpanded[cardIndex];

    // 收起其他所有卡片
    cardsExpanded.forEach((_, index) => {
      if (index !== cardIndex) {
        cardsExpanded[index] = false;
      }
    });

    this.setData({
      cardsExpanded
    });
  },

  // 预约讨论区
  bookDiscussion(e) {
    const { id, status } = e.currentTarget.dataset;
    if (status !== 'available') {
      wx.showToast({
        title: '该讨论区已被占用',
        icon: 'none'
      });
      return;
    }
    
    wx.showToast({
      title: '预约成功',
      icon: 'success'
    });
    
    // 这里可以添加实际的预约逻辑
    console.log('预约讨论区:', id);
  }
});