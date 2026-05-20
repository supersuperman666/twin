const categories = [
  {
    key: 'sleep',
    name: '睡眠',
    icon: '◐',
    devices: [
      { id: 'zg-m11a', name: '雷达睡眠监测仪 ZG-M11A', type: 'bluetooth', icon: '◐', desc: '睡眠呼吸、体动、睡眠时长' },
      { id: 'zg-m11b', name: '雷达睡眠监测仪 ZG-M11B', type: 'bluetooth', icon: '◐', desc: '睡眠呼吸、睡眠时长' },
      { id: 'huawei-sleep', name: '华为健康数据', type: 'huawei', icon: 'H', desc: '通过华为健康开放平台同步' }
    ]
  },
  {
    key: 'glucose',
    name: '血糖',
    icon: '滴',
    devices: [
      { id: 'huawei-glucose', name: '华为健康数据', type: 'huawei', icon: 'H', desc: '通过华为健康开放平台同步' },
      { id: 'sannuo-glucose', name: '三诺血糖仪', type: 'huawei', icon: '滴', desc: '本期统一走华为授权流程' },
      { id: 'yuwell-glucose', name: '鱼跃血糖仪', type: 'huawei', icon: '滴', desc: '本期统一走华为授权流程' }
    ]
  },
  {
    key: 'pressure',
    name: '血压',
    icon: '压',
    devices: [
      { id: 'huawei-pressure', name: '华为健康数据', type: 'huawei', icon: 'H', desc: '通过华为健康开放平台同步' },
      { id: 'omron-pressure', name: '欧姆龙血压计', type: 'huawei', icon: '压', desc: '本期统一走华为授权流程' },
      { id: 'yuwell-pressure', name: '鱼跃血压计', type: 'huawei', icon: '压', desc: '本期统一走华为授权流程' }
    ]
  },
  {
    key: 'oxygen',
    name: '血氧',
    icon: '氧',
    devices: [
      { id: 'zg-p11h', name: '血氧指环 ZG-P11H', type: 'bluetooth', icon: '氧', desc: '夜间血氧、脉率、ODI' },
      { id: 'zg-p11g', name: '血氧指环 ZG-P11/G', type: 'bluetooth', icon: '氧', desc: '夜间血氧、脉率、ODI' },
      { id: 'huawei-oxygen', name: '华为健康数据', type: 'huawei', icon: 'H', desc: '通过华为健康开放平台同步' },
      { id: 'yuwell-oxygen', name: '鱼跃血氧仪', type: 'huawei', icon: '氧', desc: '本期统一走华为授权流程' }
    ]
  },
  {
    key: 'weight',
    name: '体重',
    icon: '重',
    devices: [
      { id: 'huawei-scale', name: '华为健康数据', type: 'huawei', icon: 'H', desc: '体重、BMI、体脂率' },
      { id: 'xiaomi-scale', name: '小米体脂秤', type: 'huawei', icon: '重', desc: '本期统一走华为授权流程' },
      { id: 'yolanda-scale', name: '云麦体脂秤', type: 'huawei', icon: '重', desc: '本期统一走华为授权流程' }
    ]
  },
  {
    key: 'sport',
    name: '运动',
    icon: '动',
    devices: [
      { id: 'huawei-watch', name: '华为健康数据', type: 'huawei', icon: 'H', desc: '步数、运动、心率' },
      { id: 'huawei-gt', name: '华为 GT 系列手表', type: 'huawei', icon: '动', desc: '运动、睡眠、心率' },
      { id: 'huawei-band', name: '华为 Band 系列手环', type: 'huawei', icon: '动', desc: '步数、睡眠、心率' }
    ]
  }
]

const storageKey = 'boundHardwareDevices'

Page({
  data: {
    categories,
    activeKey: 'sleep',
    activeName: '睡眠',
    activeIcon: '睡',
    currentDevices: [],
    boundIds: []
  },

  onLoad(options = {}) {
    const targetType = this.normalizeType(options.type)
    const initialKey = targetType || 'sleep'
    this.setActiveCategory(initialKey)
  },

  onShow() {
    this.refreshDeviceState()
  },

  normalizeType(type) {
    const map = {
      sleep: 'sleep',
      oxygen: 'oxygen',
      glucose: 'glucose',
      pressure: 'pressure',
      bp: 'pressure',
      weight: 'weight',
      sport: 'sport'
    }
    return map[type] || ''
  },

  refreshDeviceState() {
    const boundIds = wx.getStorageSync(storageKey) || []
    const currentDevices = this.buildCurrentDevices(this.data.activeKey, boundIds)
    this.setData({ boundIds, currentDevices })
  },

  setActiveCategory(key) {
    const category = categories.find((item) => item.key === key) || categories[0]
    const boundIds = wx.getStorageSync(storageKey) || []
    this.setData({
      activeKey: category.key,
      activeName: category.name,
      activeIcon: category.name.slice(0, 1),
      boundIds,
      currentDevices: this.buildCurrentDevices(category.key, boundIds)
    })
  },

  buildCurrentDevices(key, boundIds) {
    const category = categories.find((item) => item.key === key) || categories[0]
    return category.devices.map((device) => ({
      ...device,
      bound: boundIds.includes(device.id),
      actionText: boundIds.includes(device.id) ? '解除绑定' : '立即绑定',
      providerText: device.type === 'huawei' ? '华为健康开放平台' : '蓝牙设备'
    }))
  },

  switchCategory(event) {
    this.setActiveCategory(event.currentTarget.dataset.key)
  },

  handleDeviceAction(event) {
    const { id } = event.currentTarget.dataset
    const device = this.data.currentDevices.find((item) => item.id === id)
    if (!device) return
    if (device.bound) {
      this.unbindDevice(device)
      return
    }
    const url = device.type === 'bluetooth'
      ? `/pages/device/bluetooth/index?id=${device.id}&name=${encodeURIComponent(device.name)}`
      : `/pages/device/huawei-auth/index?id=${device.id}&name=${encodeURIComponent(device.name)}`
    wx.navigateTo({ url })
  },

  unbindDevice(device) {
    wx.showModal({
      title: '解绑设备',
      content: `确认解绑${device.name}？解绑后将不再展示为已绑定设备。`,
      confirmText: '解绑',
      confirmColor: '#e5484d',
      success: (res) => {
        if (!res.confirm) return
        const nextIds = this.data.boundIds.filter((item) => item !== device.id)
        wx.setStorageSync(storageKey, nextIds)
        this.setData({
          boundIds: nextIds,
          currentDevices: this.buildCurrentDevices(this.data.activeKey, nextIds)
        })
        wx.showToast({ title: '已解绑', icon: 'success' })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
