@echo off
chcp 65001 >nul
echo [关闭] 正在停止本地预览服务...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$processes = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*local-preview-server.js*' }; if (-not $processes) { Write-Host '[信息] 未找到正在运行的本地预览服务。'; exit 0 }; $processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host ('[成功] 已停止本地预览服务，PID: ' + $_.ProcessId) }"

echo [完成] 前端预览服务已关闭。
pause
