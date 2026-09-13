/* ─────────────────────────────────────────────────────────────
   1. The App Store button.
   Flip LIVE to true the day the app is approved. Until then the
   button says so plainly rather than sending people to a dead page.
   ───────────────────────────────────────────────────────────── */
const LIVE = false;   // flip it in 404.html too: the team-link page
const STORE_URL = "https://apps.apple.com/app/id6809611679";

const waitlist = document.getElementById('waitlist');

for (const btn of document.querySelectorAll('.store-btn')) {
  const label = btn.querySelector('.store-label');
  if (LIVE) {
    btn.href = STORE_URL;
  } else {
    // no dead ends: until the app is out, the button collects an address instead
    btn.href = "#";
    label.textContent = "Join the waitlist";
    btn.querySelector('svg')?.remove();      // it is not an App Store link yet
    btn.addEventListener('click', e => { e.preventDefault(); waitlist.showModal(); });
  }
}
const navCta = document.getElementById('nav-cta');
if (LIVE) { navCta.href = STORE_URL; }
else {
  navCta.textContent = "Join the waitlist";
  navCta.href = "#";
  navCta.addEventListener('click', e => { e.preventDefault(); waitlist.showModal(); });
  document.getElementById('closer-cta').hidden = false;
}

document.getElementById('waitlist-close').addEventListener('click', () => waitlist.close());
// tapping the dim area outside the card closes it too
waitlist.addEventListener('click', e => { if (e.target === waitlist) waitlist.close(); });

/* ─────────────────────────────────────────────────────────────
   1a. The waitlist itself.
   Straight into the same database the app uses. The key below is the
   publishable one — it is in the app too, and the table only accepts
   inserts, so the list can be added to but never read back.
   ───────────────────────────────────────────────────────────── */
const SUPABASE_URL = "https://jhygmyivoaxmzqajqkuu.supabase.co";
const SUPABASE_KEY = "sb_publishable_fxbApy-1QyEhskA3uGhqUQ_8HRaS9Th";

function wireSignup(formId, noteId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const note = document.getElementById(noteId);
  const input = form.querySelector('input');
  const button = form.querySelector('button');
  const resting = note.textContent;

  function said(text, kind) {
    note.textContent = text;
    note.className = 'signup-note' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email)) {
      said('That does not look like an email address.', 'bad');
      input.focus();
      return;
    }
    button.disabled = true;
    const wasLabel = button.textContent;
    button.textContent = 'One moment…';
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/waitlist', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ email, source: 'web' }),
      });
      // 409 is the unique index: they are already on the list, which is a yes
      if (res.ok || res.status === 409) {
        form.hidden = true;
        said(res.status === 409
          ? "You're already on the list. We'll email you the day it lands."
          : "You're on the list. We'll email you the day it lands.", 'ok');
      } else {
        said('That did not go through. Try again, or email hello@carislabs.app.', 'bad');
      }
    } catch {
      said('No connection just now. Try again in a moment.', 'bad');
    } finally {
      button.disabled = false;
      button.textContent = wasLabel;
      if (!form.hidden && note.className.includes('bad') === false) said(resting);
    }
  });
}

wireSignup('signup-modal', 'note-modal');
wireSignup('signup-closer', 'note-closer');

/* ─────────────────────────────────────────────────────────────
   2. The playable console.
   The same rules the app uses: a 70-yard field, chains at 15, four
   downs. Enough to feel the loop in five seconds. Built with real
   nodes rather than markup strings.
   ───────────────────────────────────────────────────────────── */
const LEN = 70, CHAIN = 15;
const ROSTER = [
  { n: 15, first: 'Sophie' }, { n: 11, first: 'Chloe' },
  { n: 21, first: 'Zoe' },    { n: 7,  first: 'Lily'  },
];

const el = id => document.getElementById(id);
const field = el('field'), stage = el('stage'), log = el('log'), hint = el('hint');

