Page({
  data: {
    tasks: [
      { index: '1', title: '空腹血糖记录', desc: '建议 07:00-08:00 完成', action: '已完成', done: true },
      { index: '2', title: '餐后2小时血糖', desc: '午餐后 2 小时记录', action: '去记录', done: false },
      { index: '3', title: '吸入药打卡', desc: '布地奈德福莫特罗 1 吸', action: '待完成', done: false },
      { index: '4', title: '血氧复测', desc: '睡前完成 SpO2 复测', action: '去记录', done: false },
      { index: '5', title: '睡眠报告确认', desc: '查看昨晚 AHI/ODI 趋势', action: '已查看', done: true }
    ],
    focusItems: [
      { label: '血糖目标', value: '4.4-7.0', desc: '空腹 mmol/L' },
      { label: '血氧目标', value: '≥ 93%', desc: '静息 SpO2' },
      { label: '睡眠关注', value: 'AHI', desc: '每周趋势' }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  }
})
