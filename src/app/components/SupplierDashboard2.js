"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { toast } from "sonner";
import {
  ArrowLeft,
  Boxes,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  ImagePlus,
  LogOut,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";

import { auth, db, storage } from "../lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formatMoney = (amount, currency = "JMD") =>
  new Intl.NumberFormat("en-JM", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
};

const statusStyles = (status) => {
  const value = String(status || "Pending").toLowerCase();

  if (["approved", "accepted", "fulfilled", "paid"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["rejected", "cancelled", "canceled"].includes(value)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (["processing", "in_progress"].includes(value)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
};

export default function SupplierDashboard({
  user,
  onBackToDashboard,
}) {
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  const [activePage, setActivePage] = useState("overview");
  const [profileForm, setProfileForm] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setSupplier(null);
      setLoading(false);
      setLoadError(true);
      return;
    }

    setLoading(true);

    const supplierRef = doc(db, "Suppliers", user.uid);

    const unsubscribe = onSnapshot(
      supplierRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSupplier(null);
          setLoadError(true);
          setProfileForm({});
          setLogoPreview("");
        } else {
          const data = {
            uid: snapshot.id,
            ...snapshot.data(),
          };

          setSupplier(data);
          setLoadError(false);

          setProfileForm({
            businessName: data.businessName || "",
            supplierType: data.supplierType || "retailer",
            registrationNumber: data.registrationNumber || "",
            taxNumber: data.taxNumber || "",
            contactName: data.contactName || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            parish: data.parish || "",
            country: data.country || "Jamaica",
            website: data.website || "",
            profileDescription: data.profileDescription || "",
          });

          setLogoPreview(data.logoUrl || data.imageUrl || "");
        }

        setLoading(false);
      },
      (error) => {
        console.error("Supplier profile listener failed:", error);
        setLoadError(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    setOrdersError(false);

    const requestsRef = collection(
      db,
      "Suppliers",
      user.uid,
      "parts_requests"
    );

    const requestsQuery = query(
      requestsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((orderDoc) => ({
            id: orderDoc.id,
            ...orderDoc.data(),
          }))
        );

        setOrdersError(false);
        setOrdersLoading(false);
      },
      (error) => {
        console.error("Purchase orders listener failed:", error);
        setOrdersError(true);
        setOrdersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!logoFile) return undefined;

    const localUrl = URL.createObjectURL(logoFile);
    setLogoPreview(localUrl);

    return () => URL.revokeObjectURL(localUrl);
  }, [logoFile]);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await signOut(auth);
      toast.success("Signed out successfully.");
    } catch (error) {
      console.error("Supplier logout failed:", error);
      toast.error("Unable to sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const updateField = (field, value) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event?.preventDefault();

    if (!user?.uid) {
      toast.error("Please sign in again to save your profile.");
      return;
    }

    setSavingProfile(true);

    try {
      // Merge preserves approval/status fields and other existing supplier data.
      await setDoc(
        doc(db, "Suppliers", user.uid),
        {
          businessName: profileForm.businessName.trim(),
          supplierType: profileForm.supplierType || "retailer",
          registrationNumber: profileForm.registrationNumber.trim(),
          taxNumber: profileForm.taxNumber.trim(),
          contactName: profileForm.contactName.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim(),
          city: profileForm.city.trim(),
          parish: profileForm.parish.trim(),
          country: profileForm.country.trim() || "Jamaica",
          website: profileForm.website.trim(),
          profileDescription: profileForm.profileDescription.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast.success("Company profile saved.");
    } catch (error) {
      console.error("Saving supplier profile failed:", error);
      toast.error(error.message || "Unable to save your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  
  const handleLogoUpload = async () => {
    if (!user?.uid || !logoFile) {
      toast.error("Choose a logo image first.");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(logoFile.type)) {
      toast.error("Please use a PNG, JPG, or WebP image.");
      return;
    }

    if (logoFile.size > 5 * 1024 * 1024) {
      toast.error("Your logo must be 5 MB or smaller.");
      return;
    }

    setUploadingLogo(true);

    try {
      const extension =
        logoFile.type === "image/png"
          ? "png"
          : logoFile.type === "image/webp"
            ? "webp"
            : "jpg";

      const logoRef = ref(
        storage,
        `supplierLogos/${user.uid}/company-logo.${extension}`
      );

      // 1. Upload the image to Firebase Storage.
      await uploadBytes(logoRef, logoFile, {
        contentType: logoFile.type,
      });

      // 2. Get the permanent download URL for the uploaded file.
      const logoUrl = await getDownloadURL(logoRef);

      // 3. Save the URL directly to the supplier's root document.
      await setDoc(
        doc(db, "Suppliers", user.uid),
        {
          logoUrl: logoUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 4. Update the UI immediately.
      setLogoPreview(logoUrl);
      setSupplier((previous) => ({
        ...previous,
        logoUrl: logoUrl,
      }));
      setLogoFile(null);

      toast.success("Company logo uploaded and profile updated.");
    } catch (error) {
      console.error("Supplier logo upload failed:", error);
      toast.error(error.message || "Unable to upload company logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (loadError || !supplier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Supplier profile unavailable</CardTitle>
            <CardDescription>
              We couldn&apos;t load your supplier profile. Please check your
              connection or contact an administrator if this continues.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {loggingOut && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = String(supplier.status || "pending").toLowerCase();

  const statusInfo = {
    pending: {
      label: "Pending Review",
      description:
        "Your registration has been received. An administrator will review your business details.",
      icon: Clock3,
      color: "border-amber-300 bg-amber-50 text-amber-800",
    },
    approved: {
      label: "Approved",
      description:
        "Your supplier account has been approved. You can access the supplier features enabled for your account.",
      icon: CheckCircle2,
      color: "border-emerald-300 bg-emerald-50 text-emerald-800",
    },
    rejected: {
      label: "Registration Rejected",
      description:
        supplier.rejectionReason ||
        "Your registration was not approved. Please contact the administrator for more information.",
      icon: XCircle,
      color: "border-rose-300 bg-rose-50 text-rose-800",
    },
  };

  const currentStatus = statusInfo[status] || statusInfo.pending;
  const StatusIcon = currentStatus.icon;

  const profileFields = [
    { name: "businessName", label: "Business name", required: true },
    { name: "supplierType", label: "Supplier type", type: "select" },
    { name: "registrationNumber", label: "Registration number" },
    { name: "taxNumber", label: "Tax / TRN number" },
    { name: "contactName", label: "Contact person", required: true },
    {
      name: "email",
      label: "Business email",
      type: "email",
      required: true,
    },
    { name: "phone", label: "Telephone", type: "tel" },
    { name: "address", label: "Street address" },
    { name: "city", label: "City / Town" },
    { name: "parish", label: "Parish / State" },
    { name: "country", label: "Country" },
    { name: "website", label: "Website" },
  ];


    return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-sm">
              <Boxes className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="font-bold text-slate-900">Autostore</h1>
              <p className="text-xs text-slate-500">Supplier Portal</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBackToDashboard && (
              <Button variant="outline" onClick={onBackToDashboard}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            )}

            <Button
              variant={activePage === "overview" ? "default" : "outline"}
              onClick={() => setActivePage("overview")}
              className={activePage === "overview" ? "bg-slate-900" : ""}
            >
              <Boxes className="mr-2 h-4 w-4" />
              Overview
            </Button>

            <Button
              variant={activePage === "profile" ? "default" : "outline"}
              onClick={() => setActivePage("profile")}
              className={
                activePage === "profile"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : ""
              }
            >
              <Building2 className="mr-2 h-4 w-4" />
              Company Profile
            </Button>

            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {activePage === "profile" ? (
          <>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-medium text-orange-600">
                  Account settings
                </p>

                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  Company Profile
                </h2>

                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Keep your business information up to date and add a logo to
                  brand purchase orders and receipts generated from your portal.
                </p>
              </div>

              <Badge variant="outline" className={currentStatus.color}>
                <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                {currentStatus.label}
              </Badge>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.5fr]">
              <Card className="overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImagePlus className="h-5 w-5 text-orange-500" />
                    Company branding
                  </CardTitle>

                  <CardDescription>
                    Your logo is stored with your supplier account and can be
                    included on generated PDFs.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">               
                  <div className="flex items-center gap-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt={`${supplier?.businessName || "Supplier"} logo`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm text-slate-400">
                          No logo uploaded
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {supplier?.businessName || "Your Company"}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Company logo
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-logo">
                      Upload company logo
                    </Label>

                    <Input
                      id="company-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) =>
                        setLogoFile(event.target.files?.[0] || null)
                      }
                      className="cursor-pointer bg-white"
                    />

                    <p className="text-xs leading-5 text-slate-500">
                      PNG, JPG, or WebP · Maximum 5 MB. A transparent PNG is
                      recommended for the cleanest document header.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleLogoUpload}
                    disabled={!logoFile || uploadingLogo}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}

                    {uploadingLogo
                      ? "Uploading logo..."
                      : "Upload and Save Logo"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-500" />
                    Business details
                  </CardTitle>

                  <CardDescription>
                    These details can be used in the header of your purchase
                    orders, receipts, and other supplier documents.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {profileFields.map((field) => (
                        <div
                          key={field.name}
                          className="space-y-2"
                        >
                          <Label htmlFor={`profile-${field.name}`}>
                            {field.label}
                            {field.required ? " *" : ""}
                          </Label>

                          {field.type === "select" ? (
                            <select
                              id={`profile-${field.name}`}
                              value={profileForm[field.name] || "retailer"}
                              onChange={(event) =>
                                updateField(field.name, event.target.value)
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {[
                                "manufacturer",
                                "wholesaler",
                                "distributor",
                                "retailer",
                                "importer",
                                "workshop",
                                "other",
                              ].map((type) => (
                                <option key={type} value={type}>
                                  {type.charAt(0).toUpperCase() +
                                    type.slice(1)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={`profile-${field.name}`}
                              type={field.type || "text"}
                              required={field.required}
                              value={profileForm[field.name] || ""}
                              onChange={(event) =>
                                updateField(field.name, event.target.value)
                              }
                              placeholder={
                                field.name === "country"
                                  ? "Jamaica"
                                  : `Enter ${field.label.toLowerCase()}`
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-description">
                        Company description (optional)
                      </Label>

                      <Textarea
                        id="profile-description"
                        rows={3}
                        value={profileForm.profileDescription || ""}
                        onChange={(event) =>
                          updateField(
                            "profileDescription",
                            event.target.value
                          )
                        }
                        placeholder="Briefly describe your business or the products you supply."
                      />
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setProfileForm({
                            businessName: supplier.businessName || "",
                            supplierType: supplier.supplierType || "retailer",
                            registrationNumber:
                              supplier.registrationNumber || "",
                            taxNumber: supplier.taxNumber || "",
                            contactName: supplier.contactName || "",
                            email: supplier.email || user.email || "",
                            phone: supplier.phone || "",
                            address: supplier.address || "",
                            city: supplier.city || "",
                            parish: supplier.parish || "",
                            country: supplier.country || "Jamaica",
                            website: supplier.website || "",
                            profileDescription:
                              supplier.profileDescription || "",
                          });

                          setLogoFile(null);
                          setLogoPreview(
                            supplier.logoUrl || supplier.imageUrl || ""
                          );
                        }}
                      >
                        Reset changes
                      </Button>

                      <Button
                        type="submit"
                        disabled={savingProfile}
                        className="bg-slate-900 hover:bg-slate-800"
                      >
                        {savingProfile ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}

                        {savingProfile
                          ? "Saving..."
                          : "Save Company Profile"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            <Card className="border-blue-100 bg-blue-50/60">
              <CardContent className="flex items-start gap-3 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

                <div>
                  <p className="font-semibold text-blue-950">
                    Your approval status is protected
                  </p>

                  <p className="mt-1 text-sm leading-5 text-blue-900">
                    Saving this page only updates editable business-profile
                    fields and the logo. Your supplier approval status and
                    administrator review fields are preserved.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-medium text-orange-600">
                  Supplier workspace
                </p>

                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  Welcome,{" "}
                  {supplier.contactName ||
                    supplier.businessName ||
                    "Supplier"}
                </h2>

                <p className="mt-2 text-slate-500">
                  Manage your supplier account and incoming parts requests.
                </p>
              </div>

              <Button
                onClick={() => setActivePage("profile")}
                className="w-fit bg-orange-500 hover:bg-orange-600"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Company Profile
              </Button>
            </div>


            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {supplier?.logoUrl ? (
                  <img
                    src={supplier.logoUrl}
                    alt={`${supplier.businessName || "Supplier"} company logo`}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                    No logo
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {supplier?.businessName || "Your Company"}
                </h3>
                <p className="text-sm text-slate-500">
                  Company logo and supplier profile
                </p>
              </div>
            </div>


            <Card>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                    <StatusIcon className="h-6 w-6 text-orange-600" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Account status
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {currentStatus.description}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`w-fit ${currentStatus.color}`}
                >
                  {currentStatus.label}
                </Badge>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-orange-500" />
                    Business Information
                  </CardTitle>

                  <CardDescription>
                    Your registered business details.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Info
                    label="Business Name"
                    value={supplier.businessName}
                    icon={Building2}
                  />

                  <Info
                    label="Supplier Type"
                    value={supplier.supplierType}
                  />

                  <Info
                    label="Registration Number"
                    value={supplier.registrationNumber}
                  />

                  <Info
                    label="Tax / TRN Number"
                    value={supplier.taxNumber}
                  />

                  {supplier.logoUrl && (
                    <div className="border-t pt-4">
                      <p className="mb-2 text-xs text-slate-500">
                        Company logo
                      </p>

                      <img
                        src={supplier.logoUrl}
                        alt="Company logo"
                        className="max-h-16 max-w-48 object-contain"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>

                  <CardDescription>
                    Contact details associated with your account.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Info
                    label="Contact Person"
                    value={supplier.contactName}
                    icon={UserRound}
                  />

                  <Info
                    label="Email"
                    value={supplier.email || user.email}
                    icon={Mail}
                  />

                  <Info
                    label="Telephone"
                    value={supplier.phone}
                    icon={Phone}
                  />

                  <Info
                    label="Address"
                    value={[
                      supplier.address,
                      supplier.city,
                      supplier.parish,
                      supplier.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    icon={MapPin}
                  />

                  <Info
                    label="Website"
                    value={supplier.website}
                  />
                </CardContent>
              </Card>
            </div>

            {status === "approved" && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Boxes className="h-5 w-5 text-orange-500" />
                        Incoming Parts Requests
                      </CardTitle>

                      <CardDescription>
                        Parts requests submitted through MechAssistApp.
                      </CardDescription>
                    </div>

                    <Badge variant="outline">
                      {orders.length}{" "}
                      {orders.length === 1 ? "Request" : "Requests"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {ordersLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading parts requests...
                    </div>
                  ) : ordersError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      Unable to load parts requests. Check Firestore
                      permissions and try again.
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center">
                      <Boxes className="mx-auto mb-3 h-10 w-10 text-slate-300" />

                      <h3 className="font-semibold text-slate-800">
                        No parts requests yet
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        New requests sent to your supplier account will appear
                        here.
                      </p>
                    </div>
                  ) : (
                    orders.map((order) => {
                      const vehicle = order.vehicle || {};

                      return (
                        <div
                          key={order.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Parts request
                              </p>

                              <h3 className="mt-1 text-lg font-bold text-slate-900">
                                {order.orderNumber || order.id}
                              </h3>

                              <p className="mt-1 text-sm text-slate-500">
                                Submitted by{" "}
                                {order.mechanicName ||
                                  order.requesterName ||
                                  "Mechanic"}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>

                            <Badge
                              variant="outline"
                              className={statusStyles(order.status)}
                            >
                              {order.status || "Pending"}
                            </Badge>
                          </div>

                          {(vehicle.make ||
                            vehicle.model ||
                            vehicle.year) && (
                            <div className="mt-4 rounded-lg bg-slate-50 p-3">
                              <p className="text-xs text-slate-500">
                                Vehicle
                              </p>

                              <p className="mt-1 text-sm font-medium text-slate-800">
                                {[
                                  vehicle.year,
                                  vehicle.make,
                                  vehicle.model,
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              </p>
                            </div>
                          )}

                          <div className="mt-4">
                            <h4 className="mb-3 text-sm font-semibold text-slate-800">
                              Items ({order.items?.length || 0})
                            </h4>

                            <div className="space-y-3">
                              {(order.items || []).map((item, index) => (
                                <div
                                  key={`${
                                    item.partId || item.partName || "item"
                                  }-${index}`}
                                  className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                                >
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-medium text-slate-800">
                                      {item.partName || "Part"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Part ID: {item.partId || "N/A"} · Qty:{" "}
                                      {item.quantity || 0}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Unit price:{" "}
                                      {formatMoney(
                                        item.unitPrice,
                                        order.currency || "JMD"
                                      )}
                                    </p>
                                  </div>

                                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                                    {formatMoney(
                                      item.lineTotal ??
                                        Number(item.quantity || 0) *
                                          Number(item.unitPrice || 0),
                                      order.currency || "JMD"
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {order.notes && (
                            <div className="mt-3 rounded-lg bg-amber-50 p-3">
                              <p className="text-xs font-semibold text-amber-800">
                                Request notes
                              </p>

                              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">
                                {order.notes}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                            <span className="text-sm font-semibold text-slate-600">
                              Order Total
                            </span>

                            <span className="text-lg font-bold text-orange-600">
                              {formatMoney(
                                order.total,
                                order.currency || "JMD"
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            )}

            {status === "approved" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Supplier tools
                  </CardTitle>

                  <CardDescription>
                    Your company logo and saved profile details can be used
                    when generating branded PO and receipt documents.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => setActivePage("profile")}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Configure document branding
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      )}

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>

        <p className="break-words text-sm font-medium text-slate-800">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}
// "use client";

// import { useEffect, useState } from "react";

// import {
//   doc,
//   collection,
//   onSnapshot,
//   query,
//   orderBy,
// } from "firebase/firestore";

// import { signOut } from "firebase/auth";
// import { toast } from "sonner";
// import {
//   Boxes,
//   Building2,
//   Clock3,
//   CheckCircle2,
//   XCircle,
//   LogOut,
//   Loader2,
//   Mail,
//   Phone,
//   MapPin,
// } from "lucide-react";

// import { auth, db } from "../lib/firebase";;

// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/card";

// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";

// export default function SupplierDashboard({ user,onBackToDashboard, }) {
//   const [supplier, setSupplier] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState(false);
//   const [loggingOut, setLoggingOut] = useState(false);


// const [orders, setOrders] = useState([]);
// const [ordersLoading, setOrdersLoading] = useState(true);
// const [ordersError, setOrdersError] = useState(false);


//   // useEffect(() => {
//   //   if (!user?.uid) {
//   //     setLoading(false);
//   //     setLoadError(true);
//   //     return;
//   //   }

//   //   const supplierRef = doc(db, "Suppliers", user.uid);

//   //   const unsubscribe = onSnapshot(
//   //     supplierRef,
//   //     (snapshot) => {
//   //       if (!snapshot.exists()) {
//   //         setSupplier(null);
//   //         setLoadError(true);
//   //       } else {
//   //         setSupplier({
//   //           uid: snapshot.id,
//   //           ...snapshot.data(),
//   //         });
//   //         setLoadError(false);
//   //       }

//   //       setLoading(false);
//   //     },
//   //     (error) => {
//   //       console.error("Supplier profile listener failed:", error);
//   //       setLoadError(true);
//   //       setLoading(false);
//   //     }
//   //   );

//   //   return () => unsubscribe();
//   // }, [user?.uid]);


//     useEffect(() => {
//       if (!user?.uid) {
//         setOrders([]);
//         setOrdersLoading(false);
//         return;
//       }

//       setOrdersLoading(true);
//       setOrdersError(false);

      

//       // Matches the exact path written by partsApi.
//       const requestsRef = collection(
//         db,
//         "Suppliers",
//         user.uid,
//         "parts_requests"
//       );

//       const requestsQuery = query(
//         requestsRef,
//         orderBy("createdAt", "desc")
//       );

//       const unsubscribe = onSnapshot(
//         requestsQuery,
//         (snapshot) => {
//           console.log("Signed-in supplier UID:", user.uid);
//           console.log("Firebase project:", db.app.options.projectId);
//           console.log("Request collection path:",
//             `Suppliers/${user.uid}/parts_requests`
//           );
//           console.log("Requests returned:", snapshot.size);
//           console.log(
//             "Request documents:",
//             snapshot.docs.map((orderDoc) => ({
//               id: orderDoc.id,
//               ...orderDoc.data(),
//             }))
//           );

//           const incomingOrders = snapshot.docs.map((orderDoc) => ({
//             id: orderDoc.id,
//             ...orderDoc.data(),
//           }));

//           setOrders(incomingOrders);
//           setOrdersError(false);
//           setOrdersLoading(false);
//         },
//         // (snapshot) => {
//         //   const incomingOrders = snapshot.docs.map((orderDoc) => ({
//         //     id: orderDoc.id,
//         //     ...orderDoc.data(),
//         //   }));

//         //   setOrders(incomingOrders);
//         //   setOrdersError(false);
//         //   setOrdersLoading(false);
//         // },
//         (error) => {
//           console.error("Purchase orders listener failed:", error);
//           setOrdersError(true);
//           setOrdersLoading(false);
//         }
//       );

//       return () => unsubscribe();
//     }, [user?.uid]);

//   const handleLogout = async () => {
//     setLoggingOut(true);

//     try {
//       await signOut(auth);
//       toast.success("Signed out successfully.");
//     } catch (error) {
//       console.error("Supplier logout failed:", error);
//       toast.error("Unable to sign out. Please try again.");
//     } finally {
//       setLoggingOut(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-slate-50">
//         <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
//       </div>
//     );
//   }

//   if (loadError || !supplier) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
//         <Card className="w-full max-w-lg">
//           <CardHeader>
//             <CardTitle>Supplier profile unavailable</CardTitle>
//             <CardDescription>
//               We couldn't load your supplier profile. Please contact the
//               administrator if this continues.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Button
//               onClick={handleLogout}
//               disabled={loggingOut}
//               className="bg-orange-500 hover:bg-orange-600"
//             >
//               Sign out
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   const status = String(supplier.status || "pending").toLowerCase();

//   const statusInfo = {
//     pending: {
//       label: "Pending Review",
//       description:
//         "Your registration has been received. An administrator will review your business details.",
//       icon: Clock3,
//       color: "border-amber-300 bg-amber-50 text-amber-800",
//     },
//     approved: {
//       label: "Approved",
//       description:
//         "Your supplier account has been approved. You can access the supplier features enabled for your account.",
//       icon: CheckCircle2,
//       color: "border-emerald-300 bg-emerald-50 text-emerald-800",
//     },
//     rejected: {
//       label: "Registration Rejected",
//       description:
//         supplier.rejectionReason ||
//         "Your registration was not approved. Please contact the administrator for more information.",
//       icon: XCircle,
//       color: "border-rose-300 bg-rose-50 text-rose-800",
//     },
//   };

//   const currentStatus = statusInfo[status] || statusInfo.pending;
//   const StatusIcon = currentStatus.icon;

//   return (
//     <div className="min-h-screen bg-slate-50">
//       <header className="sticky top-0 z-20 border-b bg-white">
//         <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
//           <div className="flex items-center gap-3">
//             <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600">
//               <Boxes className="h-6 w-6 text-white" />
//             </div>
//             <div>
//               <h1 className="font-bold text-slate-900">Autostore</h1>
//               <p className="text-xs text-slate-500">Supplier Portal</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-2">
//             <Button
//               variant="outline"
//               onClick={onBackToDashboard}
//             >
//               <Boxes className="mr-2 h-4 w-4" />
//               Dashboard
//             </Button>

//             <Button
//               variant="outline"
//               onClick={handleLogout}
//               disabled={loggingOut}
//             >
//               {loggingOut ? (
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//               ) : (
//                 <LogOut className="mr-2 h-4 w-4" />
//               )}
//               Sign out
//             </Button>
//           </div>

//           {/* <Button
//             variant="outline"
//             onClick={handleLogout}
//             disabled={loggingOut}
//           >
//             {loggingOut ? (
//               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//             ) : (
//               <LogOut className="mr-2 h-4 w-4" />
//             )}
//             Sign out
//           </Button> */}
//         </div>
//       </header>

//       <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
//         <div>
//           <p className="text-sm text-slate-500">Supplier account</p>
//           <h2 className="mt-1 text-2xl font-bold text-slate-900">
//             Welcome, {supplier.contactName || supplier.businessName}
//           </h2>
//           <p className="mt-1 text-slate-500">
//             Manage your supplier account and registration details.
//           </p>
//         </div>

//         <Card>
//           <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
//             <div className="flex items-start gap-3">
//               <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50">
//                 <StatusIcon className="h-6 w-6 text-orange-600" />
//               </div>
//               <div>
//                 <h3 className="font-semibold text-slate-900">
//                   Account status
//                 </h3>
//                 <p className="mt-1 text-sm text-slate-600">
//                   {currentStatus.description}
//                 </p>
//               </div>
//             </div>

//             <Badge
//               variant="outline"
//               className={`w-fit ${currentStatus.color}`}
//             >
//               {currentStatus.label}
//             </Badge>
//           </CardContent>
//         </Card>

//         <div className="grid gap-6 md:grid-cols-2">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Building2 className="h-5 w-5 text-orange-500" />
//                 Business Information
//               </CardTitle>
//               <CardDescription>
//                 Your registered business details.
//               </CardDescription>
//             </CardHeader>
//               {status === "approved" && (
//                 <Card>
//                   <CardHeader>
//                     <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//                       <div>
//                         <CardTitle className="flex items-center gap-2">
//                           <Boxes className="h-5 w-5 text-orange-500" />
//                           Incoming Purchase Orders
//                         </CardTitle>
//                         <CardDescription>
//                           Purchase orders submitted by mechanics through MechAssistApp.
//                         </CardDescription>
//                       </div>

//                       <Badge variant="outline">
//                         {orders.length} {orders.length === 1 ? "Order" : "Orders"}
//                       </Badge>
//                     </div>
//                   </CardHeader>

//                   <CardContent className="space-y-4">
//                     {ordersLoading ? (
//                       <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
//                         <Loader2 className="h-5 w-5 animate-spin" />
//                         Loading purchase orders...
//                       </div>
//                     ) : ordersError ? (
//                       <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
//                         Unable to load purchase orders. Check your Firestore permissions
//                         and try again.
//                       </div>
//                     ) : orders.length === 0 ? (
//                       <div className="rounded-xl border border-dashed p-8 text-center">
//                         <Boxes className="mx-auto mb-3 h-10 w-10 text-slate-300" />
//                         <h3 className="font-semibold text-slate-800">
//                           No purchase orders yet
//                         </h3>
//                         <p className="mt-1 text-sm text-slate-500">
//                           New orders submitted to your supplier account will appear here.
//                         </p>
//                       </div>
//                     ) : (
//                       orders.map((order) => {
//                         const orderStatus = String(order.status || "Pending");
//                         const statusKey = orderStatus.toLowerCase();

//                         const statusClass =
//                           statusKey === "accepted" || statusKey === "fulfilled"
//                             ? "border-emerald-200 bg-emerald-50 text-emerald-700"
//                             : statusKey === "rejected"
//                               ? "border-rose-200 bg-rose-50 text-rose-700"
//                               : statusKey === "processing" ||
//                                   statusKey === "in_progress"
//                                 ? "border-blue-200 bg-blue-50 text-blue-700"
//                                 : "border-amber-200 bg-amber-50 text-amber-700";

//                         const orderDate = order.createdAt?.toDate
//                           ? order.createdAt.toDate().toLocaleString()
//                           : "Date unavailable";

//                         const vehicle = order.vehicle || {};

//                         return (
//                           <div
//                             key={order.id}
//                             className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
//                           >
//                             <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//                               <div>
//                                 <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
//                                   Purchase Order
//                                 </p>
//                                 <h3 className="mt-1 text-lg font-bold text-slate-900">
//                                   {order.orderNumber || order.id}
//                                 </h3>
//                                 <p className="mt-1 text-sm text-slate-500">
//                                   Submitted by {order.mechanicName || order.requesterName || "Mechanic"}
//                                 </p>
//                                 <p className="mt-1 text-xs text-slate-400">
//                                   {orderDate}
//                                 </p>
//                               </div>

//                               <Badge variant="outline" className={statusClass}>
//                                 {orderStatus}
//                               </Badge>
//                             </div>

//                             {(vehicle.make || vehicle.model || vehicle.year) && (
//                               <div className="mt-4 rounded-lg bg-slate-50 p-3">
//                                 <p className="text-xs text-slate-500">Vehicle</p>
//                                 <p className="mt-1 text-sm font-medium text-slate-800">
//                                   {[vehicle.year, vehicle.make, vehicle.model]
//                                     .filter(Boolean)
//                                     .join(" ") || "Not specified"}
//                                 </p>
//                               </div>
//                             )}

//                             <div className="mt-4">
//                               <h4 className="mb-3 text-sm font-semibold text-slate-800">
//                                 Order Items ({order.items?.length || 0})
//                               </h4>

//                               <div className="space-y-3">
//                                 {(order.items || []).map((item, index) => (
//                                   <div
//                                     key={`${item.partId || item.partName || "item"}-${index}`}
//                                     className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
//                                   >
//                                     <div className="min-w-0">
//                                       <p className="break-words text-sm font-medium text-slate-800">
//                                         {item.partName || "Part"}
//                                       </p>
//                                       <p className="mt-1 text-xs text-slate-500">
//                                         Part ID: {item.partId || "N/A"} · Qty: {item.quantity}
//                                       </p>
//                                       <p className="mt-1 text-xs text-slate-500">
//                                         Unit price:{" "}
//                                         {Number(item.unitPrice || 0).toLocaleString(
//                                           "en-JM",
//                                           { style: "currency", currency: order.currency || "JMD" }
//                                         )}
//                                       </p>
//                                     </div>

//                                     <p className="shrink-0 text-sm font-semibold text-slate-900">
//                                       {Number(item.lineTotal || 0).toLocaleString(
//                                         "en-JM",
//                                         { style: "currency", currency: order.currency || "JMD" }
//                                       )}
//                                     </p>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>

//                             {order.notes && (
//                               <div className="mt-3 rounded-lg bg-amber-50 p-3">
//                                 <p className="text-xs font-semibold text-amber-800">
//                                   Mechanic's Notes
//                                 </p>
//                                 <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">
//                                   {order.notes}
//                                 </p>
//                               </div>
//                             )}

//                             <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
//                               <span className="text-sm font-semibold text-slate-600">
//                                 Order Total
//                               </span>
//                               <span className="text-lg font-bold text-orange-600">
//                                 {Number(order.total || 0).toLocaleString(
//                                   "en-JM",
//                                   { style: "currency", currency: order.currency || "JMD" }
//                                 )}
//                               </span>
//                             </div>
//                           </div>
//                         );
//                       })
//                     )}
//                   </CardContent>
//                 </Card>
//               )}
//             <CardContent className="space-y-4">
//               <Info label="Business Name" value={supplier.businessName} />
//               <Info label="Supplier Type" value={supplier.supplierType} />
//               <Info
//                 label="Registration Number"
//                 value={supplier.registrationNumber}
//               />
//               <Info label="Tax / TRN Number" value={supplier.taxNumber} />
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle>Contact Information</CardTitle>
//               <CardDescription>
//                 Contact details associated with your account.
//               </CardDescription>
//             </CardHeader>

//             <CardContent className="space-y-4">
//               <Info
//                 label="Contact Person"
//                 value={supplier.contactName}
//               />
//               <Info
//                 label="Email"
//                 value={supplier.email || user.email}
//                 icon={Mail}
//               />
//               <Info label="Telephone" value={supplier.phone} icon={Phone} />
//               <Info
//                 label="Address"
//                 value={[
//                   supplier.address,
//                   supplier.city,
//                   supplier.country,
//                 ]
//                   .filter(Boolean)
//                   .join(", ")}
//                 icon={MapPin}
//               />
//             </CardContent>
//           </Card>
//         </div>

//         {status === "approved" && (
//           <Card>
//             <CardHeader>
//               <CardTitle>Supplier Services</CardTitle>
//               <CardDescription>
//                 Your supplier account is approved. Product listings, inventory
//                 management, and order features can be added here.
//               </CardDescription>
//             </CardHeader>
//           </Card>
//         )}
//       </main>
//     </div>
//   );
// }

// function Info({ label, value, icon: Icon }) {
//   return (
//     <div className="flex items-start gap-3">
//       {Icon && <Icon className="mt-0.5 h-4 w-4 text-slate-400" />}
//       <div className="min-w-0">
//         <p className="text-xs text-slate-500">{label}</p>
//         <p className="break-words text-sm font-medium text-slate-800">
//           {value || "Not provided"}
//         </p>
//       </div>
//     </div>
//   );
// }
