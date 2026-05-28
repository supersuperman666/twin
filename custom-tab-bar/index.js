Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', iconClass: 'icon-home' },
      { pagePath: '/pages/record/index', text: '记录', iconClass: 'icon-record' },
      { pagePath: '/pages/me/index', text: '我的', iconClass: 'icon-user' }
    ]
  },

  lifetimes: {
    attached() {
      this.updateSelected()
    }
  },

  pageLifetimes: {
    show() {
      this.updateSelected()
    }
  },

  methods: {
    updateSelected() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      if (!current) return
      const route = `/${current.route}`
      const selected = this.data.list.findIndex((item) => item.pagePath === route)
      if (selected >= 0) this.setData({ selected })
    },

    switchTab(event) {
      const { index, path } = event.currentTarget.dataset
      if (!path) return
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    }
  }
})
