// SK-01 presentation for kit scenarios: the scenario card (goals with held days, decisions, coming up,
// projects), the end-of-run results screen, scenario menu cards and per-device best results.
// Reads scenario state only; every change goes through sim actions (scnChoice, scnProject).
import { kitView, kitDef, validResult } from './scenariokit.js';
import { scenarioProgress } from './scenarios.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const money = (v) => (v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');
const pct = (v) => Math.round(v * 100) + '%';
const starRow = (n, of = 3) => `<span class="kit-stars" aria-label="${n} of ${of} stars">${'★'.repeat(n)}<i>${'★'.repeat(of - n)}</i></span>`;

export function kitFmt(g, v) {
  if (g.fmt === 'x') return v <= 0 ? 'needs 30 days' : v.toFixed(2) + '×';
  if (g.fmt === 'pct') return pct(v);
  if (g.fmt === 'money') return v === -1 ? 'needs 30 days' : money(v);
  if (g.k === 'stormOpen') return v ? `${Math.round(v)} open` : 'none';
  return String(Math.round(v));
}

// ---------------------------------------------------------------- scenario card
export function kitCardKey(sim, scMin) {
  const s = sim.s, sc = s.scenario, k = sc.kit, prog = scenarioProgress(sim);
  return JSON.stringify([sc.status, scMin, sim.day, prog.map((g) => [g.met, kitFmt(g, g.cur)]), k.streak, k.pending && k.pending.id, k.projects.map((p) => p.state), k.log.length, sc.badDays, k.badStreak, Math.round(sim.financialPosition().cash / 50)]);
}
export function kitCardHtml(sim, scMin, again) {
  const s = sim.s, sc = s.scenario, k = sc.kit, v = kitView(sim), prog = scenarioProgress(sim), day = sim.day;
  const left = sc.deadline - day + 1, ended = sc.status !== 'active';
  const head = ended ? (sc.status === 'won' ? `Scenario complete · ${starRow(k.result?.stars || 1)}` : 'Scenario failed')
    : v.pending ? 'Decision needed' : `Day ${day} of ${sc.deadline} · ${left} left`;
  const holdLine = ended ? '' : day < (sc.winFrom || 1)
    ? `<p class="kit-hold">Goals count from Day ${sc.winFrom}. Then all of them must hold for ${sc.hold} mornings in a row.</p>`
    : `<p class="kit-hold ${v.streak ? 'on' : ''}">All goals held: <b>${v.streak} of ${sc.hold}</b> mornings${v.streak ? '' : ' · a miss resets the count'}</p>`;
  const goals = `<ul class="goals">${prog.map((g) => `<li class="${g.met ? 'met' : ''}"><span class="ck">${g.met ? '&#10003;' : ''}</span><span>${esc(g.label)}</span><b>${esc(kitFmt(g, g.cur))}</b></li>`).join('')}</ul>`;
  let decision = '';
  if (!ended && v.pending) {
    const p = v.pending, cash = sim.financialPosition().cash;
    decision = `<div class="kit-decision" role="group" aria-label="${esc(p.title)}"><small>${esc(p.who)}</small><h5>${esc(p.title)}</h5><p>${esc(p.text)}</p>
      <div class="kit-opts">${p.opts.map((o, i) => { const short = o.cost > 0 && cash < o.cost; return `<button class="btn kit-opt" data-a="scnChoice" data-v="${esc(p.id)}:${i}" ${short ? 'disabled' : ''}><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}${short ? ' · not enough cash' : ''}</small>` : ''}</button>`; }).join('')}</div>
      <p class="note">No answer by Day ${p.expires}: ${esc(p.opts[p.def]?.label || '')}.</p></div>`;
  }
  const up = !ended && v.upcoming.length ? `<div class="kit-up"><b>Coming up</b><ul>${v.upcoming.map((u) => `<li class="${u.urgent ? 'urgent' : ''}">${esc(u.text)}${u.c && u.cur != null ? ` · now ${esc(kitFmt({ fmt: u.c.k === 'occ' ? 'pct' : 'n', k: u.c.k }, u.cur))}` : ''}</li>`).join('')}</ul></div>` : '';
  const projects = !ended && v.projects.length ? `<details class="kit-projects"><summary>Projects (${v.projects.filter((p) => p.state === 'offered').length} available)</summary>${v.projects.map((p) => `<div class="kit-proj"><div><b>${esc(p.name)}</b><small>${esc(p.desc || '')}</small>${p.until && p.state === 'offered' ? `<small>Offered until Day ${p.until}</small>` : ''}</div>${p.state === 'offered' ? `<button class="btn sm" data-a="scnProject" data-v="${esc(p.id)}">Start · ${money(p.cost)}</button>` : `<span class="pill ${p.state === 'done' ? 'g' : 'a'}">${p.state === 'done' ? 'Done' : 'Ready Day ' + p.doneDay}</span>`}</div>`).join('')}</details>` : '';
  const log = v.log.length ? `<details class="kit-log"><summary>What happened</summary><ul>${v.log.map((l) => `<li class="${esc(l.tone)}">Day ${l.day}: ${esc(l.text)}</li>`).join('')}</ul></details>` : '';
  const fail = !ended ? `<p class="fail ${sc.badDays || Object.values(k.badStreak || {}).some(Boolean) ? 'on' : ''}">${esc(kitDef(s)?.failText || '')}${sc.badDays ? ` Cash rule: ${sc.badDays} so far.` : ''}${Object.entries(k.badStreak || {}).filter(([, n]) => n).map(([key, n]) => ` ${key === 'occ' ? 'Occupancy' : key === 'sat' ? 'Satisfaction' : 'Reputation'} rule: ${n} so far.`).join('')}</p>` : '';
  const end = ended ? `<p>${sc.status === 'won' ? `Finished on Day ${sc.endDay}.` : esc(sc.why || '')}</p><div class="row wrap"><button class="btn pri" data-a="scnResults">See results</button><button class="btn" data-a="scenarios">Scenarios</button></div>` : '';
  return `<div class="tut scen kit ${scMin ? 'min' : ''} ${again ? 'noanim' : ''}"><div class="ch"><span>Scenario · ${esc(sc.name)}</span><button class="mini" data-a="scenMin">${scMin ? 'Show' : 'Hide'}</button></div>
    <h4>${head}</h4>${decision}${goals}${holdLine}${up}${projects}${end}${fail}${log}</div>`;
}

// ---------------------------------------------------------------- results screen
const WIN_TITLE = { grandopening: 'Leased up, and the bank is happy.', stormseason: 'You weathered the season.', chainnextdoor: 'You held your ground against the chain.', ratereset: 'Harborview pays its way again.' };
const LOSS_TITLE = { grandopening: 'The lease-up ran out of road.', stormseason: 'The storms won this season.', chainnextdoor: 'Vaultline took the neighborhood.', ratereset: 'Harborview never caught up with the market.' };
export function kitEndHtml(sim) {
  const s = sim.s, sc = s.scenario, k = sc.kit, r = k.result, def = kitDef(s); if (!r) return '';
  const won = r.won, start = k.start || {};
  const tiles = [
    ['Days', `${r.day} of ${r.deadline}`],
    ['Cash', `${money(start.cash ?? 0)} → ${money(r.cash)}`],
    ['Occupancy', pct(r.occ)],
    ['Reputation', pct(r.rep)],
    ['Monthly rent', money(r.roll)],
    ['Decisions made', String(r.decisions)],
  ];
  const goals = r.goals.map((g) => `<li class="${g.met ? 'met' : ''}"><span class="ck">${g.met ? '&#10003;' : '&#10007;'}</span><span>${esc(g.label)}</span><b>${esc(kitFmt(g, g.cur))}</b></li>`).join('');
  const notes = won ? `<h3>Stars</h3><ul class="kit-notes">${(r.notes || []).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : `<h3>What to try</h3><p>${esc(def?.tip || '')}</p>`;
  const choices = k.log.filter((l) => l.tone === 'decision').slice(-6).map((l) => `<li>Day ${l.day}: ${esc(l.text)}</li>`).join('');
  return `<div class="modal-bg"><div class="modal kit-end" role="dialog" aria-modal="true" aria-labelledby="kit-end-title">
    <small class="kicker">${won ? 'Scenario complete' : 'Scenario failed'} · ${esc(sc.name)}</small>
    <h2 id="kit-end-title">${esc(won ? WIN_TITLE[sc.id] || 'Scenario complete' : LOSS_TITLE[sc.id] || 'Scenario failed')}</h2>
    ${won ? `<div class="kit-big">${starRow(r.stars)}</div>` : `<p class="kit-why">${esc(r.why || '')}</p>`}
    <div class="kit-tiles">${tiles.map(([a, b]) => `<div><small>${esc(a)}</small><b>${esc(b)}</b></div>`).join('')}</div>
    <h3>Goals</h3><ul class="goals kit-goals">${goals}</ul>
    ${notes}
    ${choices ? `<details><summary>Your key decisions</summary><ul class="kit-notes">${choices}</ul></details>` : ''}
    <p class="note">Every new start of this scenario is different: event days, ${sc.id === 'stormseason' ? 'storm strength, ' : ''}tenants and timing change.</p>
    <div class="row wrap kit-end-btns"><button class="btn ${won ? '' : 'pri'}" data-a="new" data-v="sc:${esc(sc.id)}">Try again</button><button class="btn ${won ? 'pri' : ''}" data-a="scnKeep">Keep playing</button><button class="btn" data-a="scenarios">Scenarios</button></div>
  </div></div>`;
}

