import AsyncStorage from '@react-native-async-storage/async-storage';

const VERIFICATION_DRAFT_KEY = '@seller_verification_draft';

export type VerificationDraft = {
  phoneNumber?: string;
  phoneVerified?: boolean;
  idType?: 'national_id' | 'passport' | 'driving_license';
  idFrontImage?: string;
  idBackImage?: string;
  selfieImage?: string;
};

export async function getVerificationDraft(): Promise<VerificationDraft> {
  try {
    const raw = await AsyncStorage.getItem(VERIFICATION_DRAFT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as VerificationDraft;
  } catch {
    return {};
  }
}

export async function setVerificationDraft(patch: Partial<VerificationDraft>): Promise<void> {
  const current = await getVerificationDraft();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(VERIFICATION_DRAFT_KEY, JSON.stringify(next));
}

export async function clearVerificationDraft(): Promise<void> {
  await AsyncStorage.removeItem(VERIFICATION_DRAFT_KEY);
}
