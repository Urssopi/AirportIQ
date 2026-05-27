-- 0002: Store Expo push tokens on user_profiles so the backend can send pushes.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT;
