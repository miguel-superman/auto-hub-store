"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Boxes, Loader2, ArrowLeft, Building2 } from "lucide-react";

import { auth, db } from "../lib/firebase";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SupplierSignup({ onBack, onRegistered }) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    supplierType: "retailer",
    registrationNumber: "",
    taxNumber: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Jamaica",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = form.email.trim().toLowerCase();

    if (
      !form.businessName.trim() ||
      !form.contactName.trim() ||
      !email ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.country.trim() ||
      !form.password
    ) {
      toast.error("Please complete all required fields.");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Your password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Create the supplier's Firebase Authentication account.
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password
      );

      const supplier = {
        uid: credential.user.uid,
        businessName: form.businessName.trim(),
        supplierType: form.supplierType,
        registrationNumber: form.registrationNumber.trim(),
        taxNumber: form.taxNumber.trim(),
        contactName: form.contactName.trim(),
        email,
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),

        role: "supplier",
        status: "pending",
        isVerified: false,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Store business details separately from authentication.
      await setDoc(
        doc(db, "Suppliers", credential.user.uid),
        supplier
      );

    //   toast.success(
    //     "Registration submitted. Your supplier account is pending review."
    //   );


        await sendEmailVerification(credential.user);

        toast.success(
        "Registration submitted. Check your email to verify your account."
        );

// Keep the user signed in.
// App will show VerifyEmailScreen until email verification is complete.



    // toast.success(
    //     "Registration successful! Your supplier dashboard is loading."
    //     );

        onRegistered?.(credential.user);
      // Firebase signs in the new account automatically.
      // Sign out so the pending supplier cannot enter the admin dashboard.
      // The App auth listener will then return to the login screen.
    //   const { signOut } = await import("firebase/auth");
    //   await signOut(auth);

    //   onBack();
    } catch (error) {
      console.error("Supplier registration failed:", error);

      // If profile creation fails, do not leave the new account signed in.
      if (auth.currentUser) {
        try {
          const { signOut } = await import("firebase/auth");
          await signOut(auth);
        } catch (signOutError) {
          console.error("Sign-out after registration failure:", signOutError);
        }
      }

      switch (error.code) {
        case "auth/email-already-in-use":
          toast.error("An account already exists with this email.");
          break;

        case "auth/invalid-email":
          toast.error("Please enter a valid business email address.");
          break;

        case "auth/weak-password":
          toast.error("Please choose a stronger password.");
          break;

        case "auth/operation-not-allowed":
          toast.error(
            "Email/password registration is not enabled in Firebase."
          );
          break;

        case "permission-denied":
        case "firestore/permission-denied":
          toast.error(
            "The supplier profile could not be saved. Please check your Firestore security rules."
          );
          break;

        default:
          toast.error(
            error.message || "Registration failed. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }

//       console.log("Saving supplier profile:", {
//   uid: credential.user.uid,
//   projectId: db.app.options.projectId,
//   emailVerified: credential.user.emailVerified,
// });
  };



  const inputClass =
    "border-slate-700 bg-slate-800 text-white placeholder:text-slate-500";

  const labelClass = "text-slate-300";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
            <Boxes className="h-7 w-7 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">Autostore</h1>
            <p className="text-xs text-slate-400">
              Auto Parts Supplier Registration
            </p>
          </div>
        </div>

        <Card className="border-slate-700 bg-slate-900/80 shadow-2xl">
          <CardHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-orange-500/10">
              <Building2 className="h-6 w-6 text-orange-400" />
            </div>

            <CardTitle className="text-xl text-white">
              Register your business
            </CardTitle>

            <CardDescription className="text-slate-400">
              Create a supplier account to manage your auto parts business.
              Your details will be reviewed before supplier access is approved.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business information */}
              <section className="space-y-4">
                <h2 className="border-b border-slate-700 pb-2 text-sm font-semibold text-orange-400">
                  Business Information
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className={labelClass} htmlFor="businessName">
                      Business Name *
                    </Label>
                    <Input
                      id="businessName"
                      autoComplete="organization"
                      placeholder="e.g. Kingston Auto Parts Ltd."
                      value={form.businessName}
                      onChange={(e) =>
                        updateField("businessName", e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>Supplier Type *</Label>
                    <Select
                      value={form.supplierType}
                      onValueChange={(value) =>
                        updateField("supplierType", value)
                      }
                    >
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Select supplier type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manufacturer">
                          Manufacturer
                        </SelectItem>
                        <SelectItem value="wholesaler">
                          Wholesaler / Distributor
                        </SelectItem>
                        <SelectItem value="retailer">
                          Retailer
                        </SelectItem>
                        <SelectItem value="importer">
                          Importer
                        </SelectItem>
                        <SelectItem value="workshop">
                          Auto Workshop / Garage
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="registrationNumber">
                      Business Registration Number
                    </Label>
                    <Input
                      id="registrationNumber"
                      placeholder="Registration number (if applicable)"
                      value={form.registrationNumber}
                      onChange={(e) =>
                        updateField("registrationNumber", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className={labelClass} htmlFor="taxNumber">
                      Tax / TRN Number
                    </Label>
                    <Input
                      id="taxNumber"
                      placeholder="Optional"
                      value={form.taxNumber}
                      onChange={(e) =>
                        updateField("taxNumber", e.target.value)
                      }
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-500">
                      Provide this if applicable to your business.
                    </p>
                  </div>
                </div>
              </section>

              {/* Contact information */}
              <section className="space-y-4">
                <h2 className="border-b border-slate-700 pb-2 text-sm font-semibold text-orange-400">
                  Contact Information
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="contactName">
                      Contact Person's Name *
                    </Label>
                    <Input
                      id="contactName"
                      autoComplete="name"
                      placeholder="Full name"
                      value={form.contactName}
                      onChange={(e) =>
                        updateField("contactName", e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="phone">
                      Business Telephone *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. +1 876 555 0123"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className={labelClass} htmlFor="address">
                      Business Address *
                    </Label>
                    <Input
                      id="address"
                      autoComplete="street-address"
                      placeholder="Street address"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="city">
                      City / Parish *
                    </Label>
                    <Input
                      id="city"
                      autoComplete="address-level2"
                      placeholder="e.g. Kingston"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="country">
                      Country *
                    </Label>
                    <Input
                      id="country"
                      autoComplete="country-name"
                      value={form.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className={labelClass} htmlFor="email">
                      Business Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@yourbusiness.com"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Account security */}
              <section className="space-y-4">
                <h2 className="border-b border-slate-700 pb-2 text-sm font-semibold text-orange-400">
                  Account Security
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="password">
                      Password *
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={form.password}
                      onChange={(e) =>
                        updateField("password", e.target.value)
                      }
                      className={inputClass}
                      minLength={8}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor="confirmPassword">
                      Confirm Password *
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={(e) =>
                        updateField("confirmPassword", e.target.value)
                      }
                      className={inputClass}
                      minLength={8}
                      required
                    />
                  </div>
                </div>
              </section>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-slate-300">
                Your account will remain pending until an administrator reviews
                your registration. Submitting this form does not grant access
                to the admin portal.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={loading}
                  className="border-slate-600 text-slate-200 hover:bg-slate-800 bg-slate-500"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700"
                >
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {loading ? "Creating Account..." : "Register as Supplier"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-500">
          Autostore Supplier Portal
        </p>
      </div>
    </div>
  );
}
