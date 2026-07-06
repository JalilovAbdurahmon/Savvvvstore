import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

// Shared toast style — keep in sync with the one used on ProductList
const TOAST_STYLE = {
  style: {
    padding: "14px 20px",
    borderRadius: "14px",
    minWidth: "280px",
    fontSize: "14px",
    boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
  },
};

// Available sizes — o'zgartirish kerak bo'lsa shu ro'yxatni tahrirlang
// Bir xil tartib ProductList.jsx dagi SIZE_ORDER bilan mos bo'lishi kerak
const AVAILABLE_SIZES = ["S", "M", "L", "XL"];
const sortSizes = (arr) =>
  [...arr].sort(
    (a, b) => AVAILABLE_SIZES.indexOf(a) - AVAILABLE_SIZES.indexOf(b)
  );

const MAX_IMAGES = 3;

// Fullscreen image lightbox — click backdrop or the X to close
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

const AddProduct = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState([]); // endi array: ["S", "M", ...]
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Bir nechta rasm: images[0] — asosiy rasm (ProductList cardida ko'rinadigan)
  const [images, setImages] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // string[] (object URL'lar)
  const [showImagePreview, setShowImagePreview] = useState(null); // index | null

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    api
      .get("/products/categories")
      .then((res) => {
        setCategories(res.data); // res.data = [{key, uz, ru}, ...]
        if (res.data.length > 0) setCategory((prev) => prev || res.data[0].key);
      })
      .catch(() => setError(t("addProduct.errorCategories")))
      .finally(() => setCategoriesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close any leftover toast when leaving/entering this page
  useEffect(() => {
    toast.dismiss();
    return () => toast.dismiss();
  }, []);

  // Har bir "images" o'zgarganda preview URL'larni qayta yasaymiz, eskilarini tozalaymiz
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const categoryLabel = (cat) => cat[i18n.language] || cat.uz;

  const toggleSize = (size) => {
    setSizes((prev) =>
      prev.includes(size)
        ? prev.filter((s) => s !== size)
        : sortSizes([...prev, size])
    );
  };

  // Fayllar tanlanganda — mavjudlarga qo'shamiz, MAX_IMAGES tadan oshirmaymiz
  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const combined = [...images, ...files].slice(0, MAX_IMAGES);

    if (images.length + files.length > MAX_IMAGES) {
      toast.error(
        t(
          "addProduct.errorMaxImages",
          `Maksimal ${MAX_IMAGES} ta rasm yuklash mumkin`
        ),
        TOAST_STYLE
      );
    }

    setImages(combined);
    // input'ni tozalaymiz — shu tufayli xuddi shu faylni yana tanlash mumkin bo'ladi
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setSizes([]);
    setImages([]);
    setCategory(categories[0] || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (images.length === 0) {
      const msg = t("addProduct.errorNoImage");
      setError(msg);
      toast.error(msg, TOAST_STYLE);
      return;
    }

    if (!category) {
      const msg = t("addProduct.errorNoCategory");
      setError(msg);
      toast.error(msg, TOAST_STYLE);
      return;
    }

    if (sizes.length === 0) {
      const msg = t("addProduct.errorNoSize");
      setError(msg);
      toast.error(msg, TOAST_STYLE);
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("sizes", JSON.stringify(sortSizes(sizes)));
    images.forEach((file) => formData.append("images", file)); // backend "images" kutadi

    setLoading(true);
    try {
      await api.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(t("addProduct.successMsg"), TOAST_STYLE);
      resetForm();
      setTimeout(() => navigate("/products"), 900);
    } catch (err) {
      const msg = err.response?.data?.message || t("addProduct.errorDefault");
      setError(msg);
      toast.error(msg, TOAST_STYLE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title={t("addProduct.title")} subtitle={t("addProduct.subtitle")}>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="card px-6 py-6 space-y-5">
          <div>
            <label className="tag-label block mb-2">
              {t("addProduct.name")}
            </label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("addProduct.namePlaceholder")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="tag-label block mb-2">
                {t("addProduct.price")}
              </label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t("addProduct.pricePlaceholder")}
                required
              />
            </div>
            <div>
              <label className="tag-label block mb-2">
                {t("addProduct.category")}
              </label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={categoriesLoading || categories.length === 0}
                required
              >
                {categoriesLoading && (
                  <option value="">{t("addProduct.loadingCategories")}</option>
                )}
                {!categoriesLoading && categories.length === 0 && (
                  <option value="">{t("addProduct.noCategories")}</option>
                )}
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {categoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="tag-label block mb-2">
              {t("addProduct.sizes")}
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SIZES.map((size) => {
                const active = sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    aria-pressed={active}
                    className={`w-14 h-11 rounded-tag border text-sm font-medium transition-colors ${
                      active
                        ? "bg-terracotta text-white border-terracotta"
                        : "bg-white text-charcoal border-sand hover:border-terracotta/50"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="tag-label block mb-2">
              {t("addProduct.image")}{" "}
              <span className="text-muted">(1–{MAX_IMAGES} ta)</span>
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {previews.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 shrink-0">
                  <img
                    src={url}
                    alt={images[idx]?.name}
                    onClick={() => setShowImagePreview(idx)}
                    className="w-20 h-20 object-cover rounded-tag border border-sand cursor-pointer hover:opacity-80 transition-opacity"
                  />
                  {idx === 0 && (
                    <span className="absolute -top-1.5 -left-1.5 text-[9px] uppercase bg-terracotta text-white px-1.5 py-0.5 rounded-tag">
                      {t("addProduct.mainImage")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                    aria-label="Remove image"
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center text-xs leading-none shadow-md hover:bg-terracottaDark transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="btn-secondary cursor-pointer">
                  {t("addProduct.chooseImage")}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-terracottaDark bg-terracotta/10 border border-terracotta/30 rounded-tag px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t("addProduct.loading") : t("addProduct.submit")}
        </button>
      </form>

      {showImagePreview !== null && previews[showImagePreview] && (
        <ImageLightbox
          src={previews[showImagePreview]}
          alt={images[showImagePreview]?.name}
          onClose={() => setShowImagePreview(null)}
        />
      )}
    </Layout>
  );
};

export default AddProduct;
