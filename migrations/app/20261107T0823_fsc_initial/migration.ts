#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9b15e7881d1012622b44a08ca420813db4cb3bae590f6a2d02226cd40131ccd4/contract';
import endContract from '../../snapshots/9b15e7881d1012622b44a08ca420813db4cb3bae590f6a2d02226cd40131ccd4/contract.json' with { type: 'json' };
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

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'account',
        columns: [
          col('accessToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('accessTokenExpiresAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('accountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('idToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('providerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('refreshToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refreshTokenExpiresAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('scope', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'calendar',
        columns: [
          col('catalogId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'calendar_kind_7dbce26e',
            sql`kind IN ('solo', 'common') AND ((kind = 'solo' AND "ownerId" IS NOT NULL) OR (kind = 'common' AND "ownerId" IS NULL))`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'catalog',
        columns: [col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } })],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'delivery',
        columns: [
          col('destination', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reminderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'event',
        columns: [
          col('allDay', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('calendarId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('creatorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('endDate', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endsAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('location', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('startDate', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startsAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('tags', 'text[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('timeZone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'event_dates_2200af96',
            sql`( "allDay" AND "startDate" IS NOT NULL AND "endDate" > "startDate" AND "startsAt" IS NULL AND "endsAt" IS NULL ) OR (NOT "allDay" AND "startsAt" IS NOT NULL AND "endsAt" > "startsAt" AND "startDate" IS NULL AND "endDate" IS NULL)`,
          ),
          checkExpression(
            'event_tags_elem_not_null_aecbe9e2',
            sql`array_position("tags", NULL) IS NULL`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'feed',
        columns: [
          col('calendarId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'invitation',
        columns: [
          col('calendarId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('inviterId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('revokedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'member',
        columns: [
          col('calendarId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['userId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauthAccessToken',
        columns: [
          col('authorizationCodeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('confirmation', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('referenceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refreshId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedUserInfoClaims', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resources', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('revoked', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('scopes', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauthClient',
        columns: [
          col('applicationType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('backchannelLogoutSessionRequired', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('backchannelLogoutUri', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientCredentialsScopes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientDiscoveryId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('clientSecret', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contacts', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('disabled', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('dpopBoundAccessTokens', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('enableEndSession', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('grantTypes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('icon', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('jwks', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('jwksUri', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('policy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('postLogoutRedirectUris', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('redirectUris', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('referenceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requirePKCE', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('responseTypes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scopes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('skipConsent', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('softwareId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('softwareStatement', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('softwareVersion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('subjectType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tokenEndpointAuthMethod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tos', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('uri', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauthClientAssertion',
        columns: [
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauthClientResource',
        columns: [
          col('clientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('resourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauthConsent',
        columns: [
          col('clientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('referenceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedUserInfoClaims', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resources', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scopes', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauthRefreshToken',
        columns: [
          col('authTime', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('authorizationCodeId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('confirmation', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('referenceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedUserInfoClaims', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resources', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('revoked', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('rotatedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('rotationReplayExpiresAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('rotationReplayResponse', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scopes', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sessionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauthResource',
        columns: [
          col('accessTokenTtl', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('allowedScopes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('customClaims', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('disabled', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('dpopBoundAccessTokensRequired', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('identifier', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('policyVersion', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('refreshTokenTtl', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('signingAlgorithm', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('signingKeyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'profile',
        columns: [
          col('calendarId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('catalogId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emailEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
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
          col('reminderMode', 'text', {
            notNull: true,
            default: lit('all'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('selectedTags', 'text[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('timeZone', 'text', {
            notNull: true,
            default: lit('Europe/Paris'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['userId']),
          checkExpression(
            'profile_preferences_192e78c4',
            sql`"reminderMinutes" >= 0 AND "reminderMinutes" <= 525600 AND "reminderMode" IN ('all', 'tags')`,
          ),
          checkExpression(
            'profile_selectedTags_elem_not_null_67ca80ed',
            sql`array_position("selectedTags", NULL) IS NULL`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'pushSubscription',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('endpoint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('subscription', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'rateLimit',
        columns: [
          col('count', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastRequest', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'reminder',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('channel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('dueAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('referenceAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('sentAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'reminder_state_bfd8900a',
            sql`channel IN ('email', 'push') AND status IN ('pending', 'dispatching', 'sent', 'cancelled', 'uncertain', 'failed')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'session',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ipAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tag',
        columns: [
          col('catalogId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emailVerified', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'verification',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('identifier', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'workerHeartbeat',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'calendar',
        constraint: 'calendar_ownerId_key',
        columns: ['ownerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'delivery',
        constraint: 'delivery_reminderId_destination_key',
        columns: ['reminderId', 'destination'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'feed',
        constraint: 'feed_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'feed',
        constraint: 'feed_userId_calendarId_key',
        columns: ['userId', 'calendarId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'invitation',
        constraint: 'invitation_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'oauthAccessToken',
        constraint: 'oauthAccessToken_token_key',
        columns: ['token'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'oauthClient',
        constraint: 'oauthClient_clientId_key',
        columns: ['clientId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'oauthClientResource',
        constraint: 'oauthClientResource_clientId_resourceId_key',
        columns: ['clientId', 'resourceId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'oauthRefreshToken',
        constraint: 'oauthRefreshToken_token_key',
        columns: ['token'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'oauthResource',
        constraint: 'oauthResource_identifier_key',
        columns: ['identifier'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'profile',
        constraint: 'profile_calendarId_key',
        columns: ['calendarId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'pushSubscription',
        constraint: 'pushSubscription_endpoint_key',
        columns: ['endpoint'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'rateLimit',
        constraint: 'rateLimit_key_key',
        columns: ['key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'reminder',
        constraint: 'reminder_eventId_userId_channel_key',
        columns: ['eventId', 'userId', 'channel'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'session',
        constraint: 'session_token_key',
        columns: ['token'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tag',
        constraint: 'tag_catalogId_key_key',
        columns: ['catalogId', 'key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'account',
        index: 'account_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'calendar',
        index: 'calendar_catalogId_idx_f0d71193',
        columns: ['catalogId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'delivery',
        index: 'delivery_reminderId_idx_273293f9',
        columns: ['reminderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_calendarId_idx_51abb0b3',
        columns: ['calendarId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_calendarId_startDate_idx_b0e0c5f1',
        columns: ['calendarId', 'startDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_calendarId_startsAt_idx_3e8a48ff',
        columns: ['calendarId', 'startsAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'event',
        index: 'event_creatorId_idx_3a77d800',
        columns: ['creatorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'feed',
        index: 'feed_calendarId_idx_51abb0b3',
        columns: ['calendarId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'feed',
        index: 'feed_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invitation',
        index: 'invitation_calendarId_idx_51abb0b3',
        columns: ['calendarId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'invitation',
        index: 'invitation_inviterId_idx_c2d8c6d6',
        columns: ['inviterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'member',
        index: 'member_calendarId_idx_51abb0b3',
        columns: ['calendarId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthAccessToken',
        index: 'oauthAccessToken_authorizationCodeId_idx_9f43c228',
        columns: ['authorizationCodeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthAccessToken',
        index: 'oauthAccessToken_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthAccessToken',
        index: 'oauthAccessToken_refreshId_idx_baab7735',
        columns: ['refreshId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthAccessToken',
        index: 'oauthAccessToken_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthAccessToken',
        index: 'oauthAccessToken_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthClient',
        index: 'oauthClient_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthClientResource',
        index: 'oauthClientResource_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthClientResource',
        index: 'oauthClientResource_resourceId_idx_72964925',
        columns: ['resourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthConsent',
        index: 'oauthConsent_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthConsent',
        index: 'oauthConsent_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthRefreshToken',
        index: 'oauthRefreshToken_authorizationCodeId_idx_9f43c228',
        columns: ['authorizationCodeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthRefreshToken',
        index: 'oauthRefreshToken_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthRefreshToken',
        index: 'oauthRefreshToken_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauthRefreshToken',
        index: 'oauthRefreshToken_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'profile',
        index: 'profile_catalogId_idx_f0d71193',
        columns: ['catalogId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pushSubscription',
        index: 'pushSubscription_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reminder',
        index: 'reminder_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reminder',
        index: 'reminder_status_dueAt_idx_0bd78a2c',
        columns: ['status', 'dueAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reminder',
        index: 'reminder_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'session',
        index: 'session_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tag',
        index: 'tag_catalogId_idx_f0d71193',
        columns: ['catalogId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'verification',
        index: 'verification_identifier_idx_79a0dbb3',
        columns: ['identifier'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'account',
        foreignKey: {
          name: 'account_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'calendar',
        foreignKey: {
          name: 'calendar_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'calendar',
        foreignKey: {
          name: 'calendar_catalogId_fkey',
          columns: ['catalogId'],
          references: { schema: 'public', table: 'catalog', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'delivery',
        foreignKey: {
          name: 'delivery_reminderId_fkey',
          columns: ['reminderId'],
          references: { schema: 'public', table: 'reminder', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'event',
        foreignKey: {
          name: 'event_calendarId_fkey',
          columns: ['calendarId'],
          references: { schema: 'public', table: 'calendar', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'event',
        foreignKey: {
          name: 'event_creatorId_fkey',
          columns: ['creatorId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'feed',
        foreignKey: {
          name: 'feed_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'feed',
        foreignKey: {
          name: 'feed_calendarId_fkey',
          columns: ['calendarId'],
          references: { schema: 'public', table: 'calendar', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invitation',
        foreignKey: {
          name: 'invitation_calendarId_fkey',
          columns: ['calendarId'],
          references: { schema: 'public', table: 'calendar', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'invitation',
        foreignKey: {
          name: 'invitation_inviterId_fkey',
          columns: ['inviterId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'member',
        foreignKey: {
          name: 'member_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'member',
        foreignKey: {
          name: 'member_calendarId_fkey',
          columns: ['calendarId'],
          references: { schema: 'public', table: 'calendar', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthAccessToken',
        foreignKey: {
          name: 'oauthAccessToken_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'oauthClient', columns: ['clientId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthAccessToken',
        foreignKey: {
          name: 'oauthAccessToken_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'session', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthAccessToken',
        foreignKey: {
          name: 'oauthAccessToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthAccessToken',
        foreignKey: {
          name: 'oauthAccessToken_refreshId_fkey',
          columns: ['refreshId'],
          references: { schema: 'public', table: 'oauthRefreshToken', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthClient',
        foreignKey: {
          name: 'oauthClient_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthClientResource',
        foreignKey: {
          name: 'oauthClientResource_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'oauthClient', columns: ['clientId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthClientResource',
        foreignKey: {
          name: 'oauthClientResource_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'oauthResource', columns: ['identifier'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthConsent',
        foreignKey: {
          name: 'oauthConsent_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'oauthClient', columns: ['clientId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthConsent',
        foreignKey: {
          name: 'oauthConsent_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthRefreshToken',
        foreignKey: {
          name: 'oauthRefreshToken_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'oauthClient', columns: ['clientId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthRefreshToken',
        foreignKey: {
          name: 'oauthRefreshToken_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'session', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauthRefreshToken',
        foreignKey: {
          name: 'oauthRefreshToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'profile',
        foreignKey: {
          name: 'profile_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'profile',
        foreignKey: {
          name: 'profile_calendarId_fkey',
          columns: ['calendarId'],
          references: { schema: 'public', table: 'calendar', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'profile',
        foreignKey: {
          name: 'profile_catalogId_fkey',
          columns: ['catalogId'],
          references: { schema: 'public', table: 'catalog', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'pushSubscription',
        foreignKey: {
          name: 'pushSubscription_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reminder',
        foreignKey: {
          name: 'reminder_eventId_fkey',
          columns: ['eventId'],
          references: { schema: 'public', table: 'event', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reminder',
        foreignKey: {
          name: 'reminder_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'session',
        foreignKey: {
          name: 'session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tag',
        foreignKey: {
          name: 'tag_catalogId_fkey',
          columns: ['catalogId'],
          references: { schema: 'public', table: 'catalog', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
