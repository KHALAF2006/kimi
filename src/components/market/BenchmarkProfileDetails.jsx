import React from "react";
import { Landmark, Layers3 } from "lucide-react";

export default function BenchmarkProfileDetails({ instrument, isArabic }) {
  const related = isArabic ? instrument.related_companies_ar : instrument.related_companies_en;
  const type = instrument.instrument_type === "etf"
    ? (isArabic ? "صندوق متداول" : "Exchange-traded fund")
    : (isArabic ? "مؤشر سوق" : "Market index");
  return <section className="mt-4 grid gap-3 sm:grid-cols-2">
    <div className="metric-card"><span className="flex items-center gap-2"><Landmark size={14} />{isArabic ? "نوع الأداة" : "Instrument type"}</span><b>{type}</b><small>{isArabic ? "ضمن سوق المؤشرات والصناديق الأمريكية" : "U.S. indices and ETFs market"}</small></div>
    <div className="metric-card"><span className="flex items-center gap-2"><Layers3 size={14} />{isArabic ? "أبرز المكونات المرتبطة" : "Representative holdings"}</span><b className="leading-7">{Array.isArray(related) && related.length ? related.join(" · ") : "—"}</b><small>{isArabic ? "أمثلة تعريفية وليست قائمة أوزان لحظية" : "Representative examples, not live portfolio weights"}</small></div>
  </section>;
}