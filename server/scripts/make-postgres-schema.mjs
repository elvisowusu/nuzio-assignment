import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Production runs on Postgres; local development runs on SQLite so the project
 * starts with zero setup. Prisma cannot take its provider from an env var, so
 * rather than maintain two schemas that drift, the Postgres one is generated
 * from the SQLite one at build time.
 */
const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'prisma', 'schema.prisma');
const target = path.join(root, 'prisma', 'schema.prod.prisma');

const schema = readFileSync(source, 'utf8');

if (!schema.includes('provider = "sqlite"')) {
  throw new Error('Expected the source schema to declare the sqlite provider.');
}

const generated = schema
  .replace('provider = "sqlite"', 'provider = "postgresql"')
  .replace(
    '// Nuzio - personalised morning audio news',
    '// GENERATED FILE - do not edit. Produced from schema.prisma by\n' +
      '// scripts/make-postgres-schema.mjs. Edit the source schema instead.\n' +
      '// Nuzio - personalised morning audio news',
  );

writeFileSync(target, generated);
console.log(`wrote ${path.relative(root, target)} (postgresql)`);
