Page({
  data: {
    profileItems: [
      { label: '年龄', value: '56岁' },
      { label: 'BMI', value: '23.4' },
      { label: '绑定设备', value: '2台' },
      { label: '随访状态', value: '管理中' }
    ],
    devices: [
      { name: '医用脉搏血氧仪', desc: '血氧、脉率、ODI', status: '已绑定', mark: '氧' },
      { name: '睡眠呼吸监测系统', desc: 'AHI、睡眠分期、夜间血氧', status: '已绑定', mark: '睡' }
    ],
    menus: [
      { label: '我的医生' },
      { label: '评估量表', path: '/pages/scale/index/index' },
      { label: '医生建议', path: '/pages/me/advice/index' },
      { label: '我的任务', path: '/pages/me/tasks/index' },
      { label: '报告与检查' },
      { label: '用药管理' },
      { label: '隐私与授权' },
      { label: '帮助与反馈' }
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  goDevice() {
    wx.navigateTo({ url: '/pages/device/index/index' })
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/index' })
  },

  onMenuTap(e) {
    const { path } = e.currentTarget.dataset
    if (path) {
      wx.navigateTo({ url: path })
      return
    }
    wx.showToast({ title: '功能建设中', icon: 'none' })
  }
})
