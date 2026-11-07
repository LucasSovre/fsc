#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/9b15e7881d1012622b44a08ca420813db4cb3bae590f6a2d02226cd40131ccd4/contract';
import startContract from '../../snapshots/9b15e7881d1012622b44a08ca420813db4cb3bae590f6a2d02226cd40131ccd4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c6a20dc2e3cbdefb15b9763580100fb6d391131563789f88bbacd9ad34323f1a/contract';
import endContract from '../../snapshots/c6a20dc2e3cbdefb15b9763580100fb6d391131563789f88bbacd9ad34323f1a/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
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
        table: 'eventReminderPreference',
        columns: [
          col('emailEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pushEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('reminderMinutes', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'event_reminder_preferences_03c72cbe',
            sql`mode IN ('off', 'custom') AND "reminderMinutes" >= 0 AND "reminderMinutes" <= 525600 AND (mode = 'off' OR "emailEnabled" OR "pushEnabled")`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'eventReminderPreference',
        constraint: 'eventReminderPreference_eventId_userId_key',
        columns: ['eventId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eventReminderPreference',
        index: 'eventReminderPreference_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'eventReminderPreference',
        index: 'eventReminderPreference_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'eventReminderPreference',
        foreignKey: {
          name: 'eventReminderPreference_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'eventReminderPreference',
        foreignKey: {
          name: 'eventReminderPreference_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
