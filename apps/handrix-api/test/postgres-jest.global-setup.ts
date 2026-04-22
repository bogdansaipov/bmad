import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

type TestDatabaseState = {
  containerName: string;
  databaseUrl: string;
};

function getStateFilePath() {
  if (process.env.HANDRIX_TEST_DB_STATE_PATH?.trim()) {
    return process.env.HANDRIX_TEST_DB_STATE_PATH;
  }

  const directory = mkdtempSync(join(tmpdir(), 'handrix-test-db-'));
  const statePath = join(directory, 'state.json');
  process.env.HANDRIX_TEST_DB_STATE_PATH = statePath;
  return statePath;
}

function waitForDatabase(containerName: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      execFileSync('docker', [
        'exec',
        containerName,
        'pg_isready',
        '-U',
        'handrix',
        '-d',
        'handrix_test',
      ]);
      return;
    } catch (error) {
      if (attempt === 29) {
        throw error;
      }

      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
  }
}

export default function globalSetup() {
  if (process.env.HANDRIX_DATABASE_URL?.trim()) {
    return;
  }

  const containerName = `handrix-test-postgres-${process.pid}`;
  execFileSync('docker', [
    'run',
    '--rm',
    '-d',
    '--name',
    containerName,
    '-e',
    'POSTGRES_USER=handrix',
    '-e',
    'POSTGRES_PASSWORD=handrix',
    '-e',
    'POSTGRES_DB=handrix_test',
    '-p',
    '127.0.0.1::5432',
    'postgres:17-alpine',
  ]);

  waitForDatabase(containerName);

  const portOutput = execFileSync('docker', [
    'port',
    containerName,
    '5432/tcp',
  ]).toString();
  const port = portOutput.trim().split(':').at(-1);

  if (!port) {
    throw new Error('Failed to determine the mapped PostgreSQL port.');
  }

  const databaseUrl = `postgresql://handrix:handrix@127.0.0.1:${port}/handrix_test?schema=public`;
  process.env.HANDRIX_DATABASE_URL = databaseUrl;

  const state: TestDatabaseState = {
    containerName,
    databaseUrl,
  };

  writeFileSync(getStateFilePath(), JSON.stringify(state), 'utf8');
}
