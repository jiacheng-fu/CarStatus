import { getStatus } from './status.js';

// --- CarStatus: your car's status from the command line ---
// Prerequisite: `npm run auth` once to connect your car. `npm run web` shows the
// same reading as a dashboard.

const bar = (pct) => {
  const n = Math.round((pct / 100) * 20);
  return '█'.repeat(n) + '░'.repeat(20 - n);
};

try {
  const s = await getStatus();
  console.log(`\n🚗 ${s.name}${s.mode === 'simulated' ? '  (Smartcar simulated vehicle)' : ''}`);
  if (s.name !== [s.year, s.make, s.model].filter(Boolean).join(' ')) {
    console.log(`   ${[s.year, s.make, s.model].filter(Boolean).join(' ')}${s.powertrain && s.powertrain !== s.model ? ` · ${s.powertrain}` : ''}`);
  }
  console.log('\n📊 Status');
  console.log(`  Odometer  ${s.odometer == null ? 'not reported' : `${Math.round(s.odometer).toLocaleString()} ${s.odometerUnit}`}`);
  console.log(`  Fuel      ${s.fuel == null ? 'not reported' : `${bar(s.fuel)} ${Math.round(s.fuel)}%`}`);
  console.log(`  Battery   ${s.battery == null ? 'not reported' : `${bar(s.battery)} ${Math.round(s.battery)}%`}`);
  console.log('');
} catch (err) {
  console.error(`\n❌ ${err?.message ?? err}`);
  process.exit(1);
}
