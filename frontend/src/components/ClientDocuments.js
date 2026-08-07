import React, { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Upload, FileText, FileImage, FileSpreadsheet, File as FileIcon, Eye, Download, Pencil, Trash2, X, ArrowUpDown, History } from "lucide-react";

const CATEGORIES = {
  "Resmi Evraklar": ["Vergi Levhası", "İmza Sirküleri", "Ticaret Sicil Gazetesi", "Faaliyet Belgesi", "Oda Sicil Belgesi", "MERSİS"],
  "Mali Veriler": ["Bilanço", "Gelir Tablosu", "Mizan", "Muavin"],
  "Beyannameler": [],
  "Sözleşmeler": [],
  "Kimlik / Yetki Belgeleri": [],
  "Banka / Kredi Belgeleri": [],
  "SGK Belgeleri": [],
  "Şirket Belgeleri": [],
  "Diğer": [],
};
const CAT_KEYS = Object.keys(CATEGORIES);
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx";

const fmtSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
const fmtDate = (iso) => { if (!iso) return "-"; const s = String(iso).slice(0, 10); return s.length < 10 ? s : `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}`; };
const extOf = (name = "") => (name.split(".").pop() || "").toLowerCase();

function fileIcon(mime, name) {
  const e = extOf(name);
  if ((mime || "").includes("pdf") || e === "pdf") return <FileText size={18} className="text-rose-500" />;
  if ((mime || "").includes("image") || ["jpg", "jpeg", "png"].includes(e)) return <FileImage size={18} className="text-blue-500" />;
  if (["xls", "xlsx"].includes(e)) return <FileSpreadsheet size={18} className="text-emerald-600" />;
  return <FileIcon size={18} className="text-slate-500" />;
}

