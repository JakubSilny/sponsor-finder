-- Create function to find user by email (for webhook optimization)
-- This function allows admin to search for users by email efficiently
CREATE OR REPLACE FUNCTION public.find_user_by_email(search_email TEXT)
RETURNS TABLE(id UUID, email TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(search_email)
  LIMIT 1;
END;
$$;

-- Grant execute permission to service role (implicitly available via SECURITY DEFINER)
-- This function can only be called with service role key

