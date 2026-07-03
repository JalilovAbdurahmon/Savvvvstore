import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";
import api from "../api/axios.js";

const PENDING_ORDERS_PATH = "/orders/pending";
const SEEN_COUNT_KEY = "pendingOrdersSeenCount";
const POLL_INTERVAL_MS = 15000;

const Sidebar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [unseenCount, setUnseenCount] = useState(0);

  const navItems = [
    { to: "/", label: t("nav.overview"), icon: "01" },
    { to: "/products/add", label: t("nav.addProduct"), icon: "02" },
    { to: "/products", label: t("nav.products"), icon: "03" },
    { to: "/orders/pending", label: t("nav.pendingOrders"), icon: "04" },
    { to: "/orders/history", label: t("nav.orderHistory"), icon: "05" },
  ];

  // Poll pending-orders count. If we're currently on the pending-orders page,
  // treat everything as "seen" (baseline = current count, badge = 0).
  // Otherwise the badge shows how many orders arrived since the last visit.
  const checkPendingOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders");
      const currentCount = res.data.length;

      if (location.pathname === PENDING_ORDERS_PATH) {
        localStorage.setItem(SEEN_COUNT_KEY, String(currentCount));
        setUnseenCount(0);
        return;
      }

      const seenCount = Number(localStorage.getItem(SEEN_COUNT_KEY) || 0);
      setUnseenCount(Math.max(currentCount - seenCount, 0));
    } catch {
      // silent — badge just skips this tick
    }
  }, [location.pathname]);

  useEffect(() => {
    checkPendingOrders();
    const interval = setInterval(checkPendingOrders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkPendingOrders]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
  };

  return (
    <aside className="w-64 shrink-0 bg-paper border-r border-sand min-h-screen flex flex-col">
      <div className="px-6 py-7 border-b border-sand">
        <p className="tag-label mb-1">{t("nav.adminPanel")}</p>
        <h1 className="text-2xl font-serif font-semibold text-ink leading-tight">Savvvv Store</h1>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isPendingOrdersItem = item.to === PENDING_ORDERS_PATH;
          return (
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
              <span className="text-[14px] tracking-widest text-muted font-mono">{item.icon}</span>
              <span className="text-[16px]">{item.label}</span>

              {isPendingOrdersItem && (
                <span className="ml-auto relative flex items-center justify-center shrink-0">
                  <Bell size={16} className={unseenCount > 0 ? "text-terracottaDark" : "text-ink/35"} />
                  {unseenCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-terracottaDark text-paper text-[10px] leading-4 text-center font-semibold">
                      {unseenCount > 99 ? "99+" : unseenCount}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}
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
        <p className="text-sm text-ink/80 font-medium truncate">{admin?.username}</p>
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