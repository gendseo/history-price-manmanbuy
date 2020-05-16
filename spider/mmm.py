# coding=utf-8
import requests  # 请求库
from bs4 import BeautifulSoup  # 页面解析库，需要配合解析器使用，本项目使用的是lxml
import re  # 正则表达式
import datetime  # 日期
import execjs  # 调用Js
import json  # json序列化与反序列化


# 格式化时间字符串
# @:param dt => 需要解析并格式化的时间字符串
# @:return 处理好的时间字符串
# @:eg '/Date(1575820800000+0800)/' => '2019-12-09'
def format_date(dt):
    # 判断时间格式
    if '+' in dt:
        dt = re.findall(re.compile(r'[(](.*?)[+]', re.S), dt)[0]
    elif '-' in dt:
        dt = re.findall(re.compile(r'[(](.*?)[-]', re.S), dt)[0]
    else:
        pass
    # 将毫秒转换为秒
    dt = int(dt) / 1000
    # 使用 datetime 读取时间戳
    dt = datetime.datetime.fromtimestamp(dt)
    # 格式化
    dt = dt.strftime("%Y-%m-%d")
    return dt


# URL转义，避免URL被截断
# @:param text => url文本
# @:return 转义过的url
# @:eg https://example.com => https%253A%252F%252Fexample.com
def format_url(text):
    escape_dict = {
        '/': '%252F',
        '?': '%253F',
        '=': '%253D',
        ':': '%253A',
        '&': '%26',
    }
    new_string = ''
    # 遍历字符串进行比对
    for char in text:
        try:
            new_string += escape_dict[char]
        except KeyError:
            new_string += char
    return new_string


# Python调用JS生成Token，这一步是为了伪造成可信客户端
# @:param url => 需要生成token的url
# @:return token
# @:eg https://item.jd.com/100010566966.html => vqlw61ff36c6223ddf6116aced78c94750817xifms9h2
def generate_token_js(url):
    # 指定js文件
    js_file_name = 'MMM_GENERATE_TOKEN.js'
    # 读取js文件
    js_file = open(js_file_name, 'r', encoding='utf-8')
    line = js_file.readline()
    # 转换成字符串
    html_str = ''
    while line:
        html_str = html_str + line
        line = js_file.readline()
    # 调用execjs执行
    js = execjs.compile(html_str)
    # 通过js回调返回指定模块的结果
    token = js.call('d.encrypt', url, '2', 'true')
    return token


# 根据商品的url获取商品历史价格
# @:param url => 商品url
# @:return 商品历史价格信息
# @:eg https://item.jd.com/100010566966.html => 见单元测试生成的mmm.json
def get_data(url):
    # 生成token
    token = generate_token_js(url=url)
    # 使用requests.session()管理session
    # 为了再次请求接口时能够完整回传session
    session = requests.session()
    # 构造请求接口的url
    link = 'https://tool.manmanbuy.com/history.aspx?DA=1&action=gethistory&url={}&token={}'.format(
        format_url(url), token)
    print(link)
    # 对接口发起get请求
    res = session.get(url=link)
    # 请求成功则将数据解析成json，否则返回空值
    if res.ok:
        try:
            print(res.text)
            res = res.json()
        except Exception:
            return None
    else:
        return None
    # 构造json数据
    json_data = {'name': res['spName'],  # 商品名称
                 'pic': res['spPic'],  # 商品图片
                 'url': res['spUrl'],  # 商品原链接
                 'site_name': res['siteName'],  # 商城
                 'lower_price': res['lowerPrice'],  # 最低价
                 'lower_date': format_date(res['lowerDate']),  # 最低价的日期
                 'upper_price': max([i['pr'] for i in res['listPrice']]),  # 最高价
                 'current_price': res['currentPrice'],  # 当前价格
                 'spbh': res['spbh'],  # 未知字段意思，但可以用来表示id，由siteId和spid组成
                 }
    # 构造图表需要的数据
    list_data = []
    for i in res['listPrice']:
        # 日期
        dt = i['dt']
        dt = format_date(dt=dt)
        # 价格
        pr = i['pr']
        # 优惠信息
        yh = i['yh']
        list_data.append({'dt': dt, 'pr': pr, 'yh': yh})
    json_data['list_data'] = list_data
    return json_data


# 根据商品的短链获取真实链接
# @:param short_url => real_url
# @:return 商品真实的链接
# @:eg https://m.tb.cn/h.V9mzZjZ?sm=28bf6c => https://item.taobao.com/item.htm?id=597183256539
def get_real_url(short_url):
    session = requests.session()
    link = 'http://tool.manmanbuy.com/historyLowest.aspx?url={}'.format(short_url)
    res = session.get(url=link)
    if res.ok:
        res_bs = BeautifulSoup(res.text, 'lxml')
        # http://www.manmanbuy.com/redirectUrl.aspx?webid=8&tourl=https://item.gome.com.cn/A0006636887-pop8013145119.html
        linkbox = res_bs.select_one('div.linkbox')
        # 因为慢慢买接口的动态性会导致有两种方式显示商品地址
        if linkbox.select_one('a'):
            # 第一种：div.linkbox下包含有a标签，而a标签的href属性包含真实链接
            href = linkbox.select_one('a').get("href")
            href = href.split('tourl=')
            href = href[-1]  # https://item.gome.com.cn/A0006636887-pop8013145119.html
            return href
        if '商品地址' in linkbox.text:
            # 第二种：div.linkbox下包含着含有真实链接的文本
            href = str(linkbox.text).strip().replace('当前查询的商品地址：', '')
            return href  # https://item.gome.com.cn/A0006636887-pop8013145119.html


if __name__ == '__main__':
    # 单元测试

    # 获取商品历史价格
    # url = 'https://detail.tmall.com/item.htm?id=543405404720&spm=a1z09.2.0.0.60e12e8dv2YZvv&_u=b7n7qp97d81'
    # j = get_data(url=url)
    # file = open('mmm.json', 'w', encoding='utf-8')
    # json.dump(j, file, ensure_ascii=False)

    # 获取商品真实链接
    real_url = get_real_url('https://m.tb.cn/h.V9mzZjZ?sm=28bf6c')
    print(real_url)
