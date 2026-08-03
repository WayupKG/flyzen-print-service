import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';

const DEFAULT_PORT = 19100;

/**
 * Папка, рядом с которой лежит программа: там ищутся `config.json`, лог и SumatraPDF.
 * У собранного exe это его каталог, при запуске из исходников — корень проекта.
 * Различаем по имени исполняемого файла: у сборки это printservice.exe, у запуска
 * из исходников — node или bun.
 */
export function appDir() {
  const exe = basename(process.execPath).toLowerCase();
  return exe.startsWith('printservice')
    ? dirname(process.execPath)
    : dirname(dirname(fileURLToPath(import.meta.url)));
}

/** Порт: аргумент командной строки → config.json рядом с программой → 19100. */
export function resolvePort(argv) {
  const flagIndex = argv.indexOf('--port');
  if (flagIndex !== -1) {
    const value = Number(argv[flagIndex + 1]);
    if (Number.isInteger(value) && value > 0) return value;
  }

  try {
    const file = readFileSync(join(appDir(), 'config.json'), 'utf8');
    const value = Number(JSON.parse(file).port);
    if (Number.isInteger(value) && value > 0) return value;
  } catch {
    // Файла нет или он битый — это норма, работаем на порту по умолчанию.
  }

  return DEFAULT_PORT;
}
