#!/usr/bin/env node
/**
 * Build step that deploys Convex only when a deploy key is present.
 *
 * Production (and any env with CONVEX_DEPLOY_KEY) runs `convex deploy`, which
 * pushes Convex functions/schema and then builds the app via its --cmd.
 *
 * Preview deploys have NO key by design — only Production carries
 * CONVEX_DEPLOY_KEY. (This comment used to name the owning team; it has been
 * wrong twice, since the project moved Heaven → dev-tec/tm-sot → se/back-ago
 * between 2026-06 and 2026-08. The team is not what gates the build, the
 * presence of the key is, so it is no longer named here.) Without this
 * guard, `convex deploy` aborts ("no Convex deployment configuration found")
 * and the whole preview build fails before it ever runs `vite build`. So when
 * the key is absent we skip Convex and just build the frontend. The app
 * tolerates a missing VITE_CONVEX_URL at runtime (see src/lib/convex-safe.ts).
 */

import { spawnSync } from 'node:child_process';

/** Run a binary with a fixed argument list (no shell — avoids injection). */
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(`Failed to start "${command}":`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const hasDeployKey = Boolean(process.env.CONVEX_DEPLOY_KEY);

if (hasDeployKey) {
  console.log('🔑 CONVEX_DEPLOY_KEY present → deploying Convex + building app');
  // convex runs the inner --cmd string in its own shell once the backend is ready.
  run('convex', ['deploy', '--yes', '--cmd', 'tsc -b && vite build']);
} else {
  console.log(
    '⏭️  No CONVEX_DEPLOY_KEY (preview build) → skipping convex deploy, building app only',
  );
  run('tsc', ['-b']);
  run('vite', ['build']);
}
