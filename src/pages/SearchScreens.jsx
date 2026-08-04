import React from "react";
import PageHeader from "@/components/PageHeader";
import CatalogSearch from "@/components/market/CatalogSearch";
import { useActiveMarket } from "@/lib/MarketContext";

export default function SearchScreens() {
  const { market } = useActiveMarket();
  return <>
    <PageHeader title="البحث والقطاعات" description={`ابحث في ${market?.name_ar || "السوق المشترك فيه"} بالرمز أو الاسم أو التصنيف.`} />
    <CatalogSearch />
  </>;
}
