import { Schema, model, models } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true },
    category: {
      type: String,
      enum: ["Essential", "Non-Essential", "Savings"],
      required: true,
    },
    credit: { type: Boolean, default: false },
    investment: { type: Boolean, default: false },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, month: 1, date: 1 });

const Transaction = models.Transaction || model("Transaction", transactionSchema);

export default Transaction;
