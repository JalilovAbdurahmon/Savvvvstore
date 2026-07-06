import React, { useState, useEffect, useRef } from "react";
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
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] px-4 py-6 animate-fadeIn"
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

// Custom-styled dropdown for category selection — replaces native <select>
// so the option list can be rounded, spaced, and match the app's palette
const CategorySelect = ({
  value,
  onChange,
  options,
  loading,
  emptyLabel,
  loadingLabel,
  getLabel,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const disabled = loading || options.length === 0;
  const selected = options.find((o) => o.key === value);
  const displayLabel = loading
    ? loadingLabel
    : options.length === 0
    ? emptyLabel
    : selected
    ? getLabel(selected)
    : "";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`input-field flex items-center justify-between text-left transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-terracotta/40"
        } ${open ? "border-terracotta ring-2 ring-terracotta/15" : ""}`}
      >
        <span className={displayLabel ? "text-charcoal" : "text-muted"}>
          {displayLabel}
        </span>
        <svg
          className={`text-muted shrink-0 ml-2 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute z-20 top-[calc(100%+6px)] left-0 right-0 bg-white border border-sand rounded-tag shadow-[0_10px_32px_rgba(0,0,0,0.12)] py-1.5 max-h-64 overflow-auto animate-fadeIn">
          {options.map((opt) => {
            const active = opt.key === value;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm mx-1.5 my-0.5 rounded-tag transition-colors ${
                  active
                    ? "bg-terracotta text-white font-medium"
                    : "text-charcoal hover:bg-sand/60"
                }`}
                style={{ width: "calc(100% - 12px)" }}
              >
                {getLabel(opt)}
              </button>
            );
          })}
        </div>
      )}
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
  const [isDragging, setIsDragging] = useState(false);

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

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
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
  };

  // Fayllar tanlanganda — mavjudlarga qo'shamiz, MAX_IMAGES tadan oshirmaymiz
  const handleImagesChange = (e) => {
    addFiles(e.target.files);
    // input'ni tozalaymiz — shu tufayli xuddi shu faylni yana tanlash mumkin bo'ladi
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (images.length >= MAX_IMAGES) return;
    addFiles(e.dataTransfer.files);
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
      <form onSubmit={handleSubmit} className="max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* LEFT — main fields */}
          <div className="lg:col-span-3 card px-6 py-6 space-y-6">
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
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    className="input-field pr-14"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={t("addProduct.pricePlaceholder")}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted uppercase tracking-wide pointer-events-none">
                    UZS
                  </span>
                </div>
              </div>
              <div>
                <label className="tag-label block mb-2">
                  {t("addProduct.category")}
                </label>
                <CategorySelect
                  value={category}
                  onChange={setCategory}
                  options={categories}
                  loading={categoriesLoading}
                  emptyLabel={t("addProduct.noCategories")}
                  loadingLabel={t("addProduct.loadingCategories")}
                  getLabel={categoryLabel}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="tag-label">{t("addProduct.sizes")}</label>
                {sizes.length > 0 && (
                  <span className="text-xs text-terracotta font-medium">
                    {sizes.length} {t("addProduct.selected", "tanlandi")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {AVAILABLE_SIZES.map((size) => {
                  const active = sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      aria-pressed={active}
                      className={`relative h-14 rounded-tag border-2 text-sm font-semibold transition-all duration-150 ${
                        active
                          ? "bg-terracotta text-white border-terracotta shadow-[0_4px_14px_rgba(196,90,54,0.35)] scale-[1.02]"
                          : "bg-white text-charcoal border-sand hover:border-terracotta/50 hover:-translate-y-0.5"
                      }`}
                    >
                      {size}
                      {active && (
                        <svg
                          className="absolute top-1 right-1"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-sm text-terracottaDark bg-terracotta/10 border border-terracotta/30 rounded-tag px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 text-[15px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeOpacity="0.3"
                    />
                    <path
                      d="M22 12a10 10 0 0 0-10-10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  {t("addProduct.loading")}
                </span>
              ) : (
                t("addProduct.submit")
              )}
            </button>
          </div>

          {/* RIGHT — image upload, fills the space fully */}
          <div className="lg:col-span-2 card px-5 py-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <label className="tag-label">{t("addProduct.image")}</label>
              <span className="text-xs text-muted">
                {images.length}/{MAX_IMAGES}
              </span>
            </div>

            {/* Dropzone */}
            {images.length < MAX_IMAGES && (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-2 rounded-tag border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-terracotta bg-terracotta/5"
                    : "border-sand hover:border-terracotta/40 hover:bg-sand/20"
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-terracotta/10 flex items-center justify-center">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-terracotta"
                  >
                    <path
                      d="M12 16V4M12 4l-4 4M12 4l4 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-charcoal text-center">
                  {t("addProduct.chooseImage")}
                </p>
                <p className="text-xs text-muted text-center">
                  {t("addProduct.dragHint", "yoki shu yerga tortib tashlang")}
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="hidden"
                />
              </label>
            )}

            {/* Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {previews.map((url, idx) => (
                  <div key={idx} className="relative aspect-square group">
                    <img
                      src={url}
                      alt={images[idx]?.name}
                      onClick={() => setShowImagePreview(idx)}
                      className="w-full h-full object-cover rounded-tag border border-sand cursor-pointer transition-transform duration-150 group-hover:scale-[1.03] group-hover:brightness-90"
                    />
                    {idx === 0 && (
                      <span className="absolute -top-1.5 -left-1.5 text-[9px] uppercase font-semibold bg-terracotta text-white px-1.5 py-0.5 rounded-tag shadow-sm">
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
              </div>
            )}

            {images.length === 0 && (
              <p className="text-xs text-muted text-center mt-4">
                {t(
                  "addProduct.imageEmptyHint",
                  "Birinchi rasm asosiy rasm sifatida ko'rsatiladi"
                )}
              </p>
            )}
          </div>
        </div>
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
