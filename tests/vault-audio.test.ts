import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVaultAudio } from '../src/components/vault/audio/useVaultAudio';
import { VAULT_AUDIO_STORAGE_KEY } from '../src/components/vault/audio/samples';

describe('useVaultAudio', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts disabled when localStorage is empty', () => {
    const { result } = renderHook(() => useVaultAudio());
    expect(result.current.enabled).toBe(false);
  });

  it('reads "on" from localStorage on mount', () => {
    localStorage.setItem(VAULT_AUDIO_STORAGE_KEY, 'on');
    const { result } = renderHook(() => useVaultAudio());
    expect(result.current.enabled).toBe(true);
  });

  it('toggle persists state to localStorage', () => {
    const { result } = renderHook(() => useVaultAudio());
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
    expect(localStorage.getItem(VAULT_AUDIO_STORAGE_KEY)).toBe('on');
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(false);
    expect(localStorage.getItem(VAULT_AUDIO_STORAGE_KEY)).toBe('off');
  });

  it('play is a no-op when audio is disabled', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { result } = renderHook(() => useVaultAudio());
    await act(async () => {
      await result.current.play('click-suizo');
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('play swallows fetch failures silently', async () => {
    localStorage.setItem(VAULT_AUDIO_STORAGE_KEY, 'on');
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useVaultAudio());
    let threw = false;
    await act(async () => {
      try {
        await result.current.play('click-suizo');
      } catch {
        threw = true;
      }
    });
    expect(threw).toBe(false);
  });
});
