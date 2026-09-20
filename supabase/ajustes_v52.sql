-- Ajustes v52 — isolamento dos dados de cada cliente (registro; para recriar o banco do zero).
-- Objetivo: cada administrador (e usuário vinculado) enxerga SOMENTE as suas empresas e os dados delas.

-- PARTE 1 (aplicada antes do deploy do v52): funções públicas que devolvem só o registro do link recebido.
create or replace function public.vaga_publica(p_token uuid)
returns table(id uuid, funcao text, link_usado boolean, perfil_disc_id uuid, empresa_nome text, logo_url text)
language sql stable security definer set search_path = public
as $$
  select v.id, v.funcao, v.link_usado, v.perfil_disc_id, e.nome_fantasia, e.logo_url
  from public.vagas v
  left join public.empresas e on e.id = v.empresa_id
  where v.token_link = p_token
  limit 1;
$$;

create or replace function public.resultado_publico(p_candidato_id uuid)
returns table(nome_completo text, percentual_aderencia numeric, funcao text, empresa_nome text)
language sql stable security definer set search_path = public
as $$
  select c.nome_completo, c.percentual_aderencia, v.funcao, e.nome_fantasia
  from public.candidatos c
  join public.vagas v on v.id = c.vaga_id
  left join public.empresas e on e.id = v.empresa_id
  where c.id = p_candidato_id
  limit 1;
$$;

create or replace function public.colaborador_publico(p_id uuid)
returns table(id uuid, nome_completo text, empresa_nome text)
language sql stable security definer set search_path = public
as $$
  select c.id, c.nome_completo, e.nome_fantasia
  from public.colaboradores c
  left join public.empresas e on e.id = c.empresa_id
  where c.id = p_id
  limit 1;
$$;

-- PARTE 2 (aplicada DEPOIS que o v52 estiver no ar): fecha a leitura aberta das tabelas.
drop policy if exists "Leitura publica do nome da empresa" on public.empresas;
drop policy if exists "Candidato le vaga pelo token" on public.vagas;
drop policy if exists "Candidato le seu proprio resultado" on public.candidatos;
drop view if exists public.colaboradores_publico;
