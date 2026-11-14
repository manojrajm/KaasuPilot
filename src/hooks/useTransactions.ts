import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionFilters } from '@/domain/types';
import { transactionRepo } from '@/data/repositories/transactionRepo';

export function useTransactions() {
  const [filters, setFilters] = useState<TransactionFilters>({
    direction: 'all',
    searchQuery: '',
    categoryId: undefined,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState({
    totalIncomePaise: 0,
    totalExpensePaise: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  // Bumped by refresh() to force a reload outside the normal change feed.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    // Ignore results from a stale filter set or an unmounted screen.
    let active = true;
    const load = () => {
      Promise.all([transactionRepo.getAll(filters), transactionRepo.getMonthlyTotals()])
        .then(([list, calculatedTotals]) => {
          if (!active) return;
          setTransactions(list);
          setTotals(calculatedTotals);
        })
        .catch((error) => console.error('Failed to load transactions', error))
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    load();
    const unsubscribe = transactionRepo.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [filters, reloadToken]);

  const refresh = useCallback(() => setReloadToken((n) => n + 1), []);

  const setDirectionFilter = useCallback((direction: 'all' | 'debit' | 'credit') => {
    setFilters((prev) => ({ ...prev, direction }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, []);

  const setCategoryFilter = useCallback((categoryId?: string) => {
    setFilters((prev) => ({ ...prev, categoryId }));
  }, []);

  const setDateRange = useCallback((startDate?: string, endDate?: string) => {
    setFilters((prev) => ({ ...prev, startDate, endDate }));
  }, []);

  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id'>) => {
      return await transactionRepo.create(data);
    },
    []
  );

  const deleteTransaction = useCallback(async (id: string) => {
    return await transactionRepo.delete(id);
  }, []);

  return {
    transactions,
    totals,
    loading,
    filters,
    setDirectionFilter,
    setSearchQuery,
    setCategoryFilter,
    setDateRange,
    addTransaction,
    deleteTransaction,
    refresh,
  };
}
