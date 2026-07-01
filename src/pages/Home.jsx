import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

const StatCard = ({ label, value, accent }) => (
  <div className="card px-5 py-4">
    <p className="tag-label mb-1.5">{label}</p>
    <p className={`text-2xl font-serif font-semibold ${accent ? "text-terracottaDark" : "text-ink"}`}>{value}</p>
  </div>
);

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

  return (
    <Layout title={t("home.title")} subtitle={t("home.subtitle")}>
      {error && <p className="text-terracottaDark mb-4">{error}</p>}

      {!data ? (
        <p className="tag-label">{t("home.loading")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label={t("home.totalRevenue")} value={`${data.totalRevenue.toLocaleString()} ${t("home.currency")}`} accent />
            <StatCard label={t("home.totalSold")} value={data.totalSoldItems} />
            <StatCard label={t("home.completedOrders")} value={data.totalOrdersCompleted} />
            <StatCard label={t("home.pendingOrders")} value={data.totalPendingOrders} />
            <StatCard label={t("home.totalProducts")} value={data.totalProducts} />
            <StatCard label={t("home.activeProducts")} value={data.totalActiveProducts} />
          </div>

          <div className="card px-6 py-6 mb-8">
            <p className="tag-label mb-4">{t("home.last7Days")}</p>
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

          <div className="card px-6 py-6">
            <p className="tag-label mb-4">{t("home.topProducts")}</p>
            {data.topProducts.length === 0 ? (
              <p className="text-muted text-sm">{t("home.noSales")}</p>
            ) : (
              <div className="divide-y divide-sand">
                {data.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-medium text-ink">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-ink">{p.quantity} {t("home.pcs")}</p>
                      <p className="text-xs text-muted">{p.revenue.toLocaleString()} {t("home.currency")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
};

export default Home;
