const crypto = require('crypto');
const express = require('express');
const { getPostgresPool, isPostgresConfigured } = require('../services/postgresClient');

const router = express.Router();

const INSERT_STATEMENTS = {
  rider: `
    INSERT INTO rider_prd.events (id, event_type, folder_name, event_ts, payload)
    VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
    ON CONFLICT (id) DO NOTHING
  `,
  driver: `
    INSERT INTO driver_prd.events (id, event_type, folder_name, event_ts, payload)
    VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
    ON CONFLICT (id) DO NOTHING
  `,
  admin: `
    INSERT INTO admin_prd.events (id, event_type, folder_name, event_ts, payload)
    VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
    ON CONFLICT (id) DO NOTHING
  `,
};

const FOLDER_SCOPE_RULES = [
  {
    scope: 'admin',
    test: folder =>
      /^(access_approval|admin_login|expansion_roadmap|market_research|new_state|onboarding_|regulatory_|role_permissions|rydinex_admin_|security_|state_launch|system_|tnp_|user_management|vehicle_eligibility)/i.test(
        folder
      ),
  },
  {
    scope: 'driver',
    test: folder =>
      /^(glide_kinetic|rydinex_driver_|rydinex_incident_|rydinex_report_|rydinex_support_|rydinex_rider_reservations_flow|rydinex_rider_selection$)/i.test(
        folder
      ),
  },
  {
    scope: 'rider',
    test: folder => /^(family_profile|live_teen|rider_profile|teen_|trip_tracking|rydinex_rider_)/i.test(folder),
  },
];

function toEventArray(body) {
  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body.events)) {
    return body.events;
  }

  return [body];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function coercePayload(rawEvent) {
  if (isPlainObject(rawEvent.payload)) {
    return rawEvent.payload;
  }

  if (isPlainObject(rawEvent.detail)) {
    return rawEvent.detail;
  }

  return {};
}

function coerceFolder(rawEvent, payload) {
  const folder = rawEvent.folder || rawEvent.screen || payload.folder || payload.screen;
  return typeof folder === 'string' ? folder.trim() : '';
}

function coerceTimestamp(rawValue) {
  const candidate = new Date(rawValue || Date.now());
  if (Number.isNaN(candidate.getTime())) {
    return new Date().toISOString();
  }

  return candidate.toISOString();
}

function inferScope(folder, explicitScope) {
  if (typeof explicitScope === 'string' && INSERT_STATEMENTS[explicitScope]) {
    return explicitScope;
  }

  const match = FOLDER_SCOPE_RULES.find(rule => rule.test(folder));
  return match ? match.scope : null;
}

function normalizeEvent(rawEvent) {
  if (!isPlainObject(rawEvent)) {
    return { error: 'Event payload must be an object.' };
  }

  const payload = coercePayload(rawEvent);
  const folder = coerceFolder(rawEvent, payload);

  if (!folder) {
    return { error: 'Event folder/screen is required.' };
  }

  const eventType = typeof rawEvent.type === 'string' ? rawEvent.type.trim() : '';
  if (!eventType) {
    return { error: 'Event type is required.' };
  }

  const scope = inferScope(folder, rawEvent.scope || payload.scope);
  if (!scope) {
    return { error: `Unable to infer PRD scope for folder: ${folder}` };
  }

  return {
    id:
      typeof rawEvent.id === 'string' && rawEvent.id.trim()
        ? rawEvent.id.trim()
        : crypto.randomUUID(),
    scope,
    eventType,
    folder,
    eventTs: coerceTimestamp(rawEvent.ts),
    payload,
  };
}

router.post('/', async (req, res, next) => {
  try {
    if (!isPostgresConfigured()) {
      return res.status(503).json({
        error: 'PostgreSQL is not configured.',
        required: ['DATABASE_URL or PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD'],
      });
    }

    const events = toEventArray(req.body).map(normalizeEvent);
    const invalidEvent = events.find(event => event.error);

    if (invalidEvent) {
      return res.status(400).json({ error: invalidEvent.error });
    }

    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      let inserted = 0;
      const scopes = { rider: 0, driver: 0, admin: 0 };

      await client.query('BEGIN');

      for (const event of events) {
        const result = await client.query(INSERT_STATEMENTS[event.scope], [
          event.id,
          event.eventType,
          event.folder,
          event.eventTs,
          JSON.stringify(event.payload),
        ]);

        inserted += result.rowCount;
        scopes[event.scope] += result.rowCount;
      }

      await client.query('COMMIT');

      return res.status(202).json({
        received: events.length,
        inserted,
        deduplicated: events.length - inserted,
        scopes,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;