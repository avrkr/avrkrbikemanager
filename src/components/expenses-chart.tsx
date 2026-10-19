"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type MonthTotal = { month: string; fuel: number; maintenance: number; other: number };

export function ExpensesChart({ data }: { data: MonthTotal[] }) {
  return <div className="h-[260px] w-full min-w-0">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke="#303630" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "#929990", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#929990", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `₹${value}`} />
        <Tooltip contentStyle={{ background: "#191c19", border: "1px solid #394039", borderRadius: 4, color: "#f0f2ed", fontSize: 12 }} formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#a3aaa1" }} />
        <Bar dataKey="fuel" name="Fuel" stackId="a" fill="#d8fa56" radius={[0, 0, 0, 0]} />
        <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill="#79a99a" />
        <Bar dataKey="other" name="Other" stackId="a" fill="#e8b95d" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}