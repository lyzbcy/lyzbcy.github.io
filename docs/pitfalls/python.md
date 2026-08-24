# 坑:Python 语言层

## 坑 1:字符串 `hash()` 跨进程必失配(已两次中招!)

Python 的 str hash 带进程级随机盐(PYTHONHASHSEED),**重启进程后同一字符串 hash 值不同**。

- 小红书开源项目用它做已回评论 ID → 重启后全失效 → **重复回复同一条评论**(社交事故)
- 抖音 poster 脚本用它选表情 → 重跑结果不可复现

**铁律:一切持久化 ID 用 `hashlib.md5(内容.encode()).hexdigest()`**;需要确定性选择用 `ord(x[0]) % n`。

## 坑 2:timedelta 连加越界

想表达"该周周日 23:59",写 `monday + timedelta(days=6, hours=23, minutes=59)` ——这是**加 6天23小时59分**,从周一下午出发直接跳到下周一!导致周报周号整体偏移一周、period 显示成单日。

**铁律:先归位再 replace**:
```python
monday = ref - timedelta(days=ref.weekday())
sunday = monday + timedelta(days=6)
ref = sunday.replace(hour=23, minute=59)   # ✓
```

## 坑 3:`open(path, "w", encoding=XXX)` encoding 非法时文件已被截断

`encoding="w"` 这类笔误抛异常前,**"w" 模式已把文件清零**。真实事故:组件文件被截成 0 字节。

**铁律:改重要文件前先备份(cp xxx xxx.bak-日期);用 python 批量改文件时,写前 assert 内容、写后立即验证行数。**

## 坑 4:时区 naive vs aware 混比

`datetime.now(TZ)`(aware)不能和 `datetime.fromisoformat(x)`(naive)直接比较,抛 TypeError。
**铁律:解析完立刻 `if dt.tzinfo is None: dt = dt.replace(tzinfo=TZ)`,TZ=ZoneInfo("Asia/Shanghai")。**

## 坑 5:macOS CommandLineTools python 装包难

PEP 668 拒绝、pytest 装不上。**单测用 `unittest`(零依赖)**,本地跑不动就 scp 到服务器跑(服务器 python 3.12 环境全)。

## 坑 6:bash 单引号嵌套地狱

ssh 'cmd '"'"'inner'"'"'...' 极易错。**复杂脚本直接 Write 成 .py/.sh 文件 scp 上去执行**,别硬拼 heredoc。
