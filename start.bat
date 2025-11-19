@echo off
chcp 65001 >nul
echo ========================================
echo   Jekyll 博客本地服务器一键启动
echo ========================================
echo.

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 检查 bundle 是否安装
where bundle >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 bundle 命令
    echo.
    echo 请先安装 Ruby 和 Bundler：
    echo 1. 访问 https://rubyinstaller.org/downloads/
    echo 2. 下载并安装 Ruby+Devkit 版本
    echo 3. 运行: gem install bundler
    echo.
    pause
    exit /b 1
)

REM 检查 Gemfile.lock 是否存在，如果不存在则安装依赖
if not exist "Gemfile.lock" (
    echo [提示] 首次运行，正在安装依赖...
    echo.
    bundle install
    if %errorlevel% neq 0 (
        echo.
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

REM 启动 Jekyll 服务器
echo [提示] 正在启动 Jekyll 服务器...
echo [提示] 服务器地址: http://localhost:4000
echo [提示] 按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

bundle exec jekyll s -l

pause

