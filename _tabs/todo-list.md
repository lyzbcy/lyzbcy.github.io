---
layout: page
icon: fas fa-tasks
order: 4
---

# 📋 To Do List

<!-- 测试脚本是否加载 -->
<script>
  (function() {
    console.log('🔍 页面加载测试 - 脚本标签已执行');
    if (typeof console !== 'undefined') {
      console.log('✅ Console 对象可用');
    }
    // 检查主脚本是否已加载
    setTimeout(function() {
      if (typeof window.initTodoList === 'undefined') {
        console.error('❌ 主脚本未加载！initTodoList 函数不存在');
        console.log('请检查页面源代码中的 script 标签是否正确生成');
      } else {
        console.log('✅ 主脚本已加载');
      }
    }, 2000);
  })();
</script>

<div class="todo-controls">
  <button id="toggleView" class="view-toggle-btn">
    <i class="fas fa-th-large"></i> 模块视图
  </button>
  <button id="addTaskBtn" class="add-task-btn">
    <i class="fas fa-plus"></i> 添加任务
  </button>
</div>

<div id="masonryView" class="todo-view active">
  <div id="masonryContainer" class="masonry-container"></div>
  <div id="debugInfo" style="display:none; padding:10px; background:#f0f0f0; margin-top:20px; border-radius:5px; font-family:monospace; font-size:12px;"></div>
</div>

<div id="calendarView" class="todo-view">
  <div class="calendar-header">
    <button id="prevMonth" class="calendar-nav-btn" aria-label="上一月" title="上一月"><i class="fas fa-chevron-left"></i></button>
    <h2 id="calendarMonth"></h2>
    <button id="nextMonth" class="calendar-nav-btn" aria-label="下一月" title="下一月"><i class="fas fa-chevron-right"></i></button>
  </div>
  <div id="calendarGrid" class="calendar-grid"></div>
</div>

<style>
/* 控制按钮样式 */
.todo-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.view-toggle-btn, .add-task-btn {
  padding: 10px 20px;
  border: 2px solid #7c4dff;
  background: transparent;
  color: #7c4dff;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  font-family: inherit;
}

.view-toggle-btn:hover, .add-task-btn:hover {
  background: #7c4dff;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(124, 77, 255, 0.3);
}

.view-toggle-btn.active {
  background: #7c4dff;
  color: white;
}

/* 视图切换 */
.todo-view {
  display: none;
}

.todo-view.active {
  display: block;
}

/* ========== 模块化展示样式 ========== */
.masonry-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-rows: 10px;
  gap: 15px;
  padding: 20px 0;
}

.task-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  padding: 15px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  grid-row-end: span var(--card-height);
}

.task-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.task-card:hover {
  transform: translateY(-5px) rotate(1deg);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.task-card:hover::before {
  opacity: 1;
}

.task-card.completed {
  opacity: 0.6;
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
}

.task-card.completed::after {
  content: '✓';
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 24px;
  color: rgba(255,255,255,0.8);
}

/* 任务大小和紧急程度的视觉表现 */
.task-card.size-small {
  --card-height: 15;
  min-height: 90px;
}

.task-card.size-medium {
  --card-height: 20;
  min-height: 120px;
}

.task-card.size-large {
  --card-height: 25;
  min-height: 150px;
}

.task-card.urgency-high {
  border-left: 5px solid #ff6b6b;
  animation: pulse 2s infinite;
}

.task-card.urgency-medium {
  border-left: 5px solid #ffd93d;
}

.task-card.urgency-low {
  border-left: 5px solid #6bcf7f;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3); }
  50% { box-shadow: 0 4px 25px rgba(255, 107, 107, 0.6); }
}

.task-card h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.task-card p {
  margin: 0 0 8px 0;
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 11px;
  opacity: 0.8;
}

.task-date {
  display: flex;
  align-items: center;
  gap: 5px;
}

.task-category {
  background: rgba(255,255,255,0.2);
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
}

/* ========== 日历展示样式 ========== */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  color: white;
}

