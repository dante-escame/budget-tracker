import type { Entry } from '@/lib/entries/mongodb-documents';

// Human-readable labels for every category. Shared by the statement table and
// the tagging-rules UI so display stays consistent in one place.
export const CATEGORY_LABELS: Record<Entry.Category, string> = {
  not_categorized: 'Not Categorized',
  // Outcome
  housing: 'Housing',
  food: 'Food & Groceries',
  dining: 'Dining',
  transportation: 'Transportation',
  health: 'Health',
  entertainment: 'Entertainment',
  education: 'Education',
  shopping: 'Shopping',
  personal_care: 'Personal Care',
  travel: 'Travel',
  subscriptions: 'Subscriptions',
  financial: 'Financial',
  taxes: 'Taxes',
  pets: 'Pets',
  gifts: 'Gifts',
  investment: 'Investment',
  other_outcome: 'Other Outcome',
  // Income
  salary: 'Salary',
  freelance: 'Freelance',
  investment_return: 'Investment Return',
  rental_income: 'Rental Income',
  bonus: 'Bonus',
  gift_received: 'Gift Received',
  refund: 'Refund',
  other_income: 'Other Income',
};

// Categories grouped by flow, in display order, for select inputs.
export const OUTCOME_CATEGORIES: Entry.Category[] = [
  'not_categorized',
  'housing',
  'food',
  'dining',
  'transportation',
  'health',
  'entertainment',
  'education',
  'shopping',
  'personal_care',
  'travel',
  'subscriptions',
  'financial',
  'taxes',
  'pets',
  'gifts',
  'investment',
  'other_outcome',
];

export const INCOME_CATEGORIES: Entry.Category[] = [
  'not_categorized',
  'salary',
  'freelance',
  'investment_return',
  'rental_income',
  'bonus',
  'gift_received',
  'refund',
  'other_income',
];

export const ALL_CATEGORIES: Entry.Category[] = [
  ...OUTCOME_CATEGORIES,
  ...INCOME_CATEGORIES,
];

export function categoryLabel(category: Entry.Category): string {
  return CATEGORY_LABELS[category] ?? category;
}
