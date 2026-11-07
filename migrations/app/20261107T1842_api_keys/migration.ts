#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4308286df4b76832d315f2d1e638cdc4326067dddd7a5989ab685789270ad2b4/contract';
import startContract from '../../snapshots/4308286df4b76832d315f2d1e638cdc4326067dddd7a5989ab685789270ad2b4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c0ec9df83980f11d05bfe1c9338c25652dbaf72d0e635544bac0360502fec5a5/contract';
import endContract from '../../snapshots/c0ec9df83980f11d05bfe1c9338c25652dbaf72d0e635544bac0360502fec5a5/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'apiKey',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('keyHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastUsedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('prefix', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('scopes', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'apiKey_scopes_elem_not_null_de6fcc8e',
            sql`array_position("scopes", NULL) IS NULL`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'apiKey',
        constraint: 'apiKey_keyHash_key',
        columns: ['keyHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'apiKey',
        index: 'apiKey_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'apiKey',
        foreignKey: {
          name: 'apiKey_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
