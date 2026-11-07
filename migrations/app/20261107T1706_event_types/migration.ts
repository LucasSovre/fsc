#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4308286df4b76832d315f2d1e638cdc4326067dddd7a5989ab685789270ad2b4/contract';
import endContract from '../../snapshots/4308286df4b76832d315f2d1e638cdc4326067dddd7a5989ab685789270ad2b4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e87018f296c27b23b5dfd7013a7753d46b05ef774ee2d7eed6470d96a9c2c165/contract';
import startContract from '../../snapshots/e87018f296c27b23b5dfd7013a7753d46b05ef774ee2d7eed6470d96a9c2c165/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
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
        table: 'eventAttachment',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mime', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('size', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'event',
        column: col('link', 'text', {
          notNull: true,
          default: lit(''),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'event',
        column: col('type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'event',
        constraint: 'event_type_223f83b0',
        expression: sql`type IS NULL OR type IN ('spectacle', 'sortie', 'vacances', 'visio', 'travail')`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'eventAttachment',
        index: 'eventAttachment_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'eventAttachment',
        foreignKey: {
          name: 'eventAttachment_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
