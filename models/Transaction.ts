import { Schema, model, models } from "mongoose";

const transactionSchema = new Schema(
  {
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ["Essential", "Non-Essential", "Savings"],
      required: true,
      index: true,
    },
    credit: { type: Boolean, default: false },
    investment: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Transaction = models.Transaction || model("Transaction", transactionSchema);

export default Transaction;
