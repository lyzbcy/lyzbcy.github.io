@echo off
chcp 65001 >nul
echo [关闭] 正在停止 3D 世界开发服务器...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$processes = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*vite*--port 5174*' }; if (-not $processes) { Write-Host '[信息] 未找到正在运行的 Vite 开发服务器（端口 5174）。'; exit 0 }; $processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host ('[成功] 已停止 Vite 开发服务器，PID: ' + $_.ProcessId) }"

echo [完成] 3D 世界开发服务器已关闭。
pause