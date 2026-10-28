"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Loader2,
  Boxes,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  reload,
  getIdToken,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "./lib/firebase";

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
import { Badge } from "@/components/ui/badge";

import {
  TableRow,
  TableCell,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// import SupplierDashboard from "./components/SupplierDashboard2";
import Dashboard from "./components/Dashboard";
import SupplierSignup from "./components/SupplierSignup";
import SupplierDashboard from "./components/SupplierDashboard2";
import SupplierApprovals from "./components/SupplierApprovals";
import VerifyEmailScreen from "./components/VerifyEmailScreen";
import SupplierPartsCatalogue from "./components/SupplierPartsCatalogue";

// ---------- helpers ----------
const STATUS_META = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Loader2 },
  fulfilled: { label: 'Fulfilled', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: XCircle },
};

const isFirebaseConfigured = true

function formatTime(ts) {
  if (!ts) return '';
  const ms = typeof ts === 'number' ? ts : ts?.toMillis ? ts.toMillis() : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ms).toLocaleString();
}

// Beep using Web Audio API (no asset needed)
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.42);
  } catch (e) {
    // ignore
  }
}


// ---------- Login ----------
function LoginScreen({ onShowSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // const handleLogin = async (e) => {
  //   e.preventDefault();

  //   const normalizedEmail = email

  //   if (!normalizedEmail || !password) {
  //     toast.error("Enter your email and password.");
  //     return;
  //   }

  //   setLoading(true);

  //   try {
  //     await signInWithEmailAndPassword(
  //       auth,
  //       normalizedEmail,
  //       password
  //     );

  //     // App's onAuthStateChanged listener handles account routing.
  //     toast.success("Signed in successfully.");
  //   } catch (error) {
  //     console.error("Firebase login failed:", {
  //       code: error.code,
  //       message: error.message,
  //       projectId: auth.app.options.projectId,
  //     });

  //     switch (error.code) {
  //       case "auth/invalid-credential":
  //         toast.error("Incorrect email or password.");
  //         break;

  //       case "auth/user-not-found":
  //         toast.error("No account was found with this email.");
  //         break;

  //       case "auth/wrong-password":
  //         toast.error("Incorrect password.");
  //         break;

  //       case "auth/invalid-email":
  //         toast.error("Please enter a valid email address.");
  //         break;

  //       case "auth/operation-not-allowed":
  //         toast.error(
  //           "Email/password sign-in is not enabled in Firebase."
  //         );
  //         break;

  //       case "auth/too-many-requests":
  //         toast.error(
  //           "Too many attempts. Please try again later."
  //         );
  //         break;

  //       default:
  //         toast.error(error.message || "Unable to sign in. Check if your email has been verified.");
  //     }
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const handleLogin = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      toast.error("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      toast.success("Signed in successfully.", {
        description: "Checking your account permissions...",
      });

      // Your existing onAuthStateChanged listener
      // will determine which screen should open.
    } catch (error) {
      console.error("Firebase login failed:", {
        code: error.code,
        message: error.message,
        projectId: auth.app.options.projectId,
      });

      const messages = {
        "auth/invalid-credential":
          "Incorrect email or password.",
        "auth/user-not-found":
          "No account was found with this email.",
        "auth/wrong-password":
          "Incorrect password.",
        "auth/invalid-email":
          "Please enter a valid email address.",
        "auth/operation-not-allowed":
          "Email/password sign-in is not enabled in Firebase.",
        "auth/too-many-requests":
          "Too many attempts. Please try again later.",
        "auth/network-request-failed":
          "Network error. Please check your internet connection.",
        "auth/user-disabled":
          "This account has been disabled. Please contact the administrator.",
      };

      toast.error(
        messages[error.code] ||
          "Unable to sign in. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error("Enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);

      toast.success(
        "If the account is eligible, a password reset email will be sent."
      );
    } catch (error) {
      console.error("Password reset failed:", error);

      toast.error(
        error.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : "Unable to request a password reset. Please try again."
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30">
              <Boxes className="h-7 w-7 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                Autostore
              </h1>
              <p className="-mt-0.5 text-xs text-slate-400">
                Admin Portal
              </p>
            </div>
          </div>
        </div>

        <Card className="border-slate-700 bg-slate-900/60 shadow-2xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">
              Sign in
            </CardTitle>

            <CardDescription className="text-slate-400">
              Use the credentials provided by your administrator.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>

                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@autostore.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-slate-300"
                >
                  Password
                </Label>

                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700"
              >
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign in
              </Button>

              <div className="pt-3 text-center">
                <p className="text-sm text-slate-400">
                  Are you an auto parts supplier?
                </p>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onShowSignup}
                  disabled={loading}
                  className="mt-2 w-full border-slate-600 bg-slate-500 text-white hover:bg-slate-800 hover:text-white"
                >
                  Register Your Business
                </Button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="w-full text-xs text-slate-400 transition hover:text-orange-400"
              >
                Forgot password?
              </button>
            </form>
          </CardContent>
        </Card>

        {!isFirebaseConfigured && (
          <div className="mt-4 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Demo Mode.</strong> Firebase is not yet
              configured. Add your Firebase configuration before
              using the live authentication system.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



  // return (
  //   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
  //     <div className="w-full max-w-md">
  //       <div className="flex items-center justify-center mb-8">
  //         <div className="flex items-center gap-3">
  //           <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
  //             <Boxes className="h-7 w-7 text-white" />
  //           </div>
  //           <div>
  //             <h1 className="text-2xl font-bold text-white">Autostore</h1>
  //             <p className="text-xs text-slate-400 -mt-0.5">Admin Portal</p>
  //           </div>
  //         </div>
  //       </div>

  //       <Card className="border-slate-700 bg-slate-900/60 backdrop-blur shadow-2xl">
  //         <CardHeader>
  //           <CardTitle className="text-white">Sign in</CardTitle>
  //           <CardDescription className="text-slate-400">
  //             Use the credentials provided by your administrator.
  //           </CardDescription>
  //         </CardHeader>
  //         <CardContent>
  //           <form onSubmit={handleLogin} className="space-y-4">
  //             <div className="space-y-2">
  //               <Label htmlFor="email" className="text-slate-300">Email</Label>
  //               <Input
  //                 id="email"
  //                 type="email"
  //                 placeholder="you@autostore.com"
  //                 value={email}
  //                 onChange={(e) => setEmail(e.target.value)}
  //                 className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
  //               />
  //             </div>
  //             <div className="space-y-2">
  //               <Label htmlFor="password" className="text-slate-300">Password</Label>
  //               <Input
  //                 id="password"
  //                 type="password"
  //                 placeholder="••••••••"
  //                 value={password}
  //                 onChange={(e) => setPassword(e.target.value)}
  //                 className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
  //               />
  //             </div>
  //             <Button
  //               type="submit"
  //               disabled={loading}
  //               className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
  //             >
  //               {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
  //               Sign in
  //             </Button>

  //             <div className="pt-3 text-center">
  //               <p className="text-sm text-slate-400">
  //                 Are you an auto parts supplier?
  //               </p>

  //               <Button
  //                 type="button"
  //                 variant="outline"
  //                 onClick={onShowSignup}
  //                 className="mt-2 w-full border-slate-600 text-white hover:text-white hover:bg-slate-800 bg-slate-500"
  //               >
  //                 Register Your Business
  //               </Button>
  //             </div>

  //             <button
  //               type="button"
  //               onClick={handleReset}
  //               className="w-full text-xs text-slate-400 hover:text-orange-400 transition"
  //             >
  //               Forgot password?
  //             </button>
  //           </form>
  //         </CardContent>
  //       </Card>

  //       {!isFirebaseConfigured && (
  //         <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 flex gap-2">
  //           <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
  //           <div>
  //             <strong>Demo Mode.</strong> Firebase is not yet configured. Any email/password
  //             will log you in to preview the UI. Add your config to <code>/app/.env</code> to
  //             go live.
  //           </div>
  //         </div>
  //       )}
  //     </div>
  //   </div>
  // );




function StatCard({ label, value, icon: Icon, color }) {
  const styles = {
    amber: 'from-amber-500 to-amber-600 shadow-amber-200',
    blue: 'from-blue-500 to-blue-600 shadow-blue-200',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
    rose: 'from-rose-500 to-rose-600 shadow-rose-200',
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${styles[color]} shadow-lg flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-3xl font-bold text-slate-900 leading-none">{value}</div>
          <div className="text-xs text-slate-500 mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestRow({ r, onClick }) {
  const meta = STATUS_META[r.status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <TableRow className="hover:bg-slate-50 cursor-pointer" onClick={onClick}>
      <TableCell>
        <div className="font-medium text-slate-900">{r.partName}</div>
        <div className="text-xs text-slate-500 font-mono">{r.partId}</div>
      </TableCell>
      <TableCell className="font-mono text-sm">{r.vehicleId}</TableCell>
      <TableCell className="text-center font-semibold">{r.quantity}</TableCell>
      <TableCell className="text-sm text-slate-600">{r.requestedBy}</TableCell>
      <TableCell className="font-mono text-sm">
        {r.assignedBin || <span className="text-slate-300">—</span>}
      </TableCell>
      <TableCell className="text-sm">
        {r.assignedPicker || <span className="text-slate-300">—</span>}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`${meta.color} font-medium`}>
          <Icon className={`h-3 w-3 mr-1 ${r.status === 'in_progress' ? 'animate-spin' : ''}`} />
          {meta.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-slate-500">{formatTime(r.timestamp)}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm">Manage</Button>
      </TableCell>
    </TableRow>
  );
}

function UpdateDialog({ request, onClose, onSave }) {
  const [status, setStatus] = useState('pending');
  const [bin, setBin] = useState('');
  const [picker, setPicker] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (request) {
      setStatus(request.status || 'pending');
      setBin(request.assignedBin || '');
      setPicker(request.assignedPicker || '');
    }
  }, [request]);

  if (!request) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(request.id, {
      status,
      assignedBin: bin,
      assignedPicker: picker,
    });
    setSaving(false);
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Request</DialogTitle>
          <DialogDescription>
            Update status and assign warehouse bin & picker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-slate-50 p-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Part</span>
              <span className="font-medium">{request.partName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Part ID</span>
              <span className="font-mono text-sm">{request.partId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Vehicle</span>
              <span className="font-mono text-sm">{request.vehicleId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Quantity</span>
              <span className="font-semibold">{request.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Requested By</span>
              <span className="text-sm">{request.requestedBy}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Assigned Bin</Label>
              <Input
                placeholder="e.g. A-12-03"
                value={bin}
                onChange={(e) => setBin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Picker</Label>
              <Input
                placeholder="e.g. John Doe"
                value={picker}
                onChange={(e) => setPicker(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SupplierStatusScreen({ user, status, onLogout }) {
  const isRejected = status === "rejected";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${
            isRejected
              ? "bg-rose-500/10 text-rose-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {isRejected ? (
            <XCircle className="h-8 w-8" />
          ) : (
            <Clock className="h-8 w-8" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-white">
          {isRejected
            ? "Supplier Application Not Approved"
            : "Supplier Application Under Review"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {isRejected
            ? "Your supplier application has not been approved. Please contact the Autostore administrator for more information."
            : "Your email is verified, but your supplier account is still awaiting approval. You will be able to access the supplier dashboard once your application is approved."}
        </p>

        <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800 p-4 text-left">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="mt-1 break-all font-medium text-white">
            {user?.email || "Supplier account"}
          </p>

          <p className="mt-3 text-xs text-slate-400">Account status</p>
          <Badge
            variant="outline"
            className={
              isRejected
                ? "mt-1 border-rose-500/40 text-rose-300"
                : "mt-1 border-amber-500/40 text-amber-300"
            }
          >
            {isRejected ? "Rejected" : "Pending approval"}
          </Badge>
        </div>

        <Button
          onClick={onLogout}
          className="mt-6 w-full bg-orange-500 text-white hover:bg-orange-600"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

// ---------- App root ----------



function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [accountType, setAccountType] = useState(null);
  const [supplierPage, setSupplierPage] = useState("dashboard");
  const [supplierStatus, setSupplierStatus] = useState(null);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!mounted) return;

        setChecking(true);

        if (!firebaseUser) {
          setUser(null);
          setAccountType(null);
          setChecking(false);
          return;
        }

        try {
          // Refresh the user's verification status from Firebase.
          await reload(firebaseUser);

          if (!mounted) return;

          // Never display a dashboard before email verification.
          if (!firebaseUser.emailVerified) {
            setUser(firebaseUser);
            setSupplierStatus(null);
            setAccountType("unverified");
            setChecking(false);
            return;
          }

          // Refresh the ID token so its claims are current.
          await getIdToken(firebaseUser, true);

          if (!mounted) return;

          // Check the supplier profile first.
          // const supplierSnapshot = await getDoc(
          //   doc(db, "Suppliers", firebaseUser.uid)
          // );

          // Check the supplier profile and determine the supplier's access status.
              const supplierSnapshot = await getDoc(
                doc(db, "Suppliers", firebaseUser.uid)
              );

              if (!mounted) return;

              if (supplierSnapshot.exists()) {
                const supplierData = supplierSnapshot.data();
                const rawStatus = String(supplierData.status || "")
                  .trim()
                  .toLowerCase();

                let normalizedStatus;

                // Explicit statuses take priority over the legacy isVerified field.
                if (rawStatus === "rejected") {
                  normalizedStatus = "rejected";
                } else if (
                  rawStatus === "approved" ||
                  rawStatus === "active"
                ) {
                  normalizedStatus = "approved";
                } else if (
                  rawStatus === "pending" ||
                  rawStatus === "in_progress" ||
                  rawStatus === "in-progress"
                ) {
                  normalizedStatus = "pending";
                } else if (supplierData.isVerified === true) {
                  // Supports existing approved supplier records without a status.
                  normalizedStatus = "approved";
                } else {
                  // Unknown or missing status must not grant dashboard access.
                  normalizedStatus = "pending";
                }

                setUser(firebaseUser);
                setAccountType("supplier");
                setSupplierStatus(normalizedStatus);
                setChecking(false);
                return;
              }

              // Only check the admin profile if no supplier profile exists.
              // const adminSnapshot = await getDoc(
              //   doc(db, "Admins", firebaseUser.uid)
              // );

              // if (!mounted) return;

              // setSupplierStatus(null);

              // if (
              //   adminSnapshot.exists() &&
              //   adminSnapshot.data().active === true
              // ) {
              //   setUser(firebaseUser);
              //   setAccountType("admin");
              // } else {
              //   setUser(firebaseUser);
              //   setAccountType("unknown");
              // }

          if (!mounted) return;

          if (supplierSnapshot.exists()) {
            setUser(firebaseUser);
            setAccountType("supplier");
            setChecking(false);
            return;
          }

          // Only check the admin profile if no supplier profile exists.
          const adminSnapshot = await getDoc(
            doc(db, "Admins", firebaseUser.uid)
          );

          if (!mounted) return;

          if (
            adminSnapshot.exists() &&
            adminSnapshot.data().active === true
          ) {
            setUser(firebaseUser);
            setAccountType("admin");
          } else {
            setUser(firebaseUser);
            setAccountType("unknown");
          }
        } catch (error) {
          if (!mounted) return;

          console.error("Unable to determine account type:", {
            code: error.code,
            message: error.message,
            uid: firebaseUser.uid,
          });

          setUser(firebaseUser);
          setAccountType("lookup-error");

          toast.error(
            "Unable to verify your account permissions. Please try again."
          );
        } finally {
          if (mounted) {
            setChecking(false);
          }
        }
      },
      (error) => {
        console.error("Authentication state error:", error);

        if (mounted) {
          setUser(null);
          setAccountType(null);
          setChecking(false);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully.");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Unable to sign out. Please try again.");
    }
  };

  // Wait until Firebase has determined the account state.
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Unverified users must always see the verification screen.
  // if (user && accountType === "unverified") {
  //   return <VerifyEmailScreen user={user} />;
  // }

  // // Only verified suppliers can reach their dashboard.
  // // if (user && accountType === "supplier") {
  // //   return <SupplierDashboard user={user} />;
  // // }


  // if (user && accountType === "supplier") {
  //   if (supplierPage === "profile") {
  //     return (
  //       <SupplierDashboard
  //         user={user}
  //         onBackToDashboard={() => setSupplierPage("dashboard")}
  //       />
  //     );
  //   }

  //   if (supplierPage === "parts") {
  //     return (
  //       <SupplierPartsCatalogue
  //         user={user}
  //         onBackToDashboard={() => setSupplierPage("dashboard")}
  //       />
  //     );
  //   }

  //   return (
  //     <Dashboard
  //       user={user}
  //       onLogout={handleLogout}
  //       onOpenProfile={() => setSupplierPage("profile")}
  //       onOpenParts={() => setSupplierPage("parts")}
  //     />
  //   );
  // }


  // // Only verified, active admins can access admin functionality.
  // if (user && accountType === "admin") {
  //   return <SupplierApprovals user={user} onLogout={handleLogout} />;
  // }

  // Only verified and approved suppliers can access supplier features.
    if (user && accountType === "supplier") {
      if (supplierStatus !== "approved") {
        return (
          <SupplierStatusScreen
            user={user}
            status={supplierStatus || "pending"}
            onLogout={handleLogout}
          />
        );
      }

      if (supplierPage === "profile") {
        return (
          <SupplierDashboard
            user={user}
            onBackToDashboard={() => setSupplierPage("dashboard")}
          />
        );
      }

      if (supplierPage === "parts") {
        return (
          <SupplierPartsCatalogue
            user={user}
            onBackToDashboard={() => setSupplierPage("dashboard")}
          />
        );
      }

      return (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onOpenProfile={() => setSupplierPage("profile")}
          onOpenParts={() => setSupplierPage("parts")}
        />
        // <SupplierDashboard
        //     user={user}
        //     onBackToDashboard={() => setSupplierPage("dashboard")}
        //   />
      );
    }

    // Only verified, active admins can access admin functionality.
    if (user && accountType === "admin") {
      return (
        <SupplierApprovals
          user={user}
          onLogout={handleLogout}
        />
      );
    }

  if (user && accountType === "lookup-error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
        <h1 className="text-xl font-bold">
          Unable to verify account
        </h1>

        <p className="max-w-md text-slate-400">
          We couldn't verify your account permissions. Please try again
          or contact the administrator.
        </p>

        <Button onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    );
  }

  if (user && accountType === "unknown") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
        <h1 className="text-xl font-bold">
          Account not recognized
        </h1>

        <p className="max-w-md text-slate-400">
          Your account has not been assigned supplier or administrator
          access. Please contact the administrator.
        </p>

        <Button onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    );
  }

  // Registration does not grant dashboard access.
  if (showSignup) {
    return (
      <SupplierSignup
        onBack={() => setShowSignup(false)}
        onRegistered={(registeredUser) => {
          setUser(registeredUser);
            setAccountType("unverified");
          // setAccountType(
          //   registeredUser.emailVerified
          //     ? "supplier"
          //     : "unverified"
          // );
          setShowSignup(false);
        }}
      />
    );
  }

  return (
    <LoginScreen
      onShowSignup={() => setShowSignup(true)}
    />
  );
}

export default App;

