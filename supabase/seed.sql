-- Seed data for testing SponsorFinder
-- Run this in your Supabase SQL Editor after running the migration

-- Insert sample brands
INSERT INTO brands (name, category, website_url, is_active) VALUES
('Razer', 'gaming', 'https://www.razer.com', true),
('Logitech', 'gaming', 'https://www.logitech.com', true),
('Corsair', 'gaming', 'https://www.corsair.com', true),
('L''Oreal', 'beauty', 'https://www.loreal.com', true),
('Maybelline', 'beauty', 'https://www.maybelline.com', true),
('Sephora', 'beauty', 'https://www.sephora.com', true),
('Apple', 'tech', 'https://www.apple.com', true),
('Samsung', 'tech', 'https://www.samsung.com', true),
('Google', 'tech', 'https://www.google.com', true),
('Microsoft', 'tech', 'https://www.microsoft.com', true);

-- Insert sample contacts (these will only be visible to premium users)
-- Note: Replace brand_id with actual UUIDs from your brands table
-- You can get the IDs by running: SELECT id, name FROM brands;

-- Example contacts (update brand_id values after inserting brands)
-- INSERT INTO contacts (brand_id, email, name, role) VALUES
-- ((SELECT id FROM brands WHERE name = 'Razer'), 'sponsorships@razer.com', 'John Doe', 'Partnerships Manager'),
-- ((SELECT id FROM brands WHERE name = 'Logitech'), 'influencer@logitech.com', 'Jane Smith', 'Influencer Relations'),
-- ((SELECT id FROM brands WHERE name = 'Apple'), 'creator@apple.com', 'Mike Johnson', 'Creator Partnerships');

-- To insert contacts, first get brand IDs:
-- SELECT id, name FROM brands;

-- Then insert contacts with the correct brand_id UUIDs

