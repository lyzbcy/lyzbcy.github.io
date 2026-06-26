# frozen_string_literal: true
# 真加密插件：{% encrypted %}...{% endencrypted %} 捕获明文，
# :post_render hook 用 AES-GCM-256 加密，替换占位符为密文容器。
#
# 设计要点：
# - Liquid Block 渲染期，明文仍是明文，用占位符 <!--ENC_START-->...<!--ENC_END--> 包裹
# - :post_render hook 在整页 HTML 渲染后，扫描占位符，加密其中内容并替换为密文容器
# - 密文容器：<script type="application/json" class="enc-payload"> 内含 JSON，浏览器不执行
# - 前端 encrypted-post.js 用 Web Crypto API 解密
require 'openssl'
require 'json'

module EncryptContent
  ITERATIONS = 300_000
  # 注意：占位符不能用 HTML 注释 <!-- -->，否则 Jekyll 二次 markdown 转换会
  # 把它和紧邻的 HTML 标签一起当作 HTML 块重新解析，注释边界被重组导致丢失。
  # 用纯文本 token 规避：@ 在 markdown 中无特殊含义，此组合不会出现在正常内容里。
  START_TOKEN = '@@@ENC_START@@@'
  END_TOKEN = '@@@ENC_END@@@'
  PLACEHOLDER_RE = /#{START_TOKEN}(.*?)#{END_TOKEN}/m.freeze

  module_function

  # 从密码柜取密码
  def fetch_password(site, ref)
    secrets = site.data['encryption_secrets']
    raise "加密文章缺少密码柜：请创建 _data/encryption_secrets.yml" if secrets.nil?
    pwd = secrets[ref]
    raise "密码柜无 '#{ref}' 键（_data/encryption_secrets.yml）" if pwd.nil?
    pwd.to_s
  end

  # AES-GCM 加密，返回字段 hash（字段名与前端约定）
  def encrypt(plaintext, pwd)
    salt = OpenSSL::Random.random_bytes(16)
    iv   = OpenSSL::Random.random_bytes(12)
    key  = OpenSSL::PKCS5.pbkdf2_hmac(pwd, salt, ITERATIONS, 32, 'sha256')
    cipher = OpenSSL::Cipher::AES.new(256, :GCM)
    cipher.encrypt
    cipher.key = key
    cipher.iv = iv
    ct = cipher.update(plaintext) + cipher.final
    tag = cipher.auth_tag
    {
      'ciphertext' => (ct + tag).unpack1('H*'),
      'iv'         => iv.unpack1('H*'),
      'salt'       => salt.unpack1('H*'),
      'iterations' => ITERATIONS,
      # verify = PBKDF2 原始派生的 32 字节 hex
      # （JS 端 deriveBits(256) 拿到同样的 32 字节，转 hex 直接比对，两端天然一致）
      'verify'     => key.unpack1('H*')
    }
  end

  # 渲染密文注入容器 HTML（替代占位符）
  def render_container(enc)
    payload = {
      'ciphertext' => enc['ciphertext'],
      'iv'         => enc['iv'],
      'salt'       => enc['salt'],
      'iterations' => enc['iterations'],
      'verify'     => enc['verify']
    }
    <<~HTML
      <div class="encrypted-block">
        <script type="application/json" class="enc-payload">#{payload.to_json}</script>
      </div>
    HTML
  end
end

# 1) Liquid Block：捕获内容，先 markdown→HTML（kramdown），再用占位符包裹
#    注意：super 返回的是 markdown 原文（Liquid 只处理了 {% %} 标签），
#    必须用 kramdown 转成 HTML，否则浏览器解密后拿到的是 ## 这种裸 markdown
class EncryptedBlock < Liquid::Block
  def render(context)
    inner = super
    # markdown（含内嵌HTML）→ HTML，与 Jekyll 正文渲染一致
    html = Kramdown::Document.new(inner, input: 'GFM').to_html
    "#{EncryptContent::START_TOKEN}#{html}#{EncryptContent::END_TOKEN}"
  end
end
Liquid::Template.register_tag('encrypted', EncryptedBlock)

# 2) :post_render hook：把所有占位符加密并替换
#    同时清理 post.content（搜索索引 post-summary.html 读它），防止明文泄露到 search.json
Jekyll::Hooks.register :posts, :post_render do |post|
  next unless post.data['encrypted'] == true

  output = post.output
  next unless output.include?(EncryptContent::START_TOKEN)

  pwd = EncryptContent.fetch_password(post.site, post.data['password_ref'])

  new_output = output.gsub(EncryptContent::PLACEHOLDER_RE) do
    plaintext = Regexp.last_match(1)
    enc = EncryptContent.encrypt(plaintext, pwd)
    EncryptContent::render_container(enc)
  end
  post.output = new_output

  # post.content 同样含占位符（Liquid Block 输出的），清空为提示，
  # 避免 search.json / search 索引读到明文
  if post.content && post.content.include?(EncryptContent::START_TOKEN)
    post.content = post.content.gsub(EncryptContent::PLACEHOLDER_RE, '[此内容已加密，请输入密码查看]')
  end
end
