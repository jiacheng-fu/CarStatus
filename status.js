import 'dotenv/config';
import { loadConnection } from './tokens.js';

// --- One reading of the car: everything index.js prints ---
//
// Smartcar API v3 over plain HTTP. The `smartcar` npm SDK and the v2.0 API this
// project started on are deprecated on 2026-12-01, and new Smartcar apps only get
// v3 ("M2M") credentials, so:
//   1. an application token from iam.smartcar.com (client credentials, 1 h),
//   2. the vehicle connected to our user, from /v3/connections,
//   3. each signal by its code, with the `sc-user-id` header.
// No per-user OAuth tokens to store or refresh: `npm run auth` only records which
// Smartcar user connected a car.

const IAM = 'https://iam.smartcar.com/oauth2/token';
const API = 'https://vehicle.api.smartcar.com/v3';

/** What we read, and how to pull a value out of each signal's payload. */
const SIGNALS = {
  odometer: 'odometer-traveleddistance',
  fuel: 'internalcombustionengine-fuellevel',
  battery: 'tractionbattery-stateofcharge',
  nickname: 'vehicleidentification-nickname',
};

let cached = null; // { token, expires }

async function appToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const { SMARTCAR_CLIENT_ID, SMARTCAR_CLIENT_SECRET } = process.env;
  if (!SMARTCAR_CLIENT_ID || !SMARTCAR_CLIENT_SECRET) {
    throw new Error('Missing SMARTCAR_CLIENT_ID / SMARTCAR_CLIENT_SECRET in .env (see .env.example).');
  }
  const res = await fetch(IAM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: SMARTCAR_CLIENT_ID,
      client_secret: SMARTCAR_CLIENT_SECRET,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Smartcar auth failed: ${body.error_description || body.error || res.status}`);
  cached = { token: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return cached.token;
}

async function api(path, userId) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${await appToken()}`, ...(userId ? { 'sc-user-id': userId } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** A signal's value, or null when the car (or plan) does not report it. */
async function signal(vehicleId, userId, code) {
  const { ok, body } = await api(`/vehicles/${vehicleId}/signals/${code}`, userId);
  if (!ok) return null;
  const a = body?.data?.attributes ?? {};
  return a.body ?? a.value ?? a;
}

export async function getStatus() {
  const conn = loadConnection();
  if (!conn?.userId) throw new Error('Not connected yet. Run `npm run auth` first to connect your car.');

  const { ok, body } = await api(`/connections?filter[userId]=${encodeURIComponent(conn.userId)}`);
  if (!ok) throw new Error(`Could not list connections (${body?.errors?.[0]?.detail ?? 'HTTP error'})`);
  const vehicleId = body.data?.[0]?.relationships?.vehicle?.data?.id;
  if (!vehicleId) throw new Error('Connected, but no vehicle is linked to this Smartcar user yet.');

  const vehicle = (await api(`/vehicles/${vehicleId}`, conn.userId)).body?.data?.attributes ?? {};
  const [odo, fuel, battery, nickname] = await Promise.all(
    Object.values(SIGNALS).map((code) => signal(vehicleId, conn.userId, code)),
  );

  return {
    mode: process.env.SMARTCAR_MODE || 'live',
    name: nickname?.value ?? nickname ?? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' '),
    year: vehicle.year, make: vehicle.make, model: vehicle.model, powertrain: vehicle.powertrainType,
    odometer: odo?.value ?? null,
    odometerUnit: odo?.unit ?? 'km',
    fuel: fuel?.value ?? null,
    battery: battery?.value ?? null,
  };
}
