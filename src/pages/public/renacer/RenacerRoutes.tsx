/**
 * RenacerRoutes — the public route subtree of the Kit Renacer campaign.
 *
 * Mounted in App's InvitationRouter at `/renacer/*`, i.e. ABOVE the auth
 * check, so neither the landing nor any screen added here ever asks the person
 * who scanned a bracelet to sign in. Everything the campaign needs lives under
 * this subtree; adding a screen is adding a <Route> here, and it is public by
 * construction.
 *
 * The bracelet code lives under `m/` (`/renacer/m/TM-0042`) so the rest of the
 * `/renacer/*` namespace stays free for those screens — a bare `/renacer/:code`
 * would swallow every future path as if it were a code.
 *
 * An unknown campaign path lands on the landing rather than falling through to
 * the sign-in screen: a mistyped or truncated printed QR must never dead-end.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import RenacerPage from './RenacerPage';

export default function RenacerRoutes() {
  return (
    <Routes>
      <Route index element={<RenacerPage />} />
      <Route path="m/:code" element={<RenacerPage />} />
      <Route path="*" element={<Navigate to="/renacer" replace />} />
    </Routes>
  );
}