.calendar-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.calendar-nav-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calendar-nav-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: scale(1.1);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-top: 20px;
  position: relative;
}

.calendar-day-header {
  text-align: center;
  padding: 10px;
  font-weight: 600;
  color: #7c4dff;
  background: rgba(124, 77, 255, 0.1);
  border-radius: 10px;
}

.calendar-day {
  min-height: 100px;
  padding: 10px;
  padding-top: 35px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
}

.calendar-day:hover {
  border-color: #7c4dff;
  background: #f0f0ff;
}

.calendar-day.today {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #7c4dff;
}

.calendar-day.other-month {
  opacity: 0.3;
  background: #e9ecef;
}

.day-number {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
}

.calendar-task {
  background: white;
  padding: 6px 8px;
  margin-bottom: 5px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* 当日任务样式 - 提高对比度 */
.calendar-day.today .calendar-task {
  background: #ffffff;
  color: #333;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  border-left-width: 4px;
}

.calendar-task:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0,0,0,0.15);
  z-index: 10;
}

.calendar-task.urgency-high {
  border-left-color: #ff6b6b;
  background: linear-gradient(90deg, #fff5f5 0%, #ffffff 100%);
}

.calendar-task.urgency-medium {
  border-left-color: #ffd93d;
  background: linear-gradient(90deg, #fffef5 0%, #ffffff 100%);
}

.calendar-task.urgency-low {
  border-left-color: #6bcf7f;
  background: linear-gradient(90deg, #f5fff7 0%, #ffffff 100%);
}

.calendar-day.today .calendar-task.urgency-high {
  background: linear-gradient(90deg, #ffe5e5 0%, #ffffff 100%);
}

.calendar-day.today .calendar-task.urgency-medium {
  background: linear-gradient(90deg, #fff9e5 0%, #ffffff 100%);
}

.calendar-day.today .calendar-task.urgency-low {
  background: linear-gradient(90deg, #e5ffe9 0%, #ffffff 100%);
}

.calendar-task.completed {
  opacity: 0.6;
  text-decoration: line-through;
}

/* 跨天任务长条样式 */
.calendar-task.task-span {
  position: absolute;
  margin: 0;
  z-index: 1;
  border-radius: 0;
  border-left-width: 4px;
  border-right: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 22px;
  line-height: 22px;
  padding: 0 8px;
  box-sizing: border-box;
  /* 确保任务条在日期数字下方 */
  pointer-events: auto;
}

.calendar-task.task-span-start {
  border-radius: 6px 0 0 6px;
  border-right: 2px dashed rgba(0,0,0,0.15);
}

.calendar-task.task-span-end {
  border-radius: 0 6px 6px 0;
  border-left: none;
  border-right: 4px solid;
}

.calendar-task.task-span-middle {
  border-left: none;
  border-right: none;
  border-top: 2px solid;
  border-bottom: 2px solid;
  border-top-color: transparent;
  border-bottom-color: transparent;
}

.calendar-task.task-span-single {
  border-radius: 6px;
  border-right: 4px solid;
}

/* 任务条位置计算 - 使用动态计算，确保在日期数字下方 */
.calendar-task.task-span {
  top: calc(32px + var(--task-row, 0) * 27px);
}

/* 当日跨天任务特殊样式 */
.calendar-day.today .calendar-task.task-span {
  background: #ffffff;
  color: #333;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

.task-count {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #7c4dff;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.calendar-day.today .task-count {
  background: white;
  color: #7c4dff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .masonry-container {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }
  
  .calendar-grid {
    gap: 5px;
  }
  
  .calendar-day {
    min-height: 80px;
    padding: 5px;
  }
}

/* 添加任务模态框（未来可以扩展） */
.task-form {
  display: none;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  z-index: 1000;
  max-width: 500px;
  width: 90%;
}
</style>

<script>
// 立即执行的测试，确保脚本加载（使用立即执行函数避免作用域问题）
(function() {
  'use strict';
  console.log('📝 TodoList 脚本开始加载...');
  console.log('脚本执行时间:', new Date().toISOString());
  console.log('文档状态:', document.readyState);
  console.log('window 对象:', typeof window);
  console.log('document 对象:', typeof document);
  
  // 测试基本 JavaScript 功能
  try {
    var testVar = 'test';
    console.log('✓ JavaScript 基本功能正常，testVar =', testVar);
  } catch (e) {
    console.error('❌ JavaScript 执行出错:', e);
  }
})();

// 任务数据
let tasks = [];
let currentView = 'masonry'; // 'masonry' 或 'calendar'
let currentDate = new Date();

// 自动计算任务模块大小
function calculateTaskSize(urgency, daysUntil) {
  // 紧急程度权重：high=3, medium=2, low=1
  const urgencyWeight = { high: 3, medium: 2, low: 1 };
  const urgencyValue = urgencyWeight[urgency] || 2;
  
  // 日期临近程度权重：越近越大
  // 0-3天：3分，4-7天：2分，8-14天：1分，超过14天：0.5分
  let proximityScore;
  if (daysUntil <= 3) {
    proximityScore = 3;
  } else if (daysUntil <= 7) {
    proximityScore = 2;
  } else if (daysUntil <= 14) {
    proximityScore = 1;
  } else {
    proximityScore = 0.5;
  }
  
  // 综合得分 = 紧急程度 * 0.6 + 临近程度 * 0.4
  const totalScore = urgencyValue * 0.6 + proximityScore * 0.4;
  
  // 根据得分决定大小
  if (totalScore >= 2.5) {
    return 'large';
  } else if (totalScore >= 1.5) {
    return 'medium';
  } else {
    return 'small';
  }
}

// 初始化函数（全局作用域，确保可以访问）
window.initTodoList = function() {
  console.log('=== TodoList 初始化开始 ===');
  console.log('当前 URL:', window.location.href);
  console.log('当前路径:', window.location.pathname);
  console.log('文档状态:', document.readyState);
  
  if (typeof setupEventListeners === 'function') {
    setupEventListeners();
  } else {
    console.error('❌ setupEventListeners 函数不存在');
  }
  
  if (typeof loadTasks === 'function') {
    loadTasks().then(() => {
      console.log('数据加载完成，开始渲染视图');
      console.log('任务数量:', tasks.length);
      if (typeof renderCurrentView === 'function') {
        renderCurrentView();
      } else {
        console.error('❌ renderCurrentView 函数不存在');
      }
    }).catch(err => {
      console.error('❌ 加载任务数据失败:', err);
      console.error('错误堆栈:', err.stack);
      if (typeof renderCurrentView === 'function') {
        renderCurrentView(); // 即使加载失败也渲染视图
      }
    });
  } else {
    console.error('❌ loadTasks 函数不存在');
  }
  
  console.log('=== TodoList 初始化完成 ===');
};

// 也创建一个普通函数（兼容性）
function initTodoList() {
  return window.initTodoList();
}

// 多种方式确保初始化执行
if (document.readyState === 'loading') {
  // 文档还在加载中
  document.addEventListener('DOMContentLoaded', initTodoList);
  console.log('📌 等待 DOMContentLoaded 事件...');
} else {
  // 文档已经加载完成
  console.log('📌 文档已加载，立即执行初始化...');
  initTodoList();
}

// 备用方案：延迟执行
setTimeout(function() {
  if (tasks.length === 0 && !window.todoListInitialized) {
    console.log('⚠️ 备用初始化方案触发');
    window.todoListInitialized = true;
    initTodoList();
  }
}, 1000);

// 加载任务数据
async function loadTasks() {
  let tasksData = null;
  let useLiquid = false;
  
  // 直接使用 fetch 加载数据（GitHub Pages 上更可靠）
  console.log('开始通过 fetch 加载数据...');
  
  try {
    console.log('尝试加载路径: /todos.json');
    const response = await fetch('/todos.json');
    if (response.ok) {
      const text = await response.text();
      console.log('✓ 响应文本:', text.substring(0, 200));
      try {
        const data = JSON.parse(text);
        console.log('✓ 成功解析 JSON 数据:', data);
        tasksData = data.tasks || data;
        if (tasksData && Array.isArray(tasksData) && tasksData.length > 0) {
          console.log('✓ 数据加载成功，任务数量:', tasksData.length);
        } else {
          console.warn('⚠ 数据为空或格式不正确:', tasksData);
          tasksData = [];
        }
      } catch (jsonError) {
        console.error('❌ JSON 解析失败:', jsonError);
        console.error('❌ 响应文本:', text);
        tasksData = [];
      }
    } else {
      console.error('❌ 路径加载失败: /todos.json, 状态码:', response.status);
      tasksData = [];
    }
  } catch (fetchError) {
    console.error('❌ 路径加载出错: /todos.json', fetchError);
    tasksData = [];
  }
  
  console.log('最终加载的任务数据:', tasksData);
  console.log('数据类型:', typeof tasksData);
  console.log('是否为数组:', Array.isArray(tasksData));
  console.log('数据长度:', tasksData ? (Array.isArray(tasksData) ? tasksData.length : '不是数组') : 'null/undefined');
  
  // 在页面上显示调试信息（如果数据加载失败）
  const debugDiv = document.getElementById('debugInfo');
  if (debugDiv) {
    if (!tasksData || !Array.isArray(tasksData) || tasksData.length === 0) {
      debugDiv.style.display = 'block';
      debugDiv.innerHTML = `
        <strong>⚠️ 数据加载问题</strong><br>
        数据类型: ${typeof tasksData}<br>
        是否为数组: ${Array.isArray(tasksData)}<br>
        数据值: ${JSON.stringify(tasksData).substring(0, 200)}<br>
        <br>
        <strong>请检查：</strong><br>
        1. 打开浏览器控制台（F12）查看详细日志<br>
        2. 访问 <a href="/todos.json" target="_blank">/todos.json</a> 检查文件是否存在<br>
        3. 检查网络请求是否成功
      `;
    } else {
      debugDiv.style.display = 'none';
    }
  }
  
  // 处理日期格式：支持单个日期或时间段
  if (!tasksData || !Array.isArray(tasksData)) {
    console.error('❌ 数据格式错误，tasksData 不是数组:', tasksData);
    tasks = [];
    return;
  }
  
  tasks = tasksData.map(task => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, endDate, isRange;
    
    if (task.startDate && task.endDate) {
      // 时间段任务
      startDate = new Date(task.startDate);
      endDate = new Date(task.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      isRange = true;
    } else if (task.date) {
      // 单个日期任务（兼容旧格式）
      startDate = new Date(task.date);
      endDate = new Date(task.date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      isRange = false;
    } else {
      // 如果没有日期，使用今天
      startDate = new Date(today);
      endDate = new Date(today);
      isRange = false;
    }
    
    // 计算距离今天最近的天数（用于决定模块大小）
    const daysUntilStart = Math.floor((startDate - today) / (1000 * 60 * 60 * 24));
    const daysUntilEnd = Math.floor((endDate - today) / (1000 * 60 * 60 * 24));
    
    // 对于时间段任务，使用最接近的日期（开始或结束）
    // 如果今天在时间段内，使用0（最近）
    let nearestDay;
    if (daysUntilStart <= 0 && daysUntilEnd >= 0) {
      // 任务正在进行中
      nearestDay = 0;
    } else if (daysUntilStart > 0) {
      // 任务还未开始，使用开始日期
      nearestDay = daysUntilStart;
    } else {
      // 任务已结束，使用结束日期（虽然已经过期，但为了显示考虑）
      nearestDay = Math.abs(daysUntilEnd);
    }
    
    // 自动计算模块大小（基于紧急程度和日期临近程度）
    const autoSize = calculateTaskSize(task.urgency, nearestDay);
    
    return {
      ...task,
      startDate: startDate,
      endDate: endDate,
      isRange: isRange,
      daysUntilStart: daysUntilStart,
      daysUntilEnd: daysUntilEnd,
      nearestDay: nearestDay,
      size: autoSize,
      // 保留date字段用于兼容（使用开始日期）
      date: task.date || task.startDate
    };
  });
}

// 设置事件监听器
function setupEventListeners() {
  try {
    const toggleViewBtn = document.getElementById('toggleView');
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener('click', toggleView);
    }
    
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        alert('添加任务功能待实现，你可以直接编辑 _data/todos.yml 文件来添加任务');
      });
    }
    
    const prevMonthBtn = document.getElementById('prevMonth');
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
      });
    }
    
    const nextMonthBtn = document.getElementById('nextMonth');
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
      });
    }
  } catch (error) {
    console.error('设置事件监听器时出错:', error);
  }
}

