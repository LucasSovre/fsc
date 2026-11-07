#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/800615cf587e466c52e1b6a297792bb630b5f575eec93bde5056eb8d0e815882/contract';
import endContract from '../../snapshots/800615cf587e466c52e1b6a297792bb630b5f575eec93bde5056eb8d0e815882/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c6a20dc2e3cbdefb15b9763580100fb6d391131563789f88bbacd9ad34323f1a/contract';
import startContract from '../../snapshots/c6a20dc2e3cbdefb15b9763580100fb6d391131563789f88bbacd9ad34323f1a/contract.json' with { type: 'json' };
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
        table: 'todo',
        columns: [
          col('calendarId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('completedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('creatorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('dueDate', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'todoDigest',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('day', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('retryAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('sentAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'todo_digest_state_da754800',
            sql`status IN ('pending', 'dispatching', 'sent', 'cancelled', 'failed', 'uncertain') AND attempts >= 1 AND attempts <= 4`,
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'profile',
        column: col('todoEmailEnabled', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'todoDigest',
        constraint: 'todoDigest_userId_day_key',
        columns: ['userId', 'day'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'todo',
        index: 'todo_calendarId_completedAt_dueDate_idx_e3d07be4',
        columns: ['calendarId', 'completedAt', 'dueDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'todo',
        index: 'todo_calendarId_idx_51abb0b3',
        columns: ['calendarId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'todo',
        index: 'todo_creatorId_idx_3a77d800',
        columns: ['creatorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'todoDigest',
        index: 'todoDigest_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'todo',
        foreignKey: {
          name: 'todo_calendarId_fkey',
          columns: ['calendarId'],
          references: { schema: 'public', table: 'calendar', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'todo',
        foreignKey: {
          name: 'todo_creatorId_fkey',
          columns: ['creatorId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'todoDigest',
        foreignKey: {
          name: 'todoDigest_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
