export type AccountType = 'checking' | 'savings' | 'cash' | 'investment' | 'credit';

export interface AccountProps {
  id?: string;
  name: string;
  type: AccountType;
  institution?: string;
  openingBalance?: number;
  isActive?: boolean;
}

export class Account {
  constructor(public readonly props: AccountProps) {
    if (!props.name.trim()) {
      throw new Error('Nome da conta obrigatório.');
    }
  }

  get isActive() {
    return this.props.isActive ?? true;
  }
}
