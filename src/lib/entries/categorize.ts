import type { Entry } from '@/lib/entries/mongodb-documents';

/**
 * Lowercases, strips accents and collapses whitespace so that matching is
 * tolerant of diacritics and casing — e.g. `débito`/`DEBITO`/`debito` and
 * `SAÚDE`/`saude` all compare equal.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// The fields of a rule that matching actually needs. Both the serializable
// record and (after light mapping) the DB document satisfy this shape.
export type MatchableRule = Pick<
  Entry.TaggingRuleRecord,
  'pattern' | 'matchType' | 'category' | 'flow' | 'priority'
>;

/**
 * Returns the category of the first rule (by ascending priority) whose pattern
 * matches the transaction's text, or `null` when no rule applies. Pure — no I/O.
 */
export function matchCategory(
  description: string,
  merchant: string | null,
  flow: Entry.Flow,
  rules: readonly MatchableRule[]
): Entry.Category | null {
  const haystack = normalizeText(`${merchant ?? ''} ${description}`);

  const ordered = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of ordered) {
    if (rule.flow && rule.flow !== flow) continue;

    const needle = normalizeText(rule.pattern);
    if (needle.length === 0) continue;

    // Only 'contains' is supported today; future match types branch here.
    if (haystack.includes(needle)) {
      return rule.category;
    }
  }

  return null;
}

/**
 * A starter set of rules seeded for a user who has none yet, so the first import
 * isn't entirely `other_*`. These are inserted as ordinary, fully editable and
 * deletable rules — not hardcoded behavior. Patterns are matched accent- and
 * case-insensitively. Lower priority numbers win when several patterns match.
 */
export const DEFAULT_TAGGING_RULES: Entry.TaggingRuleInput[] = [
  // Dining
  { pattern: 'ifood', matchType: 'contains', category: 'dining', flow: 'outcome', priority: 10 },
  { pattern: 'rappi', matchType: 'contains', category: 'dining', flow: 'outcome', priority: 10 },
  { pattern: 'restaurante', matchType: 'contains', category: 'dining', flow: 'outcome', priority: 10 },
  { pattern: 'lanchone', matchType: 'contains', category: 'dining', flow: 'outcome', priority: 10 },
  { pattern: 'grill', matchType: 'contains', category: 'dining', flow: 'outcome', priority: 10 },
  { pattern: 'sorveteria', matchType: 'contains', category: 'dining', flow: 'outcome', priority: 10 },
  // Food / groceries
  { pattern: 'supermercado', matchType: 'contains', category: 'food', flow: 'outcome', priority: 20 },
  { pattern: 'covabra', matchType: 'contains', category: 'food', flow: 'outcome', priority: 20 },
  { pattern: 'atacad', matchType: 'contains', category: 'food', flow: 'outcome', priority: 20 },
  { pattern: 'hortifruti', matchType: 'contains', category: 'food', flow: 'outcome', priority: 20 },
  // Subscriptions
  { pattern: 'spotify', matchType: 'contains', category: 'subscriptions', flow: 'outcome', priority: 30 },
  { pattern: 'netflix', matchType: 'contains', category: 'subscriptions', flow: 'outcome', priority: 30 },
  { pattern: 'wellhub', matchType: 'contains', category: 'subscriptions', flow: 'outcome', priority: 30 },
  { pattern: 'gympass', matchType: 'contains', category: 'subscriptions', flow: 'outcome', priority: 30 },
  { pattern: 'disney', matchType: 'contains', category: 'subscriptions', flow: 'outcome', priority: 30 },
  // Entertainment
  { pattern: 'cinema', matchType: 'contains', category: 'entertainment', flow: 'outcome', priority: 40 },
  { pattern: 'centerplex', matchType: 'contains', category: 'entertainment', flow: 'outcome', priority: 40 },
  { pattern: 'ingresso', matchType: 'contains', category: 'entertainment', flow: 'outcome', priority: 40 },
  // Shopping
  { pattern: 'shopping', matchType: 'contains', category: 'shopping', flow: 'outcome', priority: 50 },
  // Transportation
  { pattern: 'uber', matchType: 'contains', category: 'transportation', flow: 'outcome', priority: 60 },
  { pattern: 'posto', matchType: 'contains', category: 'transportation', flow: 'outcome', priority: 60 },
  { pattern: 'combustivel', matchType: 'contains', category: 'transportation', flow: 'outcome', priority: 60 },
  { pattern: 'estacionamento', matchType: 'contains', category: 'transportation', flow: 'outcome', priority: 60 },
  // Health
  { pattern: 'farmacia', matchType: 'contains', category: 'health', flow: 'outcome', priority: 70 },
  { pattern: 'drogaria', matchType: 'contains', category: 'health', flow: 'outcome', priority: 70 },
  { pattern: 'hospital', matchType: 'contains', category: 'health', flow: 'outcome', priority: 70 },
  { pattern: 'clinica', matchType: 'contains', category: 'health', flow: 'outcome', priority: 70 },
  { pattern: 'laboratorio', matchType: 'contains', category: 'health', flow: 'outcome', priority: 70 },
  // Taxes
  { pattern: 'receita federal', matchType: 'contains', category: 'taxes', flow: 'outcome', priority: 80 },
  { pattern: 'darf', matchType: 'contains', category: 'taxes', flow: 'outcome', priority: 80 },
  { pattern: 'imposto', matchType: 'contains', category: 'taxes', flow: 'outcome', priority: 80 },
  // Financial (credit-card bill payment)
  { pattern: 'pagamento de fatura', matchType: 'contains', category: 'financial', flow: 'outcome', priority: 90 },
  // Income
  { pattern: 'estorno', matchType: 'contains', category: 'refund', flow: 'income', priority: 100 },
  { pattern: 'reembolso', matchType: 'contains', category: 'refund', flow: 'income', priority: 100 },
  { pattern: 'salario', matchType: 'contains', category: 'salary', flow: 'income', priority: 110 },
];
