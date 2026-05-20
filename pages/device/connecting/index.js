const storageKey = 'boundHardwareDevices'

Page({
  data: {
    deviceName: '智能设备'
  },

  onLoad(options = {}) {
    const id = options.id || ''
    const deviceName = decodeURIComponent(options.name || '智能设备')
    if (id) {
      const boundIds = wx.getStorageSync(storageKey) || []
      if (!boundIds.includes(id)) {
        wx.setStorageSync(storageKey, boundIds.concat(id))
      }
    }
    this.setData({ deviceName })
  },

  goHardware() {
    wx.navigateBack({ delta: 2 })
  }
})
