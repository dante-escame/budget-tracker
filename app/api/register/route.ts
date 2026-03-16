import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    return NextResponse.json({ error: "This email is already registered." }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);

  await User.create({
    email,
    passwordHash,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
