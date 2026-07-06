import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";
import api from "../api/axios.js";

const SEEN_KEY = "seenPendingOrderIds";
const POLL_INTERVAL = 5000; // 5 soniyada bir marta tekshiradi, refresh shart emas

const loadSeenIds = () => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveSeenIds = (idsSet) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...idsSet]));
  } catch {
    // localStorage ishlamasa ham ilova ishlashda davom etadi
  }
};

// Oddiy bell (qo'ng'iroq) ikonkasi — tashqi kutubxonasiz
const BellIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Sidebar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [pendingCount, setPendingCount] = useState(0);
  const seenIdsRef = useRef(loadSeenIds());

  // Yangi buyurtmalarni fon rejimida tekshirib turadi — refresh shart emas.
  // Faqat tizimga kirilgan bo'lsa ishlaydi (login sahifasida so'rov yubormaydi).
  useEffect(() => {
    if (!admin) {
      setPendingCount(0);
      return;
    }

    const fetchPending = async () => {
      try {
        // Backend'da yangi (pending) buyurtmalar shu yo'l orqali qaytadi
        // (routes/orders.js dagi GET "/" — status: "pending" bo'yicha filtrlangan)
        const res = await api.get("/orders");
        const orders = Array.isArray(res.data) ? res.data : [];
        const currentIds = orders.map((o) => o._id);

        // Foydalanuvchi hozir "Yangi buyurtmalar" sahifasida bo'lsa —
        // joriy buyurtmalarning barchasi "ko'rilgan" deb belgilanadi,
        // shu bilan bell'dagi son 0 bo'ladi
        if (location.pathname === "/orders/pending") {
          seenIdsRef.current = new Set(currentIds);
          saveSeenIds(seenIdsRef.current);
          setPendingCount(0);
          return;
        }

        const unseenCount = currentIds.filter(
          (id) => !seenIdsRef.current.has(id)
        ).length;
        setPendingCount(unseenCount);
      } catch {
        // internet uzilishi va h.k. holatlarda jim qoladi
      }
    };

    fetchPending(); // sahifa/route o'zgarganda darhol tekshiradi
    const interval = setInterval(fetchPending, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [admin, location.pathname]);

  const navItems = [
    { to: "/", label: t("nav.overview"), icon: "01" },
    { to: "/products/add", label: t("nav.addProduct"), icon: "02" },
    { to: "/products", label: t("nav.products"), icon: "03" },
    { to: "/orders/pending", label: t("nav.pendingOrders"), icon: "04" },
    { to: "/orders/history", label: t("nav.orderHistory"), icon: "05" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
  };

  return (
    <aside className="w-64 shrink-0 bg-paper border-r border-sand h-screen sticky top-0 flex flex-col overflow-y-auto">
      <div className="px-6 py-7 border-b border-sand">
        <p className="tag-label mb-1">{t("nav.adminPanel")}</p>
        <h1 className="text-2xl font-serif font-semibold text-ink leading-tight">
          Savvvv Store
        </h1>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-tag text-sm font-medium transition-colors ${
                isActive
                  ? "bg-terracotta/10 text-terracottaDark border border-terracotta/30"
                  : "text-ink/70 hover:bg-sand/60 border border-transparent"
              }`
            }
          >
            <span className="text-[14px] tracking-widest text-muted font-mono">
              {item.icon}
            </span>
            <span className="text-[16px] flex-1">{item.label}</span>

            {item.to === "/orders/pending" && (
              <span className="relative inline-flex items-center justify-center w-5 h-5 text-ink/50 shrink-0">
                <BellIcon />
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-terracottaDark text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-sand">
        <p className="tag-label mb-2">Til / Язык</p>
        <div className="flex gap-2">
          <button
            onClick={() => changeLang("uz")}
            className={`text-xs px-3 py-1.5 rounded-tag border transition-colors ${
              i18n.language === "uz"
                ? "bg-terracotta/10 text-terracottaDark border-terracotta/30 font-semibold"
                : "text-ink/60 border-sand hover:bg-sand/60"
            }`}
          >
            {t("lang.uz")}
          </button>
          <button
            onClick={() => changeLang("ru")}
            className={`text-xs px-3 py-1.5 rounded-tag border transition-colors ${
              i18n.language === "ru"
                ? "bg-terracotta/10 text-terracottaDark border-terracotta/30 font-semibold"
                : "text-ink/60 border-sand hover:bg-sand/60"
            }`}
          >
            {t("lang.ru")}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 border-t border-sand">
        <p className="text-sm text-ink/80 font-medium truncate">
          {admin?.username}
        </p>
        <button
          onClick={handleLogout}
          className="mt-2 text-xs tag-label hover:text-terracottaDark transition-colors"
        >
          {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
