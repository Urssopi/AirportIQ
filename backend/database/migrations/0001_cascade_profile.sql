-- 0001: Make user_profiles.id cascade-delete from auth.users.
-- Without this, deleting an auth user fails while a profile row references it.
ALTER TABLE user_profiles
  DROP CONSTRAINT user_profiles_id_fkey,
  ADD  CONSTRAINT user_profiles_id_fkey
       FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
