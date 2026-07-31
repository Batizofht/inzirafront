import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api-client';

export type UserType = 'buyer' | 'seller' | null;

const USER_TYPE_KEY = '@user_type';
const IS_LOGGED_IN_KEY = '@is_logged_in';
const AUTH_TOKEN_KEY = '@auth_token';
const AUTH_USER_KEY = '@auth_user';
const SELLER_VERIFICATION_STATUS_KEY = '@seller_verification_status';

export type AuthUser = {
  id: string;
  fullName: string;
  phone?: string | null;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  location?: string | null;
  isVerifiedSeller?: boolean;
  isEmailVerified?: boolean;
  isBroker?: boolean;
  profileImage?: string | null;
  sellerType?: 'individual' | 'company' | null;
  accountType?: 'individual' | 'dealer' | 'company';
  hasPaidVerificationFee?: boolean;
  createdAt?: string;
};

export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const value = await AsyncStorage.getItem(AUTH_USER_KEY);
    const user = value ? (JSON.parse(value) as AuthUser) : null;
    console.log('Retrieved authUser:', user); // Debug log
    return user;
  } catch (error) {
    console.error('Error retrieving authUser:', error);
    return null;
  }
}

export async function setAuthSession(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  await AsyncStorage.setItem(USER_TYPE_KEY, user.role === 'admin' ? 'seller' : user.role);
  await AsyncStorage.setItem(IS_LOGGED_IN_KEY, 'true');

  if (user.isVerifiedSeller) {
    await AsyncStorage.removeItem(SELLER_VERIFICATION_STATUS_KEY);
  }
}

// Update the stored auth user in AsyncStorage (e.g. after payment changes flags)
export async function updateStoredAuthUser(updates: Partial<AuthUser>): Promise<void> {
  try {
    const value = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (!value) return;
    const existing = JSON.parse(value) as AuthUser;
    const updated = { ...existing, ...updates };
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}

export async function setSellerVerificationStatus(status: 'pending' | null): Promise<void> {
  if (!status) {
    await AsyncStorage.removeItem(SELLER_VERIFICATION_STATUS_KEY);
    return;
  }

  await AsyncStorage.setItem(SELLER_VERIFICATION_STATUS_KEY, status);
}

export async function getSellerVerificationStatus(): Promise<'pending' | null> {
  const status = await AsyncStorage.getItem(SELLER_VERIFICATION_STATUS_KEY);
  return status === 'pending' ? 'pending' : null;
}

// Register - returns userId + email so OTP screen can continue
export async function registerUser(payload: {
  fullName: string;
  email: string;
  password: string;
  role: 'buyer' | 'seller';
  phone?: string;
  sellerType?: 'individual' | 'company';
  isBroker?: boolean;
  accountType?: 'individual' | 'dealer' | 'company';
}): Promise<{ userId: string; email: string; role: string }> {
  const response = await apiRequest<{ status: number; data: { userId: string; email: string; role: string } }>('/auth/register', {
    method: 'POST',
    body: payload,
  });
  return response.data;
}

// Verify OTP - returns token + user on success
export async function verifyOtp(userId: string, otp: string): Promise<AuthUser> {
  const response = await apiRequest<{ status: number; data: { token: string; user: AuthUser } }>('/auth/verify-otp', {
    method: 'POST',
    body: { userId, otp },
  });
  await setAuthSession(response.data.token, response.data.user);
  return response.data.user;
}

// Resend OTP
export async function resendOtp(userId: string): Promise<void> {
  await apiRequest('/auth/resend-otp', {
    method: 'POST',
    body: { userId },
  });
}

// Login with email + password
export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const response = await apiRequest<{ status: number; data: { token: string; user: AuthUser } }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  await setAuthSession(response.data.token, response.data.user);
  return response.data.user;
}

// Keep old name for backwards compatibility
export const loginWithPhone = loginWithEmail;

export async function registerAndLogin(payload: {
  fullName: string;
  email: string;
  password: string;
  role: 'buyer' | 'seller';
}): Promise<AuthUser> {
  await apiRequest('/auth/register', {
    method: 'POST',
    body: payload,
  });
  return loginWithEmail(payload.email, payload.password);
}

export async function getUserType(): Promise<UserType> {
  try {
    const authUser = await getAuthUser();
    if (authUser && authUser.role !== 'admin') {
      return authUser.role as UserType;
    }
    const value = await AsyncStorage.getItem(USER_TYPE_KEY);
    return value as UserType;
  } catch {
    return null;
  }
}

export async function setUserType(type: UserType): Promise<void> {
  try {
    const authUser = await getAuthUser();
    if (authUser && type) {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify({ ...authUser, role: type }));
    }
    if (type) {
      await AsyncStorage.setItem(USER_TYPE_KEY, type);
    } else {
      await AsyncStorage.removeItem(USER_TYPE_KEY);
    }
  } catch {
    // Silently fail
  }
}

export async function isLoggedIn(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(IS_LOGGED_IN_KEY);
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return value === 'true' && Boolean(token);
  } catch {
    return false;
  }
}

export async function setLoggedIn(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(IS_LOGGED_IN_KEY, value ? 'true' : 'false');
  } catch {
    // Silently fail
  }
}

export async function clearLocalAuthSession(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(USER_TYPE_KEY),
      AsyncStorage.removeItem(IS_LOGGED_IN_KEY),
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
      AsyncStorage.removeItem(SELLER_VERIFICATION_STATUS_KEY),
    ]);
  } catch {
    // Silently fail
  }
}

export async function logout(): Promise<void> {
  try {
    const token = await getAuthToken();
    if (token) {
      await apiRequest('/auth/logout', { method: 'POST', auth: true }).catch(() => undefined);
    }
    await clearLocalAuthSession();
  } catch {
    // Silently fail
  }
}

export async function switchAccountRole(
  role: 'buyer' | 'seller',
  sellerType?: 'individual' | 'company',
  accountType?: 'individual' | 'dealer',
): Promise<{ status: number; data: { user: AuthUser } }> {
  return apiRequest<{ status: number; data: { user: AuthUser } }>('/auth/switch-role', {
    method: 'POST',
    auth: true,
    body: { role, sellerType, accountType },
  });
}
