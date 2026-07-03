import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { useAuth, AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { roleHome } from "@/lib/case-utils";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(72);

function AuthPage() {
  const router = useRouter();
  const { user, role, loading, refreshRole, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const [showSignInPass, setShowSignInPass] = useState(false);
  const [showSignUpPass, setShowSignUpPass] = useState(false);

  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "patient" as string,
  });

  const [doctorsList, setDoctorsList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const rolesSnap = await getDocs(collection(db, "user_roles"));
        const profilesSnap = await getDocs(collection(db, "profiles"));
        
        const rolesMap = new Map();
        rolesSnap.forEach((d) => rolesMap.set(d.id, d.data().role));
        
        const list: { id: string; name: string }[] = [];
        profilesSnap.forEach((d) => {
          const roleVal = rolesMap.get(d.id);
          const email = d.data().email || "";
          
          if (roleVal === "doctor" || roleVal === "doctor1" || roleVal === "doctor2") {
            if (email.includes("doctor1") || email.includes("doctor2") || email.includes("doctor12")) return;
            list.push({ id: d.id, name: d.data().full_name || "Doctor" });
          }
        });
        setDoctorsList(list);
      } catch (err) {
        console.error("Error fetching doctors", err);
      }
    };
    fetchDoctors();
  }, []);

  const handleForgotPassword = async () => {
    const email = signIn.email.trim();
    if (!email) {
      return toast.error("Please enter your email address in the Email field first.");
    }
    const validated = emailSchema.safeParse(email);
    if (!validated.success) {
      return toast.error("Please enter a valid email address.");
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.toLowerCase());
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send password reset email.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
        <p className="text-slate-500 font-medium">Loading auth details...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center pt-24 pb-8 overflow-hidden bg-slate-50">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <img src="/login_bg_hospital_light.png" alt="Hospital Background" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] dark:bg-slate-950/60" />
        </div>

        <GlobalNavbar isFixed={true} />
        <div className="w-full max-w-md px-4 relative z-10">
          <Card className="border border-white/60 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] relative overflow-hidden backdrop-blur-[20px] text-slate-900 dark:text-white rounded-[2rem] p-2">
            <CardHeader className="text-center">
              <CardTitle>Already Signed In</CardTitle>
              <CardDescription>
                You are currently signed in as a <span className="font-bold text-cyan-600 dark:text-cyan-400 capitalize">{role === "doctor1" || role === "doctor2" ? "Doctor" : role || "User"}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={role ? roleHome[role] : "/"}>
                <Button className="w-full font-bold">
                  Go to Dashboard
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full border-slate-200 hover:bg-red-50 hover:text-red-650 dark:border-white/10 dark:hover:bg-red-500/20 font-bold" 
                onClick={async () => {
                  await signOut();
                  toast.success("Logged out successfully");
                }}
              >
                Sign Out / Switch Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const e1 = emailSchema.safeParse(signIn.email);
    if (!e1.success) return toast.error("Invalid email");
    setBusy(true);

    const email = signIn.email.trim().toLowerCase();
    const password = signIn.password;

    try {
      // 1. Try signing in directly
      await signInWithEmailAndPassword(auth, email, password);
      await refreshRole();
      setBusy(false);
      toast.success("Welcome back");
    } catch (err: any) {
      // 2. If it fails, and it is a predefined email, auto-create the user
      if (["admin12@gmail.com", "nurse1@gmail.com", "doctor12@gmail.com", "doctor12@gmail", "doctor1@gmail.com", "doctor2@gmail.com"].includes(email)) {
        let roleKey: AppRole = "nurse";
        let dbRoleVal: any = "nurse";
        let name = "payal";

        if (email === "admin12@gmail.com") {
          roleKey = "admin";
          dbRoleVal = "patient"; // Store as patient to bypass constraints if any
          name = "Admin Control";
        } else if (email === "doctor12@gmail.com" || email === "doctor12@gmail" || email === "doctor1@gmail.com") {
          roleKey = "doctor1";
          dbRoleVal = "doctor1";
          name = "Dr. Kadambari Jagtap";
        } else if (email === "doctor2@gmail.com") {
          roleKey = "doctor2";
          dbRoleVal = "doctor2";
          name = "Dr. Omprasad Jagtap";
        }

        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          
          await setDoc(doc(db, "user_roles", userCred.user.uid), {
            role: dbRoleVal
          });

          await setDoc(doc(db, "profiles", userCred.user.uid), {
            full_name: name,
            email,
          });

          await refreshRole();
          setBusy(false);
          toast.success("Welcome back");
          return;
        } catch (upErr: any) {
          setBusy(false);
          return toast.error("Predefined login creation failed: " + upErr.message);
        }
      }

      setBusy(false);
      toast.error(err.message);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSchema.safeParse(signUp.email).success) return toast.error("Invalid email");
    if (!passwordSchema.safeParse(signUp.password).success) return toast.error("Password too short");
    if (!signUp.fullName.trim()) return toast.error("Enter your name");
    setBusy(true);

    try {
      const userCred = await createUserWithEmailAndPassword(auth, signUp.email, signUp.password);
      
      let dbRoleVal = signUp.role === "admin" ? "patient" : signUp.role;
      if (dbRoleVal.startsWith("doctor_")) {
        dbRoleVal = "doctor1";
      }
      
      await setDoc(doc(db, "user_roles", userCred.user.uid), {
        role: dbRoleVal
      });

      await setDoc(doc(db, "profiles", userCred.user.uid), {
        full_name: signUp.fullName.trim(),
        email: signUp.email.trim(),
      });

      await refreshRole();
      setBusy(false);
      toast.success("Account created");
    } catch (err: any) {
      setBusy(false);
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center pt-24 pb-8 overflow-hidden bg-slate-50">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <img src="/login_bg_hospital_light.png" alt="Hospital Background" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] dark:bg-slate-950/60" />
      </div>

      <GlobalNavbar isFixed={true} />
      <div className="w-full max-w-md px-4 relative z-10">
        <Card className="border border-white/60 dark:border-white/10 bg-white/45 dark:bg-slate-900/45 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] relative overflow-hidden backdrop-blur-[20px] text-slate-900 dark:text-white rounded-[2rem] p-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome</CardTitle>
            <CardDescription className="text-sm text-slate-600 dark:text-slate-300">Sign in or create your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl h-11 p-1">
                <TabsTrigger value="signin" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300 rounded-lg font-semibold cursor-pointer">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300 rounded-lg font-semibold cursor-pointer">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-800 dark:text-slate-200 font-medium">Email</Label>
                    <Input type="email" value={signIn.email}
                      onChange={(e) => setSignIn({ ...signIn, email: e.target.value })} required
                      className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-slate-800 dark:text-slate-200 font-medium">Password</Label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input type={showSignInPass ? "text" : "password"} value={signIn.password}
                        onChange={(e) => setSignIn({ ...signIn, password: e.target.value })} required
                        className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 h-11 pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowSignInPass(!showSignInPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                      >
                        {showSignInPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-700 hover:to-sky-600 text-white shadow-md transition-all duration-300 mt-2 cursor-pointer" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-slate-800 dark:text-slate-200 font-medium">Full name</Label>
                    <Input value={signUp.fullName}
                      onChange={(e) => setSignUp({ ...signUp, fullName: e.target.value })} required
                      className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 h-11" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-800 dark:text-slate-200 font-medium">Email</Label>
                    <Input type="email" value={signUp.email}
                      onChange={(e) => setSignUp({ ...signUp, email: e.target.value })} required
                      className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 h-11" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-800 dark:text-slate-200 font-medium">Password</Label>
                    <div className="relative">
                      <Input type={showSignUpPass ? "text" : "password"} value={signUp.password}
                        onChange={(e) => setSignUp({ ...signUp, password: e.target.value })} required
                        className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 h-11 pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPass(!showSignUpPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                      >
                        {showSignUpPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-800 dark:text-slate-200 font-medium">I am a</Label>
                    <Select value={signUp.role} onValueChange={(v) => setSignUp({ ...signUp, role: v })}>
                      <SelectTrigger className="rounded-xl border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-cyan-500 h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl">
                        <SelectItem value="patient">Patient</SelectItem>
                        <SelectItem value="nurse">Nurse</SelectItem>
                        {doctorsList.length > 0 ? (
                          doctorsList.map((d) => (
                            <SelectItem key={d.id} value={`doctor_${d.id}`}>
                              {d.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="doctor_generic">Doctor</SelectItem>
                        )}
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full h-11 font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-700 hover:to-sky-600 text-white shadow-md transition-all duration-300 mt-3 cursor-pointer" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-slate-505 dark:text-slate-400">
          Demo: pick a role at signup. Email verification is disabled for quick testing.
        </p>
      </div>
    </div>
  );
}
