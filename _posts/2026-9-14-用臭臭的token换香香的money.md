---
layout: post
title: "用臭臭的token换香香的money"
date: 2026-9-14 11:30:00 +0800
categories: [外快]
tags: [挖漏洞, bugbounty, 数据看板, AI协作]
description: 一块实时更新的数据看板：每个挖漏洞项目花了多少时间、烧了多少 token、换回来多少钱——用数据决定下一步往哪挖
pin: false
---

<style>
.bbm-wrap { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
.bbm-hero { background: linear-gradient(135deg, #7c5a3a 0%, #b98a4e 45%, #f5c96b 100%); border-radius: 18px; padding: 28px 26px; color: #fff; margin: 18px 0 22px; box-shadow: 0 8px 24px rgba(185,138,78,.35); }
.bbm-hero h2 { margin: 0 0 8px; font-size: 1.6em; }
.bbm-hero p { margin: 0; opacity: .92; font-size: .95em; }
.bbm-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 18px 0; }
.bbm-card { background: var(--card-bg, #f7f3ec); border: 1px solid #e5decf; border-radius: 14px; padding: 14px 16px; }
.bbm-card .k { font-size: .78em; color: #8a8172; margin-bottom: 4px; }
.bbm-card .v { font-size: 1.45em; font-weight: 700; color: #4a4234; }
.bbm-card .v.ok { color: #1a9e5c; }
.bbm-card .v.pending { color: #c98a1e; }
.bbm-card .v.zero { color: #b0553a; }
.bbm-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 20px 0; }
@media (max-width: 760px) { .bbm-charts { grid-template-columns: 1fr; } }
.bbm-chart-box { background: var(--card-bg, #f7f3ec); border: 1px solid #e5decf; border-radius: 14px; padding: 14px; }
.bbm-chart-box h3 { margin: 2px 0 10px; font-size: .95em; color: #5a5244; }
.bbm-chart-box canvas { max-height: 260px; }
.bbm-table { width: 100%; border-collapse: collapse; margin: 14px 0 8px; font-size: .88em; background: var(--card-bg, #fff); border-radius: 12px; overflow: hidden; }
.bbm-table th { background: #5a5244; color: #fff; padding: 9px 10px; text-align: left; font-weight: 600; }
.bbm-table td { padding: 9px 10px; border-bottom: 1px solid #eee6d6; color: #4a4234; vertical-align: top; }
.bbm-table tr:last-child td { border-bottom: none; }
.bbm-pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: .78em; font-weight: 600; white-space: nowrap; }
.bbm-pill.ok { background: #e1f5ea; color: #1a9e5c; }
.bbm-pill.pending { background: #fdf3dd; color: #c98a1e; }
.bbm-pill.zero { background: #fbe7e0; color: #b0553a; }
.bbm-pill.locked { background: #ece9f5; color: #6b5ca5; }
.bbm-note { font-size: .8em; color: #8a8172; background: var(--card-bg, #f7f3ec); border-left: 3px solid #b98a4e; padding: 10px 14px; border-radius: 0 10px 10px 0; margin: 14px 0; }
.bbm-insight { background: var(--card-bg, #f7f3ec); border: 1px solid #e5decf; border-radius: 14px; padding: 16px 20px; margin: 14px 0; }
.bbm-insight h3 { margin: 0 0 10px; font-size: 1.05em; color: #4a4234; }
.bbm-insight li { margin: 6px 0; color: #5a5244; }
.bbm-updated { text-align: right; font-size: .78em; color: #a39a89; margin-top: 6px; }
</style>

<div class="bbm-wrap">
  <div class="bbm-hero">
    <h2>💩➜💰 用臭臭的 token 换香香的 money</h2>
    <p>AI 挖漏洞经济账：每个项目烧了多少时间、多少 token、换回多少真金白银。数据会随项目进展持续更新，用数字决定下一步选型。</p>
  </div>

  <div class="bbm-cards" id="bbmCards"></div>

  <div class="bbm-chart-box" style="margin-bottom:14px;">
    <h3>📊 各项目投入产出一览（耗时 h ｜ token M ｜ 收入/潜在 ¥）</h3>
    <canvas id="bbmBar" height="90"></canvas>
  </div>

  <div class="bbm-charts">
    <div class="bbm-chart-box"><h3>💴 资金流状态</h3><canvas id="bbmMoney"></canvas></div>
    <div class="bbm-chart-box"><h3>🧭 路线 token 消耗占比</h3><canvas id="bbmRoute"></canvas></div>
  </div>

  <h3 style="margin:20px 0 4px;">📋 项目明细</h3>
  <table class="bbm-table" id="bbmTable">
    <thead><tr><th>项目</th><th>路线 / 通道</th><th>日期</th><th>耗时</th><th>token</th><th>收入</th><th>状态</th></tr></thead>
    <tbody></tbody>
  </table>
  <div class="bbm-updated" id="bbmUpdated"></div>

  <div class="bbm-insight">
    <h3>🧠 当前结论（随数据滚动修正）</h3>
    <ul>
      <li><b>本地源码审计 → 0day → 通用通道</b>是目前唯一验证过的正循环：禅道一个洞从零到提交 ≈9h，参考高危区间下限 ¥3000，折算 <b>≈¥333/h</b>，且方法论已沉淀进 skill，下一个洞的边际成本会显著更低。</li>
      <li><b>广撒网侦察（公益SRC）</b>两轮 12 机构 160 主机颗粒无收，时薪 ¥0——问题不在勤快，在打法：没有产品指纹的随机探测命中率太低，只配当练手。</li>
      <li><b>宝塔双洞</b>是当前最大的期权：报告已定稿封存，等首个漏洞过审解锁专属 SRC（10 万赏金池）即可当天提交，沉没成本已付。</li>
      <li>下一步优先级：<b>盯禅道过审 → 宝塔双洞 → H1 收款配置</b>；新方向优先复用「审计已知产品最新版」打法。</li>
    </ul>
  </div>

  <div class="bbm-note">
    📐 <b>数据口径</b>：耗时按会话实际起止估算；token 为模型侧粗估（含推理与上下文往返，非精确计费值，用 ≈ 标注）；「已到账」指平台完成打款，「在审/待定」按官方奖励区间计。数据由 ZCode 在项目节点自动更新。
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<script>
/* ======== 数据源：项目完成/奖励更新时改这里 ======== */
const PROJECTS = [
  { name: "公益SRC·广撒网侦察", route: "侦察/n-day", channel: "补天公益SRC",
    date: "09-12 ~ 09-13", hours: 10, tokensM: 1.1, income: 0, incomeNote: "¥0",
    status: "zero", statusText: "12机构160主机 · 0有效漏洞" },
  { name: "宝塔面板 ×2（createLink/fileBody）", route: "本地审计0day", channel: "堡塔专属SRC",
    date: "09-13", hours: 5, tokensM: 0.6, income: null, incomeNote: "待提交(池10万)",
    status: "locked", statusText: "报告封存 · 等首洞过审解锁" },
  { name: "aaPanel 未授权访问", route: "本地审计", channel: "厂商邮箱直报",
    date: "09-13", hours: 2, tokensM: 0.3, income: null, incomeNote: "待厂商回应",
    status: "pending", statusText: "已报送 · T+14 huntr 兜底" },
  { name: "禅道22.5 chart模块SQL注入", route: "本地审计0day", channel: "补天通用通道",
    date: "09-13 ~ 09-14", hours: 9, tokensM: 1.2, income: null, incomeNote: "在审 QTVA-2026-10964993",
    status: "pending", statusText: "高危区间 ¥3000-10000 · 审核中" }
];
const UPDATED = "2026-09-14 11:30";
/* ================================================= */

const fmtH = h => h + "h";
const fmtM = m => "≈" + m.toFixed(1) + "M";
const totH = PROJECTS.reduce((s, p) => s + p.hours, 0);
const totM = PROJECTS.reduce((s, p) => s + p.tokensM, 0);
const got = PROJECTS.filter(p => p.income > 0).reduce((s, p) => s + p.income, 0);
const pendingCnt = PROJECTS.filter(p => p.income === null).length;

document.getElementById("bbmCards").innerHTML = [
  ["💰 已到账", "¥" + got, got > 0 ? "ok" : "zero"],
  ["⏳ 在审/待定", pendingCnt + " 条线", "pending"],
  ["⏱️ 总耗时", fmtH(totH), ""],
  ["🪙 总 token", fmtM(totM), ""],
  ["📈 单位 token 产出", got > 0 ? ("¥" + (got / totM).toFixed(2) + "/M") : "—", got > 0 ? "ok" : ""]
].map(c => '<div class="bbm-card"><div class="k">' + c[0] + '</div><div class="v ' + c[2] + '">' + c[1] + '</div></div>').join("");

document.querySelector("#bbmTable tbody").innerHTML = PROJECTS.map(p =>
  "<tr><td><b>" + p.name + "</b></td><td>" + p.route + "<br><span style='color:#8a8172'>" + p.channel + "</span></td><td>" + p.date +
  "</td><td>" + fmtH(p.hours) + "</td><td>" + fmtM(p.tokensM) + "</td><td>" + p.incomeNote +
  "</td><td><span class='bbm-pill " + p.status + "'>" + p.statusText + "</span></td></tr>"
).join("");
document.getElementById("bbmUpdated").textContent = "数据更新于 " + UPDATED + " · 由 ZCode 在项目节点自动维护";

Chart.defaults.color = "#8a8172";
Chart.defaults.font.family = "-apple-system,'PingFang SC','Microsoft YaHei',sans-serif";
new Chart(document.getElementById("bbmBar"), {
  type: "bar",
  data: { labels: PROJECTS.map(p => p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name),
    datasets: [
      { label: "耗时(h)", data: PROJECTS.map(p => p.hours), backgroundColor: "#b98a4e", borderRadius: 6, yAxisID: "y1" },
      { label: "token(M)", data: PROJECTS.map(p => p.tokensM), backgroundColor: "#8a8172", borderRadius: 6, yAxisID: "y1" },
      { label: "已确认收入(¥)", data: PROJECTS.map(p => p.income || 0), backgroundColor: "#1a9e5c", borderRadius: 6, yAxisID: "y2" }
    ] },
  options: { responsive: true, scales: {
    y1: { position: "left", beginAtZero: true, title: { display: true, text: "h / M-token" } },
    y2: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: "¥" } }
  } }
});
new Chart(document.getElementById("bbmMoney"), {
  type: "doughnut",
  data: { labels: ["已到账", "在审/待定(线数)"],
    datasets: [{ data: [got || 0.0001, pendingCnt], backgroundColor: ["#1a9e5c", "#f5c96b"], borderWidth: 0 }] },
  options: { plugins: { legend: { position: "bottom" } }, cutout: "58%" }
});
const routeSum = {};
PROJECTS.forEach(p => { routeSum[p.route] = (routeSum[p.route] || 0) + p.tokensM; });
new Chart(document.getElementById("bbmRoute"), {
  type: "doughnut",
  data: { labels: Object.keys(routeSum), datasets: [{ data: Object.values(routeSum), backgroundColor: ["#b98a4e", "#7d9d6b", "#c98a1e", "#6b8cae"], borderWidth: 0 }] },
  options: { plugins: { legend: { position: "bottom" } }, cutout: "58%" }
});
</script>
