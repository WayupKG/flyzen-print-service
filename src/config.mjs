import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DEFAULT_PORT = 19100;

/**
 * Папка, рядом с которой лежит программа. У собранного exe это его каталог,
 * при запуске из исходников — корень проекта.
 */
export function appDir() {
  return process.pkg || process.isBun
    ? dirname(process.execPath)
    : dirname(dirname(new URL(import.meta.url).pathname));
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
