export type Category = "Essential" | "Non-Essential" | "Savings";

export interface TransactionInput {
  date: string;
  description: string;
  amount: number;
  month: string;
  category: Category;
  credit?: boolean;
  investment?: boolean;
}

export interface Summary {
  totalExpenses: number;
  byCategory: Array<{ name: Category; value: number }>;
  creditTotal: number;
  investmentTotal: number;
}
