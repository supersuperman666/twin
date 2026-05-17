Page({
  data: {
    devices: [
      { name: '医用脉搏血氧仪', model: 'ZG-P11H', status: '已连接', statusClass: 'good', sync: '最近同步 08:30', metrics: ['SpO2', '脉率', 'ODI', '夜间血氧'] },
      { name: '睡眠呼吸监测系统', model: 'ZG-M11A', status: '已绑定', statusClass: '', sync: '昨晚报告已生成', metrics: ['AHI', 'ODI', '体位', '睡眠分期', '血氧趋势'] }
    ],
    pendingDevices: [
      { name: '血糖仪', desc: '后续支持蓝牙同步，当前可手动记录', metrics: ['血糖', '空腹/餐后'] },
      { name: '血压计', desc: '后续支持设备对接，当前可手动记录', metrics: ['收缩压', '舒张压', '脉搏'] }
    ]
  },
  showComing() {
    wx.showToast({ title: '设备绑定流程待接入', icon: 'none' })
  },
  goBack() {
    wx.navigateBack()
  }
})
