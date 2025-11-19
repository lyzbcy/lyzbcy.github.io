require 'date'

module Jekyll
  # 自定义生成器：从所有文章提取 reminder_date，输出到 site.data
  class CalendarFromPostsGenerator < Generator
    safe true
    priority :low

    def generate(site)
      post_events = []

      site.posts.docs.each do |post|
        reminder_date = post.data['reminder_date']
        next unless reminder_date

        begin
          date_obj = Date.parse(reminder_date.to_s)
          formatted_date = date_obj.strftime('%Y-%m-%d')

          event_data = {
            'date' => formatted_date,
            'event' => post.data['title'] || post.data['name'] || '未命名事件',
            'type' => post.data['reminder_type'] || 'homework',
            'link' => post.url ? "#{site.baseurl}#{post.url}" : nil,
            'linkTarget' => '_self'
          }.compact

          post_events << event_data
        rescue ArgumentError
          Jekyll.logger.warn 'CalendarFromPosts:', "无法解析提醒日期: #{reminder_date}"
        end
      end

      site.data['calendar_from_posts'] = post_events
    end
  end
end

