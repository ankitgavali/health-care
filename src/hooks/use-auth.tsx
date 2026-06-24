import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type AppRole = "patient" | "nurse" | "doctor1" | "doctor2" | "admin";

type AuthCtx = {
  user: User | null;
  role: AppRole | null;
  profileName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setRole(null);
      return;
    }

    const email = currentUser.email?.trim().toLowerCase();
    if (email === "admin12@gmail.com") {
      setRole("admin");
      return;
    }

    const roleDocRef = doc(db, "user_roles", currentUser.uid);
    const roleDoc = await getDoc(roleDocRef);
    const profileDocRef = doc(db, "profiles", currentUser.uid);
    const profileDoc = await getDoc(profileDocRef);

    if (profileDoc.exists() && profileDoc.data().full_name) {
      setProfileName(profileDoc.data().full_name);
    } else {
      setProfileName(null);
    }

    if (roleDoc.exists()) {
      setRole(roleDoc.data().role as AppRole);
      return;
    }

    // If role is missing for predefined accounts, auto-insert it
    if (email && ["nurse12@gmail.com", "doctor12@gmail.com", "doctor12@gmail", "doctor1@gmail.com", "doctor2@gmail.com", "guest.patient@medicare.local"].includes(email)) {
      let roleKey: AppRole = "nurse";
      if (email === "doctor12@gmail.com" || email === "doctor12@gmail" || email === "doctor1@gmail.com") roleKey = "doctor1";
      if (email === "doctor2@gmail.com") roleKey = "doctor2";
      if (email === "guest.patient@medicare.local") roleKey = "patient";

      try {
        await setDoc(roleDocRef, { role: roleKey });
        
        let name = "Nurse Console";
        if (email === "doctor12@gmail.com" || email === "doctor12@gmail" || email === "doctor1@gmail.com") name = "Dr. Kadambari Jagtap";
        if (email === "doctor2@gmail.com") name = "Dr. Omprasad Jagtap";
        if (email === "guest.patient@medicare.local") name = "Guest Patient";

        await setDoc(doc(db, "profiles", currentUser.uid), {
          full_name: name,
          email,
        });

        setRole(roleKey);
        setProfileName(name);
      } catch (err) {
        console.error("Failed to auto-insert role in Firestore", err);
        setRole(null);
        setProfileName(null);
      }
      return;
    }

    setRole(null);
    setProfileName(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchRole(currentUser);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        profileName,
        loading,
        signOut: async () => { 
          await firebaseSignOut(auth); 
          sessionStorage.removeItem("healthbridge_submitted_case_ids");
        },
        refreshRole: async () => {
          await fetchRole(auth.currentUser);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
