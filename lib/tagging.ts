import { ESSENTIAL_KEYWORDS, SAVINGS_KEYWORDS } from "@/lib/constants";
import { Category } from "@/types/transaction";

function hasAnyKeyword(description: string, keywords: string[]) {
  return keywords.some((keyword) =>
    description.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()),
  );
}

export function autoTagCategory(description: string): Category {
  if (hasAnyKeyword(description, SAVINGS_KEYWORDS)) {
    return "Savings";
  }

  if (hasAnyKeyword(description, ESSENTIAL_KEYWORDS)) {
    return "Essential";
  }

  return "Non-Essential";
}

export function inferInvestment(description: string): boolean {
  const normalized = description.toLocaleLowerCase();
  return (
    normalized.includes("invest") ||
    normalized.includes("ações") ||
    normalized.includes("coin") ||
    normalized.includes("pix")
  );
}
