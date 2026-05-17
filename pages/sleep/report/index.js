Page({
  data: {
    overview: [
      { label: '睡眠时长', value: '6.5', unit: '小时' },
      { label: '入睡耗时', value: '18', unit: '分钟' },
      { label: 'AHI', value: '3.2', unit: '次/小时' },
      { label: 'ODI', value: '2.8', unit: '次/小时' },
      { label: '最低血氧', value: '88%', unit: '夜间最低' },
      { label: '低氧累计', value: '12', unit: '分钟 <90%' }
    ],
    events: [
      { label: '呼吸暂停', value: '12', unit: '次/晚' },
      { label: '低通气', value: '18', unit: '次/晚' },
      { label: '阻塞型', value: '8', unit: '次' },
      { label: '中枢/混合', value: '4', unit: '次' }
    ],
    positions: [
      { name: '仰卧', value: '46%', active: true },
      { name: '左侧', value: '28%' },
      { name: '右侧', value: '22%' },
      { name: '俯卧', value: '4%' }
    ]
  },
  goHistory() {
    wx.navigateTo({ url: '/pages/sleep/history/index' })
  },
  goBack() {
    wx.navigateBack()
  }
})
