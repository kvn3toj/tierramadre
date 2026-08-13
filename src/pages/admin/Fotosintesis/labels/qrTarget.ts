/**
 * The URL every printed item QR encodes, shared by all label layouts so a
 * change here can never leave one layout pointing somewhere else.
 *
 * `HTTPS://TIERRAMADRE.APP/P/<id>` (the short `/p/:itemId` alias, in
 * UPPERCASE): uppercase makes the QR encode in *alphanumeric* mode, so even
 * with the `HTTPS://` scheme the symbol stays a low-density version-2 (25×25)
 * that prints/scans off tiny 12 mm tape — and off the 15 mm halves of the 2-up
 * layout, where the module size has the least headroom of anywhere in the app.
 *
 * The scheme matters — a scheme-less payload (`tierramadre.app/...`) makes some
 * scanners run a Google search instead of opening the link. Resolves the same
 * item (React Router is case-insensitive; parseTmQr lower-cases the `/p/`
 * segment); itemIds are numeric/uppercase so no case is lost.
 *
 * Lengthening this string is not free: at 32+ alphanumeric characters the
 * symbol tips into version 3 (29×29), shrinking every module by ~14% on stock
 * that has none to give.
 */
export const QR_TARGET_BASE = 'HTTPS://TIERRAMADRE.APP/P/';
