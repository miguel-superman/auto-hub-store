"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Hash,
  Eye,
  User,
  Search,
  Filter,
  LogOut,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SupplierApprovals({ user, onLogout }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending"); // pending | approved | rejected | all
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let q;

    if (statusFilter === "all") {
      q = query(collection(db, "Suppliers"));
    } else {
      q = query(
        collection(db, "Suppliers"),
        where("status", "==", statusFilter)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSuppliers(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setLoadError(false);
        setLoading(false);
      },
      (error) => {
        console.error("Loading suppliers failed:", error);
        setLoadError(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [statusFilter]);

  // Client-side search
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;

    const term = searchQuery.toLowerCase().trim();

    return suppliers.filter((s) => {
      return (
        s.businessName?.toLowerCase().includes(term) ||
        s.contactName?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.phone?.toLowerCase().includes(term) ||
        s.city?.toLowerCase().includes(term) ||
        s.country?.toLowerCase().includes(term) ||
        s.supplierType?.toLowerCase().includes(term)
      );
    });
  }, [suppliers, searchQuery]);

  const reviewSupplier = async (supplier, decision) => {
    if (!auth.currentUser || processingId) return;

    let rejectionReason = "";

    if (decision === "rejected") {
      rejectionReason = window.prompt(
        "Enter a reason for rejecting this registration:"
      );

      if (rejectionReason === null) return;

      rejectionReason = rejectionReason.trim();

      if (!rejectionReason) {
        toast.error("Please provide a rejection reason.");
        return;
      }
    }

    setProcessingId(supplier.id);

    try {
      await updateDoc(doc(db, "Suppliers", supplier.id), {
        status: decision,
        isVerified: decision === "approved",
        rejectionReason: decision === "rejected" ? rejectionReason : "",
        reviewedBy: auth.currentUser.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(
        decision === "approved"
          ? `${supplier.businessName} has been approved.`
          : `${supplier.businessName} has been rejected.`
      );

      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier(null);
      }
    } catch (error) {
      console.error("Supplier review failed:", error);
      toast.error(
        "Unable to update supplier status. Check your admin permissions."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-300">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-300">
            Pending
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-slate-800 bg-slate-950 text-slate-100 shadow-xl">
        {/* Header */}
        <CardHeader className="border-b border-slate-800 bg-slate-900/80 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-3 text-xl text-slate-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-500/30">
                  <Building2 className="h-5 w-5 text-orange-400" />
                </div>
                Supplier Applications
              </CardTitle>
              <CardDescription className="text-slate-400">
                Review, approve, or reject auto parts supplier registrations.
              </CardDescription>
            </div>

            <Badge className="w-fit border-slate-700 bg-slate-800 text-slate-300">
              {filteredSuppliers.length} shown
            </Badge>

            <Button
              onClick={onLogout}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Filters + Search */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Search by name, email, phone, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-slate-700 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-orange-500/40"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] border-slate-700 bg-slate-900 text-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
              <p className="text-sm text-slate-400">Loading suppliers…</p>
            </div>
          ) : loadError ? (
            <div className="m-6 rounded-xl border border-rose-900/50 bg-rose-950/40 px-6 py-12 text-center">
              <XCircle className="mx-auto mb-3 h-10 w-10 text-rose-400" />
              <p className="font-medium text-rose-200">
                Unable to load suppliers
              </p>
              <p className="mt-1 text-sm text-rose-400/80">
                Check your connection and administrator permissions.
              </p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="m-6 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-slate-500" />
              <p className="text-base font-medium text-slate-200">
                No suppliers found
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                {searchQuery
                  ? "Try adjusting your search or filter."
                  : "There are no suppliers matching this status."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="pl-6 text-slate-400">
                      Business
                    </TableHead>
                    <TableHead className="text-slate-400">Contact</TableHead>
                    <TableHead className="text-slate-400">Location</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="pr-6 text-right text-slate-400">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      className="border-slate-800/80 transition-colors hover:bg-slate-900/60"
                    >
                      <TableCell className="pl-6">
                        <div className="font-medium text-slate-100">
                          {supplier.businessName}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {supplier.email || "No email"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm text-slate-300">
                          {supplier.contactName || "—"}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {supplier.phone || "No phone"}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-[160px] truncate text-sm text-slate-300">
                          {[supplier.city, supplier.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </TableCell>

                      <TableCell>{getStatusBadge(supplier.status)}</TableCell>

                      <TableCell className="pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedSupplier(supplier)}
                            className="h-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </Button>

                          {/* Show Approve only if not already approved */}
                          {supplier.status !== "approved" && (
                            <Button
                              size="sm"
                              disabled={processingId !== null}
                              onClick={() =>
                                reviewSupplier(supplier, "approved")
                              }
                              className="h-8 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {processingId === supplier.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}

                          {/* Always allow Reject (even on approved) */}
                          {supplier.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processingId !== null}
                              onClick={() =>
                                reviewSupplier(supplier, "rejected")
                              }
                              className="h-8 border-rose-900/60 text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Dialog */}
      <Dialog
        open={!!selectedSupplier}
        onOpenChange={(open) => !open && setSelectedSupplier(null)}
      >
        <DialogContent className="max-w-lg border-slate-800 bg-slate-950 text-slate-100 sm:rounded-2xl">
          {selectedSupplier && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-500/30">
                    <Building2 className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="space-y-1.5">
                    <DialogTitle className="text-xl text-slate-50">
                      {selectedSupplier.businessName}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(selectedSupplier.status)}
                      {selectedSupplier.supplierType && (
                        <Badge
                          variant="outline"
                          className="border-slate-700 text-slate-400"
                        >
                          {selectedSupplier.supplierType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem
                    icon={<User className="h-4 w-4" />}
                    label="Contact Person"
                    value={selectedSupplier.contactName}
                  />
                  <DetailItem
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={selectedSupplier.email}
                  />
                  <DetailItem
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={selectedSupplier.phone}
                  />
                  <DetailItem
                    icon={<Building2 className="h-4 w-4" />}
                    label="Supplier Type"
                    value={selectedSupplier.supplierType}
                  />
                </div>

                {/* <Separator className="bg-slate-800" /> */}

                <DetailItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Address"
                  value={
                    [
                      selectedSupplier.address,
                      selectedSupplier.city,
                      selectedSupplier.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || null
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedSupplier.registrationNumber && (
                    <DetailItem
                      icon={<FileText className="h-4 w-4" />}
                      label="Registration No."
                      value={selectedSupplier.registrationNumber}
                    />
                  )}
                  {selectedSupplier.taxNumber && (
                    <DetailItem
                      icon={<Hash className="h-4 w-4" />}
                      label="Tax / TRN"
                      value={selectedSupplier.taxNumber}
                    />
                  )}
                </div>

                {selectedSupplier.rejectionReason && (
                  <>
                    {/* <Separator className="bg-slate-800" /> */}
                    <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-rose-400">
                        Rejection Reason
                      </p>
                      <p className="mt-1 text-sm text-rose-200">
                        {selectedSupplier.rejectionReason}
                      </p>
                    </div>
                  </>
                )}

                {/* <Separator className="bg-slate-800" /> */}

                {/* Actions */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {selectedSupplier.status !== "rejected" && (
                    <Button
                      variant="outline"
                      disabled={processingId !== null}
                      onClick={() =>
                        reviewSupplier(selectedSupplier, "rejected")
                      }
                      className="border-rose-900/60 text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  )}

                  {selectedSupplier.status !== "approved" && (
                    <Button
                      disabled={processingId !== null}
                      onClick={() =>
                        reviewSupplier(selectedSupplier, "approved")
                      }
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {processingId === selectedSupplier.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Approve Supplier
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <p className="text-sm text-slate-200">
        {value || <span className="text-slate-600">Not provided</span>}
      </p>
    </div>
  );
}