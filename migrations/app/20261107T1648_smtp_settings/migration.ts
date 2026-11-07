#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5f206f77d9f5d8ad9df5e71e498947e12c60d66e0c1580ed06e1039d5662e39a/contract';
import startContract from '../../snapshots/5f206f77d9f5d8ad9df5e71e498947e12c60d66e0c1580ed06e1039d5662e39a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e87018f296c27b23b5dfd7013a7753d46b05ef774ee2d7eed6470d96a9c2c165/contract';
import endContract from '../../snapshots/e87018f296c27b23b5dfd7013a7753d46b05ef774ee2d7eed6470d96a9c2c165/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
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
        table: 'appAdmin',
        columns: [col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } })],
        constraints: [primaryKey(['userId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'smtpSetting',
        columns: [
          col('encryptedPassword', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('from', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('host', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('port', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('secure', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('user', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('smtp_port_c9893d7c', sql`port >= 1 AND port <= 65535`),
        ],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'appAdmin',
        foreignKey: {
          name: 'appAdmin_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
