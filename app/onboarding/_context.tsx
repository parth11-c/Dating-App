import React from "react";

export type OnboardingDraft = {
  name?: string;
  bio?: string;
  date_of_birth?: string; // YYYY-MM-DD
  pronoun?: string;
  gender?: string;
  preferred_gender?: string;
  religion?: string;
  interests?: string[];
  // For photos, store local URIs to upload later
  photos: { uri: string }[];
};

type Ctx = {
  draft: OnboardingDraft;
  update: (partial: Partial<OnboardingDraft>) => void;
  setPhotos: (uris: string[]) => void;
  addPhoto: (uri: string) => void;
  removePhoto: (uri: string) => void;
  clear: () => void;
};

const OnboardingContext = React.createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = React.useState<OnboardingDraft>({ photos: [] });
  const update = (partial: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...partial }));
  const setPhotos = (uris: string[]) => setDraft((d) => ({ ...d, photos: uris.map((u) => ({ uri: u })) }));
  const addPhoto = (uri: string) => setDraft((d) => ({ ...d, photos: [...d.photos, { uri }] }));
  const removePhoto = (uri: string) => setDraft((d) => ({ ...d, photos: d.photos.filter((p) => p.uri !== uri) }));
  const clear = () => setDraft({ photos: [] });
  const value = React.useMemo<Ctx>(() => ({ draft, update, setPhotos, addPhoto, removePhoto, clear }), [draft]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}

// Added to prevent expo-router warning about missing default export.
// This component is not used; the real context lives in '@/context/onboarding'.
export default function _UnusedOnboardingContextRoute() {
  return null;
}
