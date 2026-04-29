const { formatKstDateTime, ZzimcarClient } = require('./zzimcar-client');
const { fetchDesiredImsReservations } = require('./fetch-desired-ims-reservations');
const { fetchActiveMappings, upsertMapping, markMappingDeleted, markMappingFailed } = require('./zzimcar-sync-mapping-repo');

function buildMapByImsReservationId(rows = []) {
  return new Map((Array.isArray(rows) ? rows : []).map((row) => [String(row.imsReservationId), row]));
}

function hasChanged(desired, actual) {
  if (!desired || !actual) return false;
  return String(desired.carNumber) !== String(actual.carNumber)
    || String(desired.startAt) !== String(actual.startAt)
    || String(desired.endAt) !== String(actual.endAt)
    || !actual.zzimcarVehiclePid
    || !actual.zzimcarDisableTimePid
    || (desired.zzimcarVehiclePid != null && String(desired.zzimcarVehiclePid) !== String(actual.zzimcarVehiclePid));
}

function planReconcile({ desiredRows = [], actualRows = [] } = {}) {
  const desiredMap = buildMapByImsReservationId(desiredRows);
  const actualMap = buildMapByImsReservationId(actualRows);

  const additions = [];
  const changes = [];
  const deletions = [];
  const unchanged = [];

  for (const desired of desiredRows) {
    const actual = actualMap.get(String(desired.imsReservationId));
    if (!actual) {
      additions.push({ desired });
      continue;
    }
    if (hasChanged(desired, actual)) {
      changes.push({ desired, actual });
      continue;
    }
    unchanged.push({ desired, actual });
  }

  for (const actual of actualRows) {
    if (!desiredMap.has(String(actual.imsReservationId))) {
      deletions.push({ actual });
    }
  }

  return { additions, changes, deletions, unchanged };
}

function findExactDisableTime({ rows = [], payload }) {
  return (Array.isArray(rows) ? rows : []).find((row) => row.startDtime === payload.startDtime && row.endDtime === payload.endDtime) || null;
}

function isDuplicateDisableTimeError(error) {
  const message = String(error?.message || '');
  return message.includes('VEHICLE_SCHEDULE_DUPLICATION_ERROR') || message.includes('차량 스케줄이 중복되었습니다');
}

async function applyAddition({ desired, client, shouldSave }) {
  const vehicle = await client.findVehicleByCarNumber({ carNumber: desired.carNumber });
  const payload = {
    vehiclePid: vehicle.vehiclePid,
    startDtime: formatKstDateTime(desired.startAt),
    endDtime: formatKstDateTime(desired.endAt),
  };

  let createResult = null;
  let disableTimePid = null;
  if (shouldSave) {
    try {
      createResult = await client.createDisableTime(payload);
      disableTimePid = createResult?.disableTimePid || null;
    } catch (error) {
      if (!isDuplicateDisableTimeError(error)) {
        throw error;
      }

      const disableTimes = await client.getDisableTimes({ vehiclePid: vehicle.vehiclePid });
      const exact = findExactDisableTime({ rows: disableTimes, payload });
      disableTimePid = exact?.pid || null;
      createResult = {
        payload,
        body: null,
        disableTimePid,
        duplicateRecovered: Boolean(disableTimePid),
        error: error.message,
      };

      if (!disableTimePid) {
        throw error;
      }
    }

    if (!disableTimePid) {
      const disableTimes = await client.getDisableTimes({ vehiclePid: vehicle.vehiclePid });
      const exact = findExactDisableTime({ rows: disableTimes, payload });
      disableTimePid = exact?.pid || null;
    }

    if (!disableTimePid) {
      throw new Error(`Disable time pid not found after create for imsReservationId=${desired.imsReservationId}`);
    }
  }

  return {
    imsReservationId: desired.imsReservationId,
    action: 'add',
    desired,
    vehiclePid: vehicle.vehiclePid,
    payload,
    applied: shouldSave,
    disableTimePid,
    createResult,
  };
}

async function applyDeletion({ actual, client, shouldSave }) {
  let deleteResult = null;
  if (shouldSave) {
    if (!actual.zzimcarDisableTimePid) {
      throw new Error(`Missing zzimcarDisableTimePid for imsReservationId=${actual.imsReservationId}`);
    }
    deleteResult = await client.deleteDisableTime({ pid: actual.zzimcarDisableTimePid });
  }

  return {
    imsReservationId: actual.imsReservationId,
    action: 'delete',
    actual,
    applied: shouldSave,
    deleteResult,
  };
}

async function applyChange({ desired, actual, client, shouldSave }) {
  const deletion = await applyDeletion({ actual, client, shouldSave });
  const addition = await applyAddition({ desired, client, shouldSave });
  return {
    imsReservationId: desired.imsReservationId,
    action: 'change',
    desired,
    actual,
    applied: shouldSave,
    deletion,
    addition,
  };
}

