import React from "react";

export default function DataNotice({ text = "بيانات مرجعية متأخرة — المصدر والوقت موضحان" }) {
  return <div className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{text}</div>;
}