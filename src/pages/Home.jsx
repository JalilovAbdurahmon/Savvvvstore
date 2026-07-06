import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  "https://savvvvstore-backend-production.up.railway.app/api"
).replace(/\/api\/?$/, "");

// Eski nisbiy ("/uploads/..") va yangi to'liq ("https://..") rasm formatlarining ikkalasini qo'llab-quvvatlaydi
const getImageSrc = (image) => {
  if (!image) return null;
  return image.startsWith("http") ? image : `${API_ORIGIN}${image}`;
};

// Mahsulotning barcha rasmlarini (1-3 ta) to'liq URL massiviga aylantiradi
const getImageUrls = (product) => {
  if (product.images && product.images.length > 0) {
    return product.images.map((img) => getImageSrc(img));
  }
  return product.image ? [getImageSrc(product.image)] : [];
};

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

// Rasmni kattalashtirib ko'rsatish modali — bir nechta rasm bo'lsa,
// chap/o'ng strelka tugmalari orqali (faqat shunda) o'tish mumkin
const ImageLightbox = ({ images, initialIndex = 0, onClose }) => {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, images.length]);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] px-4 py-6" onClick={onClose}>
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          aria-label="Previous"
          className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-ink flex items-center justify-center shadow-lg hover:bg-white transition-colors text-xl z-10"
        >
          ‹
        </button>
      )}

      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-ink flex items-center justify-center shadow-md hover:bg-sand transition-colors z-10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <img src={images[index]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-tag" />
        {images.length > 1 && (
          <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          aria-label="Next"
          className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 text-ink flex items-center justify-center shadow-lg hover:bg-white transition-colors text-xl z-10"
        >
          ›
        </button>
      )}
    </div>
  );
};

const Home = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [viewGallery, setViewGallery] = useState(null); // { images: string[], index: number } | null
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

          {/* Barcha mahsulotlar — eng ko'p sotilgani tepada, ichki skroll bilan */}
          <div className="card px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <p className="tag-label">{t("home.topProducts")}</p>
              <span className="w-8 h-1 rounded-full bg-olive/60" />
            </div>
            {data.topProducts.length === 0 ? (
              <p className="text-muted text-sm py-4 text-center">{t("home.noSales")}</p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto overflow-x-hidden rounded-tag border border-sand">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-cream z-10">
                    <tr className="tag-label">
                      <th className="text-left font-semibold px-4 py-2.5 w-12">#</th>
                      <th className="text-left font-semibold px-4 py-2.5">
                        {t("home.productName", "Mahsulot")}
                      </th>
                      <th className="text-right font-semibold px-4 py-2.5">{t("home.pcs")}</th>
                      <th className="text-right font-semibold px-4 py-2.5">{t("home.currency")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand">
                    {data.topProducts.map((p, i) => {
                      const barWidth = maxQuantity > 0 ? (p.quantity / maxQuantity) * 100 : 0;
                      const noSales = p.quantity === 0;
                      const productImages = getImageUrls(p);
                      const imgSrc = productImages[0] || null;
                      return (
                        <tr
                          key={i}
                          className={`relative odd:bg-paper even:bg-cream/40 hover:bg-terracotta/5 transition-colors ${
                            noSales ? "opacity-60" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <span
                              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-serif font-semibold ${
                                noSales
                                  ? "bg-sand text-muted"
                                  : i === 0
                                  ? "bg-terracotta text-paper"
                                  : i === 1
                                  ? "bg-terracotta/20 text-terracottaDark"
                                  : i === 2
                                  ? "bg-olive/20 text-olive"
                                  : "bg-sand text-muted"
                              }`}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-ink">
                            <div className="flex items-center gap-2.5">
                              {imgSrc ? (
                                <div className="relative shrink-0">
                                  <img
                                    src={imgSrc}
                                    alt={p.name}
                                    onClick={() => setViewGallery({ images: productImages, index: 0 })}
                                    className="w-9 h-9 rounded-tag object-cover border border-sand cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                  {productImages.length > 1 && (
                                    <span className="absolute -bottom-1 -right-1 text-[8px] bg-ink/70 text-paper px-1 rounded">
                                      {productImages.length}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-tag bg-sand shrink-0" />
                              )}
                              <div className="relative min-w-0">
                                <span className="relative z-10 truncate block">{p.name}</span>
                                {!noSales && (
                                  <span
                                    className="absolute left-0 -bottom-1.5 h-[3px] rounded-full bg-terracotta/30"
                                    style={{ width: `${Math.max(barWidth, 6)}%` }}
                                  />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                            {noSales ? (
                              <span className="text-muted text-xs">{t("home.noSalesYet", "sotilmagan")}</span>
                            ) : (
                              p.quantity
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted whitespace-nowrap">
                            {p.revenue > 0 ? p.revenue.toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {viewGallery && (
        <ImageLightbox
          images={viewGallery.images}
          initialIndex={viewGallery.index}
          onClose={() => setViewGallery(null)}
        />
      )}
    </Layout>
  );
};

export default Home;