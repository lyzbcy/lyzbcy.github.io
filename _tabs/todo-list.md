---
layout: page
icon: fas fa-tasks
order: 4
---

# 📋 To Do List

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
</div>

<div id="calendarView" class="todo-view">
  <div class="calendar-header">
    <button id="prevMonth" class="calendar-nav-btn"><i class="fas fa-chevron-left"></i></button>
    <h2 id="calendarMonth"></h2>
    <button id="nextMonth" class="calendar-nav-btn"><i class="fas fa-chevron-right"></i></button>
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
  border-radius: 20px;
  padding: 20px;
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
  --card-height: 20;
  min-height: 120px;
}

.task-card.size-medium {
  --card-height: 30;
  min-height: 180px;
}

.task-card.size-large {
  --card-height: 40;
  min-height: 240px;
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
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
}

.task-card p {
  margin: 0 0 10px 0;
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  font-size: 12px;
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
  background: #f8f9fa;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
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
}

.calendar-day.today .calendar-task {
  background: rgba(255,255,255,0.9);
}

.calendar-task:hover {
  transform: translateX(3px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.calendar-task.urgency-high {
  border-left-color: #ff6b6b;
}

.calendar-task.urgency-medium {
  border-left-color: #ffd93d;
}

.calendar-task.urgency-low {
  border-left-color: #6bcf7f;
}

.calendar-task.completed {
  opacity: 0.6;
  text-decoration: line-through;
}

/* 时间段任务样式 */
.calendar-task.task-range-start {
  border-left-width: 5px;
  border-radius: 6px 0 0 6px;
}

.calendar-task.task-range-end {
  border-radius: 0 6px 6px 0;
}

.calendar-task.task-range-middle {
  border-left-width: 1px;
  border-radius: 0;
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

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  loadTasks();
  setupEventListeners();
  renderCurrentView();
});

// 加载任务数据
function loadTasks() {
  {% if site.data.todos %}
  tasks = {{ site.data.todos.tasks | jsonify }};
  {% else %}
  // 如果没有数据文件，使用示例数据
  tasks = [
    {
      id: 1,
      title: "完成项目文档",
      description: "编写完整的项目文档，包括API说明和使用指南",
      date: "2025-01-28",
      urgency: "high",
      completed: false,
      category: "工作"
    }
  ];
  {% endif %}
  
  // 处理日期格式：支持单个日期或时间段
  tasks = tasks.map(task => {
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
  document.getElementById('toggleView').addEventListener('click', toggleView);
  document.getElementById('addTaskBtn').addEventListener('click', () => {
    alert('添加任务功能待实现，你可以直接编辑 _data/todos.yml 文件来添加任务');
  });
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
}

// 切换视图
function toggleView() {
  currentView = currentView === 'masonry' ? 'calendar' : 'masonry';
  
  const btn = document.getElementById('toggleView');
  const masonryView = document.getElementById('masonryView');
  const calendarView = document.getElementById('calendarView');
  
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
  const container = document.getElementById('masonryContainer');
  container.innerHTML = '';
  
  // 按紧急程度和日期排序
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    }
    return a.dateObj - b.dateObj;
  });
  
  sortedTasks.forEach(task => {
    const card = createTaskCard(task);
    container.appendChild(card);
  });
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
  const monthYear = document.getElementById('calendarMonth');
  const grid = document.getElementById('calendarGrid');
  
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
  
  // 生成42天（6周）
  for (let i = 0; i < 42; i++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + i);
    
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
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
    
    // 获取当天的任务（支持时间段）
    const dayTasks = tasks.filter(task => {
      // 检查当前日期是否在任务的时间范围内（包括开始和结束日期）
      return currentDay >= task.startDate && currentDay <= task.endDate;
    });
    
    if (dayTasks.length > 0) {
      dayTasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `calendar-task urgency-${task.urgency} ${task.completed ? 'completed' : ''}`;
        
        // 如果是时间段任务，显示特殊标识
        if (task.isRange) {
          const isStart = currentDay.toDateString() === task.startDate.toDateString();
          const isEnd = currentDay.toDateString() === task.endDate.toDateString();
          if (isStart && !isEnd) {
            taskEl.classList.add('task-range-start');
          } else if (isEnd && !isStart) {
            taskEl.classList.add('task-range-end');
          } else if (!isStart && !isEnd) {
            taskEl.classList.add('task-range-middle');
          }
        }
        
        taskEl.textContent = task.title;
        const tooltip = task.isRange 
          ? `${task.description || task.title} (${formatDate(task.startDate)} - ${formatDate(task.endDate)})`
          : (task.description || task.title);
        taskEl.title = tooltip;
        dayCell.appendChild(taskEl);
      });
      
      if (dayTasks.length > 3) {
        const count = document.createElement('div');
        count.className = 'task-count';
        count.textContent = dayTasks.length;
        dayCell.appendChild(count);
      }
    }
    
    grid.appendChild(dayCell);
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
</script>
