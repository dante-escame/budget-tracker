import Papa from "papaparse";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { autoTagCategory, inferInvestment } from "@/lib/tagging";
import Transaction from "@/models/Transaction";
import { TransactionInput } from "@/types/transaction";

function normalizeMonth(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toNumber(value: string) {
  return Number(value.replace(/\./g, "").replace(",", ".").trim());
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { csvContent } = body as { csvContent?: string };

  if (!csvContent) {
    return NextResponse.json({ error: "csvContent is required" }, { status: 400 });
  }

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: parsed.errors[0].message }, { status: 400 });
  }

  const transactions = parsed.data
    .map((row) => {
      const date = row.date ?? row.Date ?? "";
      const description = row.description ?? row.Description ?? "";
      const amountRaw = row.amount ?? row.Amount ?? "0";
      const amount = toNumber(amountRaw);

      if (!date || !description || Number.isNaN(amount)) return null;
      if (amount >= 0) return null;

      const month = normalizeMonth(date);
      const category = autoTagCategory(description);

      return {
        userId: session.user.id,
        date,
        description,
        amount: Math.abs(amount),
        month,
        category,
        credit: false,
        investment: inferInvestment(description),
      };
    })
    .filter((transaction): transaction is TransactionInput => transaction !== null);

  await connectToDatabase();
  await Transaction.insertMany(transactions);

  return NextResponse.json({ imported: transactions.length });
}
