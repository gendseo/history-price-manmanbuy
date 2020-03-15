# coding=utf-8
from flask import Flask, request
import mmm # 导入爬虫模块

# 初始化 Flask 实例
app = Flask(__name__)


# 注册路由，并只允许 HTTP POST 方式
@app.route('/', methods=['POST'])
def index():
    # 判断请求参数是否是json
    if not request.is_json:
        return {'code': 10001,
                'msg': '请求参数错误',
                'data': None, }
    # 判断字段是否存在于请求参数中
    p = request.get_json()
    if 'url' not in p.keys():
        return {'code': 10001,
                'msg': '字段不存在',
                'data': None, }
    # 判断字段是否空值
    if p['url'] == '':
        return {'code': 10001,
                'msg': '字段非法',
                'data': None, }
    # 获取商品历史价格
    json_data = mmm.get_data(url=p['url'])
    # 获取失败
    if json_data is None:
        return {
            'code': 10002,
            'msg': '请求发生错误',
            'data': None,
        }
    # 获取成功
    return {
        'code': 0,
        'msg': '请求成功',
        'data': json_data,
    }


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9500, debug=False)
