import 'dotenv/config';
import http from 'node:http';
import { exec } from 'node:child_process';
import { saveConnection } from './tokens.js';

// --- One-time: connect your car ---
// Opens Smartcar Connect; you log in to your car brand and approve. Smartcar
// redirects back here with the `user_id` that now owns that connection, and that
// is all we keep (see tokens.js). Run once: `npm run auth`.
//
// Smartcar Simulator vehicles created with "automatically connect" skip Connect
// entirely: copy the vehicle's User ID from the dashboard and run
//   npm run auth -- --user <user-id>

const flag = process.argv.indexOf('--user');
if (flag !== -1) {
  const userId = process.argv[flag + 1];
  if (!userId) {
    console.error('❌ Usage: npm run auth -- --user <smartcar-user-id>');
    process.exit(1);
  }
  saveConnection({ userId, via: 'dashboard' });
  console.log('✅ Saved. Run `npm start` (or `npm run web`) to see the car.');
  process.exit(0);
}

const { SMARTCAR_APPLICATION_ID } = process.env;
const redirectUri = process.env.SMARTCAR_REDIRECT_URI || 'http://localhost:8000/callback';
const mode = process.env.SMARTCAR_MODE || 'live'; // 'live' for a real car, 'simulated' for the Simulator

if (!SMARTCAR_APPLICATION_ID) {
  console.error('❌ Missing SMARTCAR_APPLICATION_ID. Fill it in .env (see .env.example).');
  process.exit(1);
}

const authUrl = 'https://connect.smartcar.com/oauth/authorize?' + new URLSearchParams({
  response_type: 'code',
  client_id: SMARTCAR_APPLICATION_ID,
  redirect_uri: redirectUri,
  scope: 'read_vehicle_info read_odometer read_fuel read_battery',
  mode,
});
const { port, pathname } = new URL(redirectUri);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== pathname) {
    res.writeHead(404).end('Not found');
    return;
  }
  const userId = url.searchParams.get('user_id');
  const error = url.searchParams.get('error');
  if (error || !userId) {
    res.writeHead(400).end(`Authorization failed: ${error ?? 'no user_id returned'}. You can close this tab.`);
    console.error(`\n❌ Authorization failed: ${error ?? 'no user_id returned'}`);
  } else {
    saveConnection({ userId, via: 'connect', mode });
    res.writeHead(200, { 'Content-Type': 'text/html' })
      .end('<h2>✅ CarStatus connected!</h2><p>You can close this tab and run <code>npm start</code>.</p>');
    console.log('\n✅ Connected. Run `npm start` (or `npm run web`) to see your car.');
  }
  server.close();
  setTimeout(() => process.exit(error || !userId ? 1 : 0), 100);
});

server.listen(Number(port) || 80, () => {
  console.log('🔗 Open this URL in your browser to connect your car (it may also open automatically):\n');
  console.log('   ' + authUrl + '\n');
  // Best-effort auto-open. This used to be Windows-only (`start` via cmd.exe),
  // so on macOS and Linux nothing opened. CARSTATUS_NO_OPEN=1 skips it.
  if (!process.env.CARSTATUS_NO_OPEN) {
    const opener = process.platform === 'darwin' ? `open "${authUrl}"`
      : process.platform === 'win32' ? `start "" "${authUrl}"`
      : `xdg-open "${authUrl}"`;
    exec(opener, process.platform === 'win32' ? { shell: 'cmd.exe' } : {}, () => {});
  }
  console.log(`⏳ Waiting for the Smartcar redirect on ${redirectUri} …`);
});
