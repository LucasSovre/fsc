#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/37e5c8f0d65262c364067a164556bb44975a6a9cb3833bea79f593acb3d28de0/contract';
import startContract from '../../snapshots/37e5c8f0d65262c364067a164556bb44975a6a9cb3833bea79f593acb3d28de0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/5f206f77d9f5d8ad9df5e71e498947e12c60d66e0c1580ed06e1039d5662e39a/contract';
import endContract from '../../snapshots/5f206f77d9f5d8ad9df5e71e498947e12c60d66e0c1580ed06e1039d5662e39a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'travelDay',
        columns: [
          col('day', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'travelDay',
        constraint: 'travelDay_userId_day_key',
        columns: ['userId', 'day'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'travelDay',
        index: 'travelDay_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'travelDay',
        foreignKey: {
          name: 'travelDay_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
