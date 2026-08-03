# Значок PrintService в области уведомлений.
#
# Сама программа собрана без окна, поэтому понять, работает ли она, оператору было
# нечем. Значок решает это: видно, что сервис жив, и из меню можно открыть журнал
# или остановить его, не заходя в диспетчер задач.
#
# Отдельный скрипт, а не часть программы: Node не умеет рисовать в трее, а PowerShell
# берёт для этого готовый NotifyIcon из System.Windows.Forms. Значок необязателен —
# если запуск не удался, печать продолжает работать.

param([int]$Port = 19100, [int]$ServicePid = 0)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:ServicePid = $ServicePid
$exePath = Join-Path $PSScriptRoot 'printservice.exe'
$script:LogPath = Join-Path $PSScriptRoot 'printservice.log'
$script:HealthUrl = "http://127.0.0.1:$Port/health"

$icon = $null
if (Test-Path $exePath) {
  try { $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath) } catch { $icon = $null }
}
if ($null -eq $icon) { $icon = [System.Drawing.SystemIcons]::Information }

$script:Notify = New-Object System.Windows.Forms.NotifyIcon
$script:Notify.Icon = $icon
$script:Notify.Text = "Flyzen PrintService — порт $Port"
$script:Notify.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$itemLog = $menu.Items.Add('Журнал печати')
$itemLog.add_Click({
  if (Test-Path $script:LogPath) { Start-Process notepad.exe $script:LogPath }
})

$itemHealth = $menu.Items.Add('Проверить связь')
$itemHealth.add_Click({ Start-Process $script:HealthUrl })

$menu.Items.Add('-') | Out-Null

$itemStop = $menu.Items.Add('Остановить PrintService')
$itemStop.add_Click({
  if ($script:ServicePid -gt 0) {
    Stop-Process -Id $script:ServicePid -Force -ErrorAction SilentlyContinue
  }
  $script:Notify.Visible = $false
  [System.Windows.Forms.Application]::Exit()
})

$script:Notify.ContextMenuStrip = $menu

# Двойной клик по значку — самый ожидаемый жест: показываем журнал.
$script:Notify.add_DoubleClick({
  if (Test-Path $script:LogPath) { Start-Process notepad.exe $script:LogPath }
})

# Значок живёт ровно столько, сколько сам сервис: если программу остановили
# через uninstall.bat или диспетчер задач, висящая иконка только путала бы.
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.add_Tick({
  if ($script:ServicePid -gt 0) {
    $alive = Get-Process -Id $script:ServicePid -ErrorAction SilentlyContinue
    if ($null -eq $alive) {
      $script:Notify.Visible = $false
      [System.Windows.Forms.Application]::Exit()
    }
  }
})
$timer.Start()

[System.Windows.Forms.Application]::Run()

$script:Notify.Visible = $false
$script:Notify.Dispose()
