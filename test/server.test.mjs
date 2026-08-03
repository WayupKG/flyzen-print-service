import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startServer } from '../src/server.mjs';

const PORT = 19199;
const base = `http://127.0.0.1:${PORT}`;
const printed = [];

let server;

before(async () => {
  server = startServer({
    port: PORT,
    log: () => {},
    printers: async () => ['Zebra ZD230', 'Xprinter XP-365B'],
    print: async (printer, buffer) => {
      if (printer === 'Broken') throw new Error('printer offline');
      printed.push({ printer, size: buffer.length });
    },
  });
  await new Promise((resolve) => server.once('listening', resolve));
});

after(() => server.close());

const job = { jobId: 'job-1', printer: 'Zebra ZD230', format: 'pdf', data: 'JVBERi0xLjQK' };

function print(body) {
  return fetch(`${base}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('health', () => {
  it('отдаёт версию и принтеры одним запросом', async () => {
    const res = await fetch(`${base}/health`);
    const body = await res.json();

    assert.equal(body.status, 'ok');
    assert.deepEqual(body.printers, ['Zebra ZD230', 'Xprinter XP-365B']);
    assert.equal(res.headers.get('access-control-allow-private-network'), 'true');
  });
});

describe('print', () => {
  it('печатает задание', async () => {
    const body = await print(job).then((r) => r.json());

    assert.deepEqual(body, { jobId: 'job-1', status: 'printed' });
    assert.equal(printed.length, 1);
  });

  it('не печатает повтор с тем же jobId', async () => {
    const body = await print(job).then((r) => r.json());

    assert.deepEqual(body, { jobId: 'job-1', status: 'printed' });
    assert.equal(printed.length, 1, 'дубль этикетки — худшее, что может сделать сервис');
  });

  it('отвечает ошибкой на неполное задание', async () => {
    const res = await print({ jobId: 'job-2' });

    assert.equal(res.status, 400);
    assert.equal((await res.json()).status, 'error');
  });

  // Ошибку печати не запоминаем: приёмщик должен иметь возможность повторить.
  it('кладёт ошибку принтера в тело ответа и позволяет повторить', async () => {
    const broken = { ...job, jobId: 'job-3', printer: 'Broken' };

    const first = await print(broken).then((r) => r.json());
    assert.equal(first.status, 'error');
    assert.equal(first.error, 'printer offline');

    const retry = await print({ ...broken, printer: 'Zebra ZD230' }).then((r) => r.json());
    assert.equal(retry.status, 'printed');
    assert.equal(printed.length, 2);
  });
});
