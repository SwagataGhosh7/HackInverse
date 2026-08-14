import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Camera, Loader2, User, Wallet, FileCheck, ShieldCheck } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EvidencePanel, EvidenceRow } from "@/components/evidence";
import { FaceVerify } from "@/components/face-verify";
import { truncateHash } from "@/lib/media";
import { EXPLORER } from "@/lib/chain";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Provenance Registry" },
      {
        name: "description",
        content: "Manage your creator profile, avatar, display name, and linked wallets.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.photoURL ?? null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<string | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);

  // Stats from Supabase
  const [registrationCount, setRegistrationCount] = useState<number | null>(null);
  const [wallets, setWallets] = useState<{ address: string; created_at: string }[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch profile from Supabase
    supabase
      .from("profiles")
      .select("display_name, avatar_url, face_descriptor")
      .eq("id", user.uid)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.face_descriptor) {
          setFaceDescriptor(data.face_descriptor);
          setFaceVerified(true);
        }
      });

    // Fetch registration count
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.uid)
      .then(({ count }) => setRegistrationCount(count ?? 0));

    // Fetch linked wallets
    supabase
      .from("wallets")
      .select("address, created_at")
      .eq("user_id", user.uid)
      .order("created_at", { ascending: false })
      .then(({ data }) => setWallets(data ?? []));
  }, [user]);

  async function saveDisplayName() {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    try {
      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.uid, display_name: displayName, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success("Display name saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save name.");
    } finally {
      setSavingName(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `avatars/${user.uid}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;

      // Update Firebase Auth photoURL
      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url });
      }

      // Update Supabase profile
      await supabase
        .from("profiles")
        .upsert({ id: user.uid, avatar_url: url, updated_at: new Date().toISOString() });

      setAvatarUrl(url);
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleFaceVerified(result: { snapshot: string; descriptor: string; matchScore: number | null }) {
    if (!user) return;
    try {
      await supabase
        .from("profiles")
        .upsert({ 
          id: user.uid, 
          face_descriptor: result.descriptor,
          updated_at: new Date().toISOString() 
        });
      
      setFaceDescriptor(result.descriptor);
      setFaceVerified(true);
      toast.success(result.matchScore !== null 
        ? `Face verified successfully (${result.matchScore}% match)` 
        : "Face biometric registered successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Face verification failed.");
    }
  }

  const initials = (displayName || user?.email || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="label-mono">Account settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Profile</h1>
      </header>

      <div className="space-y-6">
        {/* Avatar + name */}
        <EvidencePanel title="Identity">
          <div className="space-y-6 py-4">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-border bg-muted">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName || "Avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-xl font-semibold text-primary">
                      {initials}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                  aria-label="Change avatar"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div>
                <p className="font-medium">{displayName || "Unnamed creator"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 text-xs text-primary underline-offset-4 hover:underline"
                >
                  Change photo
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Display name */}
            <div className="space-y-1.5">
              <Label htmlFor="display-name" className="label-mono">Display name</Label>
              <div className="flex gap-2">
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  placeholder="Studio or creator name"
                  className="max-w-xs"
                />
                <Button
                  size="sm"
                  onClick={saveDisplayName}
                  disabled={savingName || !displayName.trim()}
                >
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>

            {/* Account info */}
            <EvidenceRow label="Email" value={user?.email ?? "—"} mono={false} />
            <EvidenceRow label="UID" value={user?.uid ?? "—"} />
          </div>
        </EvidencePanel>

        {/* Face verification */}
        <EvidencePanel title="Biometric verification">
          <div className="space-y-4 py-4">
            {faceVerified ? (
              <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
                  <ShieldCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-success">Face biometric registered</p>
                  <p className="text-xs text-muted-foreground">Your face descriptor is stored for verification during media registration.</p>
                </div>
              </div>
            ) : (
              <FaceVerify 
                referenceDescriptor={null}
                onVerified={handleFaceVerified}
                onSkip={() => toast.info("Face verification skipped. You can enable it later.")}
              />
            )}
          </div>
        </EvidencePanel>

        {/* Stats */}
        <EvidencePanel title="Activity">
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-4 text-center">
              <FileCheck className="h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-mono font-semibold text-foreground">
                {registrationCount ?? "—"}
              </p>
              <p className="label-mono mt-0.5">Registrations</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-4 text-center">
              <Wallet className="h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-mono font-semibold text-foreground">{wallets.length}</p>
              <p className="label-mono mt-0.5">Linked wallets</p>
            </div>
          </div>
        </EvidencePanel>

        {/* Linked wallets */}
        <EvidencePanel title="Linked wallets">
          <div className="py-4">
            {wallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No wallets linked yet. Connect a wallet on the{" "}
                <a href="/dashboard" className="text-primary underline-offset-4 hover:underline">
                  Dashboard
                </a>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {wallets.map((w) => (
                  <div
                    key={w.address}
                    className="flex items-center justify-between rounded border border-border px-3 py-2"
                  >
                    <span className="font-mono text-xs text-foreground">
                      {truncateHash(w.address, 10, 8)}
                    </span>
                    <a
                      href={`${EXPLORER}/address/${w.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="label-mono text-primary hover:underline underline-offset-4"
                    >
                      Explorer →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </EvidencePanel>

        {/* Danger zone */}
        <EvidencePanel title="Account">
          <div className="py-4 space-y-2">
            <EvidenceRow
              label="Signed in via"
              value={user?.providerData?.[0]?.providerId ?? "email"}
              mono={false}
            />
            <EvidenceRow
              label="Account created"
              value={
                user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString()
                  : "—"
              }
              mono={false}
            />
          </div>
        </EvidencePanel>
      </div>
    </main>
  );
}
