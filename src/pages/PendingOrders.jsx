import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

const OrderCard = ({ order, onComplete, onCancel, busy, t }) => (
  <div className="card px-5 py-4">
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="font-medium text-ink">
          {order.firstName || t("pendingOrders.customer")} {order.username ? `(@${order.username})` : ""}
        </p>
        <p className="text-xs text-muted mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
      </div>
      <span className="status-pending text-xs px-2.5 py-1 rounded-tag font-medium">{t("pendingOrders.pending")}</span>
    </div>

    <div className="text-sm text-ink/80 space-y-1 mb-3">
      {order.phone && <p>📞 {order.phone}</p>}
      {order.address && <p>📍 {order.address}</p>}
    </div>

    <div className="divide-y divide-sand border-t border-sand">
      {order.items.map((item, i) => (
        <div key={i} className="flex items-center justify-between py-2 text-sm">
          <span className="text-ink/90">
            {item.name} <span className="text-muted">({item.size})</span> × {item.quantity}
          </span>
          <span className="text-ink font-medium">
            {(item.price * item.quantity).toLocaleString()} {t("pendingOrders.currency")}
          </span>
        </div>
      ))}
    </div>

    <div className="flex items-center justify-between mt-3 pt-3 border-t border-sand">
      <p className="font-serif font-semibold text-lg text-terracottaDark">
        {order.totalPrice.toLocaleString()} {t("pendingOrders.currency")}
      </p>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => onCancel(order._id)}
          className="text-xs px-3 py-1.5 rounded-tag border border-ink/20 text-ink/70 hover:border-ink/40 transition-colors"
        >
          {t("pendingOrders.cancel")}
        </button>
        <button disabled={busy} onClick={() => onComplete(order._id)} className="btn-primary text-xs py-1.5">
          {t("pendingOrders.complete")}
        </button>
      </div>
    </div>
  </div>
);

const PendingOrders = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const { t } = useTranslation();

  const load = () => {
    api
      .get("/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => setError(err.response?.data?.message || t("pendingOrders.errorLoad")));
  };

  useEffect(load, []);

  const handleComplete = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/orders/${id}/complete`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || t("pendingOrders.errorAction"));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm(t("pendingOrders.confirmCancel"))) return;
    setBusyId(id);
    try {
      await api.put(`/orders/${id}/cancel`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || t("pendingOrders.errorAction"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout title={t("pendingOrders.title")} subtitle={t("pendingOrders.subtitle", { count: orders.length })}>
      {error && <p className="text-terracottaDark mb-4">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-muted">{t("pendingOrders.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {orders.map((o) => (
            <OrderCard
              key={o._id}
              order={o}
              onComplete={handleComplete}
              onCancel={handleCancel}
              busy={busyId === o._id}
              t={t}
            />
          ))}
        </div>
      )}
    </Layout>
  );
};

export default PendingOrders;
