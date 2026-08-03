import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { appDir } from './config.mjs';

const run = promisify(execFile);
const isWindows = process.platform === 'win32';

/**
 * Тихая печать PDF на Windows делается сторонним движком: системного способа
 * напечатать PDF без окна нет. Берём SumatraPDF — он умеет `-print-to … -silent`
 * и не требует установки, достаточно положить exe рядом.
 */
function findSumatra() {
  const candidates = [
    join(appDir(), 'SumatraPDF.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'SumatraPDF', 'SumatraPDF.exe'),
    join(process.env.PROGRAMFILES ?? '', 'SumatraPDF', 'SumatraPDF.exe'),
  ];
  return candidates.find((path) => path && existsSync(path)) ?? null;
}

/** Имена принтеров, видимых системе. */
export async function listPrinters() {
  if (isWindows) {
    const { stdout } = await run('powershell', [
      '-NoProfile',
      '-Command',
      'Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name',
    ]);
    return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }

  // Ветка для отладки на машине разработчика: в бою программа работает на Windows.
  const { stdout } = await run('lpstat', ['-a']);
  return stdout.split(/\r?\n/).map((line) => line.split(' ')[0]).filter(Boolean);
}

/** Печатает PDF на указанный принтер. Бросает ошибку с текстом для оператора. */
export async function printPdf(printerName, pdfBuffer) {
  const dir = await mkdtemp(join(tmpdir(), 'flyzen-label-'));
  const file = join(dir, 'label.pdf');
  await writeFile(file, pdfBuffer);

  try {
    if (isWindows) {
      const sumatra = findSumatra();
      if (!sumatra) {
        throw new Error(
          'SumatraPDF.exe не найден — положите его рядом с printservice.exe (см. README)',
        );
      }
      await run(sumatra, ['-print-to', printerName, '-silent', '-exit-when-done', file]);
    } else {
      await run('lp', ['-d', printerName, file]);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
