@echo off
set server_pid=0
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq python.exe" /fo table /nh') do set server_pid=%%a
if not %server_pid%==0 (
    echo 发现已存在的Python进程，可能正在运行
    taskkill /f /im python.exe 2>nul
)

rem 在后台启动服务器
start /B python -m http.server 8080
timeout /t 1 /nobreak > nul
start http://localhost:8080
echo 服务器已启动，按任意键停止...

rem 这里可以记录PID，但批处理管理后台进程较复杂
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq python.exe" /fo table /nh') do set new_pid=%%a
if not %new_pid%==%server_pid% (
    echo 服务器进程ID: %new_pid%
    echo 要停止服务器，可以按Ctrl+Alt+Delete，在任务管理器中结束python.exe
)
pause