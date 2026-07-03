import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";
import {
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Package,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 4;

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
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
    if (!order.address) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleDelete = async (order) => {
    const confirmed = window.confirm(t("orderHistory.confirmDelete"));
    if (!confirmed) return;

    setDeletingId(order._id);
    try {
      await api.delete(`/orders/${order._id}`);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
    } catch (err) {
      setError(err.response?.data?.message || t("orderHistory.errorDelete"));
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Pagination logic ----
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));

  // Agar joriy sahifadagi elementlar o'chirilib ketsa yoki yangi order kelib
  // umumiy sahifalar soni kamaysa, currentPage ni chegaraga moslashtiramiz.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedOrders = orders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    // Ko'p sahifa bo'lsa ham max 5 ta tugma ko'rsatamiz
    const maxButtons = 5;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paginatedOrders.map((o) => {
              const status = statusStyles[o.status] || {
                text: o.status,
                cls: "bg-sand text-ink border border-sand",
                icon: null,
              };
              return (
                <div
                  key={o._id}
                  className="card p-5 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-200 border border-sand/60 relative"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(o)}
                    disabled={deletingId === o._id}
                    title={t("orderHistory.delete", "O'chirish")}
                    className="absolute top-5.5 right-4 p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Header: customer + status */}
                  <div className="flex items-start justify-between pr-8">
                    <div>
                      <p className="text-base font-semibold text-ink">
                        {o.firstName || t("orderHistory.customer")}
                      </p>
                      {o.phone && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted">
                          <Phone size={14} />
                          <a
                            href={`tel:${o.phone}`}
                            className="hover:text-terracottaDark transition-colors"
                          >
                            {o.phone}
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
                        {t("orderHistory.orderedAt")}
                      </p>
                      <p className="text-ink/80">{formatDate(o.createdAt)}</p>
                    </div>
                    <div>
                      <p className="tag-label text-muted mb-1 flex items-center gap-1">
                        {t("orderHistory.deliveredAt")}
                      </p>
                      <p className="text-ink/80">{formatDate(o.completedAt)}</p>
                    </div>
                  </div>

                  {/* Location button */}
                  <div className="pt-1">
                    <button
                      onClick={() => openLocation(o)}
                      disabled={!o.address}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-terracottaDark hover:text-white hover:border-terracottaDark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sand/40 disabled:hover:text-ink"
                    >
                      <MapPin size={16} />
                      {t("orderHistory.viewLocation")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 mt-8">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-terracottaDark hover:text-white hover:border-terracottaDark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sand/40 disabled:hover:text-ink"
                  aria-label={t("orderHistory.pagination.previous")}
                >
                  <ChevronLeft size={16} />
                </button>

                {getPageNumbers()[0] > 1 && (
                  <>
                    <button
                      onClick={() => goToPage(1)}
                      className="w-9 h-9 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-terracottaDark hover:text-white hover:border-terracottaDark transition-colors duration-200 text-sm font-medium"
                    >
                      1
                    </button>
                    <span className="text-muted px-1">…</span>
                  </>
                )}

                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors duration-200 ${
                      page === currentPage
                        ? "bg-terracottaDark text-white border-terracottaDark"
                        : "border-sand bg-sand/40 text-ink hover:bg-terracottaDark hover:text-white hover:border-terracottaDark"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                  <>
                    <span className="text-muted px-1">…</span>
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="w-9 h-9 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-terracottaDark hover:text-white hover:border-terracottaDark transition-colors duration-200 text-sm font-medium"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-terracottaDark hover:text-white hover:border-terracottaDark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sand/40 disabled:hover:text-ink"
                  aria-label={t("orderHistory.pagination.next")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <p className="text-xs text-muted">
                {t("orderHistory.pagination.pageInfo", {
                  current: currentPage,
                  total: totalPages,
                })}
              </p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default OrderHistory;