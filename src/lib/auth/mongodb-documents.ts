import type { ObjectId } from 'mongodb';

import type { Auth } from '@/lib/auth/types';

export interface UserDocument {
  _id?: ObjectId;
  email_normalized: string;
  email_display: string;
  password_hash: string;
  email_verified_at: Date | null;
  mfa_enrolled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  status: Auth.UserStatus;
}

export interface SessionDocument {
  _id?: ObjectId;
  user_id: ObjectId;
  token_hash: string;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  ip_hash: string | null;
  user_agent: string | null;
  level: Auth.SessionLevel;
  recent_auth_at: Date | null;
}

export interface VerificationTokenDocument {
  _id?: ObjectId;
  user_id: ObjectId;
  token_hash: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

export interface PasswordResetTokenDocument {
  _id?: ObjectId;
  user_id: ObjectId;
  token_hash: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

export interface AuthEventDocument {
  _id?: ObjectId;
  user_id: ObjectId | null;
  type: string;
  occurred_at: Date;
  ip_hash: string | null;
  user_agent: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AuthSettingDocument {
  _id?: ObjectId;
  field: string;
  key: string;
  value: string;
  updated_at: Date;
}
