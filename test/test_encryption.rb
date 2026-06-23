require 'minitest/autorun'
require 'openssl'

# 复制插件里的加密逻辑做隔离测试（与 _plugins/encrypt-content.rb 的 EncryptContent.encrypt 保持一致）
def encrypt(plaintext, pwd, iterations = 300_000)
  salt = OpenSSL::Random.random_bytes(16)
  iv   = OpenSSL::Random.random_bytes(12)
  key  = OpenSSL::PKCS5.pbkdf2_hmac(pwd, salt, iterations, 32, 'sha256')
  cipher = OpenSSL::Cipher::AES.new(256, :GCM)
  cipher.encrypt
  cipher.key = key
  cipher.iv = iv
  ct = cipher.update(plaintext) + cipher.final
  tag = cipher.auth_tag
  verify = key.unpack1('H*')  # PBKDF2 原始 32 字节 hex（与插件一致）
  { ciphertext: (ct + tag).unpack1('H*'), iv: iv.unpack1('H*'),
    salt: salt.unpack1('H*'), iterations: iterations, verify: verify }
end

class TestEncryption < Minitest::Test
  def test_encrypt_produces_all_fields
    r = encrypt('hello', 'pass')
    %w[ciphertext iv salt iterations verify].each { |k| refute_nil r[k.to_sym] }
    assert_equal 300_000, r[:iterations]
    assert_equal 64, r[:verify].length   # PBKDF2 32 字节 = 64 hex chars
    assert_equal 32, r[:salt].length     # 16 bytes = 32 hex chars
    assert_equal 24, r[:iv].length       # 12 bytes = 24 hex chars
  end

  def test_ciphertext_includes_tag_16_bytes
    r = encrypt('x', 'p')
    # ciphertext_hex_length = (plaintext_len + 16_tag) * 2
    assert_equal ('x'.bytesize + 16) * 2, r[:ciphertext].length
  end
end
