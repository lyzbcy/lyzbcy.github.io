@echo off
setlocal
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "DEV_PORT=5174"

cd /d "%PROJECT_ROOT%"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js。
  echo 下载地址: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "%PROJECT_ROOT%\node_modules" (
  echo [安装] 正在安装依赖...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络连接。
    pause
    exit /b 1
  )
)

echo.
echo ========================================
echo   捞鱼的世界 — 3D Vite 开发服务器
echo ========================================
echo.
echo   端口: %DEV_PORT%
echo   项目目录: %PROJECT_ROOT%
echo.

start "world-3d-vite" cmd /c "cd /d "%PROJECT_ROOT%" && npx vite --port %DEV_PORT%"

echo [启动] Vite 开发服务器正在启动...

set "MAX_WAIT=15"
set "WAITED=0"

:wait_loop
if %WAITED% GEQ %MAX_WAIT% (
  echo [警告] 等待超时，尝试直接打开浏览器...
  goto :open_browser
)

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%DEV_PORT%/world/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  set /a WAITED+=1
  goto :wait_loop
)

echo [成功] 开发服务器已就绪

:open_browser
echo [浏览器] 打开 3D 世界: http://127.0.0.1:%DEV_PORT%/world/
start "" "http://127.0.0.1:%DEV_PORT%/world/"

echo.
echo 可访问页面:
echo   3D 世界首页:        http://127.0.0.1:%DEV_PORT%/world/
echo   Vite 资源入口:      http://127.0.0.1:%DEV_PORT%/world/index.html
echo   站点根路径（重定向）: http://127.0.0.1:%DEV_PORT%/
echo.
echo 关闭服务器请运行: world\zeen-tools\一键关闭前端.bat
echo.
pause