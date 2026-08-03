import { createServer } from 'node:http';
import { listPrinters, printPdf } from './printer.mjs';

const VERSION = '1.0.2';

/** Последние задания: повтор после таймаута не должен печатать вторую этикетку. */
const finished = new Map();
const JOB_MEMORY = 200;

function remember(jobId, result) {
  finished.set(jobId, result);
  if (finished.size > JOB_MEMORY) finished.delete(finished.keys().next().value);
}

function send(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    // Панель открыта по https, сервис слушает http на localhost. Без этого заголовка
    // Chrome не пропускает PNA-preflight и запрос до сервиса просто не доходит.
    'Access-Control-Allow-Private-Network': 'true',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handlePrint(req, res, log, print) {
  const job = await readJson(req);
  const { jobId, printer, data } = job;

  if (!jobId || !printer || !data) {
    return send(res, 400, { status: 'error', error: 'нужны jobId, printer и data' });
  }

  if (finished.has(jobId)) {
    log(`повтор задания ${jobId} — печать пропущена`);
    return send(res, 200, finished.get(jobId));
  }

  try {
    await print(printer, Buffer.from(data, 'base64'));
    const result = { jobId, status: 'printed' };
    remember(jobId, result);
    log(`напечатано на «${printer}», задание ${jobId}`);
    send(res, 200, result);
  } catch (err) {
    log(`ошибка печати ${jobId}: ${err.message}`);
    send(res, 200, { jobId, status: 'error', error: err.message });
  }
}

/** `printers` и `print` подменяются в тестах — печатать по-настоящему они не должны. */
export function startServer({ port, log, printers = listPrinters, print = printPdf }) {
  const server = createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204, {});

      if (req.url === '/health' && req.method === 'GET') {
        // Список принтеров отдаём вместе со статусом: панели хватает одного запроса,
        // чтобы и связь проверить, и наполнить выбор принтера.
        const found = await printers().catch(() => []);
        return send(res, 200, { status: 'ok', version: VERSION, printers: found });
      }

      if (req.url === '/print' && req.method === 'POST') {
        return await handlePrint(req, res, log, print);
      }

      send(res, 404, { status: 'error', error: 'not found' });
    } catch (err) {
      log(`сбой запроса: ${err.message}`);
      send(res, 500, { status: 'error', error: err.message });
    }
  });

  // Окна у программы нет, поэтому повторный запуск (двойной клик по ярлыку,
  // ярлык поверх автозагрузки) обязан завершаться тихо: сервис уже работает.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log(`порт ${port} занят — PrintService уже запущен, второй экземпляр не нужен`);
      process.exit(0);
    }
    log(`не удалось занять порт ${port}: ${err.message}`);
    process.exit(1);
  });

  // Только localhost: печатать должна панель на этом же компьютере, открывать
  // сервис наружу незачем.
  server.listen(port, '127.0.0.1', () => log(`PrintService ${VERSION} на http://127.0.0.1:${port}`));
  return server;
}
