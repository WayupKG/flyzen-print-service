import { createInterface } from 'node:readline/promises';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { appDir, resolvePort } from './config.mjs';
import { autostartEnabled, disableAutostart, enableAutostart } from './autostart.mjs';
import { startServer } from './server.mjs';

const argv = process.argv.slice(2);

function log(message) {
  const line = `${new Date().toISOString()} ${message}`;
  console.log(line);
  try {
    appendFileSync(join(appDir(), 'printservice.log'), `${line}\n`);
  } catch {
    // Права на запись рядом с программой есть не всегда — в консоли сообщение уже есть.
  }
}

async function autostartCommand(action) {
  if (process.platform !== 'win32') {
    console.log('Автозагрузка настраивается только на Windows.');
    return;
  }
  if (action === 'on') {
    await enableAutostart();
    console.log('PrintService будет запускаться при входе в систему.');
    return;
  }
  if (action === 'off') {
    await disableAutostart();
    console.log('PrintService убран из автозагрузки.');
    return;
  }
  console.log(
    (await autostartEnabled())
      ? 'PrintService в автозагрузке.'
      : 'PrintService не в автозагрузке. Добавить: printservice autostart on',
  );
}

/**
 * При первом запуске предлагаем добавиться в автозагрузку: иначе после перезагрузки
 * компьютера приёмщик молча остаётся без печати и узнаёт об этом на первой посылке.
 * Спрашиваем только в интерактивной консоли — запуск из автозагрузки ничего не спросит.
 */
async function offerAutostart() {
  if (process.platform !== 'win32' || !process.stdin.isTTY) return;
  if (await autostartEnabled()) return;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('Запускать PrintService при включении компьютера? [Y/n] ');
    if (answer.trim().toLowerCase().startsWith('n')) {
      console.log('Хорошо. Позже это можно сделать командой: printservice autostart on');
      return;
    }
    await enableAutostart();
    console.log('Готово — программа будет запускаться сама.');
  } catch (err) {
    console.log(`Не удалось настроить автозагрузку: ${err.message}`);
  } finally {
    rl.close();
  }
}

if (argv[0] === 'autostart') {
  await autostartCommand(argv[1]);
} else if (argv[0] === 'help' || argv[0] === '--help') {
  console.log(
    [
      'PrintService — печать этикеток Flyzen без диалога браузера.',
      '',
      '  printservice                  запустить (порт из config.json или 19100)',
      '  printservice --port 19100     запустить на другом порту',
      '  printservice autostart        показать, стоит ли в автозагрузке',
      '  printservice autostart on     добавить в автозагрузку',
      '  printservice autostart off    убрать из автозагрузки',
    ].join('\n'),
  );
} else {
  await offerAutostart();
  startServer({ port: resolvePort(argv), log });
}
