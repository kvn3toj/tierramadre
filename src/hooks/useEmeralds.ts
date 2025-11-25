import { useState, useEffect, useCallback } from 'react';
import { Emerald, EmeraldStatus } from '../types';
import { storage } from '../utils/storage';

export function useEmeralds() {
  const [emeralds, setEmeralds] = useState<Emerald[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setEmeralds(storage.getAllEmeralds());
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
  }, [refresh]);

  const addEmerald = useCallback(
    (emerald: Omit<Emerald, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newEmerald = storage.addEmerald(emerald);
      setEmeralds(prev => [...prev, newEmerald]);
      return newEmerald;
    },
    []
  );

  const updateEmerald = useCallback(
    (id: string, updates: Partial<Emerald>) => {
      const updated = storage.updateEmerald(id, updates);
      if (updated) {
        setEmeralds(prev =>
          prev.map(e => (e.id === id ? updated : e))
        );
      }
      return updated;
    },
    []
  );

  const deleteEmerald = useCallback((id: string) => {
    const success = storage.deleteEmerald(id);
    if (success) {
      setEmeralds(prev => prev.filter(e => e.id !== id));
    }
    return success;
  }, []);

  const updateStatus = useCallback(
    (id: string, status: EmeraldStatus) => {
      return updateEmerald(id, { status });
    },
    [updateEmerald]
  );

  const getByStatus = useCallback(
    (status: EmeraldStatus) => {
      return emeralds.filter(e => e.status === status);
    },
    [emeralds]
  );

  return {
    emeralds,
    loading,
    refresh,
    addEmerald,
    updateEmerald,
    deleteEmerald,
    updateStatus,
    getByStatus,
    availableCount: emeralds.filter(e => e.status === 'available').length,
    totalCount: emeralds.length,
  };
}
