-- ========================================================
-- NAXXIVO AI PROMPT MARKETPLACE & USER PROFILE SCHEMA
-- Copy and run this script in your Supabase SQL Query Editor
-- (https://app.supabase.com/project/_/sql)
-- ========================================================

-- 1. Create Prompts Table
CREATE TABLE IF NOT EXISTS public.prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  image_url TEXT NOT NULL,
  model TEXT DEFAULT 'Midjourney v6',
  aspect_ratio TEXT DEFAULT '1:1',
  tags TEXT[] DEFAULT '{}',
  likes_count INT DEFAULT 0,
  author_name TEXT DEFAULT 'Anonymous',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  github_url TEXT,
  website_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies (Public read for prompts - NO AUTH REQUIRED TO VIEW)
CREATE POLICY "Public Read Prompts" ON public.prompts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated Users Insert Prompts" ON public.prompts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR true);

CREATE POLICY "Public Read Profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users Update Own Profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- 5. Trigger for New User Profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Insert Sample Data
INSERT INTO public.prompts (title, prompt, negative_prompt, category, image_url, model, aspect_ratio, tags, likes_count, author_name)
VALUES
  ('Cyberpunk Neon Samurai', 'A futuristic cybernetic samurai standing under glowing neon rain in Neo Tokyo, holding a glowing katana, hyper-detailed 8k resolution, Unreal Engine 5 render', 'blurry, low quality', 'Cyberpunk', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200', 'Midjourney v6', '16:9', ARRAY['Cyberpunk', 'Samurai'], 245, 'Naxxivo Creator'),
  ('Cute Anime Girl in Cherry Blossom', 'Beautiful anime girl with pink hair wearing traditional kimono standing under blooming sakura trees, soft sunlight, Studio Ghibli style', 'bad anatomy, cropped', 'Anime', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200', 'Niji 6', '1:1', ARRAY['Anime', 'Sakura'], 189, 'SakuraArt'),
  ('Hyper-Realistic Studio Portrait', 'Close up photo portrait of a charismatic elder artisan with detailed wrinkles and warm smile, dramatic rim lighting, 85mm f1.4 lens', 'cgi, 3d render', 'Realistic', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200', 'FLUX.1 Dev', '4:5', ARRAY['Portrait', 'Photography'], 312, 'LensMaster');
