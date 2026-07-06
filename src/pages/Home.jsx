import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

const TONES = {
  accent: {
    border: "border-l-terracotta",
    iconBg: "bg-terracotta/15",
    valueColor: "text-terracottaDark",
    cardBg: "bg-gradient-to-br from-terracotta/5 to-transparent",
  },
  blue: {
    border: "border-l-sky-400",
    iconBg: "bg-sky-100",
    valueColor: "text-sky-700",
    cardBg: "",
  },
  green: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-100",
    valueColor: "text-emerald-700",
    cardBg: "bg-emerald-50/40",
  },
  orange: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-100",
    valueColor: "text-amber-700",
    cardBg: "bg-amber-50/40",
  },
  slate: {
    border: "border-l-slate-400",
    iconBg: "bg-slate-100",
    valueColor: "text-ink",
    cardBg: "",
  },
  teal: {
    border: "border-l-teal-500",
    iconBg: "bg-teal-100",
    valueColor: "text-teal-700",
    cardBg: "bg-teal-50/40",
  },
};

// Reyting bo'yicha rang sxemasi — top 3 alohida (medal), qolganlari neytral
const RANK_STYLES = [
  {
    badge: "bg-gradient-to-br from-amber-400 to-amber-500 text-white",
    bar: "bg-gradient-to-r from-amber-400 to-amber-300",
    rowBg: "bg-amber-50/40",
    medal: "🥇",
  },
  {
    badge: "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
    bar: "bg-gradient-to-r from-slate-300 to-slate-200",
    rowBg: "bg-slate-50/50",
    medal: "🥈",
  },
  {
    badge: "bg-gradient-to-br from-orange-400 to-orange-500 text-white",
    bar: "bg-gradient-to-r from-orange-400 to-orange-300",
    rowBg: "bg-orange-50/40",
    medal: "🥉",
  },
  {
    badge: "bg-sand text-muted",
    bar: "bg-terracotta/40",
    rowBg: "",
    medal: null,
  },
];

const StatCard = ({ label, value, icon, tone = "slate" }) => {
  const s = TONES[tone];

  return (
    <div
      className={`card px-5 py-4 border-l-4 ${s.border} ${s.cardBg} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="tag-label mb-1.5">{label}</p>
          <p className={`text-2xl font-serif font-semibold ${s.valueColor}`}>{value}</p>
        </div>
        <span className={`flex items-center justify-center w-9 h-9 rounded-full text-base ${s.iconBg}`}>
          {icon}
        </span>
      </div>
    </div>
  );
};

const Home = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    api
      .get("/analytics/summary")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || t("home.errorDefault")));
  }, []);

  // Jadvaldagi nisbiy "mashhurlik" chizig'i uchun eng katta miqdorni topamiz
  const maxQuantity = data?.topProducts?.length
    ? Math.max(...data.topProducts.map((p) => p.quantity), 1)
    : 1;

  return (
    <Layout title={t("home.title")} subtitle={t("home.subtitle")}>
      {error && (
        <p className="text-terracottaDark bg-terracotta/10 border border-terracotta/30 rounded-tag px-4 py-2.5 mb-6">
          {error}
        </p>
      )}

      {!data ? (
        <div className="flex items-center gap-2 tag-label py-8">
          <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
          {t("home.loading")}
        </div>
      ) : (
        <>
          {/* Asosiy statistika kartalari */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="col-span-2 md:col-span-1">
              <StatCard
                label={t("home.totalRevenue")}
                value={`${data.totalRevenue.toLocaleString()} ${t("home.currency")}`}
                icon="💰"
                tone="accent"
              />
            </div>
            <StatCard label={t("home.totalSold")} value={data.totalSoldItems} icon="📦" tone="blue" />
            <StatCard label={t("home.completedOrders")} value={data.totalOrdersCompleted} icon="✅" tone="green" />
            <StatCard label={t("home.pendingOrders")} value={data.totalPendingOrders} icon="⏳" tone="orange" />
            <StatCard label={t("home.totalProducts")} value={data.totalProducts} icon="🗂️" tone="slate" />
            <StatCard label={t("home.activeProducts")} value={data.totalActiveProducts} icon="✨" tone="teal" />
          </div>

          {/* Diagramma — o'zgartirilmagan, aynan avvalgidek */}
          <div className="card px-6 py-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <p className="tag-label">{t("home.last7Days")}</p>
              <span className="w-8 h-1 rounded-full bg-terracotta/60" />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7DCC9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d.slice(5)}
                  tick={{ fill: "#8A7F6F", fontSize: 12 }}
                  axisLine={{ stroke: "#E7DCC9" }}
                />
                <YAxis tick={{ fill: "#8A7F6F", fontSize: 12 }} axisLine={{ stroke: "#E7DCC9" }} />
                <Tooltip
                  formatter={(value) => `${value.toLocaleString()} ${t("home.currency")}`}
                  contentStyle={{ background: "#FFFDF9", border: "1px solid #E7DCC9", borderRadius: 4 }}
                />
                <Bar dataKey="revenue" fill="#C2603D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Barcha mahsulotlar — reyting ko'rinishida, ranglar bilan, ichki skroll */}
          <div className="card px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <p className="tag-label">{t("home.topProducts")}</p>
              <span className="w-8 h-1 rounded-full bg-olive/60" />
            </div>
            {data.topProducts.length === 0 ? (
              <p className="text-muted text-sm py-4 text-center">{t("home.noSales")}</p>
            ) : (
              <div className="max-h-[440px] overflow-y-auto pr-1 space-y-2">
                {data.topProducts.map((p, i) => {
                  const barWidth = maxQuantity > 0 ? Math.max((p.quantity / maxQuantity) * 100, 4) : 0;
                  const noSales = p.quantity === 0;
                  const rankStyle = RANK_STYLES[i] || RANK_STYLES[3];

                  return (
                    <div
                      key={i}
                      className={`relative flex items-center gap-3 rounded-tag border border-sand/70 px-3 py-2.5 overflow-hidden transition-transform hover:scale-[1.01] ${
                        noSales ? "opacity-55" : "bg-paper"
                      } ${i < 3 && !noSales ? rankStyle.rowBg : ""}`}
                    >
                      {/* Fon bar — nisbiy sotuv miqdorini rang bilan ko'rsatadi */}
                      {!noSales && (
                        <div
                          className={`absolute inset-y-0 left-0 ${rankStyle.bar} opacity-25`}
                          style={{ width: `${barWidth}%` }}
                        />
                      )}

                      {/* Reyting belgisi */}
                      <span
                        className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm font-serif font-semibold shrink-0 shadow-sm ${
                          noSales ? "bg-sand text-muted" : rankStyle.badge
                        }`}
                      >
                        {!noSales && rankStyle.medal ? rankStyle.medal : i + 1}
                      </span>

                      {/* Nomi */}
                      <span className="relative z-10 font-medium text-ink flex-1 min-w-0 truncate">{p.name}</span>

                      {/* Miqdor va summa */}
                      <div className="relative z-10 text-right shrink-0">
                        {noSales ? (
                          <span className="text-muted text-xs">{t("home.noSalesYet", "sotilmagan")}</span>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-ink tabular-nums">
                              {p.quantity} <span className="text-xs font-normal text-muted">{t("home.pcs")}</span>
                            </p>
                            <p className="text-xs text-muted tabular-nums">
                              {p.revenue.toLocaleString()} {t("home.currency")}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
};

export default Home;