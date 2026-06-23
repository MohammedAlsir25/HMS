import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { api } from "../../lib/api";

function AlertPanel({ alerts, onDismiss }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(null);
  const hasAlerts = alerts.lowStock.length > 0 || alerts.expired.length > 0 || alerts.expiringSoon.length > 0;
  if (!hasAlerts) return null;
  const sections = [
    { key: "expired", label: "Expired", items: alerts.expired, color: "red", icon: "!" },
    { key: "expiringSoon", label: "Expiring Within 30 Days", items: alerts.expiringSoon, color: "yellow", icon: "!" },
    { key: "lowStock", label: t("opticsProducts.alertLowStock"), items: alerts.lowStock, color: "yellow", icon: "\u25bc" },
  ];
  return (
    <div className="space-y-2">
      {sections.filter(s => s.items.length > 0).map((section) => (
        <div key={section.key} className={`rounded-lg border ${section.color === "red" ? "border-red-300 bg-red-50" : "border-yellow-300 bg-yellow-50"} overflow-hidden`}>
          <button className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium touch-target"
            onClick={() => setExpanded(expanded === section.key ? null : section.key)}
            style={{ color: section.color === "red" ? "#991b1b" : "#92400e" }}>
            <span>{section.icon} {section.items.length} {section.label}</span>
            <svg className={`w-4 h-4 transition-transform ${expanded === section.key ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {expanded === section.key && (
            <div className="px-4 pb-3 space-y-1">
              {section.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1 border-t border-white/50">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-slate">{t("opticsProducts.colSku")}: {item.sku} &middot; {t("opticsProducts.colQty")}: {item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function OpticsProducts() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: "IN", quantity: "", notes: "" });
  const [alerts, setAlerts] = useState({ lowStock: [], expired: [], expiringSoon: [] });
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    initialQuantity: "",
    minStock: "",
  });

  const loadItems = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api.get(`/pos/optics/items${params}`);
      setItems(data);
    } catch (err) {
      console.error("Failed to load optics items:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.get("/pos/alerts?category=optics");
      setAlerts(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadItems();
    loadAlerts();
  }, [loadItems, loadAlerts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    loadItems();
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: "", sku: "", price: "", initialQuantity: "", minStock: "" });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || "",
      sku: item.sku || "",
      price: item.price ? String(item.price) : "",
      initialQuantity: "",
      minStock: item.minStock ? String(item.minStock) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        price: form.price ? parseFloat(form.price) : 0,
        minStock: form.minStock ? parseInt(form.minStock) : 0,
      };
      if (editItem) {
        await api.put(`/pos/optics/items/${editItem.id}`, payload);
      } else {
        payload.initialQuantity = form.initialQuantity ? parseInt(form.initialQuantity) : 0;
        await api.post("/pos/optics/items", payload);
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ name: "", sku: "", price: "", initialQuantity: "", minStock: "" });
      setLoading(true);
      loadItems();
      loadAlerts();
    } catch (err) {
      alert(err.message || "Failed to save item");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await api.delete(`/pos/optics/items/${deleteItem.id}`);
      setDeleteItem(null);
      setLoading(true);
      loadItems();
      loadAlerts();
    } catch (err) {
      alert(err.message || "Failed to delete item");
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjustItem) return;
    try {
      await api.post(`/pos/optics/items/${adjustItem.id}/adjust`, {
        type: adjustForm.type,
        quantity: parseInt(adjustForm.quantity),
        notes: adjustForm.notes || null,
      });
      setAdjustItem(null);
      setAdjustForm({ type: "IN", quantity: "", notes: "" });
      setLoading(true);
      loadItems();
      loadAlerts();
    } catch (err) {
      alert(err.message || "Failed to adjust stock");
    }
  };

  const columns = [
    { key: "sku", label: t("opticsProducts.colSku") },
    { key: "name", label: t("opticsProducts.colName") },
    {
      key: "quantity",
      label: t("opticsProducts.colQty"),
      render: (row) => (
        <span className={row.quantity <= row.minStock ? "text-red-500 font-semibold" : ""}>
          {row.quantity}
        </span>
      ),
    },
    { key: "price", label: t("opticsProducts.colPrice"), render: (row) => `$${Number(row.price).toFixed(2)}` },
    { key: "minStock", label: t("opticsProducts.colMinStock") },
    {
      key: "status",
      label: t("opticsProducts.colStatus"),
      render: (row) => {
        if (row.quantity <= row.minStock)
          return <Badge variant="warning">{t("opticsProducts.statusLow")}</Badge>;
        return <Badge variant="success">{t("opticsProducts.statusOk")}</Badge>;
      },
    },
    {
      key: "actions",
      label: t("opticsProducts.colActions"),
      render: (row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>{t("opticsProducts.edit")}</Button>
          <Button size="sm" variant="secondary" onClick={() => { setAdjustItem(row); setAdjustForm({ type: "IN", quantity: "", notes: "" }); }}>{t("opticsProducts.stock")}</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteItem(row)}>{t("opticsProducts.del")}</Button>
        </div>
      ),
    },
  ];

  const lowStockCount = items.filter((i) => i.quantity <= i.minStock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t("opticsProducts.title")}</h1>
          <p className="text-body text-slate mt-1">{t("opticsProducts.description")}</p>
        </div>
        <Button onClick={openCreate}>{t("opticsProducts.addProduct")}</Button>
      </div>

      <AlertPanel alerts={alerts} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-caption text-slate">{t("opticsProducts.totalProducts")}</p><p className="text-heading-sm font-semibold text-obsidian">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-caption text-slate">{t("opticsProducts.lowStock")}</p><p className="text-heading-sm font-semibold text-red-500">{lowStockCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-caption text-slate">{t("opticsProducts.totalStock")}</p><p className="text-heading-sm font-semibold text-obsidian">{items.reduce((s, i) => s + i.quantity, 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("opticsProducts.inventory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1">
                  <Input
                    placeholder={t("opticsProducts.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary">{t("common.search")}</Button>
            </div>
          </form>
          {loading ? (
            <p className="text-body text-slate">{t("opticsProducts.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-body text-slate text-center py-4">{t("opticsProducts.noProducts")}</p>
          ) : (
            <Table columns={columns} data={items} />
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? t("opticsProducts.editTitle") : t("opticsProducts.addTitle")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("opticsProducts.formName")} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t("opticsProducts.formSku")} required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input label={t("opticsProducts.formPrice")} type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          {!editItem && <Input label={t("opticsProducts.formInitialQty")} type="number" min="0" value={form.initialQuantity} onChange={(e) => setForm({ ...form, initialQuantity: e.target.value })} />}
          <Input label={t("opticsProducts.formMinStock")} type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1">{t("common.cancel")}</Button>
            <Button type="submit" className="flex-1">{editItem ? t("opticsProducts.updateBtn") : t("opticsProducts.createBtn")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!adjustItem} onClose={() => setAdjustItem(null)} title={adjustItem ? t("opticsProducts.adjustTitle", { name: adjustItem.name }) : ""}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <p className="text-body text-slate">{t("opticsProducts.currentStock")} <strong>{adjustItem?.quantity}</strong></p>
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t("opticsProducts.adjustType")}</label>
            <div className="flex gap-2">
              <button type="button" className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${adjustForm.type === "IN" ? "bg-green-100 text-green-800 border border-green-300" : "bg-bone text-graphite hover:bg-silver"}`}
                onClick={() => setAdjustForm({ ...adjustForm, type: "IN" })}>{t("opticsProducts.stockIn")}</button>
              <button type="button" className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${adjustForm.type === "OUT" ? "bg-red-100 text-red-800 border border-red-300" : "bg-bone text-graphite hover:bg-silver"}`}
                onClick={() => setAdjustForm({ ...adjustForm, type: "OUT" })}>{t("opticsProducts.stockOut")}</button>
            </div>
          </div>
          <Input label={t("opticsProducts.quantity")} type="number" min="1" required value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} />
          <Input label={t("opticsProducts.notes")} value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} placeholder={t("opticsProducts.notesPlaceholder")} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAdjustItem(null)} className="flex-1">{t("common.cancel")}</Button>
            <Button type="submit" className="flex-1">{t("opticsProducts.confirm")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title={t("opticsProducts.deleteTitle")}>
        <div className="space-y-4">
          <p className="text-body text-obsidian">{t("opticsProducts.deleteConfirm", { name: deleteItem?.name })}</p>
          <p className="text-caption text-slate">{t("opticsProducts.deleteHint")}</p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteItem(null)} className="flex-1">{t("common.cancel")}</Button>
            <Button type="button" variant="danger" onClick={handleDelete} className="flex-1">{t("common.delete")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
