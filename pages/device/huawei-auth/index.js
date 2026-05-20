Page({
  data: {
    deviceName: ''
  },

  onLoad(options = {}) {
    this.setData({ deviceName: decodeURIComponent(options.name || '') })
  },

  showUnavailable() {
    wx.showToast({ title: '功能暂未开放', icon: 'none' })
  },

  handleLogin() {
    wx.showToast({ title: '授权服务暂未开通', icon: 'none' })
  }
})
