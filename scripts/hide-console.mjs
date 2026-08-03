/**
 * Переключает собранный exe с консольной подсистемы на оконную, чтобы при запуске
 * не открывалось окно терминала: оператор закрывал его и оставался без печати.
 *
 * У Bun для этого есть `--windows-hide-console`, но он работает только при сборке
 * на самой Windows, а собираем мы кросс-компиляцией. Флаг делает ровно то же —
 * пишет 2 (GUI) вместо 3 (CONSOLE) в поле Subsystem заголовка PE.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const IMAGE_SUBSYSTEM_WINDOWS_GUI = 2;
const IMAGE_SUBSYSTEM_WINDOWS_CUI = 3;

const file = process.argv[2];
if (!file) {
  console.error('Использование: node scripts/hide-console.mjs <путь к exe>');
  process.exit(1);
}

const exe = readFileSync(file);

if (exe.toString('ascii', 0, 2) !== 'MZ') {
  throw new Error(`${file}: это не исполняемый файл Windows`);
}

const peOffset = exe.readUInt32LE(0x3c);
if (exe.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0') {
  throw new Error(`${file}: не найден заголовок PE`);
}

// Optional Header идёт после сигнатуры (4 байта) и COFF-заголовка (20 байт),
// поле Subsystem лежит в нём по смещению 68 — одинаково для PE32 и PE32+.
const subsystemAt = peOffset + 24 + 68;
const current = exe.readUInt16LE(subsystemAt);

if (current === IMAGE_SUBSYSTEM_WINDOWS_GUI) {
  console.log(`${file}: окно консоли уже отключено`);
  process.exit(0);
}

if (current !== IMAGE_SUBSYSTEM_WINDOWS_CUI) {
  throw new Error(`${file}: неожиданная подсистема ${current}, файл не тронут`);
}

exe.writeUInt16LE(IMAGE_SUBSYSTEM_WINDOWS_GUI, subsystemAt);
writeFileSync(file, exe);
console.log(`${file}: окно консоли отключено`);
