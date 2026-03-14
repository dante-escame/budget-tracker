import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import Transaction from "@/models/Transaction";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");

  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  await connectToDatabase();

  const transactions = await Transaction.find({ month }).lean();

  const byCategory = ["Essential", "Non-Essential", "Savings"].map((name) => ({
    name,
    value: transactions
      .filter((item) => item.category === name)
      .reduce((sum, current) => sum + current.amount, 0),
  }));

  const totalExpenses = transactions.reduce((sum, current) => sum + current.amount, 0);
  const creditTotal = transactions
    .filter((item) => item.credit)
    .reduce((sum, current) => sum + current.amount, 0);
  const investmentTotal = transactions
    .filter((item) => item.investment)
    .reduce((sum, current) => sum + current.amount, 0);

  return NextResponse.json({
    totalExpenses,
    byCategory,
    creditTotal,
    investmentTotal,
  });
}
