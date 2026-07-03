import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";
import { Phone, MapPin, Calendar, CheckCircle2, XCircle, Package } from "lucide-react";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  const statusStyles = {
    completed: {
      text: t("orderHistory.completed"),
      cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle2 size={14} className="text-emerald-600" />,
    },
    cancelled: {
      text: t("orderHistory.cancelled"),
      cls: "bg-rose-50 text-rose-700 border border-rose-200",
      icon: <XCircle size={14} className="text-rose-600" />,
    },
  };

  useEffect(() => {
    api
      .get("/orders/history")
      .then((res) => setOrders(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || t("orderHistory.errorLoad"))
      );
  }, []);

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleString(undefined, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const openLocation = (order) => {
    const lat = order.location?.lat;
    const lng = order.location?.lng;
    if (lat != null && lng != null) {
      window.open(
        `https://www.google.com/maps?q=${lat},${lng}`,
        "_blank",
        "noopener,noreferrer"
      );
    } else if (order.location?.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          order.location.address
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <Layout
      title={t("orderHistory.title")}
      subtitle={t("orderHistory.subtitle", { count: orders.length })}
    >
      {error && (
        <p className="text-terracottaDark mb-4 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Package size={36} className="text-muted" />
          <p className="text-muted">{t("orderHistory.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {orders.map((o) => {
            const status = statusStyles[o.status] || {
              text: o.status,
              cls: "bg-sand text-ink border border-sand",
              icon: null,
            };
            return (
              <div
                key={o._id}
                className="card p-5 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-200 border border-sand/60"
              >
                {/* Header: customer + status */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-base font-semibold text-ink">
                      {o.firstName || t("orderHistory.customer")}
                    </p>
                    {o.phoneNumber && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted">
                        <Phone size={14} />
                        <a
                          href={`tel:${o.phoneNumber}`}
                          className="hover:text-terracottaDark transition-colors"
                        >
                          {o.phoneNumber}
                        </a>
                      </div>
                    )}
                  </div>
                  <span
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-tag font-medium whitespace-nowrap ${status.cls}`}
                  >
                    {status.icon}
                    {status.text}
                  </span>
                </div>

                {/* Products */}
                <div className="border-t border-sand pt-3">
                  <p className="tag-label text-xs text-muted mb-1">
                    {t("orderHistory.products")}
                  </p>
                  <p className="text-sm text-ink/80 leading-relaxed">
                    {o.items.map((i) => `${i.name} (${i.size}) ×${i.quantity}`).join(", ")}
                  </p>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between">
                  <p className="tag-label text-xs text-muted">
                    {t("orderHistory.amount")}
                  </p>
                  <p className="text-lg font-semibold text-ink">
                    {o.totalPrice.toLocaleString()} {t("orderHistory.currency")}
                  </p>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-3 border-t border-sand pt-3 text-xs">
                  <div>
                    <p className="tag-label text-muted mb-1 flex items-center gap-1">
                      <Calendar size={12} />
                      {t("orderHistory.orderedAt", "Buyurtma vaqti")}
                    </p>
                    <p className="text-ink/80">{formatDate(o.createdAt)}</p>
                  </div>
                  <div>
                    <p className="tag-label text-muted mb-1 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {t("orderHistory.deliveredAt", "Yetkazilgan vaqt")}
                    </p>
                    <p className="text-ink/80">{formatDate(o.completedAt)}</p>
                  </div>
                </div>

                {/* Location button */}
                <div className="pt-1">
                  <button
                    onClick={() => openLocation(o)}
                    disabled={!o.location}
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-terracottaDark hover:text-white hover:border-terracottaDark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sand/40 disabled:hover:text-ink"
                  >
                    <MapPin size={16} />
                    {t("orderHistory.viewLocation", "Joylashuvni ko'rish")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default OrderHistory;