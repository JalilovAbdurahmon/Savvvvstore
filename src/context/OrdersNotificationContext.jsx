import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios.js";

const OrdersNotificationContext = createContext({ pendingCount: 0 });

const SEEN_KEY = "seenPendingOrderIds";
const POLL_INTERVAL = 3000; // 5 soniyada bir marta tekshiradi — refresh shart emas

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

export const OrdersNotificationProvider = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const seenIdsRef = useRef(loadSeenIds());
  const location = useLocation();

  const fetchPending = async () => {
    try {
      // MUHIM: agar backend'dagi yangi buyurtmalar yo'li boshqacha bo'lsa
      // (masalan "/orders?status=pending"), shu yerni almashtiring
      const res = await api.get("/orders/pending");
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
      // internet uzilishi va h.k. holatlarda jim qoladi, oldingi qiymat saqlanadi
    }
  };

  useEffect(() => {
    fetchPending(); // sahifa/route o'zgarganda darhol tekshiramiz
    const interval = setInterval(fetchPending, POLL_INTERVAL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <OrdersNotificationContext.Provider value={{ pendingCount }}>
      {children}
    </OrdersNotificationContext.Provider>
  );
};

export const useOrdersNotification = () =>
  useContext(OrdersNotificationContext);
