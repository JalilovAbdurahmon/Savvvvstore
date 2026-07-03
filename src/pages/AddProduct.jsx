import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

// Backend'da yangi category qo'shilsa (models/Product.js dagi PRODUCT_CATEGORIES),
// shu yerga chiroyli nom qo'shib qo'ying - qo'shmasangiz ham select ishlayveradi,
// faqat nomi tarjima qilinmagan holda (kalit so'zning o'zi) ko'rinadi.
const CATEGORY_LABELS = {
  uz: {
    tshirts: "Futbolkalar",
    shirts: "Ko'ylaklar",
    pants: "Shimlar",
    shorts: "Shortiklar",
    shoes: "Oyoq kiyim",
    misc: "Mayda-chuda",
  },
  ru: {
    tshirts: "Футболки",
    shirts: "Рубашки",
    pants: "Брюки",
    shorts: "Шорты",
    shoes: "Обувь",
    misc: "Мелочи",
  },
};

const AddProduct = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    api
      .get("/products/meta/categories")
      .then((res) => {
        setCategories(res.data);
        if (res.data.length > 0) setCategory((prev) => prev || res.data[0]);
      })
      .catch(() => setError(t("addProduct.errorCategories")))
      .finally(() => setCategoriesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryLabel = (key) => {
    const map = CATEGORY_LABELS[i18n.language] || CATEGORY_LABELS.uz;
    return map[key] || key;
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
    setSizes("");
    setDescription("");
    setImage(null);
    setPreview(null);
    setCategory(categories[0] || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!image) {
      setError(t("addProduct.errorNoImage"));
      return;
    }

    if (!category) {
      setError(t("addProduct.errorNoCategory"));
      return;
    }

    const sizeList = sizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (sizeList.length === 0) {
      setError(t("addProduct.errorNoSize"));
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("sizes", JSON.stringify(sizeList));
    formData.append("description", description);
    formData.append("image", image);

    setLoading(true);
    try {
      await api.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(t("addProduct.successMsg"));
      resetForm();
      setTimeout(() => navigate("/products"), 900);
    } catch (err) {
      setError(err.response?.data?.message || t("addProduct.errorDefault"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title={t("addProduct.title")} subtitle={t("addProduct.subtitle")}>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="card px-6 py-6 space-y-5">
          <div>
            <label className="tag-label block mb-2">{t("addProduct.name")}</label>
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
              <label className="tag-label block mb-2">{t("addProduct.price")}</label>
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
              <label className="tag-label block mb-2">{t("addProduct.category")}</label>
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={categoriesLoading || categories.length === 0}
                required
              >
                {categoriesLoading && <option value="">{t("addProduct.loadingCategories")}</option>}
                {!categoriesLoading && categories.length === 0 && (
                  <option value="">{t("addProduct.noCategories")}</option>
                )}
                {categories.map((key) => (
                  <option key={key} value={key}>
                    {categoryLabel(key)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="tag-label block mb-2">{t("addProduct.sizes")}</label>
            <input
              type="text"
              className="input-field"
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              placeholder={t("addProduct.sizesPlaceholder")}
              required
            />
          </div>

          <div>
            <label className="tag-label block mb-2">{t("addProduct.description")}</label>
            <textarea
              className="input-field min-h-[90px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("addProduct.descriptionPlaceholder")}
            />
          </div>

          <div>
            <label className="tag-label block mb-2">{t("addProduct.image")}</label>
            <div className="flex items-center gap-4">
              {preview && (
                <img src={preview} alt="preview" className="w-20 h-20 object-cover rounded-tag border border-sand" />
              )}
              <label className="btn-secondary cursor-pointer">
                {t("addProduct.chooseImage")}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-terracottaDark bg-terracotta/10 border border-terracotta/30 rounded-tag px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-olive bg-olive/10 border border-olive/30 rounded-tag px-3 py-2">{success}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t("addProduct.loading") : t("addProduct.submit")}
        </button>
      </form>
    </Layout>
  );
};

export default AddProduct;