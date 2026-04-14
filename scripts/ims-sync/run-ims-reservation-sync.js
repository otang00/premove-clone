#!/usr/bin/env node
const { loginToIms } = require('./lib/ims-auth');
const { fetchAllReservations } = require('./fetch-ims-reservations');
const { syncReservationsToSupabase } = require('./upsert-ims-reservations');

async function main() {
  const dryRun = process.env.IMS_SYNC_DRY_RUN === 'true';
  const auth = await loginToIms();
  const result = await fetchAllReservations({ authorization: auth.authorization });
  const sync = await syncReservationsToSupabase({
    schedules: result.schedules,
    dryRun,
  });

  const summary = {
    enabled: auth.enabled,
    totalPagesFetched: result.totalPagesFetched,
    schedulesCount: result.schedules.length,
    firstReservationId: result.schedules?.[0]?.detail?.id || null,
    firstScheduleId: result.schedules?.[0]?.id || null,
    firstRentalType: result.schedules?.[0]?.detail?.rental_type || null,
    query: result.pages?.[0]?.query || null,
    sync,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[ims-sync] failed');
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
