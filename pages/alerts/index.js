const alertList = [
  {
    id: 'A001',
    level: '紧急',
    levelKey: 'critical',
    title: '夜间血氧偏低',
    reason: '最低血氧 86%，低氧持续时间较前日增加',
    evidence: '睡眠报告 · 2026-05-24 07:20',
    status: '待处理',
    statusKey: 'pending',
    actionText: '查看睡眠报告',
    actionUrl: '/pages/sleep/report/index',
    time: '今天 07:30',
  },
  {
    id: 'A002',
    level: '重要',
    levelKey: 'important',
    title: '空腹血糖连续偏高',
    reason: '连续 2 天空腹血糖高于目标范围',
    evidence: '血糖记录 · 7.8 / 8.1 mmol/L',
    status: '待处理',
    statusKey: 'pending',
    actionText: '去复测血糖',
    actionUrl: '/pages/record/form/index?type=glucose&scene=recheck',
    time: '今天 09:10',
  },
  {
    id: 'A003',
    level: '重要',
    levelKey: 'important',
    title: '设备同步异常',
    reason: '血氧设备连续 3 天未同步数据',
    evidence: '设备状态 · 最近同步 2026-05-21',
    status: '待处理',
    statusKey: 'pending',
    actionText: '去处理设备',
    actionUrl: '/pages/device/index/index',
    time: '昨天 21:00',
  },
  {
    id: 'A004',
    level: '提醒',
    levelKey: 'notice',
    title: '随访准备不足',
    reason: '下次随访前仍缺少近 7 天血压记录',
    evidence: '随访计划 · 2026-05-28 10:00',
    status: '待医生处理',
    statusKey: 'doctor',
    actionText: '查看准备事项',
    actionUrl: '/pages/followup/detail/index?id=F002',
    time: '昨天 10:30',
  },
  {
    id: 'A005',
    level: '重要',
    levelKey: 'important',
    title: '血压明显升高',
    reason: '晨起血压 158/96 mmHg，已完成复测',
    evidence: '血压记录 · 2026-05-23 08:15',
    status: '已处理',
    statusKey: 'done',
    actionText: '查看血压详情',
    actionUrl: '/pages/record/blood-pressure-detail/index',
    time: '05-23 08:30',
  },
  {
    id: 'A006',
    level: '提醒',
    levelKey: 'notice',
    title: '单次血氧读数偏低',
    reason: '用户备注为手指冰凉，复测后恢复正常',
    evidence: '血氧记录 · 2026-05-20 22:10',
    status: '已忽略',
    statusKey: 'ignored',
    actionText: '查看血氧详情',
    actionUrl: '/pages/record/oxygen-detail/index',
    time: '05-20 22:15',
  },
];

const filters = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'doctor', label: '待医生处理' },
  { key: 'done', label: '已处理' },
  { key: 'ignored', label: '已忽略' },
];

Page({
  data: {
    filters,
    activeFilter: 'all',
    alerts: [],
    summary: {
      pending: 0,
      doctor: 0,
      done: 0,
      ignored: 0,
    },
  },

  onLoad() {
    this.refreshAlerts();
  },

  refreshAlerts() {
    const summary = {
      pending: alertList.filter(item => item.statusKey === 'pending').length,
      doctor: alertList.filter(item => item.statusKey === 'doctor').length,
      done: alertList.filter(item => item.statusKey === 'done').length,
      ignored: alertList.filter(item => item.statusKey === 'ignored').length,
    };
    this.setData({ summary }, () => this.applyFilter(this.data.activeFilter));
  },

  switchFilter(e) {
    this.applyFilter(e.currentTarget.dataset.key);
  },

  applyFilter(key) {
    const alerts = key === 'all'
      ? alertList
      : alertList.filter(item => item.statusKey === key);
    this.setData({ activeFilter: key, alerts });
  },

  handleAlertAction(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    wx.navigateTo({ url });
  },
});
