import * as echarts from '../../ec-canvas/echarts' // 导入echarts api

// echarts配置
function getOption(sd, xd) {
  // 具体请参考
  // 5分钟上手ECharts：https://www.echartsjs.com/zh/tutorial.html#5%20%E5%88%86%E9%92%9F%E4%B8%8A%E6%89%8B%20ECharts
  // 配置项：https://www.echartsjs.com/zh/option.html
  const options = {
    title: {
      show: false,
    },
    tooltip: {
      show: true,
      trigger: 'axis',
      confine: true,
      position: ['60%', '0'],
      formatter: function (params) {
        let t = params[0].name.split('-')
        t = t[0] + '年' + t[1] + '月' + t[2] + '日'
        // return `{marker0at0|} ${t} ¥${params[0].value}` // 有红点
        return `${t}  ¥${params[0].value}` // 无红点
      },
    },
    grid: {
      // show: true,
      top: 10,
      left: 50,
      bottom: 30,
      right: 10,
    },
    xAxis: {
      type: 'category',
      data: xd,
      axisLabel: {
        formatter: function (value) {
          let d = value.split('-')
          d = d[1] + '-' + d[2]
          return d
        },
      },
    },
    yAxis: {
      type: 'value',
      min: function (value) {
        return value.min - 100
      },
      max: function (value) {
        return value.max + 100
      },
      splitLine: {
        lineStyle: {
          type: 'dotted',
        }
      },
    },
    series: [{
      data: sd,
      type: 'line',
      smooth: true,
    }]
  }
  return options
}

Page({

  data: {
    ec: {
      // 将 lazyLoad 设为 true 后，需要手动初始化图表
      lazyLoad: true
    },
    isShow: false,  // 为了用户体验，先将页面隐藏，等数据加载完后再显示
    url: '', // 从路径参数传入的url
    tabActive: 0, // 时间选项卡默认激活下标
    tabList: ["全部", "180天", "60天", "30天"], // 时间选项卡的tabs
    item: {}, // 该商品的所有信息
  },

  async onLoad(options) {
    wx.showLoading({
      title: '正在查价中...',
    })

    // 指代this  避免被回调函数改变作用域
    let that = this

    if (options.url) {
      // 从路径参数获取url
      let url = decodeURIComponent(options.url) // 解码url
      that.setData({
        url: url,
      })
    }
  },

  async onReady() {
    // 获取图表组件
    this.ecComponent = this.selectComponent('#mychart-dom-bar')
    // 初始化数据和图表
    await this.renderChart()
    // 结束loading状态
    wx.hideLoading()
  },

  async renderChart() {
    let that = this

    // 使用Promise封装回调函数
    let chart = await new Promise(resolve => {
      // 初始化图表组件
      that.ecComponent.init((canvas, width, height, dpr) => {
        const chart = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr, // 像素
        })
        // 将图表实例返回，为了下一步能拿到该图表实例
        resolve(chart)
        return chart
      })
    })

    // 将图表实例赋予this
    that.chart = chart

    // 请求爬虫数据接口
    let res = await new Promise((resolve, reject) => wx.request({
      // 根据需求更换接口地址
      url: 'https://api.xiangxing.wang/hpmmb/', // 手机预览
      // url: 'http://localhost:9500/',  // 本地测试
      method: 'POST',
      data: {
        url: that.data.url,  // 将传入的url参数作为请求参数
      },
      success: res => resolve(res),
      fail: err => reject(err),
    }))

    if (res.data.code === 0) {
      // 请求成功
      that.setData({
        item: res.data.data
      })
      let sd = [] // 图表列数据
      let xd = [] // 图表行数据
      res.data.data.list_data.forEach(item => {
        sd.push(item.pr)
        xd.push(item.dt)
      })
      // 使用构造的数据渲染图表
      that.chart.setOption(getOption(sd, xd))
      // 将页面显示出来
      that.setData({
        isShow: true,
      })
      // 这一步是为了不重复的将查询的商品添加到历史查询
      let hl = wx.getStorageSync('history_list')
      if (hl) {
        let hl_exist = hl.some(item => {
          return item.spbh === res.data.data.spbh // 存在返回true，不存在返回false
        })
        if (!hl_exist) {
          // 不存在，将目前的商品添加到历史查询
          hl.push(res.data.data)
          wx.setStorageSync('history_list', hl)
        }
      }

    } else {
      // 查询失败
      wx.hideLoading()
      wx.redirectTo({
        url: '/pages/status-show/index'
      })
    }
  },

  // 切换时间选项卡后的逻辑操作
  switchCharts(index) {
    let that = this
    let num_str = that.data.tabList[index]
    // 格式化时间字符串
    if (num_str.includes('天')) {
      num_str = num_str.replace('天', '')
    } else {
      num_str = num_str.replace('全部', '99999')
    }
    // 将时间字符串转为十进制的数
    let num = parseInt(num_str)
    let l = that.data.item.list_data
    l = l.slice(-num) // 从列表末尾的第-n个元素开始截取，范围是 [末尾的第-n个元素:最后一个元素)
    let sd = [] // 列
    let xd = [] // 行
    l.forEach(function (item) {
      sd.push(item.pr)
      xd.push(item.dt)
    })
    // 渲染图表
    that.chart.setOption(getOption(sd, xd))
  },

  // 用户切换时间选项卡
  onClickTab(e) {
    let that = this
    let index = e.currentTarget.dataset.index
    that.setData({
      tabActive: index,
    })
    that.switchCharts(index)
  },

  // 用户点击分享按钮
  onShareAppMessage() {
    let that = this
    return {
      title: '历史价格--劲爆！' + that.data.item.name,
      path: '/pages/result/index' + '?' + encodeURIComponent(that.data.url)
    }
  }

})