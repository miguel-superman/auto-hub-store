"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  ArrowLeft,
  Boxes,
  Check,
  CircleOff,
  Loader2,
  PackagePlus,
  Pencil,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { db } from "../lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PART_CATEGORIES = [
  "Engine parts",
  "Brakes",
  "Filters",
  "Suspension & steering",
  "Electrical",
  "Transmission",
  "Cooling system",
  "Fuel system",
  "Tyres & wheels",
  "Body parts",
  "Lubricants",
  "Other",
];

const COMMON_BRANDS = [
  "Bosch",
  "Denso",
  "NGK",
  "Brembo",
  "MANN-FILTER",
  "KYB",
  "Genuine OEM",
  "Aftermarket",
  "Other",
];

const EMPTY_FORM = {
  partName: "",
  category: "",
  brand: "",
  customBrand: "",
  partNumber: "",
  oemNumber: "",
  vehicleMakes: "",
  vehicleModels: "",
  vehicleYears: "",
  quantityAvailable: "0",
  compatibilityNotes: "",
};

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function getErrorMessage(error) {
  if (error?.code === "permission-denied") {
    return "Access denied. Check your Firestore rules for this supplier's Parts subcollection.";
  }
  return error?.message || "Something went wrong. Please try again.";
}

export default function SupplierPartsCatalogue({
  user,
  onBackToDashboard,
}) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const partsRef = useMemo(() => {
    if (!user?.uid) return null;
    return collection(db, "Suppliers", user.uid, "Parts");
  }, [user?.uid]);

  useEffect(() => {
    if (!partsRef) {
      setParts([]);
      setLoading(false);
      setLoadError("You must be signed in to view your parts catalogue.");
      return;
    }

    setLoading(true);
    setLoadError("");

    const partsQuery = query(partsRef, orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(
      partsQuery,
      (snapshot) => {
        setParts(snapshot.docs.map((partDoc) => ({
          id: partDoc.id,
          ...partDoc.data(),
        })));
        setLoading(false);
        setLoadError("");
      },
      (error) => {
        console.error("Parts catalogue listener failed:", error);
        setLoadError(getErrorMessage(error));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [partsRef]);

  const filteredParts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return parts.filter((part) => {
      if (statusFilter === "active" && part.active !== true) return false;
      if (statusFilter === "inactive" && part.active === true) return false;

      if (!searchTerm) return true;

      const searchable = [
        part.partName,
        part.category,
        part.brand,
        part.partNumber,
        part.oemNumber,
        ...(Array.isArray(part.vehicleMakes) ? part.vehicleMakes : []),
        ...(Array.isArray(part.vehicleModels) ? part.vehicleModels : []),
      ].filter(Boolean).join(" ").toLowerCase();

      return searchable.includes(searchTerm);
    });
  }, [parts, search, statusFilter]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function beginEdit(part) {
    setEditingId(part.id);
    setForm({
      partName: part.partName || "",
      category: part.category || "",
      brand: part.brand || "",
      customBrand: "",
      partNumber: part.partNumber || "",
      oemNumber: part.oemNumber || "",
      vehicleMakes: joinList(part.vehicleMakes),
      vehicleModels: joinList(part.vehicleModels),
      vehicleYears: joinList(part.vehicleYears),
      quantityAvailable: String(part.quantityAvailable ?? 0),
      compatibilityNotes: part.compatibilityNotes || "",
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user?.uid || !partsRef) {
      toast.error("Please sign in before managing your catalogue.");
      return;
    }

    const partName = form.partName.trim();
    const category = form.category;
    const brand = form.brand === "Other"
      ? form.customBrand.trim()
      : form.brand;
    const quantityAvailable = Number(form.quantityAvailable);

    if (!partName || !category || !brand) {
      toast.error("Enter the part name, category, and brand.");
      return;
    }

    if (!Number.isFinite(quantityAvailable) || quantityAvailable < 0) {
      toast.error("Available quantity must be zero or greater.");
      return;
    }

    const payload = {
      partName,
      category,
      brand,
      partNumber: form.partNumber.trim(),
      oemNumber: form.oemNumber.trim(),
      vehicleMakes: splitList(form.vehicleMakes),
      vehicleModels: splitList(form.vehicleModels),
      vehicleYears: splitList(form.vehicleYears),
      quantityAvailable,
      price,
      compatibilityNotes: form.compatibilityNotes.trim(),
      active: true,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(
          doc(db, "Suppliers", user.uid, "Parts", editingId),
          payload
        );
        toast.success("Part updated successfully.");
      } else {
        await addDoc(partsRef, {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
        toast.success("Part added to your catalogue.");
      }

      resetForm();
    } catch (error) {
      console.error("Saving catalogue part failed:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(part) {
    if (!user?.uid) return;

    try {
      await updateDoc(
        doc(db, "Suppliers", user.uid, "Parts", part.id),
        {
          active: part.active !== true,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        }
      );
      toast.success(
        part.active === true
          ? "Part deactivated. It should no longer be matched for new requests."
          : "Part activated."
      );
    } catch (error) {
      console.error("Updating part status failed:", error);
      toast.error(getErrorMessage(error));
    }
  }

  const activeCount = parts.filter((part) => part.active === true).length;
  const inactiveCount = parts.length - activeCount;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">My Parts Catalogue</h1>
              <p className="text-xs text-slate-500">
                Manage the parts and brands you supply
              </p>
            </div>
          </div>

          {onBackToDashboard && (
            <Button variant="outline" onClick={onBackToDashboard}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <PackagePlus className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-slate-500">Total catalogue items</p>
                <p className="text-2xl font-bold">{parts.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Check className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-slate-500">Active parts</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <CircleOff className="h-8 w-8 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Inactive parts</p>
                <p className="text-2xl font-bold">{inactiveCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit catalogue item" : "Add a part"}</CardTitle>
            <CardDescription>
              Add each part and brand you stock. Separate entries can represent
              different brands or part numbers for the same type of part.
              Separate multiple vehicle values with commas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="partName">Part name *</Label>
                  <Input
                    id="partName"
                    value={form.partName}
                    onChange={(event) => updateField("partName", event.target.value)}
                    placeholder="e.g. Front brake pads"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) => updateField("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a parts category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PART_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Brand *</Label>
                  <Select
                    value={form.brand}
                    onValueChange={(value) => updateField("brand", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_BRANDS.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.brand === "Other" && (
                  <div className="space-y-2">
                    <Label htmlFor="customBrand">Custom brand name *</Label>
                    <Input
                      id="customBrand"
                      value={form.customBrand}
                      onChange={(event) => updateField("customBrand", event.target.value)}
                      placeholder="Enter brand name"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="partNumber">Part number</Label>
                  <Input
                    id="partNumber"
                    value={form.partNumber}
                    onChange={(event) => updateField("partNumber", event.target.value)}
                    placeholder="Manufacturer or aftermarket part number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oemNumber">OEM number</Label>
                  <Input
                    id="oemNumber"
                    value={form.oemNumber}
                    onChange={(event) => updateField("oemNumber", event.target.value)}
                    placeholder="Original equipment number, if known"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleMakes">Vehicle makes</Label>
                  <Input
                    id="vehicleMakes"
                    value={form.vehicleMakes}
                    onChange={(event) => updateField("vehicleMakes", event.target.value)}
                    placeholder="Toyota, Honda, Nissan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleModels">Vehicle models</Label>
                  <Input
                    id="vehicleModels"
                    value={form.vehicleModels}
                    onChange={(event) => updateField("vehicleModels", event.target.value)}
                    placeholder="Corolla, Civic, Note"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleYears">Compatible years</Label>
                  <Input
                    id="vehicleYears"
                    value={form.vehicleYears}
                    onChange={(event) => updateField("vehicleYears", event.target.value)}
                    placeholder="2018, 2019, 2020 or 2018-2022"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantityAvailable">Quantity available *</Label>
                  <Input
                    id="quantityAvailable"
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantityAvailable}
                    onChange={(event) => updateField("quantityAvailable", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="decimal"
                    min="0"
                    step="0.0"
                    value={form.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="compatibilityNotes">Compatibility notes</Label>
                <Textarea
                  id="compatibilityNotes"
                  value={form.compatibilityNotes}
                  onChange={(event) => updateField("compatibilityNotes", event.target.value)}
                  placeholder="Engine size, trim, fitment limitations, or other details"
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    <Pencil className="mr-2 h-4 w-4" />
                  ) : (
                    <PackagePlus className="mr-2 h-4 w-4" />
                  )}
                  {editingId ? "Save changes" : "Add part"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catalogue items</CardTitle>
            <CardDescription>
              Only active items should be considered for new supplier matching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search part, brand, number or vehicle"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active parts</SelectItem>
                  <SelectItem value="inactive">Inactive parts</SelectItem>
                  <SelectItem value="all">All parts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
              </div>
            ) : loadError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {loadError}
              </div>
            ) : filteredParts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <Boxes className="mx-auto mb-3 h-9 w-9 text-slate-400" />
                <p className="font-medium text-slate-700">No catalogue items found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add a part above or change your search/filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600">
                      <th className="p-3 font-medium">Part</th>
                      <th className="p-3 font-medium">Category / brand</th>
                      <th className="p-3 font-medium">Part number</th>
                      <th className="p-3 font-medium">Vehicle compatibility</th>
                      <th className="p-3 text-right font-medium">Qty</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.map((part) => (
                      <tr key={part.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-semibold text-slate-900">{part.partName}</p>
                          {part.oemNumber && (
                            <p className="mt-1 text-xs text-slate-500">
                              OEM: {part.oemNumber}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <p>{part.category || "—"}</p>
                          <p className="mt-1 text-xs text-slate-500">{part.brand || "—"}</p>
                        </td>
                        <td className="p-3">{part.partNumber || "—"}</td>
                        <td className="p-3">
                          <p>{joinList(part.vehicleMakes) || "Not specified"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[joinList(part.vehicleModels), joinList(part.vehicleYears)]
                              .filter(Boolean).join(" • ") || "No model/year details"}
                          </p>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {Number(part.quantityAvailable ?? 0)}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={part.active === true
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-slate-300 bg-slate-100 text-slate-600"}
                          >
                            {part.active === true ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => beginEdit(part)}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActive(part)}
                              title={part.active === true ? "Deactivate part" : "Activate part"}
                            >
                              {part.active === true ? (
                                <ToggleRight className="mr-1 h-4 w-4 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="mr-1 h-4 w-4 text-slate-500" />
                              )}
                              {part.active === true ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
