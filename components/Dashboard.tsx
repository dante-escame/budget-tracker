"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Category } from "@/types/transaction";

type UiTransaction = {
  _id: string;
  date: string;
  description: string;
  amount: number;
  month: string;
  category: Category;
  credit: boolean;
  investment: boolean;
};

type Summary = {
  totalExpenses: number;
  byCategory: Array<{ name: Category; value: number }>;
  creditTotal: number;
  investmentTotal: number;
};

const COLORS = ["#2563eb", "#f59e0b", "#22c55e"];

export default function Dashboard() {
  const [month, setMonth] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [transactions, setTransactions] = useState<UiTransaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (selectedMonth: string) => {
    const [txRes, sumRes] = await Promise.all([
      fetch(`/api/transactions?month=${selectedMonth}`),
      fetch(`/api/summary?month=${selectedMonth}`),
    ]);

    const txData = await txRes.json();
    const sumData = await sumRes.json();

    setTransactions(txData.transactions ?? []);
    setSummary(sumData);
  };

  const importStatement = async () => {
    if (!csvContent) return;
    setLoading(true);

    await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvContent }),
    });

    if (month) {
      await fetchData(month);
    }

    setLoading(false);
  };

  const updateTransaction = async (
    id: string,
    patch: Partial<Pick<UiTransaction, "category" | "credit" | "investment">>,
  ) => {
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });

    if (month) {
      await fetchData(month);
    }
  };

  const monthlyTotal = useMemo(
    () => summary?.totalExpenses.toLocaleString("en-US", { style: "currency", currency: "USD" }) ?? "$0.00",
    [summary],
  );

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <h2>1) Import bank statement (CSV)</h2>
        <p>
          Expected headers: <code>date,description,amount</code>. Outcome lines are negative amounts.
        </p>
        <textarea
          value={csvContent}
          onChange={(event) => setCsvContent(event.target.value)}
          placeholder="Paste CSV here"
          rows={8}
          style={{ width: "100%", borderRadius: 10, padding: 10 }}
        />
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={importStatement} disabled={loading || !csvContent}>
            {loading ? "Importing..." : "Import month statement"}
          </button>
        </div>
      </section>

      <section className="card">
        <h2>2) Select month</h2>
        <input
          type="month"
          value={month}
          onChange={async (event) => {
            const selected = event.target.value;
            setMonth(selected);
            if (selected) await fetchData(selected);
          }}
        />
        <p style={{ marginTop: 8 }}>Total month expenses: {monthlyTotal}</p>
      </section>

      <section className="grid cols-2">
        <div className="card" style={{ height: 320 }}>
          <h3>By category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={summary?.byCategory ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                {(summary?.byCategory ?? []).map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ height: 320 }}>
          <h3>Credit vs Investment</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                { name: "Credit", value: summary?.creditTotal ?? 0 },
                { name: "Investment", value: summary?.investmentTotal ?? 0 },
              ]}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card">
        <h2>3) Review transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Credit?</th>
              <th>Investment?</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item._id}>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td>{item.description}</td>
                <td>{item.amount.toFixed(2)}</td>
                <td>
                  <select
                    value={item.category}
                    onChange={(event) =>
                      updateTransaction(item._id, { category: event.target.value as Category })
                    }
                  >
                    <option>Essential</option>
                    <option>Non-Essential</option>
                    <option>Savings</option>
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={item.credit}
                    onChange={(event) =>
                      updateTransaction(item._id, { credit: event.target.checked })
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={item.investment}
                    onChange={(event) =>
                      updateTransaction(item._id, { investment: event.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
