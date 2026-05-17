Page({
  data: {
    categories: ['全部', '呼吸相关', '睡眠相关', '血糖相关'],
    activeCategory: 0,
    records: [
      { time: '05.17 19:30', title: '头痛，略有头晕', desc: '持续约2小时，休息后缓解', level: '轻度' },
      { time: '05.15 07:40', title: '晨起轻微乏力', desc: '早餐后缓解，无心慌出汗', level: '轻度' }
    ]
  },
  selectCategory(event) {
    this.setData({ activeCategory: Number(event.currentTarget.dataset.index) })
  },
  markNoSymptom() {
    wx.showToast({ title: '已记录今日无不适', icon: 'none' })
  }
})
