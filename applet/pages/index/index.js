// pages/index/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    error: '', // 错误提示信息
    dialogShow: false, // 显示删除dialog
    buttons: [{  // dialog的操作按钮
      text: '否'
    }, {
      text: '是'
    }],
    input: '',  // 用户输入内容
    scrollHeight: 0,  // 历史查询框高度
    historyList: [],  // 历史查询记录
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
    query.select('.index-history-bar').boundingClientRect(function (res) {
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
    wx.navigateTo({
      url: '/pages/result/index' + '?' + 'url=' + encodeURIComponent(that.data.input),  // 使用encodeURIComponent转义url
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

})