import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Package,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet'ning standart marker ikonkasi bundler (Vite/CRA) bilan ishlaganda
// yo'lini topa olmay, ko'rinmay qolishi mumkin — shuning uchun qo'lda belgilaymiz.
// (Agar PendingOrders.jsx'da ham ishga tushirilgan bo'lsa ham, bu yerda qayta
// chaqirish zararli emas — Leaflet buni ichkarida faqat bir marta qo'llaydi.)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const PAGE_SIZE = 4;

const API_ORIGIN = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

const resolveImageSrc = (img) => {
  if (!img) return null;
  return img.startsWith("http") ? img : `${API_ORIGIN}${img}`;
};

// Faqat matn manzil bor (koordinata yo'q) eski buyurtmalar uchun — tashqi
// Google Maps qidiruviga yo'naltiramiz, chunki aniq nuqta yo'q
const getExternalSearchUrl = (address) => {
  if (!address) return null;
  const trimmed = address.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    trimmed
  )}`;
};

// Belgilangan joyni o'zimizning sahifamiz ichida (Leaflet + OpenStreetMap) ko'rsatadigan modal.
// Bu xaritada foydalanuvchi bossa/surib-uzoqlashtirsa ham marker doim shu koordinatada qoladi,
// chunki xaritani Google emas, biz o'zimiz boshqaramiz — hech qanday API key shart emas.
const LocationMapModal = ({ lat, lng, addressLabel, onClose }) => {
  const externalUrl = `https://maps.google.com/?q=${lat},${lng}`;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-sand">
          <p className="text-sm font-medium text-ink truncate pr-2">
            {addressLabel || "Belgilangan manzil"}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center hover:bg-sand/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ height: "360px", width: "100%" }}>
          <MapContainer
            center={[lat, lng]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]}>
              <Popup>{addressLabel || "Buyurtma manzili"}</Popup>
            </Marker>
          </MapContainer>
        </div>

        <div className="px-4 py-3 border-t border-sand flex justify-end">
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-sky-700 hover:underline"
          >
            Google Maps ilovasida ochish ↗
          </a>
        </div>
      </div>
    </div>
  );
};

const ImageLightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] px-4 py-6"
      onClick={onClose}
    >
      <div
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-ink flex items-center justify-center shadow-md hover:bg-sand transition-colors z-10"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-tag"
        />
      </div>
    </div>
  );
};

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewImage, setViewImage] = useState(null);
  const [mapOrder, setMapOrder] = useState(null);
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
    toast.dismiss();
    return () => toast.dismiss();
  }, []);

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

  // Koordinata mavjud bo'lsa — o'z sahifamizdagi doimiy-marker xaritasini ochamiz.
  // Koordinata yo'q, faqat matn manzil bo'lgan eski buyurtmalar uchun — tashqi
  // Google Maps qidiruviga o'tamiz (chunki aniq nuqta yo'q, marker chizib bo'lmaydi).
  const openLocation = (order) => {
    const hasCoords =
      typeof order.latitude === "number" && typeof order.longitude === "number";

    if (hasCoords) {
      setMapOrder(order);
      return;
    }

    if (!order.address) return;
    const url = getExternalSearchUrl(order.address);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const deleteOrder = async (order) => {
    setDeletingId(order._id);
    try {
      await api.delete(`/orders/${order._id}`);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      toast.success(t("orderHistory.deleteSuccess"), {
        id: "order-delete-toast",
      });
    } catch (err) {
      setError(err.response?.data?.message || t("orderHistory.errorDelete"));
      toast.error(
        err.response?.data?.message || t("orderHistory.errorDelete"),
        { id: "order-delete-toast" }
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (order) => {
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
            <p className="text-sm font-semibold text-ink">
              {t("orderHistory.confirmDeleteTitle")}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {t("orderHistory.confirmDelete")}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => {
                  toast.dismiss(toastItem.id);
                  deleteOrder(order);
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                {t("orderHistory.confirmDeleteYes")}
              </button>
              <button
                onClick={() => toast.dismiss(toastItem.id)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-sand/70 transition-colors"
              >
                {t("orderHistory.confirmDeleteCancel")}
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  };

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));

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
              const hasLocation =
                (typeof o.latitude === "number" &&
                  typeof o.longitude === "number") ||
                Boolean(o.address);

              return (
                <div
                  key={o._id}
                  className="card p-3.5 flex flex-col gap-2.5 hover:shadow-lg transition-shadow duration-200 border border-sand/60 relative"
                >
                  <button
                    onClick={() => handleDelete(o)}
                    disabled={deletingId === o._id}
                    title={t("orderHistory.delete", "O'chirish")}
                    className="absolute top-4 right-3 p-1 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex items-start justify-between pr-7">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {o.firstName || t("orderHistory.customer")}{" "}
                        {o.username ? `(@${o.username})` : ""}
                      </p>
                      {o.phone && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted">
                          <Phone size={12} />

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
                      className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-tag font-medium whitespace-nowrap ${status.cls}`}
                    >
                      {status.icon}
                      {status.text}
                    </span>
                  </div>

                  <div className="border-t border-sand pt-2">
                    <p className="tag-label text-[11px] text-muted mb-1">
                      {t("orderHistory.products")}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {o.items.map((item, idx) => {
                        const imgSrc = resolveImageSrc(item.image);
                        const label =
                          item.name + " (" + item.size + ") x" + item.quantity;
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={item.name}
                                onClick={() =>
                                  setViewImage({ src: imgSrc, alt: item.name })
                                }
                                className="w-8 h-8 rounded-md object-cover cursor-pointer border border-sand hover:opacity-80 transition-opacity flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-sand/60 flex items-center justify-center flex-shrink-0">
                                <Package size={14} className="text-muted" />
                              </div>
                            )}
                            <p className="text-xs text-ink/80 leading-relaxed">
                              {label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="tag-label text-[11px] text-muted">
                      {t("orderHistory.amount")}
                    </p>
                    <p className="text-base font-semibold text-ink">
                      {o.totalPrice.toLocaleString()}{" "}
                      {t("orderHistory.currency")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-sand pt-2 text-[11px]">
                    <div>
                      <p className="tag-label text-muted mb-0.5 flex items-center gap-1">
                        {t("orderHistory.orderedAt")}
                      </p>
                      <p className="text-ink/80">{formatDate(o.createdAt)}</p>
                    </div>
                    <div>
                      <p className="tag-label text-muted mb-0.5 flex items-center gap-1">
                        {t("orderHistory.deliveredAt")}
                      </p>
                      <p className="text-ink/80">{formatDate(o.completedAt)}</p>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <button
                      onClick={() => openLocation(o)}
                      disabled={!hasLocation}
                      className="w-full flex items-center justify-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-sand bg-sand/40 text-ink hover:bg-terracottaDark hover:text-white hover:border-terracottaDark transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sand/40 disabled:hover:text-ink"
                    >
                      <MapPin size={14} />
                      {t("orderHistory.viewLocation")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

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

      {viewImage && (
        <ImageLightbox
          src={viewImage.src}
          alt={viewImage.alt}
          onClose={() => setViewImage(null)}
        />
      )}

      {mapOrder && (
        <LocationMapModal
          lat={mapOrder.latitude}
          lng={mapOrder.longitude}
          addressLabel={mapOrder.address}
          onClose={() => setMapOrder(null)}
        />
      )}
    </Layout>
  );
};

export default OrderHistory;
