// CR-01: property-local customer identity. Existing tenant/lease records remain authoritative
// for billing, visits, retention and collections. Accounts group independent leases only.
export const HISTORY_LIMIT = 24; // provisional design parameter

export function customerHistory(account, day, kind, note, leaseId = null) {
  if (!account) return;
  const events = account.events ||= [];
  events.push({ day, kind, note, ...(leaseId == null ? {} : { leaseId }) });
  if (events.length > HISTORY_LIMIT) events.splice(0, events.length - HISTORY_LIMIT);
}

// Never infer shared identity from a matching display name. A stable account ID
// is tied to the original tenant ID; no RNG, IDs or money are consumed during migration.
export function ensureCustomerAccounts(state) {
  const accounts = state.customerAccounts ||= {};
  state.cr01 ||= { lastOfferDay: -100000, pending: null };
  migrateWithdrawnHold(state);
  for (const tenant of Object.values(state.tenants || {})) {
    const id = tenant.accountId || `customer-${tenant.id}`;
    tenant.accountId = id;
    const account = accounts[id] ||= {
      id, name: tenant.name, since: tenant.since ?? state.t,
      leaseIds: [], events: [],
    };
    account.events ||= [];
    if (!Array.isArray(account.leaseIds)) account.leaseIds = [];
  }
  // Reconcile only existing lease references; never invent lease or history entries.
  const active = new Map(Object.keys(accounts).map(id => [id, []]));
  for (const lease of Object.values(state.leases || {})) {
    const tenant = state.tenants?.[lease.tenant];
    if (tenant?.accountId && active.has(tenant.accountId)) active.get(tenant.accountId).push(lease.id);
  }
  for (const [id, ids] of active) accounts[id].leaseIds = ids;
  for (const account of Object.values(accounts)) if (account.events.length > HISTORY_LIMIT) account.events = account.events.slice(-HISTORY_LIMIT);
}

// Existing demand only. This deterministic, RNG-free eligibility gate does not
// create extra shoppers or change the existing prospect-generation schedule.
export function returningAccount(state, prospect) {
  if (!state.tut?.done || state.mode === 'tutorial' && state.tut?.on) return null;
  if (state.cr01?.pending || (Math.floor(state.t / 1440) + 1) - (state.cr01?.lastOfferDay ?? -100000) < 14) return null;
  const accounts = Object.values(state.customerAccounts || {}).filter(a => a.leaseIds?.length);
  if (accounts.length < 12) return null; // reserve this feature for established facilities
  const seed = ((state.seed >>> 0) ^ Math.imul((state.t >>> 0) + 1, 2654435761) ^ (String(prospect.size).length * 2246822519)) >>> 0;
  if (seed % 7 !== 0) return null; // selected existing shopper, never bonus traffic
  accounts.sort((a,b) => String(a.id).localeCompare(String(b.id)));
  return accounts[seed % accounts.length];
}

// Saves from the withdrawn scarce-unit hold build may hold `cr01.hold`, a hold-type pending request or a
// hold-type card. The held shopper was never counted or charged, so it becomes the same single pending
// request with the immediate Offer / Wait choice. No lease, money, RNG draw, ID or extra shopper is created;
// the card is recreated by the running game (Sim.cr01RestoreCard), never at load.
function migrateWithdrawnHold(state) {
  const c = state.cr01;
  if (Object.hasOwn(c, 'hold')) {
    const h = c.hold; delete c.hold;
    const account = h && state.customerAccounts?.[h.accountId];
    if (h && account && h.requestId && h.prospect) {
      if (!c.pending) {
        c.pending = { id: h.requestId, accountId: h.accountId, prospect: { size: h.prospect.size, climate: !!h.prospect.climate, ad: h.prospect.ad ?? null, kind: h.prospect.kind } };
        customerHistory(account, Math.floor((state.t || 0) / 1440) + 1, 'hold_reopened', 'Unit hold ended by game update; request reopened as an immediate offer');
      } else customerHistory(account, Math.floor((state.t || 0) / 1440) + 1, 'hold_released', 'Unit hold ended by game update; no additional rental');
    }
  }
  if (c.pending && Object.hasOwn(c.pending, 'scarceUnitId')) delete c.pending.scarceUnitId;
  for (const cv of state.convos || []) {
    if (cv.key !== 'cr01' || !Array.isArray(cv.actions)) continue;
    for (const a of cv.actions) {
      if (a.action?.type !== 'cr01Reply') continue;
      if (a.action.decision === 'hold') { a.action.decision = 'check'; a.label = 'Offer a suitable unit'; }
      else if (a.action.decision === 'wait') a.label = 'Wait / not now';
    }
  }
}
