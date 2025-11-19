/**
 * 日历交互逻辑
 * 说明：解析 Liquid 注入的 JSON 数据，渲染月视图日历并提供模态框交互
 */
(() => {
  const dataElement = document.getElementById('calendarData');
  const calendarBody = document.getElementById('calendarBody');
  const monthTitle = document.getElementById('monthTitle');
  const monthSubtitle = document.getElementById('monthSubtitle');
  const statsElement = document.getElementById('eventStats');
  const modal = document.getElementById('eventModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalDateTitle = document.getElementById('modalDateTitle');
  const modalDateText = document.getElementById('modalDateText');
  const modalEventsList = document.getElementById('modalEventsList');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  const todayBtn = document.getElementById('todayBtn');

  if (!dataElement || !calendarBody) {
    return;
  }

  const typeNames = {
    homework: '作业',
    test: '考试',
    activity: '活动',
    default: '提醒'
  };
  const typeColors = {
    homework: '#ff6b6b',
    test: '#ffa726',
    activity: '#66bb6a',
    default: '#6c5ce7'
  };

  let calendarData = [];
  try {
    const parsed = JSON.parse(dataElement.textContent.trim() || '[]');
    if (Array.isArray(parsed)) {
      calendarData = parsed;
    }
  } catch (error) {
    console.error('[Calendar] JSON 解析失败：', error);
  }

  const eventsByDate = calendarData.reduce((acc, event) => {
    if (!event || !event.date) return acc;
    const key = event.date;
    if (!acc.has(key)) {
      acc.set(key, []);
    }
    acc.get(key).push(event);
    return acc;
  }, new Map());

  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth(); // 0-11

  const mobileBreakpoint = 768;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function formatDateKey(year, monthIndexZeroBased, day) {
    return `${year}-${pad(monthIndexZeroBased + 1)}-${pad(day)}`;
  }

  function formatDisplayDate(date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function updateMonthInfo() {
    const displayDate = new Date(currentYear, currentMonth, 1);
    const formatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' });
    monthTitle.textContent = formatter.format(displayDate);

    const eventsInMonth = calendarData.filter(event => {
      if (!event.date) return false;
      const date = new Date(event.date);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });
    const total = eventsInMonth.length;
    monthSubtitle.textContent = total > 0 ? `本月共有 ${total} 个事件` : '本月暂无事件';
  }

  function renderStats() {
    if (!statsElement) return;

    const summary = calendarData.reduce(
      (acc, event) => {
        const type = event.type || 'default';
        acc.total += 1;
        acc.types[type] = (acc.types[type] || 0) + 1;
        return acc;
      },
      { total: 0, types: {} }
    );

    if (summary.total === 0) {
      statsElement.textContent = '暂无数据，快去在文章或 _data/calendar.yml 中添加提醒吧～';
      return;
    }

    const fragments = [];
    fragments.push(`<span><strong>${summary.total}</strong>条事件</span>`);
    Object.entries(summary.types).forEach(([type, count]) => {
      fragments.push(
        `<span>${typeNames[type] || typeNames.default}：<strong>${count}</strong></span>`
      );
    });
    statsElement.innerHTML = fragments.join('');
  }

  function renderCalendar() {
    updateMonthInfo();
    renderStats();

    calendarBody.innerHTML = '';
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const fragment = document.createDocumentFragment();
    let dayCounter = 1;

    let row = null;
    for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
      const colIndex = cellIndex % 7;
      if (colIndex === 0) {
        row = document.createElement('tr');
        fragment.appendChild(row);
      } else {
        row = row || fragment.lastChild;
      }

      const cell = document.createElement('td');

      if (cellIndex >= firstDay && dayCounter <= daysInMonth) {
        const dateStr = formatDateKey(currentYear, currentMonth, dayCounter);
        const cellDate = new Date(currentYear, currentMonth, dayCounter);
        const events = eventsByDate.get(dateStr) || [];
        const dayWrapper = document.createElement('div');
        dayWrapper.className = 'calendar-day';
        dayWrapper.innerHTML = `<span>${dayCounter}</span><span class="day-tag">${['日','一','二','三','四','五','六'][colIndex]}</span>`;
        cell.appendChild(dayWrapper);

        const isToday =
          dayCounter === today.getDate() &&
          currentMonth === today.getMonth() &&
          currentYear === today.getFullYear();
        const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

        if (isToday) cell.classList.add('today');
        if (isPast) cell.classList.add('past');

        const eventContainer = document.createElement('div');
        cell.appendChild(eventContainer);

        if (events.length) {
          const isMobile = window.innerWidth <= mobileBreakpoint;
          const limit = isMobile ? 1 : 2;
          events
            .slice(0, limit)
            .forEach(event => renderEventBadge(event, eventContainer, dateStr));

          if (events.length > limit) {
            const more = document.createElement('div');
            more.className = 'more-events';
            more.textContent = `+${events.length - limit} 更多`;
            eventContainer.appendChild(more);
          }

          cell.addEventListener('click', () => showEventModal(dateStr, events));
        } else {
          cell.addEventListener('click', () => {
            showEventModal(dateStr, []);
          });
        }

        dayCounter += 1;
      } else {
        cell.classList.add('empty');
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(fragment);
  }

  function renderEventBadge(event, container, dateStr) {
    const badge = document.createElement('span');
    const type = event.type || 'default';
    badge.className = `event-badge ${type}`;
    badge.textContent = event.event || '未命名事件';

    badge.addEventListener('click', evt => {
      evt.stopPropagation();
      if (event.link) {
        const target = event.linkTarget || '_self';
        window.open(event.link, target);
      } else {
        showEventModal(dateStr, [event]);
      }
    });

    container.appendChild(badge);
  }

  function showEventModal(dateStr, events) {
    const date = new Date(dateStr);
    modalDateTitle.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    modalDateText.textContent =
      events.length > 0 ? `共有 ${events.length} 条事件` : '该日期暂无事件，点击日历即可新增提醒。';
    modalEventsList.innerHTML = '';

    if (events.length === 0) {
      modalEventsList.innerHTML = '<p style="color:#888;">暂未添加事件。</p>';
    } else {
      events.forEach(event => {
        const item = document.createElement('div');
        item.className = 'event-item';
        const type = event.type || 'default';
        const title = document.createElement('h4');

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.style.backgroundColor = typeColors[type] || typeColors.default;
        badge.textContent = typeNames[type] || typeNames.default;

        if (event.link) {
          const link = document.createElement('a');
          link.href = event.link;
          link.target = event.linkTarget || '_self';
          link.textContent = event.event || '未命名事件';
          link.rel = link.target === '_blank' ? 'noopener noreferrer' : '';
          title.appendChild(link);
        } else {
          title.textContent = event.event || '未命名事件';
        }

        title.appendChild(badge);
        item.appendChild(title);

        const desc = document.createElement('p');
        desc.textContent = event.link ? '点击标题可跳转详情' : '未设置链接';
        item.appendChild(desc);
        modalEventsList.appendChild(item);
      });
    }

    modal.classList.add('show');
  }

  function hideModal() {
    modal.classList.remove('show');
  }

  function handleModalClick(event) {
    if (event.target === modal) {
      hideModal();
    }
  }

  function bindNavigation() {
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentMonth -= 1;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear -= 1;
        }
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentMonth += 1;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear += 1;
        }
        renderCalendar();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        currentYear = today.getFullYear();
        currentMonth = today.getMonth();
        renderCalendar();
      });
    }
  }

  function bindModalEvents() {
    modalCloseBtn?.addEventListener('click', hideModal);
    modal?.addEventListener('click', handleModalClick);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        hideModal();
      }
    });
  }

  bindNavigation();
  bindModalEvents();
  renderCalendar();

  window.addEventListener('resize', () => {
    renderCalendar();
  });
})();


