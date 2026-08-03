@echo off
chcp 65001 >nul

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v FlyzenPrintService /f >nul 2>&1
taskkill /IM printservice.exe /F >nul 2>&1

echo.
echo PrintService остановлен и убран из автозагрузки.
echo Запустить снова - install.bat в этой же папке.
echo.
pause
