import React from "react";
import ServicePage from "@/components/ServicePage";
import DataNotice from "@/components/market/DataNotice";
import MarketTable from "@/components/market/MarketTable";
export default function Dashboard(){return <ServicePage title="نظرة السوق" description="بيانات مرجعية متأخرة مع المصدر ووقت آخر تحديث." functionName="marketRead" payload={{limit:100}}>{data=><><DataNotice text={data.notice}/><p className="mb-4 text-sm text-slate-400">يعرض {data.instruments?.length||0} من أصل {data.total||0} شركة</p><MarketTable rows={data.instruments}/></>}</ServicePage>}