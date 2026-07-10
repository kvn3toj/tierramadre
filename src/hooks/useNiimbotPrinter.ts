/**
 * useNiimbotPrinter — thin wrapper around @mmote/niimbluelib's Web Bluetooth
 * client for printing directly to the shop's NIIMBOT D11_H.
 *
 * `supported` gates the whole feature: Web Bluetooth only exists in
 * Chrome/Edge/Opera on Windows/macOS and Chrome on Android — never in
 * Safari (macOS or iOS) or Firefox. Callers MUST check `supported` and
 * render nothing (not a disabled button) when it's false — this hook does
 * not throw or degrade gracefully on unsupported browsers, the caller is
 * responsible for never invoking connect()/printLabel() there.
 *
 * Printer model is hardcoded to PrinterModel.D11_H (the shop's only
 * printer) — the library's own model auto-detection is documented as
 * unreliable, and a model-picker UI would be premature for a printer
 * fleet of one. The library does not print tasks by model name directly:
 * a model maps to a print *task* (protocol family) via `findPrintTask`.
 * For D11_H that resolves to the "D110M_V4" task (see deviation note in
 * task-5-report.md) — we resolve it via the library's own lookup table
 * rather than hardcoding the task name, so a library update that remaps
 * D11_H to a different task keeps working without a code change here.
 *
 * `@mmote/niimbluelib` MUST stay exact-pinned in package.json (no `^`/`~`)
 * — it's Alpha-stage (`0.0.1-alpha.x`) and its own README warns the API can
 * change between releases. Repo-root `.npmrc` sets `save-exact=true` so
 * future `npm install`s default to exact versions, but don't "helpfully"
 * widen this one by hand either.
 */

import { useCallback, useRef, useState } from 'react';
import {
  NiimbotBluetoothClient,
  ImageEncoder,
  PrinterModel,
  findPrintTask,
} from '@mmote/niimbluelib';

const PRINTER_MODEL = PrinterModel.D11_H;

export interface UseNiimbotPrinterReturn {
  supported: boolean;
  connected: boolean;
  connecting: boolean;
  printing: boolean;
  connect: () => Promise<void>;
  printLabel: (canvas: HTMLCanvasElement, quantity?: number) => Promise<void>;
}

export function useNiimbotPrinter(): UseNiimbotPrinterReturn {
  const supported =
    typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const clientRef = useRef<NiimbotBluetoothClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const connect = useCallback(async () => {
    if (!supported || connected || connecting) return;
    setConnecting(true);
    try {
      const client = new NiimbotBluetoothClient();
      client.on('disconnect', () => setConnected(false));
      await client.connect();
      clientRef.current = client;
      setConnected(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        // User cancelled the Bluetooth device picker — not a real error,
        // don't surface it as one.
        return;
      }
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [supported, connected, connecting]);

  const printLabel = useCallback(
    async (canvas: HTMLCanvasElement, quantity = 1) => {
      if (!supported) {
        throw new Error('Web Bluetooth no está disponible en este navegador.');
      }
      if (!clientRef.current) {
        await connect();
      }
      const client = clientRef.current;
      if (!client) {
        throw new Error('No se pudo conectar con la impresora.');
      }
      const taskName = findPrintTask(PRINTER_MODEL);
      if (!taskName) {
        throw new Error(
          'La biblioteca de impresión no reconoce el modelo D11_H.',
        );
      }
      setPrinting(true);
      try {
        const encoded = ImageEncoder.encodeCanvas(canvas, 'left');
        const printTask = client.abstraction.newPrintTask(taskName, {
          totalPages: quantity,
        });
        await printTask.printInit();
        await printTask.printPage(encoded, quantity);
        await printTask.waitForPageFinished();
        await printTask.waitForFinished();
        await printTask.printEnd();
      } finally {
        setPrinting(false);
      }
    },
    [supported, connect],
  );

  return { supported, connected, connecting, printing, connect, printLabel };
}
