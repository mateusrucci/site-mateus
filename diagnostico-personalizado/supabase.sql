create table if not exists public.diagnostico_personalizado_leads (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  momento_atual text,
  nome text,
  email text,
  telefone text,
  empresa text,
  cargo text,
  faturamento_faixa text,
  investimento_mensal_faixa text,
  operacao_atual text,
  clareza_metricas text,
  dores jsonb,
  meta_12_meses text,
  urgencia text,
  resultado_diagnostico text,
  recomendacao_oferta text,
  lead_score text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,
  referral_source text,
  pagina_origem text,
  cidade text,
  estado text,
  pais text,
  parcial boolean default true,
  etapa_atual integer,
  data_envio timestamptz,
  criado_em timestamptz default now()
);

alter table public.diagnostico_personalizado_leads
add column if not exists momento_atual text;

create unique index if not exists diagnostico_personalizado_leads_session_id_key
on public.diagnostico_personalizado_leads (session_id);

alter table public.diagnostico_personalizado_leads enable row level security;

drop policy if exists "anon_insert_diagnostico_personalizado_leads" on public.diagnostico_personalizado_leads;
drop policy if exists "anon_update_diagnostico_personalizado_leads" on public.diagnostico_personalizado_leads;
drop policy if exists "anon_select_diagnostico_personalizado_leads" on public.diagnostico_personalizado_leads;

create policy "anon_insert_diagnostico_personalizado_leads"
on public.diagnostico_personalizado_leads
for insert
to anon
with check (true);

create policy "anon_update_diagnostico_personalizado_leads"
on public.diagnostico_personalizado_leads
for update
to anon
using (true)
with check (true);

create policy "anon_select_diagnostico_personalizado_leads"
on public.diagnostico_personalizado_leads
for select
to anon
using (true);
