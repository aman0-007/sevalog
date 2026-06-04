-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 2. CREATE A HELPER FUNCTION TO CHECK IF USER IS ADMIN
-- This makes our policies much cleaner.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin') 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. POLICIES FOR 'PROFILES'
-- Everyone can view profiles (to see volunteer lists)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile info
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. POLICIES FOR 'EVENTS'
-- Anyone (even guests) can see upcoming events
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (true);

-- Only admins can create, update, or delete events
CREATE POLICY "Admins can manage events" ON events
  FOR ALL TO authenticated USING (is_admin());

-- 5. POLICIES FOR 'REGISTRATIONS'
-- Users can see their own registrations
CREATE POLICY "Users can view own registrations" ON registrations
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());

-- Users can sign themselves up for an event
CREATE POLICY "Users can register for events" ON registrations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Only admins can log hours or update registration status
CREATE POLICY "Admins can update registrations" ON registrations
  FOR UPDATE TO authenticated USING (is_admin());

-- 6. POLICIES FOR 'ACTIVITIES' (Gallery)
-- Public can see the impact/activities
CREATE POLICY "Activities are viewable by everyone" ON activities
  FOR SELECT USING (true);

-- Only admins can post new activities
CREATE POLICY "Admins can manage activities" ON activities
  FOR ALL TO authenticated USING (is_admin());