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
const AVAILABLE_SIZES = ["S", "M", "L", "XL"];

const AddProduct = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState([]); // endi array: ["S", "M", ...]
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    api
      .get("/products/categories") // <-- to'g'rilandi: "/meta/categories" emas
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

  const categoryLabel = (cat) => cat[i18n.language] || cat.uz;

  const toggleSize = (size) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setSizes([]);
    setDescription("");
    setImage(null);
    setPreview(null);
    setCategory(categories[0] || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!image) {
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
    formData.append("sizes", JSON.stringify(sizes));
    formData.append("description", description);
    formData.append("image", image);

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
              {t("addProduct.description")}
            </label>
            <textarea
              className="input-field min-h-[90px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("addProduct.descriptionPlaceholder")}
            />
          </div>

          <div>
            <label className="tag-label block mb-2">
              {t("addProduct.image")}
            </label>
            <div className="flex items-center gap-4">
              {preview && (
                <img
                  src={preview}
                  alt="preview"
                  className="w-20 h-20 object-cover rounded-tag border border-sand"
                />
              )}
              <label className="btn-secondary cursor-pointer">
                {t("addProduct.chooseImage")}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
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
    </Layout>
  );
};

export default AddProduct;