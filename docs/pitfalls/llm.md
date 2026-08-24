# 坑:LLM 调用(ws-claw-corp / th-deepseek 系列)

> 适用:一切调 `https://model.wshoto.com/v1` 的脚本(抖音/小红书评论回复等)。

## 坑 1(最高频):max_tokens 太小 → 空回复,伪装成"超时"

`th-deepseek-v4-pro-202606` 是**思维链模型**(配置标 `reasoning: false` 是骗人的):输出先烧思维链(实测 300~700 tokens),`max_tokens=300` 时思维链烧光预算,正文一个字没出就 `finish=length`,`content=''`。

**症状**:回复"超时"/走兜底模板,日志看 `LLM返回空或过短`。空回复率可高达 83%。

**铁律**:`max_tokens ≥ 2000`(实测 6/6 成功);打包调用按 `条数×900+500` 预算,上限 16000。

## 坑 2:逐条调用浪费且互相独立

老架构每条评论一个请求(3 并发):单条超时单条兜底(用户看到"同一轮有的成功有的兜底"),N 条评论 = N 次请求。

**正解:打包调用**——人设/规则 prompt 只发一次,N 条评论一个 JSON 输出,输入 token 省 ~68%。结构:
```
prompt = 人设 + 评论列表(JSON数组,含id) + "只输出 {id: reply} JSON"
输出容错:剥 ```json 围栏 → 取首尾{ }解析 → 缺失条目单条兜底 → 再不行走模板
```
参考实现:小红书 `xhs_core.py` 的 `build_batch_prompt`/`parse_batch_response`;抖音 `process-comments.py` 的 `call_llm_batch`。

## 坑 3:token 花的是用户个人额度

ws-claw-corp 配置里 `cost: 0` 是假的,**实际走用户额度,省钱有意义**。别再说"反正不花钱"。

## API 凭证读取(标准姿势)

```python
cfg = json.load(open(Path.home() / ".openclaw/openclaw.json"))
prov = cfg["models"]["providers"]["ws-claw-corp"]
# baseUrl: https://model.wshoto.com/v1  apiKey: prov["apiKey"]
```
环境变量 `OPENCLAW_CONFIG` 可覆盖路径。备选模型:`th-glm-5`、`th-deepseek-v4-flash`。
