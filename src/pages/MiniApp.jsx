import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";

const API_ROOT = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

// Bot foydalanuvchi uchun tanlagan tilni ?lang= orqali yuboradi
const getLangFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang");
    return lang === "ru" ? "ru" : "uz";
  } catch {
    return "uz";
  }
};

const TEXTS = {
  uz: {
    all: "Hammasi",
    loading: "Yuklanmoqda...",
    notFound: "Mahsulotlar topilmadi",
    addToCart: "Savatga qo'shish",
    chooseSize: "o'lchamni tanlang",
    cart: "Savat",
    total: "Jami",
    sum: "so'm",
    checkoutNote:
      "Buyurtma berish tugmasini bosgach, ism va telefon raqamingiz avtomatik olinadi, so'ngra bot sizdan yetkazib berish manzilini (lokatsiyani) so'raydi.",
    placeOrder: "Buyurtma berish",
    telegramOnly: "Buyurtma berish faqat Telegram ilovasi ichida ishlaydi.",
  },
  ru: {
    all: "Все",
    loading: "Загрузка...",
    notFound: "Товары не найдены",
    addToCart: "Добавить в корзину",
    chooseSize: "выберите размер",
    cart: "Корзина",
    total: "Итого",
    sum: "сум",
    checkoutNote:
      "После нажатия кнопки заказа ваше имя и номер телефона будут получены автоматически, затем бот запросит у вас адрес доставки (геолокацию).",
    placeOrder: "Оформить заказ",
    telegramOnly: "Оформление заказа доступно только внутри Telegram.",
  },
};

// Eski (nisbiy "/uploads/..") va yangi (to'liq Cloudinary "https://..") rasm formatlarini qo'llab-quvvatlaydi
const getImageSrc = (image) => {
  if (!image) return null;
  return image.startsWith("http") ? image : `${API_ROOT}${image}`;
};

export default function MiniApp() {
  const lang = useMemo(getLangFromUrl, []);
  const tr = TEXTS[lang];
  const nameKey = lang === "ru" ? "ru" : "uz";

  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]); // {productId, name, price, image, size, quantity}
  const [selectingProduct, setSelectingProduct] = useState(null); // size tanlash uchun
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // rasmni kattalashtirib ko'rish

  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;

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

  // Zakazni yakunlash: ism/telefon/manzil so'ramaymiz — ularni bot o'zi biladi
  // (ism va telefon ro'yxatdan o'tishda saqlangan, manzil/lokatsiyani esa
  // bot buyurtma tasdiqlangandan keyin so'raydi). Mini App faqat savat
  // tarkibini botga yuboradi.
  const submitOrder = () => {
    if (cart.length === 0) return;

    if (!tg || typeof tg.sendData !== "function") {
      alert(tr.telegramOnly);
      return;
    }

    const payload = {
      items: cart.map((i) => ({
        product: i.productId,
        name: i.name,
        size: i.size,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
      })),
    };

    // Bu ma'lumot botga "web_app_data" sifatida boradi, keyin bot
    // lokatsiyani so'rab, zakazni yaratadi. Yuborilgandan keyin
    // Telegram Mini App'ni avtomatik yopadi.
    tg.sendData(JSON.stringify(payload));
  };

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
          {tr.all}
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              activeCategory === c.key ? "bg-black text-white" : "bg-white border"
            }`}
          >
            {c[nameKey]}
          </button>
        ))}
      </div>

      {/* Mahsulotlar */}
      {loading ? (
        <p className="text-center py-10 text-gray-400">{tr.loading}</p>
      ) : products.length === 0 ? (
        <p className="text-center py-10 text-gray-400">{tr.notFound}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3">
          {products.map((p) => {
            const imgSrc = getImageSrc(p.image);
            return (
              <div key={p._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <img
                  src={imgSrc}
                  alt={p.name}
                  onClick={() => imgSrc && setPreviewImage(imgSrc)}
                  className="w-full h-32 object-cover cursor-zoom-in active:opacity-80 transition-opacity"
                />
                <div className="p-2">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-sm text-gray-600">
                    {p.price.toLocaleString()} {tr.sum}
                  </p>
                  <button
                    onClick={() => setSelectingProduct(p)}
                    className="mt-2 w-full bg-black text-white text-xs py-1.5 rounded-lg"
                  >
                    {tr.addToCart}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* O'lcham tanlash modal */}
      {selectingProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-30" onClick={() => setSelectingProduct(null)}>
          <div className="bg-white w-full rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              {getImageSrc(selectingProduct.image) && (
                <img
                  src={getImageSrc(selectingProduct.image)}
                  alt={selectingProduct.name}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              <p className="font-medium">
                {selectingProduct.name} — {tr.chooseSize}
              </p>
            </div>
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

      {/* Savat tugmasi (pastda) — o'lcham tanlash oynasi ochiq bo'lganda yashiriladi, ustiga chiqib qolmasligi uchun */}
      {cartCount > 0 && !checkoutOpen && !selectingProduct && (
        <button
          onClick={() => setCheckoutOpen(true)}
          className="fixed bottom-4 left-4 right-4 bg-black text-white py-3 rounded-xl font-medium z-20"
        >
          {tr.cart} ({cartCount}) — {total.toLocaleString()} {tr.sum}
        </button>
      )}

      {/* Checkout panel — endi faqat savat tarkibini ko'rsatadi, telefon/manzil so'ramaydi */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-30" onClick={() => setCheckoutOpen(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-3">{tr.cart}</p>
            {cart.map((i) => (
              <div key={i.productId + i.size} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm">
                    {i.name} ({i.size})
                  </p>
                  <p className="text-xs text-gray-500">
                    {i.price.toLocaleString()} {tr.sum}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(i.productId, i.size, -1)} className="w-6 h-6 border rounded">-</button>
                  <span>{i.quantity}</span>
                  <button onClick={() => changeQty(i.productId, i.size, 1)} className="w-6 h-6 border rounded">+</button>
                </div>
              </div>
            ))}

            <p className="text-right font-semibold mt-3">
              {tr.total}: {total.toLocaleString()} {tr.sum}
            </p>

            <p className="text-xs text-gray-400 mt-3">{tr.checkoutNote}</p>

            <button
              onClick={submitOrder}
              disabled={cart.length === 0}
              className="w-full bg-black text-white py-3 rounded-xl mt-3 font-medium disabled:opacity-50"
            >
              {tr.placeOrder}
            </button>
          </div>
        </div>
      )}

      {/* Rasmni kattalashtirib ko'rsatish modali */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-40 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg text-lg leading-none"
            >
              ×
            </button>
            <img src={previewImage} alt="" className="w-full max-h-[80vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}