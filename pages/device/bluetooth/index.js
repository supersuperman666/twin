Page({
  data: {
    deviceId: '',
    deviceName: '智能设备'
  },

  onLoad(options = {}) {
    this.setData({
      deviceId: options.id || '',
      deviceName: decodeURIComponent(options.name || '智能设备')
    })
  },

  startBinding() {
    const url = `/pages/device/connecting/index?id=${this.data.deviceId}&name=${encodeURIComponent(this.data.deviceName)}`
    wx.navigateTo({ url })
  }
})
