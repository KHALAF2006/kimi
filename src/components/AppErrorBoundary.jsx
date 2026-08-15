import React, { Component } from "react";
import { SessionLink } from "@/components/SessionLink";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("SMART_INVESTOR interface render failed", error?.message || "unknown_render_error");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50 p-5 text-right dark:bg-slate-950" dir="rtl" role="alert">
      <section className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-7 shadow-xl dark:border-red-500/30 dark:bg-slate-900">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">تعذر عرض هذه الصفحة</h1>
        <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">تم إيقاف الجزء المتعطل بدل ترك الموقع في صفحة بيضاء. ارجع إلى لوحة السوق ثم أعد فتح الشركة.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SessionLink className="primary-button" to="/dashboard">العودة إلى لوحة السوق</SessionLink>
          <button type="button" className="secondary-button" onClick={() => window.location.reload()}>إعادة تحميل الصفحة</button>
        </div>
      </section>
    </main>;
  }
}
