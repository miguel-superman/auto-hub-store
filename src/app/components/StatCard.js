
"use client";

import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, icon: Icon, color = "blue" }) {
  const colors = {
    amber: {
      icon: "text-amber-600",
      background: "bg-amber-50",
      accent: "border-l-amber-500",
    },
    blue: {
      icon: "text-blue-600",
      background: "bg-blue-50",
      accent: "border-l-blue-500",
    },
    emerald: {
      icon: "text-emerald-600",
      background: "bg-emerald-50",
      accent: "border-l-emerald-500",
    },
    rose: {
      icon: "text-rose-600",
      background: "bg-rose-50",
      accent: "border-l-rose-500",
    },
  };

  const theme = colors[color] || colors.blue;

  return (
    <Card className={`border-l-4 ${theme.accent} shadow-sm`}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {value ?? 0}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.background}`}
        >
          <Icon className={`h-5 w-5 ${theme.icon}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
