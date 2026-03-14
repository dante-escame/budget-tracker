import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import Transaction from "@/models/Transaction";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");

  await connectToDatabase();

  const query = month ? { month } : {};
  const transactions = await Transaction.find(query).sort({ date: 1 }).lean();

  return NextResponse.json({ transactions });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, credit, investment, category } = body as {
    id?: string;
    credit?: boolean;
    investment?: boolean;
    category?: "Essential" | "Non-Essential" | "Savings";
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await connectToDatabase();

  const updated = await Transaction.findByIdAndUpdate(
    id,
    { credit, investment, category },
    { new: true },
  ).lean();

  return NextResponse.json({ transaction: updated });
}
