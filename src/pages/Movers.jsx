import React from "react";
import ServicePage from "@/components/ServicePage";
import MarketTable from "@/components/market/MarketTable";
import { useActiveMarket } from "@/lib/MarketContext";

export default function Movers() {
  const { marketCode } = useActiveMarket();
  return <ServicePage title="الأعلى والأقل والثابتة" description="فرز شركات السوق المفتوح حسب نسبة التغير." functionName="marketRead" payload={{ limit: 500, mode: "movers", market_code: marketCode }}>
    {(data) => {
      const rows = data.instruments || [];
      return <>
        <h2 className="mb-3 font-bold">الأعلى</h2><MarketTable rows={rows.slice(0, 10)} marketCode={marketCode} />
        <h2 className="mb-3 mt-8 font-bold">الأقل</h2><MarketTable rows={rows.slice(-10).reverse()} marketCode={marketCode} />
        <h2 className="mb-3 mt-8 font-bold">الثابتة</h2><MarketTable rows={rows.filter((item) => Number(item.quote?.change_percent || 0) === 0).slice(0, 10)} marketCode={marketCode} />
      </>;
    }}
  </ServicePage>;
}
