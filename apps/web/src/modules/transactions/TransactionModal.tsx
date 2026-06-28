import { useEffect, useState } from 'react';
import { MEGButton } from '@ui';
import { useAppStore } from '../../app/store';
import type { LegacyTransaction } from '@core/finance/events';

interface TransactionModalProps {
  open: boolean;
  editing?: LegacyTransaction | null;
  onClose: () => void;
}

export function TransactionModal({ open, editing, onClose }: TransactionModalProps) {
  const addTransaction = useAppStore((state) => state.addTransaction);
  const updateTransaction = useAppStore((state) => state.updateTransaction);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState('2026-06-20');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [group, setGroup] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('Santander');
  const [paymentMethod, setPaymentMethod] = useState('PIX');

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setType((editing.type as 'income' | 'expense') || 'expense');
      setDate(editing.date || '2026-06-20');
      setDescription(editing.description || '');
      setAmount(String(editing.amount ?? editing.incomeAmount ?? editing.expenseAmount ?? ''));
      setGroup(editing.group || '');
      setCategory(editing.category || '');
      setAccount(editing.account || 'Santander');
      setPaymentMethod(editing.paymentMethod || 'PIX');
      return;
    }

    setType('expense');
    setDate('2026-06-20');
    setDescription('');
    setAmount('');
    setGroup('');
    setCategory('');
    setAccount('Santander');
    setPaymentMethod('PIX');
  }, [open, editing]);

  if (!open) return null;

  function submit() {
    const value = Number(String(amount).replace(',', '.')) || 0;

    if (!description.trim() || value <= 0) {
      alert('Informe descrição e valor válido.');
      return;
    }

    const payload: LegacyTransaction = {
      id: editing?.id || crypto.randomUUID(),
      type,
      date,
      description,
      amount: value,
      account,
      paymentMethod,
      status: editing?.status || (type === 'income' ? 'paid' : 'planned'),
      situation: editing?.situation || (type === 'income' ? 'PAGO' : 'PENDENTE'),
      group: group || (type === 'income' ? 'Renda' : 'Não informado'),
      category
    };

    if (editing) {
      updateTransaction(editing.id, payload);
    } else {
      addTransaction(payload);
    }

    onClose();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <header>
          <div>
            <span>{editing ? 'Editar evento' : 'Novo evento'}</span>
            <h2>{editing ? 'Editar lançamento financeiro' : 'Lançamento financeiro'}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>×</button>
        </header>

        <div className="form-grid">
          <label>
            Tipo
            <select value={type} onChange={(event) => setType(event.target.value as 'income' | 'expense')}>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </label>

          <label>
            Data
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          <label className="span-2">
            Descrição
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Energia elétrica" />
          </label>

          <label>
            Valor
            <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" />
          </label>

          <label>
            Conta
            <input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="Ex.: Santander" />
          </label>

          <label>
            Grupo
            <input value={group} onChange={(event) => setGroup(event.target.value)} placeholder="Ex.: Moradia" />
          </label>

          <label>
            Categoria
            <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: Energia" />
          </label>

          <label>
            Forma de pagamento
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option>PIX</option>
              <option>Boleto</option>
              <option>Cartão de crédito</option>
              <option>Cartão de débito</option>
              <option>Transferência</option>
              <option>Dinheiro</option>
            </select>
          </label>
        </div>

        <footer>
          <MEGButton variant="ghost" onClick={onClose}>Cancelar</MEGButton>
          <MEGButton onClick={submit}>{editing ? 'Salvar alterações' : 'Salvar lançamento'}</MEGButton>
        </footer>
      </div>
    </div>
  );
}
