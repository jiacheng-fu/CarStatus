import 'dotenv/config';
import http from 'node:http';
import crypto from 'node:crypto';

// --- Optional: a Smartcar webhook receiver ---
// Smartcar's v3 API reads a vehicle's signals from a server-side store that is
// filled by webhook deliveries. Until the vehicle is subscribed to a VERIFIED
// webhook, `npm start` sees no data ("not reported") - true even for Simulator
// cars, though the docs don't say so. Run this, expose it on HTTPS (e.g.
// `cloudflared tunnel --url http://localhost:8787`), add that URL as a webhook in
// the dashboard, subscribe the vehicle, then Verify. See README.

const PORT = Number(process.env.WEBHOOK_PORT) || 8787;
const token = process.env.SMARTCAR_MANAGEMENT_TOKEN;
if (!token) {
  console.error('❌ Missing SMARTCAR_MANAGEMENT_TOKEN in .env (Configuration > API credentials).');
  process.exit(1);
}

http
  .createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch { /* not JSON */ }
      const type = body.eventType ?? body.type;
      if (type === 'VERIFY') {
        // Smartcar proves we own the URL: answer with HMAC-SHA256(challenge, management token).
        const challenge = body.data?.challenge ?? body.payload?.challenge ?? body.challenge ?? '';
        const hmac = crypto.createHmac('sha256', token).update(challenge).digest('hex');
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ challenge: hmac }));
        console.log('✅ Webhook verified by Smartcar');
        return;
      }
      console.log(`📨 ${type ?? req.method + ' ' + req.url} ${new Date().toLocaleTimeString()}`, raw.slice(0, 400));
      res.writeHead(200).end('ok');
    });
  })
  .listen(PORT, () => console.log(`🪝 Smartcar webhook receiver on http://localhost:${PORT}`));
