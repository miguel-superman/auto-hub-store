"use client"


import { useEffect, useState, useRef, useMemo } from "react";
import { toast } from "sonner";

import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { generateSupplierDocument } from "../lib/supplierDocuments";

// Change this path to match your Firebase configuration file.
import { db } from "../lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Eye,
  Pencil,
  FileText,
  Boxes,
  Clock,
  CheckCircle2,
  CalendarDays,
  XCircle,
  Volume2,
  VolumeX,
  KeyRound,
  LogOut,
  Search,
  Truck,
  CarFront,
  Package,
   UserRound,
   Save,
   X,
} from "lucide-react";

import StatCard from "./StatCard";



function RequestRow({ r, onUpdate, onView }) {
  const status = String(r.status || "pending").toLowerCase();

  const statusStyles = {
    pending: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    fulfilled: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    processing: "bg-blue-100 text-blue-800",
    accepted: "bg-emerald-100 text-emerald-800",
  };

  const vehicle =
    typeof r.vehicle === "string"
      ? r.vehicle
      : r.vehicleId ||
        [r.vehicle?.year, r.vehicle?.make, r.vehicle?.model]
          .filter(Boolean)
          .join(" ") ||
        "Not specified";

  const items = Array.isArray(r.items) ? r.items : [];
  const itemSummary = items.length
    ? items.map((item) =>
        `${item.partName || item.name || item.partId || "Part"} × ${item.quantity ?? 0}`
      ).join(", ")
    : `${r.partName || "Parts request"} × ${r.quantity ?? 0}`;

  const formatDate = (value) => {
    if (!value) return "—";

    const date = value?.toDate
      ? value.toDate()
      : new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString();
  };

  return (
    <tr className="border-b border-slate-200 hover:bg-slate-50">
      <td className="px-2 py-3">
        <div className="font-medium text-slate-900">
          {itemSummary}
        </div>
        {/* <div className="text-xs text-slate-500">
          {formatDate(r.timestamp || r.createdAt)}
        </div> */}
      </td>
      {/* <td className="px-4 py-3">
        <div className="font-medium text-slate-900">
          {r.orderNumber || r.id}
        </div>
        <div className="text-xs text-slate-500">
          {formatDate(r.timestamp || r.createdAt)}
        </div>
      </td> */}

      {/* <td className="px-4 py-3 text-sm text-slate-700">
        {vehicle}
      </td> */}

       <td className="px-4 py-3">
        <div className="max-w-xs text-sm text-slate-800">
          {r.quantity ?? items.reduce((sum, item) => sum + (item.quantity ?? 0), 0)}
        </div>
      </td>

      {/* <td className="px-4 py-3">
        <div className="max-w-xs text-sm text-slate-800">
          {itemSummary}
        </div>
      </td> */}

      

      <td className="px-4 py-3 text-sm text-slate-700">
        {r.mechanicName || r.requestedBy || r.mechanicId || "Unknown"}
      </td>

      <td className="px-0 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            statusStyles[status] || "bg-slate-100 text-slate-700"
          }`}
        >
          {status.replaceAll("_", " ")}
        </span>
      </td>

      <td className="px-0 py-3">
        
          {r.createdAt ? formatDate(r.createdAt) : r.timestamp ? formatDate(r.timestamp) : "—"}
       
      </td>


      <td className="px-4 py-3 text-right">
        <div className="flex flex-wrap justify-end gap-2">
          {typeof onView === "function" && (
            <button
              type="button"
              onClick={() => onView(r)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              <Eye className="h-4 w-4" />
              View full
            </button>
          )}

          {typeof onUpdate === "function" && (
            <button
              type="button"
              onClick={() => onUpdate(r)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
            >
              <Pencil className="h-4 w-4" />
              Update
            </button>
          )}
        </div>
      </td>


      {/* <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          {typeof onView === "function" && (
            <button
              type="button"
              onClick={() => onView(r)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              View
            </button>
          )}

          {typeof onUpdate === "function" && (
            <button
              type="button"
              onClick={() => onUpdate(r)}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
            >
              Update
            </button>
          )}
        </div>
      </td> */}
    </tr>
  );
}


function RequestDetailsDialog({ request,
      onClose,
      onUpdate,
      onGenerateDocument,
      generatingDocument,
    }) {
  if (!request) return null;

  const items = Array.isArray(request.items) ? request.items : [];

  const formatDate = (value) => {
    if (!value) return "—";

    const date = typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString();
  };

  const vehicle = request.vehicle && typeof request.vehicle === "object"
    ? [
        request.vehicle.year && Number(request.vehicle.year) !== 0
          ? request.vehicle.year
          : "",
        request.vehicle.make,
        request.vehicle.model,
      ].filter(Boolean).join(" ")
    : typeof request.vehicle === "string"
      ? request.vehicle
      : request.vehicleId || "Not specified";

  const statusLabel = String(request.status || "Pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const statusStyles = {
    pending: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    in_progress: "bg-blue-100 text-blue-800",
    accepted: "bg-emerald-100 text-emerald-800",
    pending_items: "bg-orange-100 text-orange-800",
    fulfilled: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const statusKey = String(request.status || "pending")
    .toLowerCase()
    .replaceAll(" ", "_");

  const money = (value) =>
    new Intl.NumberFormat("en-JM", {
      style: "currency",
      currency: request.currency || "JMD",
    }).format(Number(value) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-6 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                <FileText className="h-4 w-4" />
                Purchase order details
              </div>

              <h2 className="text-2xl font-bold">
                {request.orderNumber || request.id}
              </h2>

              <p className="mt-1 text-sm text-slate-300">
                {request.supplierName || "Supplier"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close request details"
              className="rounded-lg p-2 text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              statusStyles[statusKey] || "bg-slate-200 text-slate-800"
            }`}>
              {statusLabel}
            </span>

            <span className="text-sm text-slate-300">
              Reference: {request.orderId || request.id}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <UserRound className="mb-3 h-5 w-5 text-orange-600" />
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Requested by
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {request.mechanicName || request.requestedBy || "Unknown"}
              </p>
              <p className="mt-1 break-all text-xs text-slate-500">
                {request.mechanicId || ""}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <CarFront className="mb-3 h-5 w-5 text-orange-600" />
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Vehicle
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {vehicle.make} {vehicle.model} {vehicle.year || "Not specified"}
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                Chassis #:{request.chassisNumber || "Not specified"}
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                Engine #:{ request.engineNumber || "Not specified"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <CalendarDays className="mb-3 h-5 w-5 text-orange-600" />
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Submitted
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(request.createdAt || request.timestamp)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Updated: {formatDate(request.updatedAt)}
              </p>
            </div>
          </div>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Requested parts
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Part</th>
                    {/* <th className="px-4 py-3">Part ID</th> */}
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Unit price</th>
                    <th className="px-4 py-3 text-right">Line total</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.length > 0 ? items.map((item, index) => (
                    <tr key={item.partId || index}>
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {item.partName || item.name || "Part"}
                      </td>
                      {/* <td className="px-4 py-4 text-slate-500">
                        {item.partId || "—"}
                      </td> */}
                      <td className="px-4 py-4 text-right">
                        {Number(item.quantity) || 0}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {money(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {money(
                          item.lineTotal ??
                          (Number(item.quantity || 0) * Number(item.unitPrice || 0))
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No item details are available for this request.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Request notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {request.notes || "No notes have been added."}
              </p>
            </div>

            <div className="min-w-52 rounded-xl bg-slate-900 p-5 text-white">
              <p className="text-sm text-slate-300">Order total</p>
              <p className="mt-2 text-2xl font-bold">
                {money(request.total)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {items.length} part line{items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>

            <Button
              className="bg-slate-900 hover:bg-slate-700"
              onClick={() => onUpdate(request)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Update status & notes
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 border-t pt-4">
            <Button
              onClick={() => onGenerateDocument(request, "po")}
              disabled={Boolean(generatingDocument)}
              className="bg-slate-900 text-white"
            >
              {generatingDocument === "po"
                ? "Generating PO..."
                : "Download PO PDF"}
            </Button>

            <Button
              variant="outline"
              onClick={() => onGenerateDocument(request, "receipt")}
              disabled={Boolean(generatingDocument)}
            >
              {generatingDocument === "receipt"
                ? "Generating receipt..."
                : "Download Receipt PDF"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



function UpdateRequestDialog({ request, onClose, onSave }) {
  const [status, setStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!request) return;

    const rawStatus = String(request.status || "Pending")
      .toLowerCase()
      .replaceAll("_", " ");

    const statusMap = {
      pending: "Pending",
      processing: "Processing",
      in_progress: "Processing",
      accepted: "Accepted",
      "pending items": "Pending Items",
      fulfilled: "Fulfilled",
      rejected: "Rejected",
    };

    setStatus(statusMap[rawStatus] || "Pending");
    setNotes(request.notes || "");
  }, [request]);

  if (!request) return null;

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onSave(request.id, {
        status,
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
      <form
        onSubmit={handleSave}
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">Supplier response</p>
              <h2 className="mt-1 text-xl font-bold">
                Update parts request
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {request.orderNumber || request.id}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close update form"
              className="rounded-lg p-2 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label
              htmlFor="request-status"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Request status
            </label>

            <select
              id="request-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Accepted">Accepted</option>
              <option value="Pending Items">Pending Items</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="request-notes"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Notes / supplier response
            </label>

            <textarea
              id="request-notes"
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add an update for the mechanic, such as availability, delays, substitutions, or collection instructions..."
              className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />

            <p className="mt-2 text-xs text-slate-500">
              These notes are saved with the request and can be displayed to the mechanic.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function normalizeRequestStatus(value) {
  const status = String(value || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (status === "processing") return "in_progress";

  return status;
}


// ---------- Dashboard ----------
function Dashboard({ user, onLogout, onOpenProfile,  onOpenParts, }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewRequest, setViewRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [pwOpen, setPwOpen] = useState(false);

  const [supplierProfile, setSupplierProfile] = useState({});
  const [generatingDocument, setGeneratingDocument] = useState("");

  const prevIdsRef = useRef(new Set());
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "Suppliers", user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setSupplierProfile(snapshot.data());
        }
      },
      (error) => {
        console.error("Unable to load supplier profile:", error);
        toast.error("Could not load company branding.");
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleGenerateDocument = async (request, type) => {
    try {
      setGeneratingDocument(type);

      await generateSupplierDocument({
        request,
        profile: supplierProfile,
        type,
      });

      toast.success(
        type === "po"
          ? "Purchase order PDF generated."
          : "Receipt PDF generated."
      );
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error(error.message || "Unable to generate PDF.");
    } finally {
      setGeneratingDocument("");
    }
  };

  function handleSnapshot(list) {
    // Detect new requests for notifications
    const prev = prevIdsRef.current;
    if (prev.size > 0) {
      const newOnes = list.filter((r) => !prev.has(r.id) && r.status === 'pending');
      newOnes.forEach((r) => {
        if (soundRef.current) playBeep();
        toast.success(`New parts request: ${r.partName}`, {
          description: `Qty ${r.quantity} • Vehicle ${r.vehicleId} • by ${r.requestedBy}`,
          duration: 6000,
        });
      });
    }
    prevIdsRef.current = new Set(list.map((r) => r.id));
    setRequests(list);
  }

  // const stats = useMemo(() => {
  //   const s = { pending: 0, in_progress: 0, fulfilled: 0, rejected: 0 };
  //   requests.forEach((r) => {
  //     s[r.status] = (s[r.status] || 0) + 1;
  //   });
  //   return s;
  // }, [requests]);


    const stats = useMemo(() => {
      const counts = {
        pending: 0,
        in_progress: 0,
        fulfilled: 0,
        rejected: 0,
      };

      requests.forEach((request) => {
        if (Object.prototype.hasOwnProperty.call(counts, request.status)) {
          counts[request.status] += 1;
        }
      });

      return counts;
}, [requests]);


  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.partName?.toLowerCase().includes(q) ||
          r.partId?.toLowerCase().includes(q) ||
          r.vehicleId?.toLowerCase().includes(q) ||
          r.requestedBy?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requests, filter, search]);




    const updateRequest = async (id, updates) => {
      if (!user?.uid) {
        toast.error("Please sign in to update requests.");
        throw new Error("User is not signed in.");
      }

      try {
        await updateDoc(
          doc(db, "Suppliers", user.uid, "parts_requests", id),
          {
            status: updates.status,
            notes: updates.notes,
            updatedAt: serverTimestamp(),
          }
        );

        toast.success("Parts request updated successfully.");
        setEditingRequest(null);
        setViewRequest(null);
      } catch (error) {
        console.error("Failed to update supplier request:", error);
        toast.error("Update failed: " + (error.message || "Please try again."));
        throw error;
      }
    };


  useEffect(() => {
    if (!user?.uid) {
      setRequests([]);
      return;
    }

    const requestsRef = collection(
      db,
      "Suppliers",
      user.uid,
      "parts_requests"
    );

    // Initially read the collection without orderBy.
    // This avoids excluding documents that do not have "timestamp".
    const unsubscribe = onSnapshot(
      requestsRef,
      (snapshot) => {
        console.log("Supplier UID:", user.uid);
        console.log("Firebase project:", db.app.options.projectId);
        console.log("Request documents found:", snapshot.size);

        const list = snapshot.docs.map((document) => {
          const data = document.data();
          const firstItem = data.items?.[0] || {};

          const vehicle = data.vehicle || {};
          const vehicleDescription =
            typeof vehicle === "string"
              ? vehicle
              : [
                  vehicle.year,
                  vehicle.make,
                  vehicle.model,
                ]
                  .filter(Boolean)
                  .join(" ");

          return {
            ...data,

            // Preserve the Firestore document ID for updates.
            id: document.id,

            // Support both the API schema and the older dashboard schema.
            partName: data.partName || firstItem.partName || firstItem.name || "Parts request",
            partId: data.partId || firstItem.partId || "",
            quantity: data.quantity ?? firstItem.quantity ?? 0,
            vehicleId: data.vehicleId || vehicleDescription || "",
            requestedBy:
              data.requestedBy || data.mechanicName || data.mechanicId || "Unknown",
            // status: String(data.status || "pending").toLowerCase(),
            status: normalizeRequestStatus(data.status),
            timestamp: data.timestamp || data.createdAt || null,
          };
        });

        console.log("Loaded supplier requests:", list);

        // Sort newest first using either timestamp field.
        list.sort((a, b) => {
          const getTime = (value) => {
            if (!value) return 0;
            if (typeof value.toDate === "function") {
              return value.toDate().getTime();
            }
            const parsed = new Date(value).getTime();
            return Number.isNaN(parsed) ? 0 : parsed;
          };

          return getTime(b.timestamp) - getTime(a.timestamp);
        });

        handleSnapshot(list);
      },
      (error) => {
        console.error("Supplier parts request subscription error:", {
          code: error.code,
          message: error.message,
          supplierId: user.uid,
        });

        toast.error(
          "Unable to load supplier parts requests: " + error.message
        );
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);





  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Autostore Admin</h1>
              <p className="text-xs text-slate-500">Real-time parts request dashboard</p>
            </div>
                        
            <Badge
              variant="outline"
              className="ml-3 border-emerald-400 bg-emerald-50 text-emerald-700"
            >
              LIVE MODE
            </Badge>

          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundOn((s) => !s)}
              title={soundOn ? 'Mute notifications' : 'Unmute notifications'}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            </Button>
            {/* {!isFirebaseConfigured && (
              <Button variant="outline" size="sm" onClick={addDemoRequest}>
                <Plus className="h-4 w-4 mr-1" /> Simulate request
              </Button>
            )} */}
            <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
              <KeyRound className="h-4 w-4 mr-1" /> Change password
            </Button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center text-xs font-semibold">
                {(user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-700">{user?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenParts}
            >
              <Package className="mr-2 h-4 w-4" />
              My Parts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenProfile}
            >
              <UserRound className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">


        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            color="amber"
          />

          <StatCard
            label="In Progress"
            value={stats.in_progress}
            icon={Truck}
            color="blue"
          />

          <StatCard
            label="Fulfilled"
            value={stats.fulfilled}
            icon={CheckCircle2}
            color="emerald"
          />

          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="rose"
          />
        </div>

        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"> */}
          {/* <StatCard label="Pending" value={stats.pending} icon={Clock} color="amber" />
          <StatCard label="In Progress" value={stats.in_progress} icon={Truck} color="blue" />
          <StatCard label="Fulfilled" value={stats.fulfilled} icon={CheckCircle2} color="emerald" />
          <StatCard label="Rejected" value={stats.rejected} icon={XCircle} color="rose" /> */}

          
        {/* </div> */}

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress ({stats.in_progress})</TabsTrigger>
                <TabsTrigger value="fulfilled">Fulfilled ({stats.fulfilled})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search part, vehicle, requester..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-bold">Parts</TableHead>
                    {/* <TableHead>Vehicle</TableHead> */}
                    <TableHead className="font-bold">Qty</TableHead>
                    <TableHead className="font-bold">Requested By</TableHead>
                    {/* <TableHead>Bin</TableHead> */}
                    {/* <TableHead>Picker</TableHead> */}
                    <TableHead className="font-bold text-left">Status</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                        <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        No requests {filter !== 'all' ? `in ${filter}` : 'yet'}
                      </TableCell>
                    </TableRow>
                  )}                  
                  {filtered.map((r) => (
                    <RequestRow
                      key={r.id}
                      r={r}
                      onView={(request) => setViewRequest(request)}
                      onUpdate={(request) => setEditingRequest(request)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {viewRequest && (
        <RequestDetailsDialog
          request={viewRequest}
          onClose={() => setViewRequest(null)}
          onUpdate={(request) => {
            setViewRequest(null);
            setEditingRequest(request);
          }}
          onGenerateDocument={handleGenerateDocument}
          generatingDocument={generatingDocument}
        />
      )}

      {editingRequest && (
        <UpdateRequestDialog
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSave={updateRequest}
        />
      )}

    </div>
  );
}

export default Dashboard