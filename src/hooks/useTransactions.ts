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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, calculatedTotals] = await Promise.all([
        transactionRepo.getAll(filters),
        transactionRepo.getMonthlyTotals(),
      ]);
      setTransactions(list);
      setTotals(calculatedTotals);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
    const unsubscribe = transactionRepo.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [loadData]);

  const setDirectionFilter = useCallback((direction: 'all' | 'debit' | 'credit') => {
    setFilters((prev) => ({ ...prev, direction }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, []);

  const setCategoryFilter = useCallback((categoryId?: string) => {
    setFilters((prev) => ({ ...prev, categoryId }));
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
    addTransaction,
    deleteTransaction,
    refresh: loadData,
  };
}
