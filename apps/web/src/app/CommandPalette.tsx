import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from './store';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onNewTransaction: () => void;
}

export function CommandPalette({ open, onClose, onNavigate, onNewTransaction }: CommandPaletteProps) {
  const transactions = useAppStore((state) => state.transactions);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const resetDemoData = useAppStore((state) => state.resetDemoData);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const commands = useMemo(() => {
    const base = [
      { label: 'Ir para Centro de Operações', action: () => onNavigate('dashboard') },
      { label: 'Ir para Movimentações', action: () => onNavigate('transactions') },
      { label: 'Ir para Cartões de Crédito', action: () => onNavigate('cards') },
      { label: 'Ir para Inteligência', action: () => onNavigate('analytics') },
      { label: 'Ir para Fluxo', action: () => onNavigate('cashflow') },
      { label: 'Novo lançamento', action: onNewTransaction },
      { label: 'Alternar tema claro/escuro', action: toggleTheme },
      { label: 'Restaurar dados demo', action: resetDemoData }
    ];

    const transactionCommands = transactions.slice(0, 8).map((transaction) => ({
      label: `Buscar: ${transaction.description}`,
      action: () => onNavigate('transactions')
    }));

    return [...base, ...transactionCommands].filter((command) =>
      command.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, transactions, onNavigate, onNewTransaction, toggleTheme, resetDemoData]);

  if (!open) return null;

  return (
    <div className="command-backdrop" onClick={onClose}>
      <div className="command-card" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          placeholder="Digite um comando ou procure algo..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="command-list">
          {commands.map((command) => (
            <button
              key={command.label}
              onClick={() => {
                command.action();
                onClose();
              }}
            >
              {command.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
