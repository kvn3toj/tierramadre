import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOverlayBackButton } from "../src/hooks/useOverlayBackButton";

/**
 * Simulates the user pressing hardware/browser Back. The hook listens to
 * `popstate`, so dispatching it drives the close path. Each test self-balances
 * the module-level overlay stack so the suite stays order-independent.
 */
function firePopState() {
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

describe("useOverlayBackButton", () => {
  let pushSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // pushState calls through (jsdom keeps the URL since no url arg is passed);
    // back() is stubbed so jsdom doesn't async-traverse during the test.
    pushSpy = vi.spyOn(window.history, "pushState");
    backSpy = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pushes exactly one synthetic history entry when the overlay opens", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }) => useOverlayBackButton(open, onClose),
      { initialProps: { open: false } },
    );
    expect(pushSpy).not.toHaveBeenCalled();

    rerender({ open: true });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    // Drain so the shared stack returns to baseline for the next test.
    firePopState();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the overlay on Back (popstate) WITHOUT calling history.back()", () => {
    const onClose = vi.fn();
    renderHook(() => useOverlayBackButton(true, onClose));
    expect(pushSpy).toHaveBeenCalledTimes(1);

    firePopState();
    // The browser already popped our entry — closing must not pop again.
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(backSpy).not.toHaveBeenCalled();
  });

  it("retracts its entry with one history.back() when closed from the UI, swallowing the echo", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }) => useOverlayBackButton(open, onClose),
      { initialProps: { open: true } },
    );
    expect(pushSpy).toHaveBeenCalledTimes(1);

    rerender({ open: false }); // dismissed from the UI (X / backdrop / Esc)
    expect(backSpy).toHaveBeenCalledTimes(1);

    // The popstate echo from our own back() must not re-trigger a close.
    firePopState();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not call history.back() again after a Back-press close", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }) => useOverlayBackButton(open, onClose),
      { initialProps: { open: true } },
    );

    firePopState(); // user pressed Back → overlay closes
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender({ open: false }); // consumer reacts; entry is already gone
    expect(backSpy).not.toHaveBeenCalled();
  });
});
