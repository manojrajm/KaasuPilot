import { useEffect, useState } from 'react';
import { Account } from '@/domain/types';
import { accountRepo } from '@/data/repositories/accountRepo';

/**
 * Live account list (cards + Cash) and a lookup of every account ever created,
 * so transactions on archived cards can still show their name.
 */
export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [byId, setById] = useState<Record<string, Account>>({});

  useEffect(() => {
    let active = true;
    const load = () => {
      Promise.all([accountRepo.getAll(), accountRepo.getNameMap()])
        .then(([list, map]) => {
          if (!active) return;
          setAccounts(list);
          setById(map);
        })
        .catch((error) => console.error('Failed to load accounts', error));
    };
    load();
    const unsubscribe = accountRepo.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { accounts, byId };
}
