export const seedHealthData = {
  currentDoctor: {
    id: "D001",
    name: "林医生",
    role: "主责医生",
    department: "慢病管理中心"
  },
  patients: [
    {
      id: "P001",
      name: "周明",
      sex: "男",
      age: 58,
      phone: "138****0921",
      bindAt: "2026-05-18 09:12",
      doctorRelation: "主责医生",
      diseases: ["糖尿病", "慢阻肺", "睡眠呼吸暂停"],
      riskLevel: "重点关注",
      riskScore: 78,
      important: true,
      latest: "夜间最低血氧 86%，持续 12 分钟",
      activePlanId: "PL001",
      nextFollowupId: "F001"
    },
    {
      id: "P002",
      name: "李岚",
      sex: "女",
      age: 46,
      phone: "139****3188",
      bindAt: "2026-05-17 14:26",
      doctorRelation: "主责医生",
      diseases: ["糖尿病"],
      riskLevel: "稳定",
      riskScore: 42,
      important: false,
      latest: "空腹血糖 8.7 mmol/L",
      activePlanId: "PL002",
      nextFollowupId: "F002"
    },
    {
      id: "P003",
      name: "陈建国",
      sex: "男",
      age: 67,
      phone: "136****7402",
      bindAt: "2026-05-16 11:05",
      doctorRelation: "协作医生",
      diseases: ["慢阻肺", "高血压"],
      riskLevel: "需干预",
      riskScore: 64,
      important: true,
      latest: "连续 3 天未同步血氧设备",
      activePlanId: "PL003",
      nextFollowupId: "F003"
    },
    {
      id: "P004",
      name: "王秀梅",
      sex: "女",
      age: 62,
      phone: "137****5501",
      bindAt: "2026-05-15 16:40",
      doctorRelation: "主责医生",
      diseases: ["高血压"],
      riskLevel: "稳定",
      riskScore: 38,
      important: false,
      latest: "近 7 天血压记录完整",
      activePlanId: "PL004",
      nextFollowupId: "F004"
    }
  ],
  alerts: [
    {
      id: "A001",
      patientId: "P001",
      level: "紧急",
      type: "睡眠低氧",
      title: "夜间血氧低于 90% 累计 12 分钟",
      rule: "最低血氧 < 90% 且累计低氧时长 >= 10 分钟",
      evidence: ["最低 SpO2 86%", "ODI 18.6 次/小时", "CPAP 使用 2.1 小时"],
      status: "待处理",
      createdAt: "2026-05-19 07:30"
    },
    {
      id: "A002",
      patientId: "P002",
      level: "重要",
      type: "血糖异常",
      title: "空腹血糖连续 2 次高于目标范围",
      rule: "空腹血糖 > 7.0 mmol/L 连续 2 次",
      evidence: ["05-18 8.4 mmol/L", "05-19 8.7 mmol/L"],
      status: "待处理",
      createdAt: "2026-05-19 08:10"
    },
    {
      id: "A003",
      patientId: "P003",
      level: "提醒",
      type: "设备未同步",
      title: "血氧设备连续 3 天未同步",
      rule: "核心设备超过 72 小时无数据",
      evidence: ["最近同步 2026-05-15 22:18", "缺失夜间血氧报告 3 份"],
      status: "待处理",
      createdAt: "2026-05-19 09:00"
    }
  ],
  plans: [
    {
      id: "PL001",
      patientId: "P001",
      disease: "睡眠呼吸暂停",
      title: "OSA 夜间低氧干预方案",
      source: "系统生成草稿",
      status: "待医生确认",
      objective: "未来 14 天降低夜间低氧风险，提升 CPAP 佩戴依从性",
      targets: ["睡眠时长 >= 6 小时", "最低血氧 >= 90%", "AHI < 15 次/小时", "CPAP 使用 >= 4 小时/晚"],
      tasks: ["每日同步睡眠报告", "每晚佩戴 CPAP", "出现憋醒/晨起头痛时记录症状"],
      updatedAt: "2026-05-19 07:36"
    },
    {
      id: "PL002",
      patientId: "P002",
      disease: "糖尿病",
      title: "血糖稳定管理方案",
      source: "医生创建",
      status: "执行中",
      objective: "未来 30 天提升血糖记录完整性并降低空腹血糖波动",
      targets: ["空腹血糖 4.4-7.0 mmol/L", "餐后 2h 血糖 < 10.0 mmol/L", "每周记录 >= 5 天"],
      tasks: ["每日记录空腹血糖", "每周至少 2 次餐后 2h 血糖", "记录饮食备注"],
      updatedAt: "2026-05-18 16:20"
    },
    {
      id: "PL003",
      patientId: "P003",
      disease: "慢阻肺",
      title: "COPD 稳态监测方案",
      source: "医生创建",
      status: "需调整",
      objective: "恢复血氧监测连续性，识别急性加重风险",
      targets: ["静息 SpO2 >= 92%", "呼吸频率 12-20 次/分", "CAT 评分较上次不升高"],
      tasks: ["每日记录血氧", "每周完成 CAT 评估", "咳嗽/痰量变化时记录症状"],
      updatedAt: "2026-05-17 10:14"
    }
  ],
  followups: [
    {
      id: "F001",
      patientId: "P001",
      title: "低氧预警后随访",
      type: "预警后随访",
      status: "待随访",
      dueAt: "2026-05-19 15:30",
      focus: ["睡眠低氧原因", "CPAP 佩戴依从性", "晨起症状"],
      linkedPlanId: "PL001"
    },
    {
      id: "F002",
      patientId: "P002",
      title: "血糖方案执行随访",
      type: "方案随访",
      status: "待随访",
      dueAt: "2026-05-22 10:00",
      focus: ["空腹血糖", "餐后血糖", "饮食记录"],
      linkedPlanId: "PL002"
    },
    {
      id: "F003",
      patientId: "P003",
      title: "设备未同步随访",
      type: "提醒随访",
      status: "逾期",
      dueAt: "2026-05-18 17:00",
      focus: ["设备连接状态", "血氧记录缺失原因"],
      linkedPlanId: "PL003"
    }
  ],
  timeline: [
    { id: "T001", patientId: "P001", type: "预警", time: "2026-05-19 07:30", text: "触发睡眠低氧预警" },
    { id: "T002", patientId: "P001", type: "方案", time: "2026-05-19 07:36", text: "系统生成 OSA 夜间低氧干预方案草稿" },
    { id: "T003", patientId: "P002", type: "方案", time: "2026-05-18 16:20", text: "血糖稳定管理方案开始执行" },
    { id: "T004", patientId: "P003", type: "随访", time: "2026-05-18 17:00", text: "设备未同步随访逾期" }
  ]
};
