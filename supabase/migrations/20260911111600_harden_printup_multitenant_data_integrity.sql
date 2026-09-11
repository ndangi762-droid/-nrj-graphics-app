-- PRINTUP multi-tenant data integrity + starter catalog
-- Existing legacy rows remain untouched (shop_id IS NULL).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_name_key') THEN
    ALTER TABLE public.services DROP CONSTRAINT services_name_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_job_number_key') THEN
    ALTER TABLE public.jobs DROP CONSTRAINT jobs_job_number_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS services_shop_name_key
  ON public.services (shop_id, name)
  WHERE shop_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_shop_job_number_key
  ON public.jobs (shop_id, job_number)
  WHERE shop_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.seed_printup_shop_services()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.services (shop_id, name, category, rate, active)
  VALUES
    (NEW.id,'Star Flex','Flex Printing',0,true),
    (NEW.id,'Normal HS Flex','Flex Printing',0,true),
    (NEW.id,'Black Back (BB) Flex','Flex Printing',0,true),
    (NEW.id,'One Way Vision','Flex Printing',0,true),
    (NEW.id,'Vinyl','Flex Printing',0,true),
    (NEW.id,'Backlit Flex','Flex Printing',0,true),
    (NEW.id,'300 GSM Single Side','Digital Printing',0,true),
    (NEW.id,'300 GSM Both Side','Digital Printing',0,true),
    (NEW.id,'SS + Lamination','Digital Printing',0,true),
    (NEW.id,'BS + Lamination','Digital Printing',0,true),
    (NEW.id,'SS Non-Tear (NT)','Digital Printing',0,true),
    (NEW.id,'PVC Sticker','Stickers',0,true),
    (NEW.id,'Normal Sticker','Stickers',0,true),
    (NEW.id,'Sunboard Print','Sunboard',0,true),
    (NEW.id,'Sunboard Mounting','Sunboard',0,true),
    (NEW.id,'Sunboard Cutout','Sunboard',0,true),
    (NEW.id,'Sunboard + Vinyl','Sunboard',0,true),
    (NEW.id,'Standard Roll Up','Roll Up Standy',0,true),
    (NEW.id,'Premium Roll Up','Roll Up Standy',0,true),
    (NEW.id,'Double Side Roll Up','Roll Up Standy',0,true),
    (NEW.id,'Canopy Printing','Canopy / Tent',0,true),
    (NEW.id,'Canopy with Frame','Canopy / Tent',0,true),
    (NEW.id,'Promotional Tent','Canopy / Tent',0,true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_printup_shop_services ON public.shops;
CREATE TRIGGER trg_seed_printup_shop_services
AFTER INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.seed_printup_shop_services();

REVOKE ALL ON FUNCTION public.seed_printup_shop_services() FROM PUBLIC, anon, authenticated;
