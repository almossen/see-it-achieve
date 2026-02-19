-- Create voice_synonyms table for managing Arabic search synonyms per tenant
CREATE TABLE public.voice_synonyms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_word text NOT NULL,
  to_word text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_synonyms ENABLE ROW LEVEL SECURITY;

-- Admins can manage synonyms
CREATE POLICY "Admins can manage voice synonyms"
ON public.voice_synonyms
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND is_tenant_admin());

-- All tenant users can read synonyms (needed by VoiceSearch)
CREATE POLICY "Users can view tenant synonyms"
ON public.voice_synonyms
FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Unique constraint: one mapping per from_word per tenant
CREATE UNIQUE INDEX voice_synonyms_tenant_from_word_idx ON public.voice_synonyms(tenant_id, from_word);
