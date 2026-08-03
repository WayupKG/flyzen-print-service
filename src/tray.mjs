import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { appDir } from './config.mjs';

/**
 * Показывает значок в области уведомлений. Рисует его PowerShell — Node в трей
 * не умеет, а System.Windows.Forms есть на любой Windows.
 *
 * Значок — вещь вспомогательная: любая неудача здесь не должна мешать печати,
 * поэтому ошибки только пишутся в журнал.
 */
export function startTray(port, log) {
  if (process.platform !== 'win32') return;

  const script = join(appDir(), 'tray.ps1');
  if (!existsSync(script)) {
    log('tray.ps1 рядом с программой не найден — работаем без значка');
    return;
  }

  try {
    const tray = spawn(
      'powershell',
      [
        '-NoProfile',
        // Скрипт лежит рядом с программой и не подписан: без Bypass политика
        // запуска скриптов не даст его выполнить.
        '-ExecutionPolicy',
        'Bypass',
        '-WindowStyle',
        'Hidden',
        '-File',
        script,
        '-Port',
        String(port),
        '-ServicePid',
        String(process.pid),
      ],
      { detached: true, stdio: 'ignore', windowsHide: true },
    );
    tray.on('error', (err) => log(`значок в трее не запустился: ${err.message}`));
    tray.unref();
  } catch (err) {
    log(`значок в трее не запустился: ${err.message}`);
  }
}
