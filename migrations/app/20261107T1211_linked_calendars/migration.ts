#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/37e5c8f0d65262c364067a164556bb44975a6a9cb3833bea79f593acb3d28de0/contract';
import endContract from '../../snapshots/37e5c8f0d65262c364067a164556bb44975a6a9cb3833bea79f593acb3d28de0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/800615cf587e466c52e1b6a297792bb630b5f575eec93bde5056eb8d0e815882/contract';
import startContract from '../../snapshots/800615cf587e466c52e1b6a297792bb630b5f575eec93bde5056eb8d0e815882/contract.json' with { type: 'json' };
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
        table: 'linkedCalendar',
        columns: [
          col('calendarId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('encryptedUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('lastSyncedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nextSyncAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('syncToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('urlHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'event',
        column: col('linkedCalendarId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'event',
        column: col('sourceKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'event',
        constraint: 'event_source_b5d5c4ba',
        expression: sql`("linkedCalendarId" IS NULL) = ("sourceKey" IS NULL)`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'event',
        constraint: 'event_linkedCalendarId_sourceKey_key',
        columns: ['linkedCalendarId', 'sourceKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'linkedCalendar',
        constraint: 'linkedCalendar_calendarId_urlHash_key',
        columns: ['calendarId', 'urlHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_linkedCalendarId_idx_d2d25352',
        columns: ['linkedCalendarId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'linkedCalendar',
        index: 'linkedCalendar_calendarId_idx_51abb0b3',
        columns: ['calendarId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'linkedCalendar',
        index: 'linkedCalendar_enabled_nextSyncAt_idx_c3a0d29c',
        columns: ['enabled', 'nextSyncAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'linkedCalendar',
        index: 'linkedCalendar_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'linkedCalendar',
        foreignKey: {
          name: 'linkedCalendar_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'linkedCalendar',
        foreignKey: {
          name: 'linkedCalendar_calendarId_fkey',
          columns: ['calendarId'],
          references: { schema: 'public', table: 'calendar', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'event',
        foreignKey: {
          name: 'event_linkedCalendarId_fkey',
          columns: ['linkedCalendarId'],
          references: { schema: 'public', table: 'linkedCalendar', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
