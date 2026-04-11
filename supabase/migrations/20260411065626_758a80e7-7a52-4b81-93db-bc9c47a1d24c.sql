-- Allow authenticated users to read all profiles (needed for companies to see candidate names)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);