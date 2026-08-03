import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const VALUE_NAME = 'FlyzenPrintService';

/**
 * Автозапуск через ветку реестра Run текущего пользователя. Служба Windows была бы
 * надёжнее, но требует прав администратора — на складской машине их обычно нет,
 * а печатать нужно из сеанса пользователя, где виден его принтер.
 */
function commandLine() {
  return `"${process.execPath}"`;
}

export async function autostartEnabled() {
  if (process.platform !== 'win32') return false;
  try {
    await run('reg', ['query', RUN_KEY, '/v', VALUE_NAME]);
    return true;
  } catch {
    return false;
  }
}

export async function enableAutostart() {
  await run('reg', [
    'add',
    RUN_KEY,
    '/v',
    VALUE_NAME,
    '/t',
    'REG_SZ',
    '/d',
    commandLine(),
    '/f',
  ]);
}

export async function disableAutostart() {
  await run('reg', ['delete', RUN_KEY, '/v', VALUE_NAME, '/f']);
}