// ---------------------------------------------------------------- per-device records (best stars), never required
const REC_KEY = 'sst.scenarioRecords.v1';
export function readKitRecords() { try { const o = JSON.parse(localStorage.getItem(REC_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch { return {}; } }
export function recordKitResult(r) {
  if (!validResult(r)) return false;
  try {
    const all = readKitRecords(), cur = all[r.id] || { plays: 0, wins: 0, best: 0, bestDay: null };
    const key = r.seed + ':' + r.t; if (cur.last === key) return false; // the same ending is recorded once
    cur.plays++; cur.last = key;
    if (r.won) { cur.wins++; cur.best = Math.max(cur.best, r.stars); cur.bestDay = cur.bestDay == null ? r.day : Math.min(cur.bestDay, r.day); }
    all[r.id] = cur; localStorage.setItem(REC_KEY, JSON.stringify(all)); return true;
  } catch { return false; }
}
export function kitMenuCard(id, S, rec) {
  const best = rec && rec.wins ? `<p class="kit-rec">Best ${starRow(rec.best)} · ${rec.wins} win${rec.wins > 1 ? 's' : ''} in ${rec.plays} run${rec.plays > 1 ? 's' : ''}${rec.bestDay ? ` · fastest Day ${rec.bestDay}` : ''}</p>` : rec && rec.plays ? `<p class="kit-rec">${rec.plays} run${rec.plays > 1 ? 's' : ''}, no win yet</p>` : '';
  return `<div class="scen-card kit-card"><b>${esc(S.name)} <span class="pill g">New</span></b><p>${esc(S.blurb)}</p>${best}<ul>${S.goals.map((g) => `<li>${esc(g.label)}</li>`).join('')}<li>Goals count from Day ${S.winFrom} and must all hold ${S.hold} mornings in a row · deadline Day ${S.deadline}</li><li>Decisions along the way; every start is different</li><li class="f">${esc(S.failText || '')}</li></ul><button class="btn pri" data-a="new" data-v="sc:${id}">Start ${esc(S.name)}</button></div>`;
}
