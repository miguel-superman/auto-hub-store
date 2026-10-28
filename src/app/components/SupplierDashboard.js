
"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Boxes, Clock, LogOut, ShieldCheck } from "lucide-react";

import { auth, db } from "../lib/firebase";

export default function SupplierDashboard({ user }) {
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setSupplier(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setProfileError(false);

    const supplierRef = doc(db, "Suppliers", user.uid);

    const unsubscribe = onSnapshot(
      supplierRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSupplier(null);
          setProfileError(true);
        } else {
          setSupplier(snapshot.data());
          setProfileError(false);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Supplier profile error:", error);
        setProfileError(true);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("You have signed out.");
    } catch (error) {
      console.error("Supplier logout failed:", error);
      toast.error("Unable to sign out. Please try again.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading your supplier account...
      </main>
    );
  }

  if (profileError || !supplier) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <h1 className="text-xl font-bold">
          Unable to load supplier profile
        </h1>
        <p className="max-w-md text-sm text-slate-400">
          Your supplier profile could not be loaded. Check your connection
          and Firestore permissions, or contact support.
        </p>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-slate-700 px-5 py-3"
        >
          Sign Out
        </button>
      </main>
    );
  }

  const approved =
    supplier.status?.toLowerCase() === "approved";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-500 p-3">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Auto Hub Store</h1>
            <p className="text-sm text-slate-400">
              Supplier Portal
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-orange-400">
          Supplier Account
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Welcome, {supplier.businessName || "Supplier"}
        </h2>

        <p className="mt-2 text-slate-400">
          Signed in as {user.email}
        </p>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {approved ? (
            <>
              <ShieldCheck className="mb-4 h-10 w-10 text-emerald-400" />

              <h3 className="text-xl font-semibold">
                Your supplier account is approved
              </h3>

              <p className="mt-2 text-slate-400">
                Your account has been approved. You can now access
                the supplier features enabled for your account.
              </p>

              {/* Add approved supplier features here. */}
            </>
          ) : (
            <>
              <Clock className="mb-4 h-10 w-10 text-amber-400" />

              <h3 className="text-xl font-semibold">
                Your account is awaiting approval
              </h3>

              <p className="mt-2 text-slate-400">
                Your registration has been received. An administrator
                must review and approve your account before you can
                access protected supplier features.
              </p>

              <div className="mt-5 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
                Status: {supplier.status || "Pending"}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