// 切换视图
function toggleView() {
  try {
    currentView = currentView === 'masonry' ? 'calendar' : 'masonry';
    
    const btn = document.getElementById('toggleView');
    const masonryView = document.getElementById('masonryView');
    const calendarView = document.getElementById('calendarView');
    
    if (!btn || !masonryView || !calendarView) {
      console.error('切换视图时找不到必要的元素');
      return;
    }
    
    if (currentView === 'masonry') {
      masonryView.classList.add('active');
      calendarView.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-th-large"></i> 模块视图';
      renderMasonry();
    } else {
      calendarView.classList.add('active');
      masonryView.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-calendar"></i> 日历视图';
      renderCalendar();
    }
  } catch (error) {
    console.error('切换视图时出错:', error);
  }
}

// 渲染当前视图
function renderCurrentView() {
  if (currentView === 'masonry') {
    renderMasonry();
  } else {
    renderCalendar();
  }
}

// 渲染模块化视图
function renderMasonry() {
  try {
    const container = document.getElementById('masonryContainer');
    if (!container) {
      console.error('找不到模块化视图容器');
      return;
    }
    
    container.innerHTML = '';
    
    // 确保 tasks 是数组
    if (!Array.isArray(tasks)) {
      console.warn('tasks 不是数组，使用空数组');
      tasks = [];
    }
    
    // 计算任务的综合优先级分数（用于排序）
    function calculatePriorityScore(task) {
      // 已完成的任务优先级最低
      if (task.completed) return -1000;
      
      // 紧急程度权重：high=3, medium=2, low=1
      const urgencyWeight = { high: 3, medium: 2, low: 1 };
      const urgencyValue = urgencyWeight[task.urgency] || 2;
      
      // 时间临近程度权重：越近分数越高
      // 使用 nearestDay（距离今天最近的天数）
      let timeScore;
      const nearestDay = task.nearestDay || 0;
      
      if (nearestDay < 0) {
        // 已过期但未完成的任务，给予较高优先级
        timeScore = 2;
      } else if (nearestDay === 0) {
        // 今天或正在进行中
        timeScore = 5;
      } else if (nearestDay <= 1) {
        // 明天
        timeScore = 4;
      } else if (nearestDay <= 3) {
        // 2-3天后
        timeScore = 3;
      } else if (nearestDay <= 7) {
        // 4-7天后
        timeScore = 2;
      } else if (nearestDay <= 14) {
        // 8-14天后
        timeScore = 1;
      } else {
        // 超过14天
        timeScore = 0.5;
      }
      
      // 综合得分 = 紧急程度 * 0.5 + 时间临近程度 * 0.5
      // 这样两者权重相等，可以综合考虑
      const priorityScore = urgencyValue * 0.5 + timeScore * 0.5;
      
      return priorityScore;
    }
    
    // 按综合优先级排序（综合考虑时间临近程度和重要性）
    const sortedTasks = [...tasks].sort((a, b) => {
      const scoreA = calculatePriorityScore(a);
      const scoreB = calculatePriorityScore(b);
      
      // 优先级高的排在前面
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // 如果优先级相同，按日期排序（早的在前）
      const dateA = a.startDate || a.date || new Date(0);
      const dateB = b.startDate || b.date || new Date(0);
      return dateA - dateB;
    });
    
    sortedTasks.forEach(task => {
      const card = createTaskCard(task);
      container.appendChild(card);
    });
  } catch (error) {
    console.error('渲染模块化视图时出错:', error);
  }
}

