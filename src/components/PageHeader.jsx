import React from "react";
export default function PageHeader({ title, description = "", action = null }) {
  return <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div><h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{title}</h1>{description&&<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}</div>{action}
  </div>;
}
