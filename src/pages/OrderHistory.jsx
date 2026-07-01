import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  const statusLabel = {
    completed: { text: t("orderHistory.completed"), cls: "status-completed" },
    cancelled: { text: t("orderHistory.cancelled"), cls: "status-cancelled" },
  };

  useEffect(() => {
    api
      .get("/orders/history")
      .then((res) => setOrders(res.data))
      .catch((err) => setError(err.response?.data?.message || t("orderHistory.errorLoad")));
  }, []);

  return (
    <Layout title={t("orderHistory.title")} subtitle={t("orderHistory.subtitle", { count: orders.length })}>
      {error && <p className="text-terracottaDark mb-4">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-muted">{t("orderHistory.empty")}</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left">
                <th className="tag-label px-5 py-3">{t("orderHistory.customer")}</th>
                <th className="tag-label px-5 py-3">{t("orderHistory.products")}</th>
                <th className="tag-label px-5 py-3">{t("orderHistory.amount")}</th>
                <th className="tag-label px-5 py-3">{t("orderHistory.status")}</th>
                <th className="tag-label px-5 py-3">{t("orderHistory.date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {orders.map((o) => (
                <tr key={o._id}>
                  <td className="px-5 py-3 text-ink/90">{o.firstName || t("orderHistory.customer")}</td>
                  <td className="px-5 py-3 text-ink/70">
                    {o.items.map((i) => `${i.name} (${i.size}) ×${i.quantity}`).join(", ")}
                  </td>
                  <td className="px-5 py-3 font-medium text-ink">
                    {o.totalPrice.toLocaleString()} {t("orderHistory.currency")}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-tag font-medium ${statusLabel[o.status]?.cls}`}>
                      {statusLabel[o.status]?.text || o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs">
                    {o.completedAt ? new Date(o.completedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default OrderHistory;
