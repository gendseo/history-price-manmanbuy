// pages/index/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    error: '', // 错误提示信息
    dialogShow: false, // 显示删除dialog
    buttons: [{ // dialog的操作按钮
      text: '否'
    }, {
      text: '是'
    }],
    input: '', // 用户输入内容
    scrollHeight: 0, // 历史查询框高度
    historyList: [], // 历史查询记录
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    let that = this
    // 获取系统信息 参考微信小程序官方文档
    let sysInfo = wx.getSystemInfoSync()
    // wx.createSelectorQuery 参考微信小程序官方文档
    let query = wx.createSelectorQuery().in(this)
    // 返回元素的布局和位置等信息 参考微信小程序官方文档
    query.select('.index-history-bar').boundingClientRect(res => {
      that.setData({
        scrollHeight: sysInfo.windowHeight - res.bottom
      })
    }).exec()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    let that = this
    // 从本地缓存中同步获取历史记录
    let historyList = wx.getStorageSync('history_list')
    if (historyList) {
      that.setData({
        historyList: historyList
      })
    } else {
      // 不存在则初始化
      wx.setStorageSync('history_list', [])
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '阿韦比价',
      path: '/pages/index/index',
    }
  },

  /**
   * 用户点击查价攻略
   */
  onClickGuide() {
    wx.showToast({
      title: '进入商品详情页，点击右上角分享图标，复制链接后回来哦~',
      icon: 'none',
      duration: 5000,
    })
  },

  /**
   * 输入框的值改变时触发该事件
   */
  onChangeInput(e) {
    this.setData({
      input: e.detail.value
    })
  },

  /**
   * 用户点击查询按钮
   */
  onClickSubmit() {
    let that = this
    // 检查字段
    if (!this.checkField()) {
      return
    }
    let _url = ''
    let s = this.checkShortUrl()
    if (s.isShortUrl) {
      // 是短链
      _url = '/pages/result/index' + '?' + 'url=' + encodeURIComponent(this.getShortUrl(s.from)) + '&' + 'isShortUrl=' + true
    } else {
      // 使用encodeURIComponent转义url
      _url = '/pages/result/index' + '?' + 'url=' + encodeURIComponent(that.data.input) + '&' + 'isShortUrl=' + false
    }
    console.log(_url)
    wx.navigateTo({
      url: _url
    })
  },

  /**
   * 用户清除历史查询 垃圾桶图标
   */
  onClickClean() {
    // 显示dialog
    this.setData({
      dialogShow: true
    })
  },

  /**
   * 用户清除历史查询的操作确认dialog
   */
  tapDialogButton(e) {
    let that = this
    let index = e.detail.index
    // 判断是点击了哪个button
    if (index === 1) {
      // 点击了是
      wx.setStorageSync('history_list', [])
      that.setData({
        historyList: [],
        dialogShow: false,
      })
    } else {
      // 点击了否或遮罩层
      that.setData({
        dialogShow: false,
      })
    }
  },

  /**
   * 用户点击历史记录项
   */
  onClickHistory(e) {
    if (e.currentTarget.dataset.url) {
      // 跳转到被点击商品的历史价格
      wx.navigateTo({
        url: '/pages/result/index' + '?' + 'url=' + encodeURIComponent(e.currentTarget.dataset.url),
      })
    }
  },

  /**
   * 字段效验
   */
  checkField() {
    let that = this
    let inputVal = that.data.input
    // 判断长度
    if (inputVal === '' || inputVal.length === 0) {
      that.setData({
        error: '输入链接才能查价~'
      })
      return false
    }
    // 判断关键词
    if (!inputVal.includes('http') && !inputVal.includes('https')) {
      that.setData({
        error: '输入链接格式不正确~'
      })
      return false
    }
    return true
  },

  // 检查是否是短链
  checkShortUrl() {
    // 具体的做法就是检查输入的url中是否包含有关键词，如："这","行","话"
    let isShortUrl = false
    let from = ''
    let taobao_rule = ['这', '行', '话']

    let inputUrl = this.data.input

    if (taobao_rule.some(r => {
        return inputUrl.includes(r)
      })) {
      isShortUrl = true
      from = 'tb'
    } else if (inputUrl.includes(' ')) {
      isShortUrl = true
      from = 'other'
    } else if (inputUrl.includes('gome.com')) {
      isShortUrl = true
      from = 'gome'
    }
    return {
      isShortUrl: isShortUrl,
      from: from,
    }
  },

  // 获取短链
  getShortUrl(from) {
    let _url = this.data.input
    let a = ''
    console.log('from = ', from)
    if (from === 'tb') {
      // fu至这行话₤TJhj18T4qgp₤转移至👉τаo宝аρρ👈【华为荣耀FlypodsPro单只左右3蓝牙耳机充电盒仓器丢失损坏补配件】；或https://m.tb.cn/h.VgmmC53?sm=2b9e07 点几链街，再选择瀏..覽..噐大开
      a = _url.split('或') // 将字符串从 "或" 字分割
      a = a[1].split(' ') // 再将含有url的从 " " 分割
      a = a[0] // 获取url
    } else if (from === 'other') {
      a = _url.split(' ')
      a = a[a.length - 1]
    } else if (from === 'gome') {
      a = _url.replace(' ', '')
    }
    console.log(a)
    return a
  },

})