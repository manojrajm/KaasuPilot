import { Transaction, TransactionFilters } from '@/domain/types';

// Pre-seeded initial transactions stored strictly on the local device
let localTransactionsStore: Transaction[] = [
  {
    id: 'tx-1',
    accountId: 'acc_hdfc',
    amountPaise: 41200, // ₹ 412.00
    direction: 'debit',
    categoryId: 'cat_food',
    merchant: 'Swiggy Gourmet',
    note: 'Dinner with friends',
    txnDate: new Date().toISOString(),
    source: 'manual',
    status: 'confirmed',
  },
  {
    id: 'tx-2',
    accountId: 'acc_cash',
    amountPaise: 28000, // ₹ 280.00
    direction: 'debit',
    categoryId: 'cat_food',
    merchant: 'Blue Tokai Coffee',
    note: 'Iced Latte',
    txnDate: new Date(Date.now() - 3600000 * 4).toISOString(),
    source: 'manual',
    status: 'confirmed',
  },
  {
    id: 'tx-3',
    accountId: 'acc_hdfc',
    amountPaise: 150000, // ₹ 1,500.00
    direction: 'debit',
    categoryId: 'cat_transport',
    merchant: 'Shell Mobility Hub',
    note: 'Full tank petrol',
    txnDate: new Date(Date.now() - 86400000).toISOString(),
    source: 'sms',
    status: 'confirmed',
  },
  {
    id: 'tx-4',
    accountId: 'acc_icici',
    amountPaise: 1500000, // ₹ 15,000.00
    direction: 'credit',
    categoryId: 'cat_income',
    merchant: 'Consulting Retainer',
    note: 'Client project milestone',
    txnDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    source: 'manual',
    status: 'confirmed',
  },
  {
    id: 'tx-5',
    accountId: 'acc_card',
    amountPaise: 249900, // ₹ 2,499.00
    direction: 'debit',
    categoryId: 'cat_shopping',
    merchant: 'Amazon Super Value',
    note: 'Home essentials',
    txnDate: new Date(Date.now() - 86400000 * 4).toISOString(),
    source: 'sms',
    status: 'confirmed',
  },
  {
    id: 'tx-6',
    accountId: 'acc_hdfc',
    amountPaise: 19900, // ₹ 199.00
    direction: 'debit',
    categoryId: 'cat_entertainment',
    merchant: 'Apple Services Sub',
    note: 'iCloud 200GB',
    txnDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    source: 'sms',
    status: 'confirmed',
  },
  {
    id: 'tx-7',
    accountId: 'acc_hdfc',
    amountPaise: 6200000, // ₹ 62,000.00
    direction: 'credit',
    categoryId: 'cat_income',
    merchant: 'Salary Credit • ACME Tech',
    note: 'Monthly salary credit',
    txnDate: new Date(Date.now() - 86400000 * 12).toISOString(),
    source: 'sms',
    status: 'confirmed',
  },
  {
    id: 'tx-8',
    accountId: 'acc_hdfc',
    amountPaise: 845000, // ₹ 8,450.00
    direction: 'debit',
    categoryId: 'cat_emi',
    merchant: 'HDFC Auto Loan EMI',
    note: 'Installment #36 of 60',
    txnDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    source: 'manual',
    status: 'confirmed',
  },
];

type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export const transactionRepo = {
  subscribe(callback: ChangeListener) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    let list = [...localTransactionsStore];

    if (filters?.direction && filters.direction !== 'all') {
      list = list.filter((t) => t.direction === filters.direction);
    }

    if (filters?.categoryId) {
      list = list.filter((t) => t.categoryId === filters.categoryId);
    }

    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.merchant.toLowerCase().includes(q) ||
          (t.note && t.note.toLowerCase().includes(q))
      );
    }

    // Sort descending by date
    list.sort(
      (a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime()
    );

    return list;
  },

  async create(data: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTxn: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };

    localTransactionsStore.unshift(newTxn);
    notifyListeners();
    return newTxn;
  },

  async delete(id: string): Promise<boolean> {
    const prevLen = localTransactionsStore.length;
    localTransactionsStore = localTransactionsStore.filter((t) => t.id !== id);
    if (localTransactionsStore.length !== prevLen) {
      notifyListeners();
      return true;
    }
    return false;
  },

  async getMonthlyTotals(): Promise<{
    totalIncomePaise: number;
    totalExpensePaise: number;
    count: number;
  }> {
    let totalIncomePaise = 0;
    let totalExpensePaise = 0;

    localTransactionsStore.forEach((tx) => {
      if (tx.direction === 'credit') {
        totalIncomePaise += tx.amountPaise;
      } else {
        totalExpensePaise += tx.amountPaise;
      }
    });

    return {
      totalIncomePaise,
      totalExpensePaise,
      count: localTransactionsStore.length,
    };
  },
};
