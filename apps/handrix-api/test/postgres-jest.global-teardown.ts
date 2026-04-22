import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

type TestDatabaseState = {
  containerName: string;
};

export default function globalTeardown() {
  const statePath = process.env.HANDRIX_TEST_DB_STATE_PATH?.trim();

  if (!statePath) {
    return;
  }

  let state: TestDatabaseState | null = null;

  try {
    state = JSON.parse(readFileSync(statePath, 'utf8')) as TestDatabaseState;
  } catch {
    return;
  }

  try {
    execFileSync('docker', ['rm', '-f', state.containerName]);
  } catch {
    // Ignore cleanup failures if the container was already removed.
  }
}
