-- Add governorate_id, city_id, and district_id to addresses table for proper cascading dropdowns

ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS governorate_id UUID REFERENCES public.governorates(id),
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id),
ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_addresses_governorate_id ON public.addresses(governorate_id);
CREATE INDEX IF NOT EXISTS idx_addresses_city_id ON public.addresses(city_id);
CREATE INDEX IF NOT EXISTS idx_addresses_district_id ON public.addresses(district_id);

-- Add comment
COMMENT ON COLUMN public.addresses.governorate_id IS 'Reference to governorate for cascading dropdowns';
COMMENT ON COLUMN public.addresses.city_id IS 'Reference to city for cascading dropdowns';
COMMENT ON COLUMN public.addresses.district_id IS 'Reference to district for cascading dropdowns';
