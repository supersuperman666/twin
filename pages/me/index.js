const mockSession = require('../../utils/mock-session');
const profileStore = require('../../utils/profile-store');

function getProfileCompletion(profile) {
  const required = [
    profile.sex,
    profile.birthDate,
    profile.height,
    profile.weight,
    profile.waistline,
    profile.family && profile.family.length,
    profile.allergy,
    profile.smoke,
    profile.alcoholic,
    profile.disease && profile.disease.length
  ];
  const completed = required.filter(Boolean).length;
  return Math.round((completed / required.length) * 100);
}

Page({
  data: {
    currentPatient: null,
    hasDoctor: false,
    doctor: null,
    healthTags: [],
    profileCompletion: 0,
    deviceSummary: null,
    quickEntries: [
      { label: '我的任务', icon: '任', path: '/pages/me/tasks/index' },
      { label: '医生建议', icon: '建', path: '/pages/me/advice/index' },
      { label: '随访记录', icon: '访', path: '/pages/followup/records/index' },
      { label: '预警记录', icon: '警', path: '/pages/alerts/index' }
    ],
    serviceMenus: [
      { label: '评估量表', desc: 'CAT、mMRC 等评估', path: '/pages/scale/index/index' },
      { label: '用药管理', desc: '用药提醒与执行记录', path: '/pages/medication/detail/index' }
    ],
    settingMenus: [
      { label: '隐私与授权', action: 'privacy' },
      { label: '帮助与反馈', action: 'help' },
      { label: '退出登录', action: 'logout' }
    ],
    helpTapCount: 0,
    lastHelpTapAt: 0
  },

  onShow() {
    const currentPatient = mockSession.getCurrentPatient();
    const profile = profileStore.getProfile();
    const deviceCount = currentPatient.devices.length;
    this.setData({
      currentPatient,
      hasDoctor: Boolean(currentPatient.doctorName),
      healthTags: currentPatient.healthTags || currentPatient.diseases || [],
      doctor: {
        name: currentPatient.doctorName,
        role: currentPatient.doctorRole || '当前主责医生'
      },
      profileCompletion: getProfileCompletion(profile),
      deviceSummary: {
        count: deviceCount,
        label: deviceCount ? `已绑定 ${deviceCount} 台` : '尚未绑定设备',
        actionText: deviceCount ? '查看设备' : '去绑定'
      }
    });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
  },

  goPath(e) {
    const { path } = e.currentTarget.dataset;
    if (path) wx.navigateTo({ url: path });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/index' })
  },

  goDevice() {
    wx.navigateTo({ url: '/pages/device/index/index' })
  },

  handleDoctorTap() {
    if (!this.data.hasDoctor) {
      wx.showToast({ title: '扫码绑定流程建设中', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '我的医生',
      content: `${this.data.doctor.name}｜${this.data.doctor.role}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  handleBindDoctor() {
    wx.showToast({ title: '扫码绑定流程建设中', icon: 'none' });
  },

  onSettingTap(e) {
    const { action } = e.currentTarget.dataset;
    if (action === 'privacy') {
      wx.showModal({
        title: '隐私与授权',
        content: '隐私与授权页面建设中，当前仅用于演示入口。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    if (action === 'logout') {
      wx.showModal({
        title: '退出登录',
        content: '当前为演示环境，暂不清除登录态。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    if (action === 'help') this.handleHelpTap();
  },

  handleHelpTap() {
    const now = Date.now()
    const nextCount = now - this.data.lastHelpTapAt > 2500 ? 1 : this.data.helpTapCount + 1
    this.setData({ helpTapCount: nextCount, lastHelpTapAt: now })
    if (nextCount >= 5) {
      this.setData({ helpTapCount: 0, lastHelpTapAt: 0 })
      wx.navigateTo({ url: '/pages/me/mock-config/index' })
      return
    }
    if (nextCount >= 3) {
      wx.showToast({ title: `再点 ${5 - nextCount} 次进入演示配置`, icon: 'none' })
      return
    }
    wx.showToast({ title: '功能建设中', icon: 'none' })
  }
})
