# 营养看板·身体趋势 v3（2026-08-26）

> 跨年年份标注 + 2025-12 减脂期历史数据合并 + 胸/大腿/小腿/上臂围度支持。
> 部署 commit: `67f1d11a`（已验证线上渲染+脚本语法）。

## 改了什么

1. **跨年年份标注**：数据从 2023 跨到 2026，5 个指标 chips 日期改 `YYYY/M/D`；折线图横轴每年首个点在日期上方标注年份（金色 9px）。点数 >18 自动紧凑模式（数值字号 10.5、去 ▲▼）。
2. **12月历史数据合并**：旧文《12月减脂记录》的体重(10点)/InBody 体测(11-17、12-28)/围度(12-12、12-17) 存 `_data/nutrition_legacy_2025.json`，模板 JS 按日期与 live 数据**去重合并（live 优先）**。cron 只重生成 nutrition.json 不会覆盖 legacy 文件。
   - ⚠️ legacy 里 smm/ffm/tbw 是 **InBody 实测**，与 live 的公式估值口径不同（页面已注明）。
   - 12-12 体重 live 已有 70.3（旧文 70.35），去重规则保留 live。
3. **围度 v3 全链路**：`body_measure.py record` 新增 `--chest/--thigh/--calf/--arm`（选填，仅记录不参与公式）→ config bodyMeasurementHistory → `generate_nutrition_data.py` 围度透传元组扩为 `(neck,waist,hip,whr,whtr,chest,thigh,calf,arm)` → 面板人形图新增 4 个可点击 pill（数值由 JS 从合并后数据回填，class `nb-b2-gval`）+ META 折线。
   - 以后录体测：`body_measure.py record --neck .. --waist .. --chest .. --thigh .. --calf .. --arm ..`

## 新坑/认知

- **服务器仓库会被多写入方超前**：macOS 有时直连 push（如 airpods 提交 a4d2a741/d6e943db），服务器 cron 只 push 不 pull → 服务器操作/push 前先 `git fetch && pull --rebase`，否则 fast-forward 失败。
- **Windows 无密钥连服务器**：Git Bash 用 `SSH_ASKPASS_REQUIRE=force` + askpass 输出 `$SSHPW` 环境变量的方式可非交互密码登录（密码只进 env 不落盘），已验证可用。
- tar 流传输会把 py 文件 mode 变 755，提交前 `git update-index --chmod=-x` 修正。

## 验证记录

- 本地：页面结构测试 6/6；Node 假 DOM 跑真实 JS（体重24点/体脂5点/腰围6点/4新围度+pill填充）✓
- 服务器：generate 脚本金丝雀运行 EXIT=0（今日数据正常聚合后已还原）
- 线上：curl 提取 script → `node --check` ✓，chips 渲染 `2026/8/21` ✓，legacy 数据/围度标记齐全 ✓
