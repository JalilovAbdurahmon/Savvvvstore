import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../components/Layout.jsx";
import api from "../api/axios.js";
import { useTranslation } from "react-i18next";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "https://savvvvstore-backend-production.up.railway.app/api").replace(/\/api\/?$/, "");

// Shared style for simple success/error toasts — wider, more breathing room, softer look
const TOAST_STYLE = {
  style: {
    padding: "14px 20px",
    borderRadius: "14px",
    minWidth: "280px",
    fontSize: "14px",
    boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
  },
};

const EditModal = ({ product, onClose, onSaved }) => {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price);
  const [sizes, setSizes] = useState(product.sizes.join(", "));
  const [description, setDescription] = useState(product.description || "");
  const [isActive, setIsActive] = useState(product.isActive);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  // Original snapshot so we can detect whether the user actually changed anything
  const original = {
    name: product.name,
    price: String(product.price),
    sizes: product.sizes.join(", "),
    description: product.description || "",
    isActive: product.isActive,
  };

  const hasChanges =
    name !== original.name ||
    String(price) !== original.price ||
    sizes !== original.sizes ||
    description !== original.description ||
    isActive !== original.isActive ||
    image !== null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!hasChanges) {
      // Nothing changed — just close the modal, no request, no toast
      onClose();
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append(
      "sizes",
      JSON.stringify(
        sizes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
    formData.append("description", description);
    formData.append("isActive", isActive);
    if (image) formData.append("image", image);

    setLoading(true);
    try {
      const res = await api.put(`/products/${product._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(res.data);
      toast.success(t("productList.toast.updateSuccess", "Mahsulot muvaffaqiyatli yangilandi"), TOAST_STYLE);
    } catch (err) {
      const message = err.response?.data?.message || t("productList.modal.errorDefault");
      setError(message);
      toast.error(message, TOAST_STYLE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="card w-full max-w-md px-6 py-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-serif font-semibold mb-5">{t("productList.modal.title")}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="tag-label block mb-1.5">{t("productList.modal.name")}</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="tag-label block mb-1.5">{t("productList.modal.price")}</label>
              <input
                type="number"
                className="input-field"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="tag-label block mb-1.5">{t("productList.modal.sizes")}</label>
              <input className="input-field" value={sizes} onChange={(e) => setSizes(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="tag-label block mb-1.5">{t("productList.modal.description")}</label>
            <textarea
              className="input-field min-h-[70px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="tag-label block mb-1.5">{t("productList.modal.newImage")}</label>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} className="text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/80">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t("productList.modal.visible")}
          </label>

          {error && <p className="text-sm text-terracottaDark">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? t("productList.modal.saving") : t("productList.modal.save")}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              {t("productList.modal.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const { t } = useTranslation();

  const load = () => {
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => setError(err.response?.data?.message || t("productList.errorLoad")));
  };

  useEffect(load, []);

  const performDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success(t("productList.toast.deleteSuccess", "Mahsulot o'chirildi"), TOAST_STYLE);
    } catch (err) {
      toast.error(err.response?.data?.message || t("productList.errorDelete"), TOAST_STYLE);
    }
  };

  const handleDelete = (id, name) => {
    toast(
      (tst) => (
        <div className="flex flex-col gap-4 py-1 px-1 min-w-[260px]">
          <p className="text-sm leading-relaxed text-ink">
            {t("productList.toast.deleteConfirm", { name, defaultValue: `"${name}" mahsulotini o'chirmoqchimisiz?` })}
          </p>
          <div className="flex gap-2.5 justify-end">
            <button
              onClick={() => toast.dismiss(tst.id)}
              className="text-sm font-medium px-4 py-2 rounded-tag border border-ink/15 text-ink/70 hover:bg-ink/5 transition-colors"
            >
              {t("productList.toast.cancel", "Bekor qilish")}
            </button>
            <button
              onClick={() => {
                toast.dismiss(tst.id);
                performDelete(id);
              }}
              className="text-sm font-medium px-4 py-2 rounded-tag bg-terracottaDark text-paper hover:opacity-90 transition-opacity"
            >
              {t("productList.toast.confirmDelete", "Ha, o'chirish")}
            </button>
          </div>
        </div>
      ),
      {
        duration: 8000,
        style: {
          maxWidth: "420px",
          padding: "18px 20px",
          borderRadius: "16px",
          boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
        },
      }
    );
  };

  const handleSaved = (updated) => {
    setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setEditing(null);
  };

  return (
    <Layout title={t("productList.title")} subtitle={t("productList.subtitle", { count: products.length })}>
      {error && <p className="text-terracottaDark mb-4">{error}</p>}

      {products.length === 0 ? (
        <p className="text-muted">{t("productList.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <div key={p._id} className="card overflow-hidden flex flex-col">
              <div className="relative">
                <img src={`${API_ORIGIN}${p.image}`} alt={p.name} className="w-full h-40 object-cover" />
                {!p.isActive && (
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-ink/70 text-paper px-2 py-1 rounded-tag">
                    {t("productList.hidden")}
                  </span>
                )}
              </div>
              <div className="px-4 py-3 flex-1 flex flex-col">
                <p className="font-medium text-ink truncate">{p.name}</p>
                <p className="text-sm text-terracottaDark font-semibold mt-0.5">{p.price.toLocaleString()} {t("productList.currency")}</p>
                <p className="text-xs text-muted mt-1">{p.sizes.join(" · ")}</p>
                <div className="flex gap-2 mt-auto pt-3">
                  <button onClick={() => setEditing(p)} className="btn-secondary flex-1 text-xs py-1.5">
                    {t("productList.edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(p._id, p.name)}
                    className="flex-1 text-xs py-1.5 rounded-tag border border-terracotta/40 text-terracottaDark hover:bg-terracotta/10 transition-colors"
                  >
                    {t("productList.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <EditModal product={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </Layout>
  );
};

export default ProductList;