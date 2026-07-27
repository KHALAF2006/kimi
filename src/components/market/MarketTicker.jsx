import React from "react";
import { Link } from "react-router-dom";
import LossFlagBadge from "@/components/market/LossFlagBadge";
import { formatNumber, quoteDirection } from "@/lib/market";
import { usePreferences } from "@/lib/preferences";

export default function MarketTicker({ rows = [] }) {
  const { language } = usePreferences();
  const ticker = rows.filter((row) => row.quote).slice(0, 80);
  if (!ticker.length) return null;
  const content = [...ticker, ...ticker];
  return <div className="market-ticker" aria-label={language === "ar" ? "شريط السوق" : "Market ticker"}>
    <div className="market-ticker-track">
      {content.map((row, index) => {
        const direction = quoteDirection(row.quote?.change_percent);
        const stateLabel = row.quote?.data_state?.label || "";
        return <Link key={row.symbol + "-" + index} to={"/dashboard?company=" + row.symbol} className="market-ticker-item" title={(language === "ar" ? "افتح " + row.name_ar : "Open " + row.name_en) + (stateLabel ? " · " + stateLabel : "")}>
          <span className="font-black">{row.symbol}</span>
          <span>{language === "ar" ? row.name_ar : row.name_en}</span>
          <b className={"market-" + direction} dir="ltr">{formatNumber(row.quote?.last_price, "en")}</b>
          <b className={"market-" + direction} dir="ltr">{Number(row.quote?.change_percent || 0) > 0 ? "+" : ""}{formatNumber(row.quote?.change_percent, "en")}%</b>
          <LossFlagBadge flag={row.warning_flag || row.loss_classification?.level} compact />
        </Link>;
      })}
    </div>
  </div>;
}