async function reconcileZzimcarDisableTimes({
  shouldSave = false,
  now = new Date(),
  supabaseClient,
  client,
} = {}) {
  const supabase = supabaseClient;
  const zzimcarClient = client || new ZzimcarClient();
  const desiredRows = await fetchDesiredImsReservations({ now, supabaseClient: supabase });
  const actualRows = await fetchActiveMappings({
    supabaseClient: supabase,
    allowMissingTable: !shouldSave,
  });
  const plan = planReconcile({ desiredRows, actualRows });

  const results = { additions: [], deletions: [], changes: [], unchanged: plan.unchanged, errors: [] };
  const requiresZzimcarAccess = shouldSave && (plan.additions.length > 0 || plan.deletions.length > 0 || plan.changes.length > 0);

  if (!shouldSave) {
    return {
      mode: 'dry-run',
      desiredCount: desiredRows.length,
      actualCount: actualRows.length,
      additionsCount: plan.additions.length,
      deletionsCount: plan.deletions.length,
      changesCount: plan.changes.length,
      unchangedCount: plan.unchanged.length,
      errorsCount: 0,
      results: {
        additions: plan.additions.map(({ desired }) => ({ action: 'add', imsReservationId: desired.imsReservationId, desired, applied: false })),
        deletions: plan.deletions.map(({ actual }) => ({ action: 'delete', imsReservationId: actual.imsReservationId, actual, applied: false })),
        changes: plan.changes.map(({ desired, actual }) => ({ action: 'change', imsReservationId: desired.imsReservationId, desired, actual, applied: false })),
        unchanged: plan.unchanged,
        errors: [],
      },
    };
  }

  if (requiresZzimcarAccess) {
    try {
      await zzimcarClient.ensureLoggedIn();
    } catch (error) {
      return {
        mode: 'save',
        desiredCount: desiredRows.length,
        actualCount: actualRows.length,
        additionsCount: plan.additions.length,
        deletionsCount: plan.deletions.length,
        changesCount: plan.changes.length,
        unchangedCount: plan.unchanged.length,
        errorsCount: 1,
        results: {
          additions: [],
          deletions: [],
          changes: [],
          unchanged: plan.unchanged,
          errors: [{ action: 'auth', error: error.message }],
        },
      };
    }
  }

  for (const entry of plan.additions) {
    try {
      const result = await applyAddition({ ...entry, client: zzimcarClient, shouldSave });
      results.additions.push(result);
      if (shouldSave) {
        await upsertMapping({
          mapping: {
            imsReservationId: result.imsReservationId,
            carNumber: result.desired.carNumber,
            zzimcarVehiclePid: result.vehiclePid,
            zzimcarDisableTimePid: result.disableTimePid,
            startAt: result.desired.startAt,
            endAt: result.desired.endAt,
            syncStatus: 'active',
          },
          supabaseClient: supabase,
        });
      }
    } catch (error) {
      const failure = {
        action: 'add',
        imsReservationId: entry.desired.imsReservationId,
        error: error.message,
      };
      results.errors.push(failure);
      if (shouldSave) {
        await markMappingFailed({
          imsReservationId: entry.desired.imsReservationId,
          carNumber: entry.desired.carNumber,
          startAt: entry.desired.startAt,
          endAt: entry.desired.endAt,
          lastError: error.message,
          syncStatus: 'sync_failed',
          supabaseClient: supabase,
        });
      }
    }
  }

  for (const entry of plan.deletions) {
    try {
      const result = await applyDeletion({ ...entry, client: zzimcarClient, shouldSave });
      results.deletions.push(result);
      if (shouldSave) {
        await markMappingDeleted({ imsReservationId: result.imsReservationId, supabaseClient: supabase });
      }
    } catch (error) {
      const failure = {
        action: 'delete',
        imsReservationId: entry.actual.imsReservationId,
        error: error.message,
      };
      results.errors.push(failure);
      if (shouldSave) {
        await markMappingFailed({
          imsReservationId: entry.actual.imsReservationId,
          carNumber: entry.actual.carNumber,
          zzimcarVehiclePid: entry.actual.zzimcarVehiclePid,
          zzimcarDisableTimePid: entry.actual.zzimcarDisableTimePid,
          startAt: entry.actual.startAt,
          endAt: entry.actual.endAt,
          lastError: error.message,
          syncStatus: 'delete_failed',
          supabaseClient: supabase,
        });
      }
    }
  }

  for (const entry of plan.changes) {
    try {
      const result = await applyChange({ ...entry, client: zzimcarClient, shouldSave });
      results.changes.push(result);
      if (shouldSave) {
        await upsertMapping({
          mapping: {
            imsReservationId: result.imsReservationId,
            carNumber: result.desired.carNumber,
            zzimcarVehiclePid: result.addition.vehiclePid,
            zzimcarDisableTimePid: result.addition.disableTimePid,
            startAt: result.desired.startAt,
            endAt: result.desired.endAt,
            syncStatus: 'active',
          },
          supabaseClient: supabase,
        });
      }
    } catch (error) {
      const failure = {
        action: 'change',
        imsReservationId: entry.desired.imsReservationId,
        error: error.message,
      };
      results.errors.push(failure);
      if (shouldSave) {
        await markMappingFailed({
          imsReservationId: entry.desired.imsReservationId,
          carNumber: entry.desired.carNumber,
          zzimcarVehiclePid: entry.actual.zzimcarVehiclePid,
          zzimcarDisableTimePid: entry.actual.zzimcarDisableTimePid,
          startAt: entry.desired.startAt,
          endAt: entry.desired.endAt,
          lastError: error.message,
          syncStatus: 'sync_failed',
          supabaseClient: supabase,
        });
      }
    }
  }

  return {
    mode: shouldSave ? 'save' : 'dry-run',
    desiredCount: desiredRows.length,
    actualCount: actualRows.length,
    additionsCount: results.additions.length,
    deletionsCount: results.deletions.length,
    changesCount: results.changes.length,
    unchangedCount: results.unchanged.length,
    errorsCount: results.errors.length,
    results,
  };
}

module.exports = {
  applyAddition,
  applyChange,
  applyDeletion,
  buildMapByImsReservationId,
  findExactDisableTime,
  hasChanged,
  isDuplicateDisableTimeError,
  planReconcile,
  reconcileZzimcarDisableTimes,
};