function node(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
/** A line of guidance with one word emphasised. */
function say(before, strong, after) {
  hint.replaceChildren();
  if (before) hint.append(before);
  if (strong) hint.append(node('b', null, strong));
  if (after) hint.append(after);
}

let S, history = [];

const fresh = () => ({
  spot: 15, down: 1, ltg: 30, us: 0, them: 0, ours: true,
  rows: [], flow: null, draft: null,
});
function snapshot() {
  history.push(structuredClone(S));
  if (history.length > 30) history.shift();
}

const ordinal = n => ['1st', '2nd', '3rd', '4th'][n - 1] || n + 'th';
const spotName = y => y === LEN / 2 ? 'Midfield' : y < LEN / 2 ? 'Own ' + y : 'Opp ' + (LEN - y);
const ddText = () => S.ltg >= LEN || S.ltg <= 0
  ? ordinal(S.down) + ' & Goal'
  : ordinal(S.down) + ' & ' + Math.abs(S.ltg - S.spot);
const pct = y => 9 + (y / LEN) * 82;          // the playing surface spans 9%..91%
const who = n => { const p = ROSTER.find(p => p.n === n); return '#' + p.n + ' ' + p.first; };

function draw() {
  el('us-pts').textContent = S.us;
  el('them-pts').textContent = S.them;
  el('side-us').classList.toggle('has', S.ours);
  el('side-them').classList.toggle('has', !S.ours);
  el('dd').textContent = ddText();
  el('at').textContent = spotName(S.draft ?? S.spot);
  el('los').style.left = pct(S.spot) + '%';
  el('ltg').style.left = pct(Math.max(0, Math.min(LEN, S.ltg))) + '%';
  el('pill').style.left = pct(S.draft ?? S.spot) + '%';
  el('undo').disabled = history.length === 0;
  field.classList.toggle('armed', S.draft !== null);
  drawStage();
  drawLog();
}

function drawStage() {
  stage.replaceChildren();

  // nothing started yet: pick a play
  if (!S.flow) {
    stage.append(node('p', 'ask', S.ours ? 'Our ball. What happened?' : 'Their ball. What happened?'));
    const tiles = node('div', 'tiles');
    const choices = S.ours
      ? [['pass', 'Pass'], ['rush', 'Rush']]
      : [['opp', 'Their gain'], ['pull', 'Flag pull']];
    for (const [act, label] of choices) {
      const b = node('button', 'tile', label);
      b.dataset.act = act;
      tiles.append(b);
    }
    stage.append(tiles);
    S.ours ? say('Tap ', 'Pass', ' or Rush to start a play.')
           : say('They have the ball. Log what their offense did.');
    return;
  }

  // who did it
  if (S.flow.needs) {
    const asks = { qb: 'Who threw it?', rec: 'Who caught it?', rusher: 'Who ran it?', puller: 'Who pulled the flag?' };
    stage.append(node('p', 'ask', asks[S.flow.needs]));
    const tiles = node('div', 'tiles three');
    for (const p of ROSTER) {
      const b = node('button', 'tile quiet', String(p.n));
      b.append(node('span', 'who', p.first));
      b.dataset.pick = String(p.n);
      tiles.append(b);
    }
    stage.append(tiles);
    say('Every stat files by number.');
    return;
  }

  // where it ended up
  const commit = node('button', 'tile commit', 'Log it');
  commit.dataset.act = 'commit';
  stage.append(commit);
  say('Now ', 'drag the ball', ' or tap the field to say where it ended up.');
}

function drawLog() {
  log.replaceChildren();
  if (!S.rows.length) {
    log.append(node('p', 'empty', 'No plays yet — run a series.'));
    return;
  }
  for (const r of S.rows.slice(-4).reverse()) {
    const row = node('div', 'row' + (r.first ? ' first' : '') + (r.six ? ' six' : ''));
    row.append(node('span', 'd', r.down));
    row.append(node('span', 't', r.text));
    row.append(node('span', 'y', r.yds === null ? '—' : (r.yds > 0 ? '+' : '') + r.yds));
    log.append(row);
  }
}

/* ── actions ─────────────────────────────────────────────────── */

function act(kind) {
  snapshot();
  if (kind === 'pass') S.flow = { kind, needs: 'qb' };
  if (kind === 'rush') S.flow = { kind, needs: 'rusher' };
  if (kind === 'pull') S.flow = { kind, needs: 'puller' };
  if (kind === 'opp')  { S.flow = { kind }; S.draft = S.spot; }
  draw();
}

function pick(n) {
  snapshot();
  const f = S.flow;
  if (f.needs === 'qb') { f.qb = n; f.needs = 'rec'; }
  else if (f.needs === 'rec')    { f.rec = n;    f.needs = null; S.draft = S.spot; }
  else if (f.needs === 'rusher') { f.rusher = n; f.needs = null; S.draft = S.spot; }
  else if (f.needs === 'puller') { f.puller = n; f.needs = null; S.draft = S.spot; }
  draw();
}

function celebrate(scoredByUs) {
  const pts = scoredByUs ? el('us-pts') : el('them-pts');
  const flash = el('flash');
  for (const node of [pts, flash]) {
    node.classList.remove('bump', 'go');
    void node.offsetWidth;                       // restart the animation
  }
  pts.classList.add('bump');
  flash.classList.add('go');
}

function commit() {
  snapshot();
  const f = S.flow, end = S.draft, gain = S.ours ? end - S.spot : S.spot - end;
  const downLabel = ddText();

  let text = '';
  if (f.kind === 'pass') text = who(f.qb) + ' pass to ' + who(f.rec);
  if (f.kind === 'rush') text = who(f.rusher) + ' rush';
  if (f.kind === 'pull') text = 'Flag pull by ' + who(f.puller);
  if (f.kind === 'opp')  text = 'Opponent gain';

  const scored = S.ours ? end >= LEN : end <= 0;
  const gotFirst = !scored && (S.ours ? end >= S.ltg : end <= S.ltg);

  if (scored) {
    text += ' for the touchdown';
    if (S.ours) S.us += 6; else S.them += 6;
    celebrate(S.ours);
  }

  S.rows.push({ down: downLabel, text, yds: gain, first: gotFirst, six: scored });

  if (scored) {
    S.ours = !S.ours;
    S.spot = S.ours ? 15 : LEN - 15;
    S.down = 1;
  } else {
    S.spot = end;
    if (gotFirst) S.down = 1;
    else if (S.down === 4) {
      S.rows.push({ down: '4th down', text: 'Turnover on downs', yds: null, first: false, six: false });
      S.ours = !S.ours;
      S.down = 1;
    } else S.down += 1;
  }
  if (S.down === 1) S.ltg = S.ours ? Math.min(S.spot + CHAIN, LEN) : Math.max(S.spot - CHAIN, 0);

  S.flow = null;
  S.draft = null;
  draw();
}

/* ── the field: drag or tap to place the ball ────────────────── */

function yardAt(clientX) {
  const r = field.getBoundingClientRect();
  const p = ((clientX - r.left) / r.width) * 100;
  return Math.max(0, Math.min(LEN, Math.round(((p - 9) / 82) * LEN)));
}

let dragging = false;
field.addEventListener('pointerdown', e => {
  if (S.draft === null) return;
  dragging = true;
  field.setPointerCapture(e.pointerId);
  S.draft = yardAt(e.clientX);
  draw();
});
field.addEventListener('pointermove', e => {
  if (!dragging) return;
  S.draft = yardAt(e.clientX);
  draw();
});
for (const ev of ['pointerup', 'pointercancel']) {
  field.addEventListener(ev, () => { dragging = false; });
}

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a) { a.dataset.act === 'commit' ? commit() : act(a.dataset.act); return; }
  const p = e.target.closest('[data-pick]');
  if (p) pick(Number(p.dataset.pick));
});

el('undo').addEventListener('click', () => {
  if (!history.length) return;
  S = history.pop();
  draw();
});

S = fresh();
draw();
