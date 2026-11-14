import { useState, useEffect, useCallback, useMemo } from 'react';
import { transactionRepo } from '@/data/repositories/transactionRepo';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/data/seed/defaultCategories';
import { Category, Transaction } from '@/domain/types';
import { localMonthRangeIso } from '@/utils/date';

export interface CategorySpendBreakdown {
  category: Category;
  amountPaise: number;
  percentage: number;
  transactionCount: number;
}

export interface EnvelopeTier {
  title: string;
  subtitle: string;
  targetPercent: number;
  targetPaise: number;
  actualPaise: number;
  percentUsed: number;
  isOverBudget: boolean;
  categories: Category[];
}

export interface EnvelopeBudgetData {
  needs: EnvelopeTier;
  wants: EnvelopeTier;
  savings: EnvelopeTier;
}

export interface FinancialInsight {
  id: string;
  icon: string;
  title: string;
  messageTamil: string;
  messageEnglish: string;
  badge: string;
  badgeColor: string;
}

const NEEDS_CAT_IDS = new Set([
  'cat_groceries',
  'cat_bills',
  'cat_emi',
  'cat_loans',
  'cat_health',
  'cat_education',
  'cat_transport',
]);

const WANTS_CAT_IDS = new Set([
  'cat_food',
  'cat_shopping',
  'cat_entertainment',
  'cat_travel',
  'cat_expense_other',
]);

