import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useDirtyGuard } from "../src/hooks/useDirtyGuard";

describe("useDirtyGuard", () => {
  // No global testing-library setup file → unmount between tests so the
  // beforeunload listeners added by dirty renders don't leak into later ones.
  afterEach(() => cleanup());

  it("closes immediately when there are no changes", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useDirtyGuard({ dirty: false, onClose }),
    );
    act(() => result.current.guardedClose());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it("intercepts the close and opens the confirm when dirty", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useDirtyGuard({ dirty: true, onClose }),
    );
    act(() => result.current.guardedClose({}, "backdropClick"));
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(true);
  });

  it("requestClose (bare buttons) also routes through the guard", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useDirtyGuard({ dirty: true, onClose }),
    );
    act(() => result.current.requestClose());
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(true);
  });

  it("confirmDiscard closes the drawer and clears the prompt", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useDirtyGuard({ dirty: true, onClose }),
    );
    act(() => result.current.guardedClose());
    act(() => result.current.confirmDiscard());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it("cancelDiscard keeps the drawer open and clears only the prompt", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useDirtyGuard({ dirty: true, onClose }),
    );
    act(() => result.current.guardedClose());
    act(() => result.current.cancelDiscard());
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.confirmOpen).toBe(false);
  });

  it("disabled bypasses the guard even when dirty (e.g. mid-save)", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useDirtyGuard({ dirty: true, onClose, enabled: false }),
    );
    act(() => result.current.guardedClose());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.confirmOpen).toBe(false);
  });

  it("blocks tab close (beforeunload) only while dirty", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ dirty }) => useDirtyGuard({ dirty, onClose }),
      { initialProps: { dirty: true } },
    );

    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);

    rerender({ dirty: false });
    const cleanEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
  });
});
