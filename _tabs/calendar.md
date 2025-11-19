---
title: 日历
icon: fas fa-calendar
order: 4
---

> 这个日历页会自动汇总文章 front matter 中的 `reminder_date` 以及 `_data/calendar.yml` 手动事件，集中展示所有待办或活动提醒。

<style>
:root {
  --calendar-bg: #ffffff;
  --calendar-border: #e5e5e5;
  --calendar-text: #1f1f1f;
  --calendar-muted: #8a8a8a;
  --calendar-today: #1a1a1a;
  --calendar-card-shadow: 0 12px 30px -18px rgba(0, 0, 0, 0.4);
}

.calendar-container {
  width: 100%;
  background-color: var(--calendar-bg);
  border-radius: 18px;
  border: 1px solid var(--calendar-border);
  padding: 24px;
  box-shadow: var(--calendar-card-shadow);
}

.calendar-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.calendar-header h3 {
  margin: 0;
  font-weight: 600;
  color: var(--calendar-text);
}

.calendar-header h3 small {
  display: block;
  font-size: 0.875rem;
  color: var(--calendar-muted);
  margin-top: 4px;
}

.calendar-nav {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.calendar-nav button {
  border: 1px solid var(--calendar-border);
  background-color: #f8f8f8;
  color: var(--calendar-text);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.calendar-nav button:hover {
  border-color: #111;
  color: #111;
  background-color: #f1f1f1;
}

.calendar-nav button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.event-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--calendar-muted);
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.event-stats strong {
  font-size: 1rem;
  color: var(--calendar-text);
  margin-right: 8px;
}

.calendar {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.calendar thead th {
  padding: 12px 0;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  color: var(--calendar-muted);
}

.calendar tbody td {
  border: 1px solid var(--calendar-border);
  height: 120px;
  padding: 8px;
  vertical-align: top;
  position: relative;
  transition: background 0.2s ease;
}

.calendar tbody td:hover {
  background-color: #fafafa;
}

.calendar-day {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.calendar-day span {
  font-weight: 600;
  color: var(--calendar-text);
}

.calendar-day .day-tag {
  font-size: 0.75rem;
  color: var(--calendar-muted);
}

.calendar tbody td.today {
  border: 2px solid var(--calendar-today);
}

.calendar tbody td.past .calendar-day span {
  color: var(--calendar-muted);
}

.event-badge {
  display: block;
  border-radius: 10px;
  padding: 6px 8px;
  color: #fff;
  font-size: 0.8rem;
  margin-bottom: 6px;
  line-height: 1.2;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.event-badge:hover {
  transform: translateY(-1px);
}

.event-badge.homework { background-color: #ff6b6b; }
.event-badge.test { background-color: #ffa726; }
.event-badge.activity { background-color: #66bb6a; }
.event-badge.default { background-color: #6c5ce7; }

.more-events {
  font-size: 0.75rem;
  color: var(--calendar-muted);
}

.event-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 999;
}

.event-modal.show {
  display: flex;
}

.event-modal-content {
  width: min(540px, 100%);
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  animation: modalFade 0.25s ease;
  max-height: 90vh;
  overflow: auto;
}

@keyframes modalFade {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.event-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.event-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.event-modal-close {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.event-modal-date {
  color: var(--calendar-muted);
  margin-bottom: 16px;
}

.event-modal-events {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  border-radius: 12px;
  padding: 14px;
  background: #f7f7f7;
  border: 1px solid var(--calendar-border);
}

.event-item h4 {
  margin: 0 0 6px;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-item a {
  color: inherit;
  text-decoration: none;
}

.event-item span.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
  text-transform: uppercase;
}

.event-item p {
  margin: 0;
  color: var(--calendar-muted);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .calendar-container {
    padding: 18px;
  }

  .calendar tbody td {
    height: 96px;
    padding: 6px;
  }

  .calendar-day span {
    font-size: 0.95rem;
  }

  .event-badge {
    font-size: 0.75rem;
    padding: 4px 6px;
  }
}

@media (max-width: 520px) {
  .calendar-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-nav {
    width: 100%;
  }

  .calendar-nav button {
    flex: 1 1 auto;
    text-align: center;
  }
}
</style>

<div class="calendar-container">
  <div class="calendar-header">
    <div>
      <h3 id="monthTitle">加载中...</h3>
      <small id="monthSubtitle">准备中</small>
    </div>
    <div class="calendar-nav">
      <button type="button" id="prevMonth">‹ 上月</button>
      <button type="button" id="todayBtn">今天</button>
      <button type="button" id="nextMonth">下月 ›</button>
    </div>
  </div>

  <div id="eventStats" class="event-stats"></div>

  <table class="calendar">
    <thead>
      <tr>
        <th>日</th>
        <th>一</th>
        <th>二</th>
        <th>三</th>
        <th>四</th>
        <th>五</th>
        <th>六</th>
      </tr>
    </thead>
    <tbody id="calendarBody"></tbody>
  </table>
</div>

<div id="eventModal" class="event-modal" role="dialog" aria-modal="true" aria-labelledby="modalDateTitle">
  <div class="event-modal-content">
    <div class="event-modal-header">
      <h3 id="modalDateTitle">日期详情</h3>
      <button class="event-modal-close" id="modalCloseBtn" aria-label="关闭">×</button>
    </div>
    <div class="event-modal-body">
      <div class="event-modal-date" id="modalDateText">暂无数据</div>
      <div class="event-modal-events" id="modalEventsList"></div>
    </div>
  </div>
</div>

<script id="calendarData" type="application/json">
{%- assign manual_events = site.data.calendar -%}
{%- assign post_events = site.data.calendar_from_posts -%}
{%- if manual_events and post_events -%}
{{ manual_events | concat: post_events | jsonify }}
{%- elsif manual_events -%}
{{ manual_events | jsonify }}
{%- elsif post_events -%}
{{ post_events | jsonify }}
{%- else -%}
[]
{%- endif -%}
</script>

<script src="{{ '/assets/js/calendar.js' | relative_url }}" defer></script>


