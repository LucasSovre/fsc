#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/37e5c8f0d65262c364067a164556bb44975a6a9cb3833bea79f593acb3d28de0/contract';
import startContract from '../../snapshots/37e5c8f0d65262c364067a164556bb44975a6a9cb3833bea79f593acb3d28de0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a0747993480de4ec251e16294c62603d14fdc914fad54aebed08d62ada953156/contract';
import endContract from '../../snapshots/a0747993480de4ec251e16294c62603d14fdc914fad54aebed08d62ada953156/contract.json' with { type: 'json' };
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
