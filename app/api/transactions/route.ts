import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Transaction from "@/models/Transaction";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const query = month ? { userId: session.user.id, month } : { userId: session.user.id };
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

  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const updated = await Transaction.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { credit, investment, category },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ transaction: updated });
}
