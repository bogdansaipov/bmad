import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { RequestStoreService } from '../../src/modules/requests/request-store.service';

function getRepoRoot() {
  return resolve(__dirname, '../../../..');
}

function getBaseDatabaseUrl() {
  const databaseUrl = process.env.HANDRIX_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      'HANDRIX_DATABASE_URL must be available before running Postgres-backed tests.',
    );
  }

  return databaseUrl;
}

function withSchema(databaseUrl: string, schemaName: string) {
  const parsedUrl = new URL(databaseUrl);
  parsedUrl.searchParams.set('schema', schemaName);
  return parsedUrl.toString();
}

function getMigrationStatements() {
  const migrationsDirectory = resolve(
    getRepoRoot(),
    'apps/handrix-api/prisma/migrations',
  );
  const migrationDirectories = readdirSync(migrationsDirectory, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return migrationDirectories.flatMap((directory) =>
    readFileSync(
      resolve(migrationsDirectory, directory, 'migration.sql'),
      'utf8',
    )
      .split(/;\s*\n/)
      .map((statement) => statement.trim())
      .filter(Boolean)
      .filter(
        (statement) =>
          !statement.includes('CREATE SCHEMA IF NOT EXISTS "public"'),
      ),
  );
}

export async function createIsolatedDatabase(label: string) {
  const baseDatabaseUrl = getBaseDatabaseUrl();
  const schemaHash = createHash('sha256')
    .update(label)
    .digest('hex')
    .slice(0, 12);
  const schemaName = `test_${schemaHash}`;
  const databaseUrl = withSchema(baseDatabaseUrl, schemaName);
  const adminClient = new PrismaClient({
    datasources: {
      db: {
        url: baseDatabaseUrl,
      },
    },
  });
  const schemaClient = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  await adminClient.$connect();
  await adminClient.$executeRawUnsafe(
    `CREATE SCHEMA IF NOT EXISTS "${schemaName}"`,
  );
  await schemaClient.$connect();

  try {
    for (const statement of getMigrationStatements()) {
      await schemaClient.$executeRawUnsafe(statement);
    }
  } finally {
    await schemaClient.$disconnect();
    await adminClient.$disconnect();
  }

  return {
    baseDatabaseUrl,
    databaseUrl,
    schemaName,
    async cleanup() {
      const adminClient = new PrismaClient({
        datasources: {
          db: {
            url: baseDatabaseUrl,
          },
        },
      });

      try {
        await adminClient.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`,
        );
      } finally {
        await adminClient.$disconnect();
      }
    },
  };
}

export async function createRequestStoreTestHarness(label: string) {
  const isolatedDatabase = await createIsolatedDatabase(label);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: isolatedDatabase.databaseUrl,
      },
    },
  });
  await prisma.$connect();

  return {
    store: new RequestStoreService(prisma as never),
    databaseUrl: isolatedDatabase.databaseUrl,
    async cleanup() {
      await prisma.$disconnect();
      await isolatedDatabase.cleanup();
    },
  };
}
