import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { CheckCircle2, AlertTriangle } from "lucide-react";

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

  // ---- Complete action ----
  const completeOrder = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/orders/${id}/complete`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
      toast.success(t("pendingOrders.completeSuccess"));
    } catch (err) {
      setError(err.response?.data?.message || t("pendingOrders.errorAction"));
      toast.error(err.response?.data?.message || t("pendingOrders.errorAction"));
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = (id) => {
    toast.custom(
      (toastItem) => (
        <div
          className={`flex items-start gap-3 bg-white border border-sand rounded-xl shadow-lg px-4 py-3.5 w-[340px] transition-all duration-200 ${
            toastItem.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{t("pendingOrders.confirmCompleteTitle")}</p>
            <p className="text-xs text-muted mt-0.5">{t("pendingOrders.confirmComplete")}</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => {
                  toast.dismiss(toastItem.id);
                  completeOrder(id);
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                {t("pendingOrders.confirmCompleteYes")}
              </button>
              <button
                onClick={() => toast.dismiss(toastItem.id)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-sand/70 transition-colors"
              >
                {t("pendingOrders.confirmCompleteCancel")}
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  };

  // ---- Cancel action ----
  const cancelOrder = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/orders/${id}/cancel`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
      toast.success(t("pendingOrders.cancelSuccess"));
    } catch (err) {
      setError(err.response?.data?.message || t("pendingOrders.errorAction"));
      toast.error(err.response?.data?.message || t("pendingOrders.errorAction"));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = (id) => {
    toast.custom(
      (toastItem) => (
        <div
          className={`flex items-start gap-3 bg-white border border-sand rounded-xl shadow-lg px-4 py-3.5 w-[340px] transition-all duration-200 ${
            toastItem.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{t("pendingOrders.confirmCancelTitle")}</p>
            <p className="text-xs text-muted mt-0.5">{t("pendingOrders.confirmCancel")}</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => {
                  toast.dismiss(toastItem.id);
                  cancelOrder(id);
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                {t("pendingOrders.confirmCancelYes")}
              </button>
              <button
                onClick={() => toast.dismiss(toastItem.id)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-sand/70 transition-colors"
              >
                {t("pendingOrders.confirmCancelCancel")}
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
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