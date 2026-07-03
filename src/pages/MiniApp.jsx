import React, { useEffect, useState } from "react";
import api from "../api/axios.js";

const API_ROOT = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

export default function MiniApp() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]); // {productId, name, price, image, size, quantity}
  const [selectingProduct, setSelectingProduct] = useState(null); // size tanlash uchun
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
  const tgUser = tg?.initDataUnsafe?.user;

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
    api.get("/public/categories").then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/public/products", { params: activeCategory ? { category: activeCategory } : {} })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const addToCart = (product, size) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id && i.size === size);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id && i.size === size ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.image,
          size,
          quantity: 1,
        },
      ];
    });
    setSelectingProduct(null);
  };

  const changeQty = (productId, size, delta) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId && i.size === size ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const submitOrder = async () => {
    if (!phone.trim() || !address.trim() || cart.length === 0) return;
    setSubmitting(true);
    try {
      await api.post("/public/orders", {
        telegramId: String(tgUser?.id || "unknown"),
        username: tgUser?.username || "",
        firstName: tgUser?.first_name || "",
        phone,
        address,
        items: cart.map((i) => ({
          product: i.productId,
          name: i.name,
          size: i.size,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })),
      });
      setOrderDone(true);
      setCart([]);
      setTimeout(() => {
        tg?.close();
      }, 2500);
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (orderDone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-5xl mb-4">✅</div>
          <p className="text-lg font-semibold">Buyurtmangiz qabul qilindi!</p>
          <p className="text-gray-500 mt-1">Tez orada siz bilan bog'lanamiz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Kategoriyalar */}
      <div className="flex gap-2 overflow-x-auto p-3 sticky top-0 bg-gray-50 z-10 border-b">
        <button
          onClick={() => setActiveCategory("")}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
            activeCategory === "" ? "bg-black text-white" : "bg-white border"
          }`}
        >
          Hammasi
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              activeCategory === c.key ? "bg-black text-white" : "bg-white border"
            }`}
          >
            {c.uz}
          </button>
        ))}
      </div>

      {/* Mahsulotlar */}
      {loading ? (
        <p className="text-center py-10 text-gray-400">Yuklanmoqda...</p>
      ) : products.length === 0 ? (
        <p className="text-center py-10 text-gray-400">Mahsulotlar topilmadi</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3">
          {products.map((p) => (
            <div key={p._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <img src={`${API_ROOT}${p.image}`} alt={p.name} className="w-full h-32 object-cover" />
              <div className="p-2">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-sm text-gray-600">{p.price.toLocaleString()} so'm</p>
                <button
                  onClick={() => setSelectingProduct(p)}
                  className="mt-2 w-full bg-black text-white text-xs py-1.5 rounded-lg"
                >
                  Savatga qo'shish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* O'lcham tanlash modal */}
      {selectingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={() => setSelectingProduct(null)}>
          <div className="bg-white w-full rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium mb-3">{selectingProduct.name} — o'lchamni tanlang</p>
            <div className="flex flex-wrap gap-2">
              {selectingProduct.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => addToCart(selectingProduct, s)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Savat tugmasi (pastda) */}
      {cartCount > 0 && !checkoutOpen && (
        <button
          onClick={() => setCheckoutOpen(true)}
          className="fixed bottom-4 left-4 right-4 bg-black text-white py-3 rounded-xl font-medium z-20"
        >
          Savat ({cartCount}) — {total.toLocaleString()} so'm
        </button>
      )}

      {/* Checkout panel */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-30" onClick={() => setCheckoutOpen(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-3">Savat</p>
            {cart.map((i) => (
              <div key={i.productId + i.size} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm">{i.name} ({i.size})</p>
                  <p className="text-xs text-gray-500">{i.price.toLocaleString()} so'm</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(i.productId, i.size, -1)} className="w-6 h-6 border rounded">-</button>
                  <span>{i.quantity}</span>
                  <button onClick={() => changeQty(i.productId, i.size, 1)} className="w-6 h-6 border rounded">+</button>
                </div>
              </div>
            ))}

            <p className="text-right font-semibold mt-3">Jami: {total.toLocaleString()} so'm</p>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefon raqamingiz"
              className="w-full border rounded-lg p-2 mt-3 text-sm"
            />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Yetkazib berish manzili"
              className="w-full border rounded-lg p-2 mt-2 text-sm"
              rows={2}
            />

            <button
              onClick={submitOrder}
              disabled={submitting || cart.length === 0}
              className="w-full bg-black text-white py-3 rounded-xl mt-3 font-medium disabled:opacity-50"
            >
              {submitting ? "Yuborilmoqda..." : "Buyurtma berish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}