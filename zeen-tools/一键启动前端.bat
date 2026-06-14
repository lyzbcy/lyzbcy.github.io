@echo off
setlocal
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"
set "LOCAL_PREVIEW_PORT=8091"
set "SERVER_SCRIPT=%PROJECT_ROOT%\local-preview-server.js"

cd /d "%PROJECT_ROOT%"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js。
  echo 下载地址: https://nodejs.org/
  pause
  exit /b 1
)

echo.
echo ========================================
echo   lyzbcy.github.io 本地预览
echo ========================================
echo.
echo   端口: %LOCAL_PREVIEW_PORT%
echo   根目录: %PROJECT_ROOT%
echo.

start "lyzbcy-local-preview" /min cmd /c "cd /d "%PROJECT_ROOT%" && set LOCAL_PREVIEW_PORT=%LOCAL_PREVIEW_PORT% && node "%SERVER_SCRIPT%""

echo [启动] 服务器正在启动...

set "MAX_WAIT=15"
set "WAITED=0"

:wait_loop
if %WAITED% GEQ %MAX_WAIT% (
  echo [警告] 等待超时，尝试直接打开浏览器...
  goto :open_browser
)

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%LOCAL_PREVIEW_PORT%/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  set /a WAITED+=1
  goto :wait_loop
)

echo [成功] 服务器已就绪

:open_browser
echo [浏览器] 打开导航页: http://127.0.0.1:%LOCAL_PREVIEW_PORT%/nav
start "" "http://127.0.0.1:%LOCAL_PREVIEW_PORT%/nav"

echo.
echo 可访问页面:
echo   导航页:  http://127.0.0.1:%LOCAL_PREVIEW_PORT%/nav
echo   首页:    http://127.0.0.1:%LOCAL_PREVIEW_PORT%/
echo   AR 体验: http://127.0.0.1:%LOCAL_PREVIEW_PORT%/ar/
echo   捏脸 AR: http://127.0.0.1:%LOCAL_PREVIEW_PORT%/ar/face-deform.html
echo   手势生花: http://127.0.0.1:%LOCAL_PREVIEW_PORT%/ar/hand-flower.html
echo   手势魔法: http://127.0.0.1:%LOCAL_PREVIEW_PORT%/ar/gesture-game.html
echo   健身教练: http://127.0.0.1:%LOCAL_PREVIEW_PORT%/ar/fitness-coach.html
echo.
echo 关闭服务器请运行: zeen-tools\一键关闭前端.bat
echo.
pause