// 创建任务卡片
function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card size-${task.size} urgency-${task.urgency} ${task.completed ? 'completed' : ''}`;
  
  // 格式化日期显示
  const dateDisplay = task.isRange 
    ? `${formatDate(task.startDate)} - ${formatDate(task.endDate)}`
    : formatDate(task.date);
  
  // 计算剩余天数提示
  let daysHint = '';
  if (task.daysUntilStart < 0 && task.daysUntilEnd >= 0) {
    daysHint = '（进行中）';
  } else if (task.daysUntilStart === 0) {
    daysHint = '（今天）';
  } else if (task.daysUntilStart === 1) {
    daysHint = '（明天）';
  } else if (task.daysUntilStart > 0 && task.daysUntilStart <= 7) {
    daysHint = `（${task.daysUntilStart}天后）`;
  } else if (task.daysUntilStart < 0) {
    daysHint = '（已过期）';
  }
  
  card.innerHTML = `
    <h3>${task.title}</h3>
    <p>${task.description || ''}</p>
    <div class="task-meta">
      <span class="task-date">
        <i class="far fa-calendar"></i>
        ${dateDisplay}${daysHint}
      </span>
      <span class="task-category">${task.category || ''}</span>
    </div>
  `;
  
  card.addEventListener('click', () => {
    task.completed = !task.completed;
    renderMasonry();
  });
  
  return card;
}

// 渲染日历视图
function renderCalendar() {
  try {
    const monthYear = document.getElementById('calendarMonth');
    const grid = document.getElementById('calendarGrid');
    
    if (!monthYear || !grid) {
      console.error('找不到日历视图元素');
      return;
    }
    
    // 确保 tasks 是数组
    if (!Array.isArray(tasks)) {
      console.warn('tasks 不是数组，使用空数组');
      tasks = [];
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthYear.textContent = `${year}年 ${month + 1}月`;
    
    // 清空网格
    grid.innerHTML = '';
    
    // 添加星期标题
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      grid.appendChild(header);
    });
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // 从周日开始
    
    // 创建日期单元格数组
    const dayCells = [];
    for (let i = 0; i < 42; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);
      
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';
      dayCell.dataset.date = currentDay.toISOString().split('T')[0];
      
      if (currentDay.getMonth() !== month) {
        dayCell.classList.add('other-month');
      }
      
      const today = new Date();
      if (currentDay.toDateString() === today.toDateString()) {
        dayCell.classList.add('today');
      }
      
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = currentDay.getDate();
      dayCell.appendChild(dayNumber);
      
      grid.appendChild(dayCell);
      dayCells.push({ cell: dayCell, date: new Date(currentDay) });
    }
    
    // 处理任务渲染 - 实现跨天任务长条显示
    const visibleTasks = tasks.filter(task => {
      if (!task.startDate || !task.endDate) return false;
      // 检查任务是否在当前显示的42天范围内
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      const viewStart = dayCells[0].date;
      const viewEnd = dayCells[dayCells.length - 1].date;
      return taskEnd >= viewStart && taskStart <= viewEnd;
    });
    
    // 按开始日期和紧急程度排序
    visibleTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      }
      return a.startDate - b.startDate;
    });
    
    // 为每个任务分配行位置（避免重叠）
    const taskRows = [];
    const taskRenderQueue = [];
    
    visibleTasks.forEach(task => {
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      
      // 找到任务在日历中的起始和结束位置
      let startIndex = -1;
      let endIndex = -1;
      
      dayCells.forEach((dayInfo, index) => {
        const dayDate = dayInfo.date;
        if (dayDate >= taskStart && dayDate <= taskEnd) {
          if (startIndex === -1) startIndex = index;
          endIndex = index;
        }
      });
      
      if (startIndex === -1 || endIndex === -1) return;
      
      // 找到可用的行位置（避免重叠）
      let rowIndex = 0;
      while (taskRows.some(row => {
        return row.rowIndex === rowIndex && 
               !(endIndex < row.startIndex || startIndex > row.endIndex);
      })) {
        rowIndex++;
      }
      
      taskRows.push({
        task: task,
        startIndex: startIndex,
        endIndex: endIndex,
        rowIndex: rowIndex
      });
      
      // 计算任务跨越的周数（处理换行）
      const startWeek = Math.floor(startIndex / 7);
      const endWeek = Math.floor(endIndex / 7);
      
      taskRenderQueue.push({
        task: task,
        startIndex: startIndex,
        endIndex: endIndex,
        rowIndex: rowIndex,
        startWeek: startWeek,
        endWeek: endWeek
      });
    });
    
    // 使用 requestAnimationFrame 确保 DOM 渲染完成后再计算位置
    requestAnimationFrame(() => {
      taskRenderQueue.forEach(({ task, startIndex, endIndex, rowIndex, startWeek, endWeek }) => {
        // 如果任务在同一周内
        if (startWeek === endWeek) {
          const startCell = dayCells[startIndex].cell;
          const endCell = dayCells[endIndex].cell;
          
          const taskEl = document.createElement('div');
          taskEl.className = `calendar-task task-span urgency-${task.urgency} ${task.completed ? 'completed' : ''}`;
          taskEl.style.setProperty('--task-row', rowIndex);
          
          if (startIndex === endIndex) {
            taskEl.classList.add('task-span-single');
          } else {
            taskEl.classList.add('task-span-start');
          }
          
          // 计算宽度和位置
          const startCellRect = startCell.getBoundingClientRect();
          const endCellRect = endCell.getBoundingClientRect();
          const gridRect = grid.getBoundingClientRect();
          
          // 计算任务条的 top 位置：日期数字高度(约22px) + 间距(10px) + 行偏移
          const taskTop = startCellRect.top - gridRect.top + 32 + rowIndex * 27;
          
          taskEl.style.left = `${startCellRect.left - gridRect.left + grid.scrollLeft}px`;
          taskEl.style.width = `${endCellRect.right - startCellRect.left}px`;
          taskEl.style.top = `${taskTop}px`;
          
          taskEl.textContent = task.title;
          const tooltip = task.isRange 
            ? `${task.description || task.title} (${formatDate(task.startDate)} - ${formatDate(task.endDate)})`
            : (task.description || task.title);
          taskEl.title = tooltip;
          
          taskEl.addEventListener('click', () => {
            task.completed = !task.completed;
            renderCalendar();
          });
          
          grid.appendChild(taskEl);
        } else {
          // 任务跨越多周，分段显示
          for (let week = startWeek; week <= endWeek; week++) {
            const weekStartIndex = week * 7;
            const weekEndIndex = Math.min((week + 1) * 7 - 1, dayCells.length - 1);
            
            const segmentStart = Math.max(startIndex, weekStartIndex);
            const segmentEnd = Math.min(endIndex, weekEndIndex);
            
            if (segmentStart > segmentEnd) continue;
            
            const startCell = dayCells[segmentStart].cell;
            const endCell = dayCells[segmentEnd].cell;
            
            const taskEl = document.createElement('div');
            taskEl.className = `calendar-task task-span urgency-${task.urgency} ${task.completed ? 'completed' : ''}`;
            taskEl.style.setProperty('--task-row', rowIndex);
            
            if (segmentStart === startIndex && segmentStart === segmentEnd) {
              taskEl.classList.add('task-span-single');
            } else if (segmentStart === startIndex) {
              taskEl.classList.add('task-span-start');
            } else if (segmentEnd === endIndex) {
              taskEl.classList.add('task-span-end');
            } else {
              taskEl.classList.add('task-span-middle');
            }
            
            // 计算宽度和位置
            const startCellRect = startCell.getBoundingClientRect();
            const endCellRect = endCell.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            
            // 计算任务条的 top 位置：日期数字高度(约22px) + 间距(10px) + 行偏移
            const taskTop = startCellRect.top - gridRect.top + 32 + rowIndex * 27;
            
            taskEl.style.left = `${startCellRect.left - gridRect.left + grid.scrollLeft}px`;
            taskEl.style.width = `${endCellRect.right - startCellRect.left}px`;
            taskEl.style.top = `${taskTop}px`;
            
            // 只在第一段显示完整标题，其他段显示省略号
            if (segmentStart === startIndex) {
              taskEl.textContent = task.title;
            } else {
              taskEl.textContent = '⋯';
              taskEl.style.textAlign = 'center';
            }
            
            const tooltip = task.isRange 
              ? `${task.description || task.title} (${formatDate(task.startDate)} - ${formatDate(task.endDate)})`
              : (task.description || task.title);
            taskEl.title = tooltip;
            
            taskEl.addEventListener('click', () => {
              task.completed = !task.completed;
              renderCalendar();
            });
            
            grid.appendChild(taskEl);
          }
        }
      });
    });
    
  } catch (error) {
    console.error('渲染日历视图时出错:', error);
  }
}

// 格式化日期
function formatDate(dateInput) {
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

// 所有函数定义完成后的检查
console.log('✅ 所有函数定义完成，检查函数可用性:');
console.log('  - initTodoList:', typeof window.initTodoList);
console.log('  - loadTasks:', typeof loadTasks);
console.log('  - renderCurrentView:', typeof renderCurrentView);
console.log('  - setupEventListeners:', typeof setupEventListeners);
console.log('  - renderMasonry:', typeof renderMasonry);
console.log('  - renderCalendar:', typeof renderCalendar);

// 修复 SimpleJekyllSearch 的 templateMiddleware 函数缺少返回值的问题
// 这个错误可能导致 "Unexpected end of input" 错误
// 通过拦截并修复 SimpleJekyllSearch 的初始化来解决
(function() {
  'use strict';
  
  // 保存原始的 SimpleJekyllSearch（如果存在）
  const originalSimpleJekyllSearch = window.SimpleJekyllSearch;
  
  // 重写 SimpleJekyllSearch 函数
  window.SimpleJekyllSearch = function(options) {
    // 修复 templateMiddleware 函数，确保它有返回值
    if (options && typeof options.templateMiddleware === 'function') {
      const originalMiddleware = options.templateMiddleware;
      options.templateMiddleware = function(prop, value, template) {
        const result = originalMiddleware.call(this, prop, value, template);
        // 如果原函数没有返回值，返回空字符串
        return result !== undefined ? result : '';
      };
    }
    
    // 调用原始的 SimpleJekyllSearch
    if (originalSimpleJekyllSearch) {
      return originalSimpleJekyllSearch.call(this, options);
    } else {
      // 如果 SimpleJekyllSearch 还没有加载，等待它加载
      console.warn('⚠️ SimpleJekyllSearch 尚未加载，将在加载后修复');
    }
  };
  
  console.log('✅ 已设置 SimpleJekyllSearch 修复函数');
})();
</script>