function expiryInfo(iso) {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso) - new Date(new Date().toISOString().slice(0, 10))) / 86400000);
  if (days < 0) return { cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400", label: `Süresi doldu` };
  if (days <= 7) return { cls: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400", label: `${days} gün kaldı` };
  if (days <= 30) return { cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", label: `${days} gün kaldı` };
  return { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", label: fmtDate(iso) };
}

export default function ClientDocuments({ clientId, clientName }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fCat, setFCat] = useState("");
  const [fPeriod, setFPeriod] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [fTag, setFTag] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickedFile, setPickedFile] = useState(null);
  const [form, setForm] = useState({ title: "", category: "Diğer", subcategory: "", document_date: "", period: "", description: "", tags: "", expiry_date: "" });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parentId, setParentId] = useState("");
  const fileRef = useRef(null);

  const [editDoc, setEditDoc] = useState(null);
  const [delDoc, setDelDoc] = useState(null);
  const [preview, setPreview] = useState(null); // {doc, url, kind}
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/clients/${clientId}/documents`).then((r) => setDocs(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [clientId]);

  const allTags = [...new Set(docs.flatMap((d) => d.tags || []))];

  const filtered = docs
    .filter((d) => !fCat || d.category === fCat)
    .filter((d) => !fPeriod || (d.period || "").includes(fPeriod))
    .filter((d) => !fSearch || (d.title || "").toLowerCase().includes(fSearch.toLowerCase()))
    .filter((d) => !fTag || (d.tags || []).includes(fTag))
    .sort((a, b) => {
      const av = (a[sortKey] || ""), bv = (b[sortKey] || "");
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  const toggleSort = (k) => { if (sortKey === k) setSortAsc((s) => !s); else { setSortKey(k); setSortAsc(false); } };

  const openUpload = (parent) => {
    setParentId(parent?.id || "");
    setPickedFile(null);
    setForm({
      title: parent ? parent.title : "", category: parent ? parent.category : "Diğer",
      subcategory: parent ? (parent.subcategory || "") : "", document_date: "", period: "",
      description: "", tags: parent ? (parent.tags || []).join(", ") : "", expiry_date: "",
    });
    setUploadOpen(true);
  };

  const onPick = (f) => {
    if (!f) return;
    const e = "." + extOf(f.name);
    if (!ACCEPT.split(",").includes(e)) return toast.error("Desteklenmeyen dosya türü");
    setPickedFile(f);
    if (!form.title) setForm((x) => ({ ...x, title: f.name.replace(/\.[^.]+$/, "") }));
  };

  const doUpload = async () => {
    if (!pickedFile) return toast.error("Lütfen bir dosya seçin");
    if (!form.title.trim()) return toast.error("Belge adı zorunludur");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", pickedFile);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v || ""));
      if (parentId) fd.append("parent_document_id", parentId);
      await api.post(`/clients/${clientId}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Belge yüklendi");
      setUploadOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Yükleme başarısız"); }
    finally { setUploading(false); }
  };

  const saveEdit = async () => {
    if (!editDoc.title.trim()) return toast.error("Belge adı zorunludur");
    try {
      await api.put(`/clients/${clientId}/documents/${editDoc.id}`, {
        title: editDoc.title, category: editDoc.category, subcategory: editDoc.subcategory,
        document_date: editDoc.document_date, period: editDoc.period, description: editDoc.description,
        tags: editDoc.tags, expiry_date: editDoc.expiry_date,
      });
      toast.success("Belge güncellendi"); setEditDoc(null); load();
    } catch (e) { toast.error("Güncellenemedi"); }
  };

  const confirmDelete = async () => {
    try { await api.delete(`/clients/${clientId}/documents/${delDoc.id}`); toast.success("Belge silindi"); setDelDoc(null); load(); }
    catch (e) { toast.error("Silinemedi"); }
  };

  const fetchBlob = async (d, inline) => {
    const res = await api.get(`/clients/${clientId}/documents/${d.id}/download`, { params: inline ? { inline: 1 } : {}, responseType: "blob" });
    return window.URL.createObjectURL(new Blob([res.data], { type: d.mime_type }));
  };

  const openPreview = async (d) => {
    const e = extOf(d.original_filename);
    const isPdf = (d.mime_type || "").includes("pdf") || e === "pdf";
    const isImg = (d.mime_type || "").includes("image") || ["jpg", "jpeg", "png"].includes(e);
    if (!isPdf && !isImg) { downloadDoc(d); return; }
    setPreviewLoading(true); setPreview({ doc: d, url: null, kind: isPdf ? "pdf" : "img" });
    try { const url = await fetchBlob(d, true); setPreview({ doc: d, url, kind: isPdf ? "pdf" : "img" }); }
    catch { toast.error("Önizleme açılamadı"); setPreview(null); }
    finally { setPreviewLoading(false); }
  };

  const downloadDoc = async (d) => {
    try {
      const url = await fetchBlob(d, false);
      const a = document.createElement("a");
      a.href = url; a.download = d.original_filename || d.title;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("İndirilemedi"); }
  };

  const Th = ({ k, children, className }) => (
    <th className={`px-3 py-2.5 font-medium ${className || "text-left"}`}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">{children} <ArrowUpDown size={11} /></button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <Input data-testid="doc-search" value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="Belge adı ara..." className="w-52" />
          <select data-testid="doc-cat-filter" value={fCat} onChange={(e) => setFCat(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Tüm kategoriler</option>
            {CAT_KEYS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input data-testid="doc-period-filter" value={fPeriod} onChange={(e) => setFPeriod(e.target.value)} placeholder="Dönem/Yıl" className="w-28" />
          {allTags.length > 0 && (
            <select data-testid="doc-tag-filter" value={fTag} onChange={(e) => setFTag(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Tüm etiketler</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
        <Button data-testid="upload-doc-btn" onClick={() => openUpload(null)}><Upload size={16} className="mr-1.5" /> Evrak Yükle</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <Th k="title">Belge Adı</Th>
                <Th k="category">Kategori</Th>
                <Th k="document_date">Belge Tarihi</Th>
                <th className="px-3 py-2.5 font-medium text-left">Dönem</th>
                <th className="px-3 py-2.5 font-medium text-left">Tür</th>
                <th className="px-3 py-2.5 font-medium text-right">Boyut</th>
                <Th k="created_at">Yüklenme</Th>
                <th className="px-3 py-2.5 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Yükleniyor...</td></tr>}
              {!loading && filtered.map((d) => {
                const exp = expiryInfo(d.expiry_date);
                return (
                  <tr key={d.id} data-testid={`doc-row-${d.id}`} className="border-t border-border hover:bg-accent/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">{fileIcon(d.mime_type, d.original_filename)}
                        <div>
                          <div className="font-medium flex items-center gap-1.5">{d.title}{d.version > 1 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">v{d.version}</span>}</div>
                          {d.subcategory && <div className="text-xs text-muted-foreground">{d.subcategory}</div>}
                          {(d.tags || []).length > 0 && <div className="flex gap-1 mt-1">{d.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">{t}</span>)}</div>}
                          {exp && <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded ${exp.cls}`}>Geçerlilik: {exp.label}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><Badge variant="secondary">{d.category}</Badge></td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(d.document_date)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{d.period || "-"}</td>
                    <td className="px-3 py-2.5 uppercase text-xs text-muted-foreground">{extOf(d.original_filename)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground whitespace-nowrap">{fmtSize(d.file_size)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(d.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button data-testid={`doc-view-${d.id}`} title="Görüntüle" onClick={() => openPreview(d)} className="text-muted-foreground hover:text-blue-500"><Eye size={15} /></button>
                        <button data-testid={`doc-download-${d.id}`} title="İndir" onClick={() => downloadDoc(d)} className="text-muted-foreground hover:text-emerald-600"><Download size={15} /></button>
                        <button data-testid={`doc-version-${d.id}`} title="Yeni Versiyon" onClick={() => openUpload(d)} className="text-muted-foreground hover:text-amber-600"><History size={15} /></button>
                        <button data-testid={`doc-edit-${d.id}`} title="Düzenle" onClick={() => setEditDoc({ ...d, tags: (d.tags || []).join(", "), document_date: (d.document_date || "").slice(0, 10), expiry_date: (d.expiry_date || "").slice(0, 10) })} className="text-muted-foreground hover:text-blue-500"><Pencil size={15} /></button>
                        <button data-testid={`doc-delete-${d.id}`} title="Sil" onClick={() => setDelDoc(d)} className="text-muted-foreground hover:text-rose-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Bu mükellefe ait belge yok. Sağ üstten yeni evrak yükleyin.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{parentId ? "Yeni Versiyon Yükle" : "Evrak Yükle"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); onPick(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              data-testid="doc-dropzone"
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-accent" : "border-border hover:bg-accent/40"}`}>
              <Upload size={22} className="mx-auto mb-2 text-muted-foreground" />
              {pickedFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">{fileIcon(pickedFile.type, pickedFile.name)} {pickedFile.name} <span className="text-muted-foreground">({fmtSize(pickedFile.size)})</span></div>
              ) : (
                <p className="text-sm text-muted-foreground">Dosyayı sürükleyip bırakın veya seçmek için tıklayın<br /><span className="text-xs">PDF, JPG, PNG, Excel, Word · maks. 25 MB</span></p>
              )}
              <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" data-testid="doc-file-input" onChange={(e) => onPick(e.target.files?.[0])} />
            </div>

            <div className="space-y-1.5"><Label className="text-xs">Belge Adı *</Label><Input data-testid="doc-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Kategori</Label>
                <Input list="cat-list" data-testid="doc-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <datalist id="cat-list">{CAT_KEYS.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Alt Kategori</Label>
                <Input list="subcat-list" data-testid="doc-subcategory" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} />
                <datalist id="subcat-list">{(CATEGORIES[form.category] || []).map((s) => <option key={s} value={s} />)}</datalist>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Belge Tarihi</Label><Input type="date" data-testid="doc-date" value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Dönem / Yıl</Label><Input data-testid="doc-period" placeholder="2026 / 2026-Q1" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Etiketler (virgülle)</Label><Input data-testid="doc-tags" placeholder="KDV, Banka, 2026" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Geçerlilik / Son Kullanma Tarihi (opsiyonel)</Label><Input type="date" data-testid="doc-expiry" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Açıklama</Label><Input data-testid="doc-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>İptal</Button>
            <Button data-testid="doc-upload-submit" onClick={doUpload} disabled={uploading}>{uploading ? "Yükleniyor..." : "Yükle"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editDoc} onOpenChange={(v) => !v && setEditDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Belge Bilgilerini Düzenle</DialogTitle></DialogHeader>
          {editDoc && (
            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Belge Adı *</Label><Input data-testid="edit-doc-title" value={editDoc.title} onChange={(e) => setEditDoc({ ...editDoc, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Kategori</Label><Input list="cat-list" value={editDoc.category} onChange={(e) => setEditDoc({ ...editDoc, category: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Alt Kategori</Label><Input value={editDoc.subcategory || ""} onChange={(e) => setEditDoc({ ...editDoc, subcategory: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Belge Tarihi</Label><Input type="date" value={editDoc.document_date || ""} onChange={(e) => setEditDoc({ ...editDoc, document_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Dönem / Yıl</Label><Input value={editDoc.period || ""} onChange={(e) => setEditDoc({ ...editDoc, period: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Etiketler</Label><Input value={editDoc.tags} onChange={(e) => setEditDoc({ ...editDoc, tags: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Geçerlilik Tarihi</Label><Input type="date" value={editDoc.expiry_date || ""} onChange={(e) => setEditDoc({ ...editDoc, expiry_date: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Açıklama</Label><Input value={editDoc.description || ""} onChange={(e) => setEditDoc({ ...editDoc, description: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)}>İptal</Button>
            <Button data-testid="edit-doc-submit" onClick={saveEdit}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(v) => { if (!v) { if (preview?.url) window.URL.revokeObjectURL(preview.url); setPreview(null); } }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{preview && fileIcon(preview.doc.mime_type, preview.doc.original_filename)} {preview?.doc.title}</DialogTitle></DialogHeader>
          <div className="min-h-[60vh] grid place-items-center bg-secondary/30 rounded-lg overflow-auto">
            {previewLoading && <span className="text-muted-foreground">Yükleniyor...</span>}
            {!previewLoading && preview?.url && preview.kind === "pdf" && <iframe title="pdf" src={preview.url} className="w-full h-[70vh] rounded-lg" />}
            {!previewLoading && preview?.url && preview.kind === "img" && <img src={preview.url} alt={preview.doc.title} className="max-w-full max-h-[70vh] object-contain" />}
          </div>
          <DialogFooter>
            {preview && <Button data-testid="preview-download" onClick={() => downloadDoc(preview.doc)}><Download size={15} className="mr-1.5" /> İndir</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!delDoc} onOpenChange={(v) => !v && setDelDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Belgeyi sil</AlertDialogTitle>
            <AlertDialogDescription><strong>{delDoc?.title}</strong> silinecek. Bu işlem denetim kaydına yazılır. Devam edilsin mi?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-doc" onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