export function useFinancialAnalytics() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const monthLabel = useMemo(() => {
    return selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { startIso, endIso } = localMonthRangeIso(selectedDate);
      const allTxns = await transactionRepo.getAll();
      const filtered = allTxns.filter(
        (t) => t.status === 'confirmed' && t.txnDate >= startIso && t.txnDate < endIso
      );
      setTransactions(filtered);
    } catch (err) {
      console.error('Failed to load financial analytics', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
    const unsub = transactionRepo.subscribe(loadData);
    return () => unsub();
  }, [loadData]);

  const goToPrevMonth = useCallback(() => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Aggregates
  const { totalIncomePaise, totalExpensePaise, netSurplusPaise, savingsRatePercent } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      if (t.direction === 'credit') {
        income += t.amountPaise;
      } else {
        expense += t.amountPaise;
      }
    }

    const surplus = income - expense;
    const rate = income > 0 ? Math.round((Math.max(0, surplus) / income) * 100) : 0;

    return {
      totalIncomePaise: income,
      totalExpensePaise: expense,
      netSurplusPaise: surplus,
      savingsRatePercent: rate,
    };
  }, [transactions]);

  // Category Breakdown
  const categoryBreakdown = useMemo<CategorySpendBreakdown[]>(() => {
    const map = new Map<string, { amount: number; count: number }>();

    for (const t of transactions) {
      if (t.direction === 'debit') {
        const cur = map.get(t.categoryId) || { amount: 0, count: 0 };
        map.set(t.categoryId, { amount: cur.amount + t.amountPaise, count: cur.count + 1 });
      }
    }

    const result: CategorySpendBreakdown[] = [];
    const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

    map.forEach((val, catId) => {
      const cat = allCategories.find((c) => c.id === catId) || {
        id: catId,
        name: 'Other Outflow',
        iconName: 'other',
        emoji: '📦',
        color: '#8E9BB0',
        gradientColors: ['#8E9BB0', '#65738E'] as [string, string],
        categoryType: 'expense' as const,
        isSystem: false,
      };

      const pct = totalExpensePaise > 0 ? Math.round((val.amount / totalExpensePaise) * 100) : 0;
      result.push({
        category: cat,
        amountPaise: val.amount,
        percentage: pct,
        transactionCount: val.count,
      });
    });

    result.sort((a, b) => b.amountPaise - a.amountPaise);
    return result;
  }, [transactions, totalExpensePaise]);

  // 50/30/20 Envelope Breakdown
  const envelope = useMemo<EnvelopeBudgetData>(() => {
    const baseIncome = totalIncomePaise > 0 ? totalIncomePaise : totalExpensePaise;
    const needsTarget = Math.round(baseIncome * 0.5);
    const wantsTarget = Math.round(baseIncome * 0.3);
    const savingsTarget = Math.round(baseIncome * 0.2);

    let needsActual = 0;
    let wantsActual = 0;

    for (const t of transactions) {
      if (t.direction === 'debit') {
        if (NEEDS_CAT_IDS.has(t.categoryId)) {
          needsActual += t.amountPaise;
        } else {
          wantsActual += t.amountPaise;
        }
      }
    }

    const savingsActual = Math.max(0, netSurplusPaise);

    const needsUsed = needsTarget > 0 ? Math.round((needsActual / needsTarget) * 100) : 0;
    const wantsUsed = wantsTarget > 0 ? Math.round((wantsActual / wantsTarget) * 100) : 0;
    const savingsAchieved = savingsTarget > 0 ? Math.round((savingsActual / savingsTarget) * 100) : 0;

    return {
      needs: {
        title: 'ESSENTIAL NEEDS (50%)',
        subtitle: 'Groceries, EMI, Rent, Utilities, Health & Transit',
        targetPercent: 50,
        targetPaise: needsTarget,
        actualPaise: needsActual,
        percentUsed: needsUsed,
        isOverBudget: needsActual > needsTarget,
        categories: EXPENSE_CATEGORIES.filter((c) => NEEDS_CAT_IDS.has(c.id)),
      },
      wants: {
        title: 'DISCRETIONARY WANTS (30%)',
        subtitle: 'Dining, Shopping, Movies, Travel & Lifestyle',
        targetPercent: 30,
        targetPaise: wantsTarget,
        actualPaise: wantsActual,
        percentUsed: wantsUsed,
        isOverBudget: wantsActual > wantsTarget,
        categories: EXPENSE_CATEGORIES.filter((c) => WANTS_CAT_IDS.has(c.id)),
      },
      savings: {
        title: 'SAVINGS & SURPLUS (20%)',
        subtitle: 'Investments, Debt Prepayment & Cold Vault Buffer',
        targetPercent: 20,
        targetPaise: savingsTarget,
        actualPaise: savingsActual,
        percentUsed: savingsAchieved,
        isOverBudget: false,
        categories: [],
      },
    };
  }, [totalIncomePaise, totalExpensePaise, netSurplusPaise, transactions]);

  // Plain-Language Explanatory Insights
  const insights = useMemo<FinancialInsight[]>(() => {
    const list: FinancialInsight[] = [];

    // 1. Top Category Insight
    if (categoryBreakdown.length > 0) {
      const top = categoryBreakdown[0];
      list.push({
        id: 'top_cat',
        icon: top.category.emoji,
        title: `${top.category.name} Dominance`,
        messageTamil: `இந்த மாதத்தின் அதிகபட்ச செலவு ${top.category.name} (${top.percentage}%).`,
        messageEnglish: `${top.category.name} is your largest expense category at ${top.percentage}% of total outflows.`,
        badge: 'PRIMARY EXPENDITURE',
        badgeColor: '#00F0FF',
      });
    }

    // 2. Wants Budget Status
    if (envelope.wants.isOverBudget) {
      const overPaise = envelope.wants.actualPaise - envelope.wants.targetPaise;
      list.push({
        id: 'wants_alert',
        icon: '⚠️',
        title: 'Wants Budget Exceeded',
        messageTamil: `உங்கள் விரும்பிய செலவுகள் 30% வரம்பைத் தாண்டிவிட்டது. மிதப்படுத்தவும்.`,
        messageEnglish: `Discretionary spend exceeded the 30% rule. Curtail non-essential dining/shopping.`,
        badge: 'BUDGET VARIANCE',
        badgeColor: '#FF3B30',
      });
    } else if (envelope.wants.actualPaise > 0) {
      list.push({
        id: 'wants_good',
        icon: '🎯',
        title: 'Disciplined Discretionary Spending',
        messageTamil: `விருப்பச் செலவுகள் 30% வரம்பிற்குள் கட்டுப்பாட்டில் உள்ளது. நன்று!`,
        messageEnglish: `Wants spending is safely disciplined within your 30% envelope target.`,
        badge: 'OPTIMAL CONTROL',
        badgeColor: '#00E676',
      });
    }

    // 3. Savings Rate
    if (savingsRatePercent >= 20) {
      list.push({
        id: 'savings_rate',
        icon: '💎',
        title: 'High Savings Capital',
        messageTamil: `வருமானத்தில் ${savingsRatePercent}% சேமிக்கப்பட்டுள்ளது. இது நிதிச் சுதந்திரத்தை விரைவுபடுத்தும்!`,
        messageEnglish: `You are saving ${savingsRatePercent}% of inflows. Excellent cash-flow velocity.`,
        badge: 'FINANCIAL WEALTH',
        badgeColor: '#FFD700',
      });
    }

    return list;
  }, [categoryBreakdown, envelope, savingsRatePercent]);

  return {
    loading,
    selectedDate,
    monthLabel,
    totalIncomePaise,
    totalExpensePaise,
    netSurplusPaise,
    savingsRatePercent,
    categoryBreakdown,
    envelope,
    insights,
    goToPrevMonth,
    goToNextMonth,
  };
}
