-- 1. Create the function that handle the new user and maps metadata to columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    phone, 
    city, 
    address, 
    bio, 
    college_name, 
    year_of_study, 
    employment_status, 
    skills, 
    interests
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'address',
    new.raw_user_meta_data ->> 'bio',
    new.raw_user_meta_data ->> 'college_name',
    new.raw_user_meta_data ->> 'year_of_study',
    new.raw_user_meta_data ->> 'employment_status',
    -- Converting JSONB arrays back to TEXT arrays
    ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data -> 'skills')),
    ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data -> 'interests'))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger the function every time a user is created in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();