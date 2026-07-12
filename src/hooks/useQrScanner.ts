import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

/**
 * useQrScanner — camera QR reader for the Fotosíntesis scanner.
 *
 * Fast path: the native Barcode Detection API (Chrome / Android) — zero extra
 * bytes, decodes straight off the <video> in a rAF loop. Fallback: dynamically
 * imported `@zxing/browser` for browsers without it (notably iOS Safari and
 * some desktops). Either way the caller just supplies an `onDecode` callback
 * and renders the returned `videoRef`.
 *
 * Reads are de-duplicated: the same payload won't fire again within
 * `cooldownMs`, so a code sitting in frame doesn't spam the handler.
 *
 * Optical zoom: when the active camera track exposes a `zoom` capability
 * (most Android rear cameras do; iOS Safari generally does not), the hook
 * surfaces `zoomCaps` (min/max/step) and a `setZoom` setter so the operator can
 * magnify tiny printed QR labels that the fixed focal length can't resolve.
 */
export type ScannerState = 'idle' | 'starting' | 'scanning' | 'error';

export interface ZoomCapabilities {
  min: number;
  max: number;
  step: number;
}

export interface UseQrScannerOptions {
  onDecode: (text: string) => void;
  cooldownMs?: number;
}

export interface UseQrScannerReturn {
  videoRef: RefObject<HTMLVideoElement>;
  state: ScannerState;
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Current zoom factor (1 = no zoom). */
  zoom: number;
  /** Zoom range for the active camera, or null if it can't zoom. */
  zoomCaps: ZoomCapabilities | null;
  /** Apply an optical zoom factor to the live camera track. */
  setZoom: (value: number) => void;
}

// `zoom` is a well-supported but non-standard MediaStream constraint, absent
// from the DOM lib types — narrow local shapes keep the casts honest.
type ZoomCapabilityShape = { min: number; max: number; step?: number };

export function useQrScanner({
  onDecode,
  cooldownMs = 1500,
}: UseQrScannerOptions): UseQrScannerReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScannerState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoomState] = useState(1);
  const [zoomCaps, setZoomCaps] = useState<ZoomCapabilities | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const runningRef = useRef(false);
  const lastRef = useRef<{ text: string; t: number }>({ text: '', t: 0 });
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  const emit = useCallback(
    (text: string) => {
      const now = Date.now();
      if (
        text === lastRef.current.text &&
        now - lastRef.current.t < cooldownMs
      ) {
        return;
      }
      lastRef.current = { text, t: now };
      onDecodeRef.current(text);
    },
    [cooldownMs],
  );

  // Read the active track's zoom capability (if any) and expose it. Called once
  // the live stream is attached, for both the native and zxing code paths.
  const captureZoom = useCallback((track: MediaStreamTrack | null) => {
    trackRef.current = track;
    const caps = track?.getCapabilities?.() as
      | { zoom?: ZoomCapabilityShape }
      | undefined;
    if (caps?.zoom && typeof caps.zoom.max === 'number') {
      setZoomCaps({
        min: caps.zoom.min ?? 1,
        max: caps.zoom.max,
        step: caps.zoom.step ?? 0.1,
      });
      const settings = track?.getSettings?.() as { zoom?: number } | undefined;
      setZoomState(settings?.zoom ?? caps.zoom.min ?? 1);
    } else {
      setZoomCaps(null);
      setZoomState(1);
    }
  }, []);

  const setZoom = useCallback((value: number) => {
    const track = trackRef.current;
    if (!track) return;
    // `advanced: [{ zoom }]` — the only reliable way to set zoom across engines.
    (track.applyConstraints as (c: unknown) => Promise<void>)({
      advanced: [{ zoom: value }],
    }).catch(() => {
      /* out-of-range or unsupported — ignore, UI stays at the last value */
    });
    setZoomState(value);
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        /* already stopped */
      }
      zxingControlsRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
      } catch {
        /* noop */
      }
      v.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    trackRef.current = null;
    setZoomCaps(null);
    setZoomState(1);
    setState('idle');
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current) return;
    setError(null);
    setState('starting');
    runningRef.current = true;

    const NativeDetector =
      typeof window !== 'undefined' ? window.BarcodeDetector : undefined;

    try {
      if (NativeDetector) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        const v = videoRef.current;
        if (!v) {
          stop();
          return;
        }
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        await v.play().catch(() => {});
        captureZoom(stream.getVideoTracks()[0] ?? null);
        const detector = new NativeDetector({ formats: ['qr_code'] });
        setState('scanning');
        const tick = async () => {
          if (!runningRef.current) return;
          try {
            const codes = await detector.detect(v);
            if (codes && codes.length && codes[0].rawValue) {
              emit(codes[0].rawValue);
            }
          } catch {
            /* transient frame detach — keep looping */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Fallback: @zxing/browser (added as a dependency; run `npm install`).
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const v = videoRef.current;
      if (!v) {
        stop();
        return;
      }
      setState('scanning');
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        v,
        (result: { getText: () => string } | undefined | null) => {
          if (result) emit(result.getText());
        },
      );
      zxingControlsRef.current = controls;
      // zxing owns the stream internally; read it back off the <video> element.
      const zxStream = v.srcObject as MediaStream | null;
      captureZoom(zxStream?.getVideoTracks?.()[0] ?? null);
    } catch (err) {
      runningRef.current = false;
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = /permission|denied|notallowed/i.test(msg)
        ? 'Permiso de cámara denegado. Actívalo en el navegador para escanear.'
        : /notfound|no camera|devicesnotfound/i.test(msg)
          ? 'No se encontró una cámara en este dispositivo.'
          : `No se pudo iniciar la cámara: ${msg}`;
      setError(friendly);
      setState('error');
    }
  }, [emit, stop, captureZoom]);

  // Ensure the camera is released if the component unmounts mid-scan.
  useEffect(() => stop, [stop]);

  return { videoRef, state, error, start, stop, zoom, zoomCaps, setZoom };
}
