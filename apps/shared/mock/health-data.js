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
      relation: "主责医生",
      diseases: ["糖尿病", "慢阻肺", "睡眠呼吸暂停"],
      riskLevel: "需干预",
      riskScore: 78,
      riskChange: -8,
      important: true,
      dataStatus: "设备同步异常",
      latest: "夜间最低血氧 86%，低氧累计 12 分钟",
      activePlanId: "PL001",
      nextFollowupId: "F001",
      profile: {
        height: 170,
        weight: 78,
        bmi: 27.0,
        address: "杭州市西湖区",
        emergency: "李女士 139****2210",
        firstDiagnosis: "糖尿病 2019 年；OSA 2024 年",
        complications: ["脂肪肝", "疑似周围神经病变"],
        medication: ["二甲双胍 0.5g bid", "阿卡波糖 50mg tid"],
        allergy: "未记录",
        lifestyle: ["吸烟史 20 年，已减少", "晚餐主食偏多", "睡眠不规律"],
        familyHistory: ["父亲高血压", "母亲糖尿病"],
        devices: ["睡眠监测仪 SL-2026-001", "指夹血氧仪 OX-0821"]
      },
      screening: {
        score: 76,
        completedAt: "2026-05-17 20:16",
        source: "患者自评",
        risks: [
          { disease: "糖尿病", level: "中风险", score: 68, factors: ["BMI 偏高", "家族史", "空腹血糖异常"] },
          { disease: "慢阻肺", level: "中风险", score: 61, factors: ["吸烟史", "活动后气促", "夜间低氧"] },
          { disease: "睡眠呼吸暂停", level: "高风险", score: 82, factors: ["STOP-Bang 阳性", "鼾声", "夜间低氧"] }
        ],
        confirmed: ["糖尿病", "睡眠呼吸暂停"],
        pending: ["慢阻肺"]
      },
      analysis: {
        completeness: "76%",
        summary: [
          "夜间最低血氧连续 2 晚低于 90%，低氧事件与 CPAP 使用不足同时出现。",
          "近 7 天空腹血糖记录 5 次，3 次高于目标范围，建议关注晚餐结构和用药执行。",
          "设备数据存在 1 天缺失，需确认睡眠监测仪同步状态。"
        ],
        metrics: [
          { label: "最低血氧", value: "86%", state: "异常" },
          { label: "AHI", value: "18.2 次/小时", state: "偏高" },
          { label: "CPAP 使用", value: "2.1 小时/晚", state: "不足" },
          { label: "空腹血糖达标率", value: "40%", state: "偏低" }
        ],
        correlations: [
          "CPAP 使用不足 + 最低血氧下降",
          "餐后血糖升高 + 饮食备注提示主食偏多"
        ]
      }
    },
    {
      id: "P002",
      name: "李岚",
      sex: "女",
      age: 46,
      phone: "139****3188",
      bindAt: "2026-05-17 14:26",
      relation: "主责医生",
      diseases: ["糖尿病"],
      riskLevel: "需关注",
      riskScore: 62,
      riskChange: -4,
      important: false,
      dataStatus: "正常",
      latest: "空腹血糖 8.7 mmol/L，连续 2 次偏高",
      activePlanId: "PL002",
      nextFollowupId: "F002",
      profile: {
        height: 162,
        weight: 63,
        bmi: 24.0,
        address: "杭州市拱墅区",
        emergency: "王先生 138****7781",
        firstDiagnosis: "糖尿病 2023 年",
        complications: ["暂无"],
        medication: ["二甲双胍 0.5g bid"],
        allergy: "青霉素过敏",
        lifestyle: ["久坐", "运动不足", "近期加班"],
        familyHistory: ["母亲糖尿病"],
        devices: ["血糖仪 BG-2026-118"]
      },
      screening: {
        score: 64,
        completedAt: "2026-05-16 21:10",
        source: "患者自评",
        risks: [{ disease: "糖尿病", level: "中风险", score: 72, factors: ["家族史", "空腹血糖异常", "运动不足"] }],
        confirmed: ["糖尿病"],
        pending: []
      },
      analysis: {
        completeness: "88%",
        summary: ["近 7 天血糖记录完整率较好，但空腹血糖连续偏高。", "餐后 2h 血糖样本不足，建议补充餐后记录以判断主要异常时段。"],
        metrics: [
          { label: "空腹血糖", value: "8.7 mmol/L", state: "偏高" },
          { label: "餐后记录", value: "2 次/周", state: "不足" },
          { label: "低血糖", value: "0 次", state: "正常" },
          { label: "记录完整率", value: "88%", state: "良好" }
        ],
        correlations: ["空腹血糖偏高 + 近期加班睡眠不足"]
      }
    },
    {
      id: "P003",
      name: "陈建国",
      sex: "男",
      age: 67,
      phone: "136****7402",
      bindAt: "2026-05-16 11:05",
      relation: "协作医生",
      diseases: ["慢阻肺", "高血压"],
      riskLevel: "需干预",
      riskScore: 66,
      riskChange: -6,
      important: true,
      dataStatus: "设备未同步",
      latest: "连续 3 天未同步血氧设备",
      activePlanId: "PL003",
      nextFollowupId: "F003",
      profile: {
        height: 168,
        weight: 70,
        bmi: 24.8,
        address: "杭州市上城区",
        emergency: "陈女士 137****2001",
        firstDiagnosis: "慢阻肺 2021 年；高血压 2018 年",
        complications: ["肺气肿"],
        medication: ["噻托溴铵吸入剂 qd", "氨氯地平 5mg qd"],
        allergy: "未记录",
        lifestyle: ["既往吸烟 35 年", "冬季易急性加重"],
        familyHistory: ["父亲高血压"],
        devices: ["指夹血氧仪 OX-7712"]
      },
      screening: {
        score: 70,
        completedAt: "2026-05-15 19:42",
        source: "医生协助",
        risks: [
          { disease: "慢阻肺", level: "高风险", score: 78, factors: ["吸烟史", "CAT 评分升高", "血氧记录缺失"] },
          { disease: "高血压", level: "中风险", score: 62, factors: ["既往高血压", "晨间血压偏高"] }
        ],
        confirmed: ["慢阻肺", "高血压"],
        pending: []
      },
      analysis: {
        completeness: "52%",
        summary: ["血氧设备连续 3 天未同步，无法判断近期低氧风险。", "CAT 评分较上次上升 3 分，需随访核实咳嗽、咳痰、气促变化。"],
        metrics: [
          { label: "SpO2", value: "缺失 3 天", state: "缺失" },
          { label: "CAT 评分", value: "18 分", state: "升高" },
          { label: "晨间血压", value: "146/92", state: "偏高" },
          { label: "呼吸频率", value: "21 次/分", state: "偏高" }
        ],
        correlations: ["气促症状增加 + 血氧数据缺失", "晨间血压偏高 + 用药时间不固定"]
      }
    },
    {
      id: "P004",
      name: "王秀梅",
      sex: "女",
      age: 62,
      phone: "137****5501",
      bindAt: "2026-05-15 16:40",
      relation: "主责医生",
      diseases: ["高血压"],
      riskLevel: "稳定",
      riskScore: 42,
      riskChange: 3,
      important: false,
      dataStatus: "正常",
      latest: "近 7 天血压记录完整",
      activePlanId: "PL004",
      nextFollowupId: "F004",
      profile: {
        height: 158,
        weight: 59,
        bmi: 23.6,
        address: "杭州市滨江区",
        emergency: "刘先生 135****9090",
        firstDiagnosis: "高血压 2017 年",
        complications: ["暂无"],
        medication: ["缬沙坦 80mg qd"],
        allergy: "未记录",
        lifestyle: ["低盐饮食执行较好", "每日散步"],
        familyHistory: ["父亲高血压"],
        devices: ["电子血压计 BP-3360"]
      },
      screening: {
        score: 46,
        completedAt: "2026-05-14 08:30",
        source: "患者自评",
        risks: [{ disease: "高血压", level: "低风险", score: 44, factors: ["既往高血压", "年龄"] }],
        confirmed: ["高血压"],
        pending: []
      },
      analysis: {
        completeness: "96%",
        summary: ["近 7 天血压记录完整，晨晚血压均处于目标范围。", "建议维持当前方案，按月随访复盘。"],
        metrics: [
          { label: "平均血压", value: "126/78", state: "正常" },
          { label: "达标率", value: "92%", state: "良好" },
          { label: "脉率", value: "72 次/分", state: "正常" },
          { label: "记录完整率", value: "96%", state: "良好" }
        ],
        correlations: ["低盐饮食执行较好 + 血压达标率提升"]
      }
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
    },
    {
      id: "PL004",
      patientId: "P004",
      disease: "高血压",
      title: "血压稳定管理方案",
      source: "医生创建",
      status: "执行中",
      objective: "维持血压达标，保持记录完整率",
      targets: ["平均血压 < 130/80 mmHg", "每周记录 >= 5 天", "异常血压 0 次"],
      tasks: ["每日晨间血压", "每周复盘饮食运动", "按月随访"],
      updatedAt: "2026-05-15 17:08"
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
    },
    {
      id: "F004",
      patientId: "P004",
      title: "高血压月度随访",
      type: "计划内随访",
      status: "待随访",
      dueAt: "2026-05-28 10:30",
      focus: ["血压达标率", "用药执行", "生活方式"],
      linkedPlanId: "PL004"
    }
  ],
  advice: [
    { id: "AD001", patientId: "P001", type: "复测建议", source: "预警处理", status: "未读", text: "今晚睡前确认 CPAP 佩戴并同步睡眠报告。", createdAt: "2026-05-19 08:20" },
    { id: "AD002", patientId: "P002", type: "记录建议", source: "方案执行", status: "已读", text: "本周补充 2 次餐后 2h 血糖记录，并备注饮食。", createdAt: "2026-05-18 18:12" }
  ],
  timeline: [
    { id: "T001", patientId: "P001", type: "预警", time: "2026-05-19 07:30", text: "触发睡眠低氧预警" },
    { id: "T002", patientId: "P001", type: "方案", time: "2026-05-19 07:36", text: "系统生成 OSA 夜间低氧干预方案草稿" },
    { id: "T003", patientId: "P002", type: "方案", time: "2026-05-18 16:20", text: "血糖稳定管理方案开始执行" },
    { id: "T004", patientId: "P003", type: "随访", time: "2026-05-18 17:00", text: "设备未同步随访逾期" },
    { id: "T005", patientId: "P004", type: "筛查", time: "2026-05-14 08:30", text: "完成高血压风险筛查" }
  ]
};
