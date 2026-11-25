import { writeFileSync, readFileSync, existsSync } from 'node:fs';

// Which Smartcar user connected a car. With the v3 API that is all CarStatus has
// to remember: data is read with an application token (see status.js), so there
// are no per-user access/refresh tokens to cache any more. Gitignored anyway.
export const CONNECTION_FILE = new URL('./smartcar_connection.json', import.meta.url);

export function saveConnection(conn) {
  writeFileSync(CONNECTION_FILE, JSON.stringify({ ...conn, savedAt: new Date().toISOString() }, null, 2), 'utf8');
}

export function loadConnection() {
  if (!existsSync(CONNECTION_FILE)) return null;
  return JSON.parse(readFileSync(CONNECTION_FILE, 'utf8'));
}
