import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Table } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { api } from "../../lib/api";
import { posKeys } from "../../hooks/queries/usePOS";
import DeliveryModal from "./DeliveryModal";

function AlertPanel({ alerts, onDismiss }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(null);
  const hasAlerts = alerts.lowStock.length > 0 || alerts.expired.length > 0 || alerts.expiringSoon.length > 0;
  if (!hasAlerts) return null;
  const sections = [
    { key: "expired", label: t("pharmacyProducts.alertExpired"), items: alerts.expired, color: "red", icon: "!" },
    { key: "expiringSoon", label: t("pharmacyProducts.alertExpiring"), items: alerts.expiringSoon, color: "yellow", icon: "!" },
    { key: "lowStock", label: t("pharmacyProducts.alertLowStock"), items: alerts.lowStock, color: "yellow", icon: "\u25bc" },
  ];
  return (
    <div className="space-y-2">
      {sections.filter(s => s.items.length > 0).map((section) => (
        <div key={section.key} className={`rounded-lg border ${section.color === "red" ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900" : "border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900"} overflow-hidden`}>
          <button
            onClick={() => setExpanded(expanded === section.key ? null : section.key)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium touch-target ${section.color === "red" ? "text-red-800 dark:text-red-200" : "text-yellow-800 dark:text-yellow-200"}`}>
            <span>{section.icon} {section.items.length} {section.label}</span>
            <svg className={`w-4 h-4 transition-transform ${expanded === section.key ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {expanded === section.key && (
            <div className="px-4 pb-3 space-y-1">
              {section.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1 border-t border-white/50">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-slate">{t("pharmacyProducts.colSku")}: {item.sku} &middot; {t("pharmacyProducts.colQty")}: {item.quantity}{item.expiryDate ? " &middot; " + t("pharmacyProducts.colExpiry") + ": " + new Date(item.expiryDate).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PharmacyProducts() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: "IN", quantity: "", notes: "" });
  const [alerts, setAlerts] = useState({ lowStock: [], expired: [], expiringSoon: [] });
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    costPrice: "",
    initialQuantity: "",
    minStock: "",
    packSize: "1",
    expiryDate: "",
  });

  const loadItems = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api.get(`/pos/pharmacy/items${params}`);
      setItems(data);
    } catch (err) {
      console.error("Failed to load pharmacy items:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.get("/pos/alerts?category=pharmacy");
      setAlerts(data);
    } catch (err) { console.error('[PharmacyProducts]', err); }
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
    setForm({ name: "", sku: "", price: "", costPrice: "", initialQuantity: "", minStock: "", packSize: "1", expiryDate: "" });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || "",
      sku: item.sku || "",
      price: item.price ? String(item.price) : "",
      costPrice: item.costPrice ? String(item.costPrice) : "",
      initialQuantity: "",
      minStock: item.minStock ? String(item.minStock) : "",
      packSize: item.packSize ? String(item.packSize) : "1",
      expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMutationError('');
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        price: form.price ? parseFloat(form.price) : 0,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : 0,
        minStock: form.minStock ? parseInt(form.minStock) : 0,
        packSize: parseInt(form.packSize) || 1,
        expiryDate: form.expiryDate || null,
      };
      if (editItem) {
        await api.put(`/pos/pharmacy/items/${editItem.id}`, payload);
      } else {
        payload.initialQuantity = form.initialQuantity ? parseInt(form.initialQuantity) : 0;
        await api.post("/pos/pharmacy/items", payload);
      }
      setShowModal(false);
      setEditItem(null);
      setForm({ name: "", sku: "", price: "", costPrice: "", initialQuantity: "", minStock: "", packSize: "1", expiryDate: "" });
      setLoading(true);
      loadItems();
      loadAlerts();
      queryClient.invalidateQueries({ queryKey: posKeys.items('pharmacy') });
    } catch (err) {
      setMutationError(err.message || "Failed to save item");
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setMutationError('');
    try {
      await api.delete(`/pos/pharmacy/items/${deleteItem.id}`);
      setDeleteItem(null);
      setLoading(true);
      loadItems();
      loadAlerts();
      queryClient.invalidateQueries({ queryKey: posKeys.items('pharmacy') });
    } catch (err) {
      setMutationError(err.message || "Failed to delete item");
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjustItem) return;
    setMutationError('');
    try {
      await api.post(`/pos/pharmacy/items/${adjustItem.id}/adjust`, {
        type: adjustForm.type,
        quantity: parseInt(adjustForm.quantity),
        notes: adjustForm.notes || null,
      });
      setAdjustItem(null);
      setAdjustForm({ type: "IN", quantity: "", notes: "" });
      setLoading(true);
      loadItems();
      loadAlerts();
      queryClient.invalidateQueries({ queryKey: posKeys.items('pharmacy') });
    } catch (err) {
      setMutationError(err.message || "Failed to adjust stock");
    }
  };

  const columns = [
    { key: "sku", label: t("pharmacyProducts.colSku") },
    { key: "name", label: t("pharmacyProducts.colName") },
    {
      key: "packSize",
      label: "Pack",
      render: (row) => `${row.packSize || 1} strips/box`,
    },
    {
      key: "quantity",
      label: t("pharmacyProducts.colQty"),
      render: (row) => (
        <span className={row.quantity <= row.minStock ? "text-red-500 dark:text-red-400 font-semibold" : ""}>
          {Number(row.quantity).toFixed(1)}
        </span>
      ),
    },
    { key: "price", label: "Price", render: (row) => `SDG ${Number(row.price).toFixed(2)}` },
    {
      key: "pricePerStrip",
      label: "Price/Strip",
      render: (row) => `SDG ${(Number(row.price) / (row.packSize || 1)).toFixed(2)}`,
    },
    { key: "costPrice", label: "Unit Cost", render: (row) => `SDG ${Number(row.costPrice).toFixed(2)}` },
    { key: "totalValue", label: "Total Value", render: (row) => `SDG ${(Number(row.costPrice) * Number(row.quantity)).toFixed(2)}` },
    { key: "minStock", label: t("pharmacyProducts.colMinStock") },
    {
      key: "expiryDate",
      label: t("pharmacyProducts.colExpiry"),
      render: (row) =>
        row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : "-",
    },
    {
      key: "status",
      label: t("pharmacyProducts.colStatus"),
      render: (row) => {
        if (row.expiryDate && new Date(row.expiryDate) < new Date())
          return <Badge variant="danger">{t("pharmacyProducts.statusExpired")}</Badge>;
        if (row.quantity <= row.minStock)
          return <Badge variant="warning">{t("pharmacyProducts.statusLow")}</Badge>;
        return <Badge variant="success">{t("pharmacyProducts.statusOk")}</Badge>;
      },
    },
    {
      key: "actions",
      label: t("pharmacyProducts.colActions"),
      render: (row) => (
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>{t("pharmacyProducts.edit")}</Button>
          <Button size="sm" variant="secondary" onClick={() => { setAdjustItem(row); setAdjustForm({ type: "IN", quantity: "", notes: "" }); }}>{t("pharmacyProducts.stock")}</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteItem(row)}>{t("pharmacyProducts.del")}</Button>
        </div>
      ),
    },
  ];

  const lowStockCount = items.filter((i) => i.quantity <= i.minStock).length;
  const expiredCount = items.filter(
    (i) => i.expiryDate && new Date(i.expiryDate) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      {mutationError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{mutationError}</span>
          <button onClick={() => setMutationError('')} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 text-xl leading-none touch-target">&times;</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t("pharmacyProducts.title")}</h1>
          <p className="text-body text-slate mt-1">{t("pharmacyProducts.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowDeliveryModal(true)}>New Delivery</Button>
          <Button onClick={openCreate}>{t("pharmacyProducts.addProduct")}</Button>
        </div>
      </div>

      <AlertPanel alerts={alerts} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-caption text-slate">{t("pharmacyProducts.totalProducts")}</p><p className="text-heading-sm font-semibold text-obsidian">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-caption text-slate">{t("pharmacyProducts.lowStock")}</p><p className="text-heading-sm font-semibold text-red-500 dark:text-red-400">{lowStockCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-caption text-slate">{t("pharmacyProducts.expired")}</p><p className="text-heading-sm font-semibold text-red-500 dark:text-red-400">{expiredCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-caption text-slate">{t("pharmacyProducts.totalStock")}</p><p className="text-heading-sm font-semibold text-obsidian">{items.reduce((s, i) => s + i.quantity, 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("pharmacyProducts.inventory")}</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1">
                  <Input
                    placeholder={t("pharmacyProducts.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary">{t("common.search")}</Button>
            </div>
          </form>
          {loading ? (
            <p className="text-body text-slate">{t("pharmacyProducts.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-body text-slate text-center py-4">{t("pharmacyProducts.noProducts")}</p>
          ) : (
            <Table columns={columns} data={items} />
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }} title={editItem ? t("pharmacyProducts.editTitle") : t("pharmacyProducts.addTitle")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("pharmacyProducts.formName")} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t("pharmacyProducts.formSku")} required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input label="Price (per box)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Input label="Strips per box" type="number" min="1" step="1" value={form.packSize} onChange={(e) => setForm({ ...form, packSize: e.target.value })} />
          <Input label="Unit Cost (per box)" type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          {!editItem && <Input label={t("pharmacyProducts.formInitialQty")} type="number" min="0" value={form.initialQuantity} onChange={(e) => setForm({ ...form, initialQuantity: e.target.value })} />}
          <Input label={t("pharmacyProducts.formMinStock")} type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          <Input label={t("pharmacyProducts.formExpiryDate")} type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditItem(null); }} className="flex-1">{t("common.cancel")}</Button>
            <Button type="submit" className="flex-1">{editItem ? t("pharmacyProducts.updateBtn") : t("pharmacyProducts.createBtn")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!adjustItem} onClose={() => setAdjustItem(null)} title={adjustItem ? t("pharmacyProducts.adjustTitle", { name: adjustItem.name }) : ""}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <p className="text-body text-slate">{t("pharmacyProducts.currentStock")} <strong>{adjustItem?.quantity}</strong></p>
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">{t("pharmacyProducts.adjustType")}</label>
            <div className="flex gap-2">
              <button type="button" className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${adjustForm.type === "IN" ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300" : "bg-bone text-graphite hover:bg-silver"}`}
                onClick={() => setAdjustForm({ ...adjustForm, type: "IN" })}>{t("pharmacyProducts.stockIn")}</button>
              <button type="button" className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target ${adjustForm.type === "OUT" ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300" : "bg-bone text-graphite hover:bg-silver"}`}
                onClick={() => setAdjustForm({ ...adjustForm, type: "OUT" })}>{t("pharmacyProducts.stockOut")}</button>
            </div>
          </div>
          <Input label={t("pharmacyProducts.quantity")} type="number" min="1" required value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} />
          <Input label={t("pharmacyProducts.notes")} value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} placeholder={t("pharmacyProducts.notesPlaceholder")} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAdjustItem(null)} className="flex-1">{t("common.cancel")}</Button>
            <Button type="submit" className="flex-1">{t("pharmacyProducts.confirm")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title={t("pharmacyProducts.deleteTitle")}>
        <div className="space-y-4">
          <p className="text-body text-obsidian">{t("pharmacyProducts.deleteConfirm", { name: deleteItem?.name })}</p>
          <p className="text-caption text-slate">{t("pharmacyProducts.deleteHint")}</p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteItem(null)} className="flex-1">{t("common.cancel")}</Button>
            <Button type="button" variant="danger" onClick={handleDelete} className="flex-1">{t("common.delete")}</Button>
          </div>
        </div>
      </Modal>

      <DeliveryModal
        open={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        category="pharmacy"
        onSuccess={() => { setLoading(true); loadItems(); loadAlerts(); }}
      />
    </div>
  );
}
