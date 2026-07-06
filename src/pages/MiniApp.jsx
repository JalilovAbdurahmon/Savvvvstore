import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios.js";

// Leaflet'ning standart marker icon fayllari Vite kabi bundlerlarda nisbiy
// yo'l bilan topilmay, "broken image" bo'lib chiqadi — shuning uchun CDN'dan
// to'g'ridan-to'g'ri ishlatamiz
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_ROOT = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
const MAX_IMAGES = 3;

// Toshkent markazi — agar GPS berilmasa yoki ruxsat bermasa, xarita shu joydan boshlanadi
const DEFAULT_CENTER = { lat: 41.311081, lng: 69.240562 };

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
    priceLabel: "Narxi",
    sizesLabel: "O'lchamlar",
    cart: "Savat",
    total: "Jami",
    sum: "so'm",
    checkoutNote:
      "Buyurtma berish tugmasini bosgach, yetkazib berish manzilini xaritada tasdiqlaysiz.",
    placeOrder: "Buyurtma berish",
    telegramOnly: "Buyurtma berish faqat Telegram ilovasi ichida ishlaydi.",
    chooseLocation: "Manzilni tasdiqlang",
    locating: "Joylashuv aniqlanmoqda...",
    // GPS haqiqatan o'chirilgan/signal topilmagan holat uchun
    locationWarning:
      "GPS yoqilmagan bo'lishi mumkin. Iltimos, uni yoqing, aks holda joylashuvingiz noto'g'ri aniqlanishi mumkin.",
    // Foydalanuvchi ruxsat so'ralganda "Не разрешать" bosgan holat uchun (GPS holatidan qat'i nazar)
    locationPermissionDenied:
      "Joylashuvga ruxsat berilmadi. Iltimos, brauzer yoki Telegram sozlamalaridan manzil aniqlash ruxsatini bering.",
    yourAddress: "Manzil",
    confirmLocation: "Bu manzilni tasdiqlash",
    pinInstructionTitle: "Manzilni ko'rsating",
    pinInstructionSubtitle:
      "Xaritani suring yoki markerni bosib joyni belgilang",
    back: "Orqaga",
  },
  ru: {
    all: "Все",
    loading: "Загрузка...",
    notFound: "Товары не найдены",
    addToCart: "Добавить в корзину",
    chooseSize: "выберите размер",
    priceLabel: "Цена",
    sizesLabel: "Размеры",
    cart: "Корзина",
    total: "Итого",
    sum: "сум",
    checkoutNote:
      "После нажатия кнопки заказа вы подтвердите адрес доставки на карте.",
    placeOrder: "Оформить заказ",
    telegramOnly: "Оформление заказа доступно только внутри Telegram.",
    chooseLocation: "Подтвердите адрес",
    locating: "Определяем местоположение...",
    // Holat: GPS haqiqatan o'chirilgan/signal topilmagan
    locationWarning:
      "Возможно, GPS выключен. Пожалуйста, включите его, иначе местоположение может определиться неверно.",
    // Holat: foydalanuvchi ruxsat oynasida "Не разрешать" bosgan (GPS holatidan qat'i nazar)
    locationPermissionDenied:
      "Доступ к геолокации не разрешён. Пожалуйста, разрешите определение местоположения в настройках браузера или Telegram.",
    yourAddress: "Адрес",
    confirmLocation: "Подтвердить этот адрес",
    pinInstructionTitle: "Укажите адрес",
    pinInstructionSubtitle: "Перетащите карту или нажмите на метку",
    back: "Назад",
  },
};

// Eski (nisbiy "/uploads/..") va yangi (to'liq Cloudinary "https://..") rasm formatlarini qo'llab-quvvatlaydi
const getImageSrc = (image) => {
  if (!image) return null;
  return image.startsWith("http") ? image : `${API_ROOT}${image}`;
};

// Mahsulotning barcha rasmlarini to'liq URL massiviga aylantiradi.
// "images" massivi bo'lmasa (eski mahsulotlar), yagona "image" ishlatiladi.
const getImageSrcList = (product) => {
  const list =
    product.images && product.images.length ? product.images : [product.image];
  return list.map(getImageSrc).filter(Boolean);
};

