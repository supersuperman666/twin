Page({
  data: {
    activeAnchor: 'all',
    currentDate: '2023年5月16日',
    currentWeek: '周二',
    anchors: [
      { key: 'all', name: '全部' },
      { key: 'basic', name: '基础指标' },
      { key: 'oxygen', name: '血氧呼吸' },
      { key: 'sleep', name: '睡眠' },
      { key: 'symptom', name: '症状' },
      { key: 'medicine', name: '用药' }
    ],
    basicMetrics: [
      {
        name: 'BMI',
        type: 'bmi',
        value: '23.4',
        inlineValue: '23.4',
        unit: '',
        status: '正常',
        time: '05.16 14:18',
        wide: true,
        children: [
          { label: '身高', value: '160.0', unit: 'cm' },
          { label: '体重', value: '60.0', unit: 'kg' }
        ]
      },
      {
        name: '血压',
        value: '120/90',
        unit: 'mmHg',
        status: '正常',
        time: '05.16 22:21'
      },
      {
        name: '血糖',
        value: '5',
        unit: 'mmol/L',
        status: '正常',
        time: '05.16 14:53',
        note: '空腹'
      }
    ],
    oxygenMetrics: [
      {
        name: 'SpO2',
        value: '98',
        unit: '%',
        status: '正常',
        time: '05.16 08:30'
      },
      {
        name: '脉率',
        value: '72',
        unit: '次/分',
        status: '正常',
        time: '05.16 08:30'
      },
      {
        name: '呼吸频率',
        value: '18',
        unit: '次/分',
        status: '正常',
        time: '05.16 08:30',
        wide: true
      }
    ],
    sleepMetrics: [
      {
        name: '睡眠时长',
        value: '6.5',
        unit: '小时',
        status: '偏低',
        warning: true,
        time: '05.15 - 05.16',
        wide: true
      },
      {
        name: 'AHI',
        value: '3.2',
        unit: '次/小时',
        status: '正常',
        time: '05.15 - 05.16'
      },
      {
        name: 'ODI',
        value: '2.8',
        unit: '次/小时',
        status: '正常',
        time: '05.15 - 05.16'
      }
    ],
    symptomRecords: [
      {
        time: '05.16 19:30',
        title: '头痛，略有头晕',
        desc: '持续约2小时，休息后缓解',
        level: '轻度'
      }
    ],
    medicineRecords: [
      {
        time: '05.16 08:00',
        name: '阿司匹林肠溶片',
        dose: '100mg',
        desc: '早餐前服用',
        status: '已服用',
        done: true
      },
      {
        time: '05.16 20:00',
        name: '辛伐他汀片',
        dose: '20mg',
        desc: '晚餐后服用',
        status: '待服用',
        done: false
      }
    ]
  },

  onShow() {
    this.setTabBarSelected()
  },

  setTabBarSelected() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  scrollToAnchor(event) {
    const { key } = event.currentTarget.dataset
    if (key === 'all') {
      wx.pageScrollTo({ scrollTop: 0, duration: 260 })
      this.setData({ activeAnchor: key })
      return
    }

    wx.createSelectorQuery()
      .select(`#section-${key}`)
      .boundingClientRect()
      .selectViewport()
      .scrollOffset()
      .exec((res) => {
        const target = res && res[0]
        const viewport = res && res[1]
        if (!target || !viewport) return
        wx.pageScrollTo({
          scrollTop: viewport.scrollTop + target.top - 24,
          duration: 260
        })
        this.setData({ activeAnchor: key })
      })
  },

  showToast(event) {
    wx.showToast({
      title: event.currentTarget.dataset.title || '功能开发中',
      icon: 'none'
    })
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/index/index' })
  }
})
