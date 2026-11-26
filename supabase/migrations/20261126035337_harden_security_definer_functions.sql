/*
# Harden SECURITY DEFINER functions

1. Changes
   - Revoke EXECUTE from PUBLIC, anon and authenticated on handle_new_user,
     current_role_name and current_dealer_id. These are only used internally by
     triggers and RLS policies, never called directly through the API.
   - Pin search_path on touch_updated_at (search path hardening).

2. Security
   - Prevents anyone from calling privileged helper functions directly via RPC.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_role_name() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_dealer_id() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;
