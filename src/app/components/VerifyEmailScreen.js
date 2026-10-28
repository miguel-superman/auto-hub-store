// import { useState } from "react";
// import { sendEmailVerification, signOut, reload } from "firebase/auth";
// import { toast } from "sonner";
// import { Boxes, Loader2 } from "lucide-react";

// import { auth } from "../lib/firebase";

// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/card";

// import { Button } from "@/components/ui/button";
// export default function VerifyEmailScreen({ user }) {
//   const [loading, setLoading] = useState(false);

//   const checkVerification = async () => {
//     setLoading(true);

//     try {
//       // Refresh the user's Firebase Authentication record.
//       await reload(user);

//       if (auth.currentUser?.emailVerified) {
//         toast.success("Email verified successfully!");

//         // Reload the app so account permissions are checked again.
//         window.location.reload();
//       } else {
//         toast.info(
//           "Your email has not been verified yet. Please check your inbox."
//         );
//       }
//     } catch (error) {
//       console.error("Email verification check failed:", error);
//       toast.error("Unable to check verification. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const resendVerification = async () => {
//     setLoading(true);

//     try {
//       await sendEmailVerification(auth.currentUser || user);

//       toast.success("Verification email sent. Please check your inbox.");
//     } catch (error) {
//       console.error("Resending verification email failed:", error);

//       toast.error(
//         error.code === "auth/too-many-requests"
//           ? "Too many requests. Please wait before trying again."
//           : "Unable to send the verification email. Please try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       await signOut(auth);
//       toast.success("Signed out successfully.");
//     } catch (error) {
//       console.error("Sign out failed:", error);
//       toast.error("Unable to sign out. Please try again.");
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
//       <Card className="w-full max-w-md border-slate-700 bg-slate-900/80 shadow-2xl">
//         <CardHeader className="text-center">
//           <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10">
//             <Boxes className="h-7 w-7 text-orange-400" />
//           </div>

//           <CardTitle className="text-xl text-white">
//             Verify your email
//           </CardTitle>

//           <CardDescription className="text-slate-400">
//             Verify your email address before continuing to your Autostore
//             supplier account.
//           </CardDescription>
//         </CardHeader>

//         <CardContent className="space-y-5">
//           <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
//             <p className="text-sm text-slate-400">
//               Verification email sent to
//             </p>

//             <p className="mt-1 break-all font-medium text-white">
//               {user?.email || auth.currentUser?.email}
//             </p>
//           </div>

//           <p className="text-sm leading-6 text-slate-400">
//             Open the verification email from Firebase and click its link.
//             Once verified, return here and select the button below.
//           </p>

//           <Button
//             type="button"
//             onClick={checkVerification}
//             disabled={loading}
//             className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700"
//           >
//             {loading && (
//               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//             )}
//             I've verified my email
//           </Button>

//           <Button
//             type="button"
//             variant="outline"
//             onClick={resendVerification}
//             disabled={loading}
//             className="w-full border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
//           >
//             Resend verification email
//           </Button>

//           <Button
//             type="button"
//             variant="ghost"
//             onClick={handleLogout}
//             disabled={loading}
//             className="w-full text-slate-400 hover:text-white"
//           >
//             Sign out
//           </Button>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }



"use client";

import { useState } from "react";
import {
  reload,
  getIdToken,
  sendEmailVerification,
} from "firebase/auth";
import { auth, signOut } from "../lib/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function VerifyEmailScreen({ user }) {
  const [loading, setLoading] = useState(false);

  const checkVerification = async () => {
    setLoading(true);

    try {
      await reload(user);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("Please sign in again.");
        return;
      }

      if (!currentUser.emailVerified) {
        toast.info("Your email has not been verified yet.");
        return;
      }

      // Refresh the ID token so Firebase gets the latest claims.
      await getIdToken(currentUser, true);

      toast.success("Email verified. Opening your account.");

      // App's auth listener will now check the verified user.
      window.location.reload();
    } catch (error) {
      console.error("Verification check failed:", error);
      toast.error("Unable to check verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!auth.currentUser) {
      toast.error("Please sign in again.");
      return;
    }

    setLoading(true);

    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent. Check your inbox.");
    } catch (error) {
      console.error("Resending verification failed:", error);

      toast.error(
        error.code === "auth/too-many-requests"
          ? "Please wait before requesting another email."
          : "Unable to send the verification email."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Unable to sign out.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold text-white">
          Verify your email
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Verify your email address before accessing Autostore.
        </p>

        <p className="mt-4 break-words text-sm text-slate-300">
          Verification email sent to: {user.email}
        </p>

        <div className="mt-6 space-y-3">
          <Button
            onClick={checkVerification}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {loading ? "Checking..." : "I've verified my email"}
          </Button>

          <Button
            onClick={resendVerification}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Resend verification email
          </Button>

          <Button
            onClick={handleLogout}
            disabled={loading}
            variant="ghost"
            className="w-full text-slate-400"
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
