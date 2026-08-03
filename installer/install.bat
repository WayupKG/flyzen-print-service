@echo off
chcp 65001 >nul
set "DIR=%~dp0"

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v FlyzenPrintService /t REG_SZ /d "\"%DIR%printservice.exe\"" /f >nul
if errorlevel 1 (
  echo Не удалось прописать автозагрузку. Запустите файл от своего пользователя, не от имени администратора.
  pause
  exit /b 1
)

start "" "%DIR%printservice.exe"

echo.
echo PrintService запущен и будет включаться сам при входе в систему.
echo Своего окна у программы нет - она работает в фоне, закрывать нечего.
echo.
echo Дальше в панели Flyzen: меню под аватаром - Настройки печати.
echo Адрес 127.0.0.1, порт 19100, затем Проверить подключение и выбрать принтер.
echo.
pause