// Fullscreen image lightbox — bir nechta rasm bo'lsa, chap/o'ng strelkalar
// bilan aylanadi. Bu mobil ekran uchun mo'ljallangan: strelkalar rasmga
// yaqin (kichik masofa bilan) joylashadi, noutbukdagi kabi katta bo'shliq yo'q.
const ImageLightbox = ({ images, initialIndex = 0, alt, onClose }) => {
  const [index, setIndex] = useState(initialIndex);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const goPrev = (e) => {
    e.stopPropagation();
    setIndex((i) => (i - 1 + images.length) % images.length);
  };
  const goNext = (e) => {
    e.stopPropagation();
    setIndex((i) => (i + 1) % images.length);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-40 px-9 py-4"
      onClick={onClose}
    >
      <div
        className="relative inline-block max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg text-lg leading-none z-20"
        >
          ×
        </button>

        <img
          src={images[index]}
          alt={alt}
          className="max-w-full max-h-[80vh] object-contain rounded-lg block"
        />

        {hasMultiple && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i === index ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous image"
            className="fixed top-1/2 -translate-y-1/2 left-1 w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md z-20 text-lg"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next image"
            className="fixed top-1/2 -translate-y-1/2 right-1 w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md z-20 text-lg"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Manzil tanlash ekrani (Yandex/2GIS uslubidagi "pin markazda turadi, xarita
// pastda suriladi" pattern). Har chaqirilganda TOZA holatda ochiladi — hech
// qanday oldingi manzil keshlanmaydi, har safar GPS'dan qaytadan aniqlanadi.
// ---------------------------------------------------------------------------
const LocationPicker = ({ lang, onBack, onConfirm }) => {
  const tr = TEXTS[lang];
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null); // haqiqiy Leaflet marker — foydalanuvchi drag qilib to'g'rilaydi
  const [center, setCenter] = useState(null); // {lat, lng} — markerning hozirgi joyi
  const [address, setAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [locating, setLocating] = useState(true);
  // Ogohlantirish holati: null (muammo yo'q) | "off" (GPS o'chiq/signal yo'q) | "denied" (ruxsat berilmagan)
  const [locationIssue, setLocationIssue] = useState(null);

  // Reverse-geocoding: koordinatani o'qiladigan manzil matniga aylantirish
  // (OpenStreetMap Nominatim — bepul, API key kerak emas, lekin production'da
  // yuqori trafik bo'lsa o'z serveringizda kesh/proxy qilish tavsiya etiladi)
  const fetchAddress = async (lat, lng) => {
    setAddressLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=${lang}`
      );
      const data = await res.json();
      setAddress(data?.display_name || "");
    } catch {
      setAddress("");
    } finally {
      setAddressLoading(false);
    }
  };

  // Markerni va xaritani berilgan koordinataga ko'chiradi — GPS topilganda
  // ham, foydalanuvchi drag qilganda ham shu funksiya orqali holat yangilanadi
  const moveTo = (lat, lng, { recenterMap = true, zoom = 17 } = {}) => {
    markerRef.current?.setLatLng([lat, lng]);
    if (recenterMap) mapRef.current?.setView([lat, lng], zoom);
    setCenter({ lat, lng });
  };

  const detectGps = () => {
    if (!navigator.geolocation) {
      setLocating(false);
      setLocationIssue("off");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationIssue(null);
        moveTo(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        // PERMISSION_DENIED (code 1) — foydalanuvchi "Не разрешать" bosgan,
        // bu GPS yoniq/o'chiqligi bilan bog'liq emas, shuning uchun alohida xabar.
        // POSITION_UNAVAILABLE (2) / TIMEOUT (3) — haqiqatan ham GPS/signal muammosi.
        if (err.code === err.PERMISSION_DENIED) {
          setLocationIssue("denied");
        } else {
          setLocationIssue("off");
        }
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Xarita ichida barmoq bilan surganda ostidagi sahifa (body) ham birga
  // siljib, "fixed" qilingan top-card va zoom tugmalari vaqtincha ekrandan
  // chiqib ketishining oldini olamiz — LocationPicker ochiq turgan vaqtda
  // sahifa scroll'i to'liq bloklanadi, komponent yopilganda qaytariladi.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.touchAction = prevBodyTouch;
    };
  }, []);

  // Xaritani va markerni bir marta yaratamiz
  useEffect(() => {
    const map = L.map(mapElRef.current, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    // Haqiqiy, DRAG qilinadigan marker — aynan shu marker joylashuvi
    // buyurtma manzili bo'ladi (ekran markazidagi "soxta" nuqta emas)
    const marker = L.marker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], {
      draggable: true,
    }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setCenter({ lat: pos.lat, lng: pos.lng });
    });

    // Xaritaning bo'sh joyiga bosilganda ham marker o'sha yerga ko'chadi
    map.on("click", (e) => {
      moveTo(e.latlng.lat, e.latlng.lng, { recenterMap: false });
    });

    setCenter({ lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng });

    // Ochilgach darhol GPS orqali joyni aniqlashga urinamiz —
    // topilgach marker ANIQ shu koordinataga qo'yiladi va xarita ham shu yerga boradi
    detectGps();

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marker joyi o'zgarganda (GPS topganda yoki drag/click qilinganda) manzil
  // matnini debounce bilan yangilaymiz
  useEffect(() => {
    if (!center) return;
    const timer = setTimeout(() => fetchAddress(center.lat, center.lng), 500);
    return () => clearTimeout(timer);
  }, [center]);

  return (
    <div
      className="fixed inset-0 bg-white z-40 flex flex-col"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      <div className="flex items-center gap-3 p-3 border-b shrink-0">
        <button onClick={onBack} className="text-2xl leading-none px-1">
          ‹
        </button>
        <p className="font-medium">{tr.chooseLocation}</p>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={mapElRef}
          className="absolute inset-0"
          style={{ zIndex: 0, touchAction: "none" }}
        />

        {/* Yuqoridagi "manzilni ko'rsating" karta — 1-2-rasmdagi uslub */}
        <div
          className="absolute top-3 left-3 right-3 bg-white rounded-2xl shadow-lg px-4 py-3"
          style={{ zIndex: 30 }}
        >
          <p className="font-semibold text-[15px]">{tr.pinInstructionTitle}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {locating ? tr.locating : tr.pinInstructionSubtitle}
          </p>
        </div>

        {/* Joylashuv bo'yicha ogohlantirish — sababiga qarab ikki xil matn:
            "denied" -> foydalanuvchi ruxsat bermagan (GPS holatidan qat'i nazar),
            "off" -> GPS haqiqatan o'chirilgan yoki signal topilmagan */}
        {locationIssue && !locating && (
          <div
            className="absolute top-[92px] left-3 right-3 bg-amber-50 border border-amber-200 rounded-2xl shadow-md px-4 py-3 flex items-start gap-2.5"
            style={{ zIndex: 29 }}
          >
            <span className="text-amber-500 text-base leading-none mt-0.5">
              ⚠️
            </span>
            <p className="text-xs text-amber-800 leading-relaxed">
              {locationIssue === "denied"
                ? tr.locationPermissionDenied
                : tr.locationWarning}
            </p>
          </div>
        )}

        {/* Zoom +/- tugmalari — o'ng tomonda, karta ustida */}
        <div
          className="absolute bottom-4 right-3 flex flex-col rounded-xl shadow-lg overflow-hidden bg-white"
          style={{ zIndex: 30 }}
        >
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="w-11 h-11 flex items-center justify-center text-xl border-b active:bg-gray-100"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="w-11 h-11 flex items-center justify-center text-xl active:bg-gray-100"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
      </div>

      {/* Pastdagi manzil karta — 1-2-rasmdagi uslubda: pin ikonka + manzil + koordinata + katta tugma */}
      <div
        className="p-4 border-t shrink-0 bg-white relative"
        style={{ zIndex: 30 }}
      >
        <div className="flex items-start gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-blue-600 text-lg">📍</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">
              {addressLoading ? tr.loading : address || "—"}
            </p>
            {center && (
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
              </p>
            )}
          </div>
        </div>
        <button
          disabled={!center}
          onClick={() => onConfirm({ ...center, address })}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-medium disabled:opacity-50"
        >
          {tr.confirmLocation}
        </button>
      </div>
    </div>
  );
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
  // "shop" -> oddiy do'kon, "location" -> manzil tanlash ekrani
  const [step, setStep] = useState("shop");
  // Lightbox: { images: string[], index: number, alt: string } | null
  const [previewImage, setPreviewImage] = useState(null);

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
      .get("/public/products", {
        params: activeCategory ? { category: activeCategory } : {},
      })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const addToCart = (product, size) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.productId === product._id && i.size === size
      );
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i
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
          i.productId === productId && i.size === size
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Zakazni yakunlash: ism/telefon — bot tarafida ro'yxatdan o'tishda saqlangan,
  // manzilni esa endi Mini App ichida (LocationPicker) foydalanuvchi o'zi
  // xaritada tasdiqlaydi. Shu sababli items + location BIR PAKETDA botga
  // yuboriladi — bot bilan alohida location almashinuvi endi kerak emas.
  // Bu location HECH QAYERDA saqlanmaydi (localStorage/backend'ga yozilmaydi):
  // har safar "Buyurtma berish" bosilganda LocationPicker toza holatda
  // qaytadan ochiladi va GPS'dan qaytadan aniqlaydi.
  const finalizeOrder = (location) => {
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
      location: {
        latitude: location.lat,
        longitude: location.lng,
        address: location.address || "",
      },
    };

    // Bu ma'lumot botga "web_app_data" sifatida boradi va bot darhol
    // (qo'shimcha location so'ramasdan) zakazni yaratadi. Yuborilgandan
    // keyin Telegram Mini App'ni avtomatik yopadi.
    tg.sendData(JSON.stringify(payload));
  };

  if (step === "location") {
    return (
      <LocationPicker
        lang={lang}
        onBack={() => setStep("shop")}
        onConfirm={(location) => finalizeOrder(location)}
      />
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
          {tr.all}
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              activeCategory === c.key
                ? "bg-black text-white"
                : "bg-white border"
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
            const imgList = getImageSrcList(p);
            const mainImg = imgList[0];
            return (
              <div
                key={p._id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={mainImg}
                    alt={p.name}
                    onClick={() =>
                      mainImg &&
                      setPreviewImage({
                        images: imgList,
                        index: 0,
                        alt: p.name,
                      })
                    }
                    className="w-full h-32 object-cover cursor-zoom-in active:opacity-80 transition-opacity"
                  />
                  {imgList.length > 1 && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-medium bg-white/90 text-black px-1.5 py-0.5 rounded-md shadow-sm">
                      {imgList.length}/{MAX_IMAGES}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-sm text-gray-600 truncate whitespace-nowrap overflow-hidden">
                    <span className="text-gray-400">{tr.priceLabel}: </span>
                    <span className="font-semibold text-black">
                      {p.price.toLocaleString()} {tr.sum}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate whitespace-nowrap overflow-hidden">
                    {tr.sizesLabel}:{" "}
                    <span className="text-gray-600">
                      {p.sizes?.join(" · ")}
                    </span>
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
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-30"
          onClick={() => setSelectingProduct(null)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* Checkout panel — items ro'yxati, "Buyurtma berish" bosilganda endi
          location so'ramaydi/yubormaydi, aksincha LocationPicker ekraniga o'tadi */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end z-30"
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold mb-3">{tr.cart}</p>
            {cart.map((i) => {
              const imgSrc = getImageSrc(i.image);
              return (
                <div
                  key={i.productId + i.size}
                  className="flex items-center justify-between py-2 border-b"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt={i.name}
                        onClick={() =>
                          setPreviewImage({
                            images: [imgSrc],
                            index: 0,
                            alt: i.name,
                          })
                        }
                        className="w-10 h-10 rounded-lg object-cover shrink-0 cursor-zoom-in active:opacity-80 transition-opacity"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        {i.name} ({i.size})
                      </p>
                      <p className="text-xs text-gray-500">
                        {i.price.toLocaleString()} {tr.sum}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => changeQty(i.productId, i.size, -1)}
                      className="w-6 h-6 border rounded"
                    >
                      -
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      onClick={() => changeQty(i.productId, i.size, 1)}
                      className="w-6 h-6 border rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}

            <p className="text-right font-semibold mt-3">
              {tr.total}: {total.toLocaleString()} {tr.sum}
            </p>

            <p className="text-xs text-gray-400 mt-3">{tr.checkoutNote}</p>

            <button
              onClick={() => {
                setCheckoutOpen(false);
                setStep("location");
              }}
              disabled={cart.length === 0}
              className="w-full bg-black text-white py-3 rounded-xl mt-3 font-medium disabled:opacity-50"
            >
              {tr.placeOrder}
            </button>
          </div>
        </div>
      )}

      {/* Rasmni kattalashtirib ko'rsatish modali — bir nechta rasm bo'lsa navigatsiya bilan */}
      {previewImage && (
        <ImageLightbox
          images={previewImage.images}
          initialIndex={previewImage.index}
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
