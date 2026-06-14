# Jekyll plugin to generate posts.json for the 3D world
# Place this in _plugins/ directory
# It generates a JSON file with all post metadata at /world/src/data/posts.json

Jekyll::Hooks.register :site, :post_write do |site|
  require 'json'

  posts_data = site.posts.docs.map do |post|
    {
      title: post.data['title'] || post.basename_without_ext,
      category: (post.data['categories'] || []).first || '未分类',
      date: post.date.strftime('%Y-%m-%d'),
      url: post.url
    }
  end

  # Sort by date descending
  posts_data.sort_by! { |p| p[:date] }.reverse!

  # Write to world/src/data/posts.json
  output_path = File.join(site.source, 'world', 'src', 'data', 'posts.json')
  File.write(output_path, JSON.pretty_generate(posts_data))

  puts "Generated #{output_path} with #{posts_data.length} posts"
end
