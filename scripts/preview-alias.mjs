#!/usr/bin/env node
/**
 * Points the stable preview domain at the current branch's newest deployment.
 *
 * WHY THIS EXISTS
 * Google OAuth's "Authorized JavaScript origins" accepts exact origins only —
 * no wildcards, no patterns. So `*.vercel.app` and `*.preview.tierramadre.app`
 * can never be registered, and every new branch would otherwise need its own
 * Console entry before anyone can sign in to test it on a device.
 *
 * The way out is one stable origin registered once, re-pointed per branch.
 * That is all this script does.
 *
 * ONE-TIME SETUP (already done → skip):
 *   1. DNS at Hostinger:  CNAME  preview  ->  cname.vercel-dns.com
 *   2. vercel domains add preview.tierramadre.app tierra-madre-studio
 *   3. Google Cloud Console → project winged-scout-480001-a9 → Credentials →
 *      the web client → Authorized JavaScript origins → add
 *      https://preview.tierramadre.app
 *
 * USAGE
 *   npm run preview:alias              # current branch
 *   npm run preview:alias -- <branch>  # a specific branch
 *
 * TRADE-OFF: one branch at a time. For a parallel device test, register a
 * second subdomain (preview2) the same way and pass PREVIEW_DOMAIN.
 */

import { execFileSync } from 'node:child_process';

const PROJECT = process.env.VERCEL_PROJECT ?? 'tierra-madre-studio';
const DOMAIN = process.env.PREVIEW_DOMAIN ?? 'preview.tierramadre.app';

const run = (cmd, args) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

function fail(msg, hint) {
  console.error(`\n✗ ${msg}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

const branch =
  process.argv[2] ?? run('git', ['branch', '--show-current']).trim();

if (!branch) {
  fail(
    'Not on a branch (detached HEAD?).',
    'Pass one explicitly: npm run preview:alias -- my-branch',
  );
}
if (branch === 'main') {
  fail(
    'Refusing to alias `main`.',
    'main already deploys to production at tierramadre.app — aliasing it here would be misleading.',
  );
}

console.log(`branch  : ${branch}`);
console.log(`project : ${PROJECT}`);
console.log(`domain  : ${DOMAIN}\n`);

let listing;
try {
  listing = run('vercel', [
    'ls',
    PROJECT,
    '--meta',
    `githubCommitRef=${branch}`,
    '--yes',
  ]);
} catch (e) {
  fail(
    'Could not list deployments.',
    `Is the Vercel CLI logged in? Try: vercel whoami\n  ${String(
      e.stderr ?? e.message,
    )
      .trim()
      .slice(0, 200)}`,
  );
}

// `vercel ls` splits its output deliberately: the decorative table — the one
// with the Status column — goes to STDERR, while STDOUT is bare deployment
// URLs, newest first. That machine-readable stream is the contract to rely on.
//
// Do NOT try to filter on "Ready" here: there is no status text on stdout, so
// such a filter matches nothing and the script fails 100% of the time while
// looking perfectly reasonable. Readiness is verified against the served
// domain at the end instead.
const [newest] = listing.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g) ?? [];

if (!newest) {
  fail(
    `No deployment found for branch "${branch}".`,
    'Push the branch and let the build finish, then run this again.',
  );
}

console.log(`newest deployment: ${newest}`);

try {
  run('vercel', ['alias', 'set', newest, DOMAIN]);
} catch (e) {
  const err = String(e.stderr ?? e.message).trim();
  // The most common first-run failure is the domain not being attached yet.
  const missingDomain = /not found|does not exist|Cannot find domain/i.test(
    err,
  );
  fail(
    `Alias failed.`,
    missingDomain
      ? `${DOMAIN} is not attached to the project yet. Run the one-time setup at the top of this file.\n  ${err.slice(0, 200)}`
      : err.slice(0, 300),
  );
}

// Verify the OUTCOME rather than trusting intermediate CLI state: the newest
// deployment may still be building, in which case the alias is set but does not
// serve yet. Better to say so than to hand over a URL that 404s on the phone.
let served = null;
try {
  served = run('curl', [
    '-s',
    '-o',
    '/dev/null',
    '-w',
    '%{http_code}',
    '-m',
    '20',
    `https://${DOMAIN}/`,
  ]).trim();
} catch {
  /* curl missing or a network blip — fall through to the soft message */
}

console.log(`\n✓ https://${DOMAIN} -> ${branch}`);
if (served && /^(200|30\d|401|403)$/.test(served)) {
  console.log(
    `  Serving (HTTP ${served}). Sign-in works there because that exact`,
  );
  console.log('  origin is registered with the OAuth client.');
} else if (served) {
  console.log(
    `  ! Responded HTTP ${served} — the build may still be in flight.`,
  );
  console.log('    The alias is already set; give it a minute and reload.');
} else {
  console.log('  Could not verify over HTTP; open it in a browser to confirm.');
}
