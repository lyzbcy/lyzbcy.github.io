# Jekyll 博客本地服务器一键启动脚本 (PowerShell)
# 编码: UTF-8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Jekyll 博客本地服务器一键启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 切换到脚本所在目录
Set-Location $PSScriptRoot

# 检查 bundle 是否安装
$bundleExists = Get-Command bundle -ErrorAction SilentlyContinue
if (-not $bundleExists) {
    Write-Host "[错误] 未找到 bundle 命令" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 Ruby 和 Bundler："
    Write-Host "1. 访问 https://rubyinstaller.org/downloads/"
    Write-Host "2. 下载并安装 Ruby+Devkit 版本"
    Write-Host "3. 运行: gem install bundler"
    Write-Host ""
    Read-Host "按 Enter 键退出"
    exit 1
}

# 检查 Gemfile.lock 是否存在，如果不存在则安装依赖
if (-not (Test-Path "Gemfile.lock")) {
    Write-Host "[提示] 首次运行，正在安装依赖..." -ForegroundColor Yellow
    Write-Host ""
    bundle install
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[错误] 依赖安装失败" -ForegroundColor Red
        Read-Host "按 Enter 键退出"
        exit 1
    }
    Write-Host ""
}

# 启动 Jekyll 服务器
Write-Host "[提示] 正在启动 Jekyll 服务器..." -ForegroundColor Green
Write-Host "[提示] 服务器地址: http://localhost:4000" -ForegroundColor Green
Write-Host "[提示] 按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 可选：自动打开浏览器（取消注释下面的行以启用）
# Start-Process "http://localhost:4000"

bundle exec jekyll s -l

Read-Host "`n按 Enter 键退出"

