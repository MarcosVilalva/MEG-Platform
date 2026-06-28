export type CategoryType = 'income' | 'expense' | 'transfer' | 'investment';

export interface CategoryProps {
  id?: string;
  name: string;
  group?: string;
  type?: CategoryType;
  isActive?: boolean;
}

export class Category {
  constructor(public readonly props: CategoryProps) {
    if (!props.name.trim()) {
      throw new Error('Nome da categoria obrigatório.');
    }
  }

  get label() {
    return this.props.group ? `${this.props.group} / ${this.props.name}` : this.props.name;
  }
}
