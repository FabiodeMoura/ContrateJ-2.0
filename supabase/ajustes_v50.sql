-- Ajustes v50 — JÁ APLICADOS no projeto Supabase "contrateja" (registro, e para recriar o banco do zero).

-- Regra do negócio: cada empresa pode ter até 2 usuários além do administrador
-- (só nos planos pagos). Cada usuário fica vinculado a UMA empresa e só enxerga ela.

-- 1) Usuários da equipe passam a ser vinculados a uma empresa.
alter table public.equipe
  add column if not exists empresa_id uuid references public.empresas(id) on delete cascade;
alter table public.equipe alter column empresa_id set not null;
alter table public.equipe drop constraint if exists equipe_dono_id_membro_email_key;
alter table public.equipe add constraint equipe_empresa_id_membro_email_key unique (empresa_id, membro_email);
create index if not exists equipe_membro_user_id_idx on public.equipe (membro_user_id);

-- 2) Empresas que cada pessoa pode acessar: as próprias (administrador)
--    ou aquelas às quais foi vinculada como usuário ativo.
create or replace function public.empresas_acessiveis(p_uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id from public.empresas e where e.dono_id = p_uid
  union
  select q.empresa_id from public.equipe q where q.membro_user_id = p_uid and q.status = 'Ativo';
$$;

-- 3) Valida o convite: empresa do próprio administrador, plano pago e limite de 2 por empresa.
create or replace function public.equipe_validar_convite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano text;
  v_total integer;
begin
  if not exists (select 1 from public.empresas e where e.id = new.empresa_id and e.dono_id = new.dono_id) then
    raise exception 'Empresa inválida para este administrador.' using errcode = 'EQ001';
  end if;

  select a.plano into v_plano from public.assinaturas a where a.dono_id = new.dono_id;

  if coalesce(v_plano, 'Gratuito') = 'Gratuito' then
    raise exception 'O plano Gratuito não permite cadastrar usuários.' using errcode = 'EQ002';
  end if;

  if v_plano <> 'Demonstração' then
    select count(*) into v_total from public.equipe q where q.empresa_id = new.empresa_id;
    if v_total >= 2 then
      raise exception 'Esta empresa já tem 2 usuários cadastrados.' using errcode = 'EQ003';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists equipe_validar_convite on public.equipe;
create trigger equipe_validar_convite
  before insert on public.equipe
  for each row execute function public.equipe_validar_convite();

-- 4) Acesso por empresa (antes era por conta inteira).
drop policy if exists "Gestor e equipe gerenciam empresas da conta" on public.empresas;
create policy "Dono gerencia suas empresas" on public.empresas
  for all using (dono_id = auth.uid()) with check (dono_id = auth.uid());
create policy "Membro ve as empresas vinculadas" on public.empresas
  for select using (id in (select public.empresas_acessiveis(auth.uid())));

drop policy if exists "Gestor e equipe gerenciam vagas da conta" on public.vagas;
create policy "Gestor e equipe gerenciam vagas da conta" on public.vagas
  for all
  using (empresa_id in (select public.empresas_acessiveis(auth.uid())))
  with check (empresa_id in (select public.empresas_acessiveis(auth.uid())));

drop policy if exists "Gestor e equipe gerenciam colaboradores da conta" on public.colaboradores;
create policy "Gestor e equipe gerenciam colaboradores da conta" on public.colaboradores
  for all
  using (empresa_id in (select public.empresas_acessiveis(auth.uid())))
  with check (empresa_id in (select public.empresas_acessiveis(auth.uid())));

drop policy if exists "Gestor e equipe veem candidatos da conta" on public.candidatos;
create policy "Gestor e equipe veem candidatos da conta" on public.candidatos
  for select using (
    vaga_id in (select v.id from public.vagas v where v.empresa_id in (select public.empresas_acessiveis(auth.uid())))
  );

drop policy if exists "Gestor e equipe atualizam candidatos da conta" on public.candidatos;
create policy "Gestor e equipe atualizam candidatos da conta" on public.candidatos
  for update using (
    vaga_id in (select v.id from public.vagas v where v.empresa_id in (select public.empresas_acessiveis(auth.uid())))
  );

drop policy if exists "Gestor e equipe veem respostas da conta" on public.respostas_candidato;
create policy "Gestor e equipe veem respostas da conta" on public.respostas_candidato
  for select using (
    candidato_id in (
      select c.id from public.candidatos c
      join public.vagas v on v.id = c.vaga_id
      where v.empresa_id in (select public.empresas_acessiveis(auth.uid()))
    )
  );

drop policy if exists "Gestor e equipe veem respostas de saida" on public.respostas_saida;
create policy "Gestor e equipe veem respostas de saida" on public.respostas_saida
  for select using (
    colaborador_id in (
      select c.id from public.colaboradores c
      where c.empresa_id in (select public.empresas_acessiveis(auth.uid()))
    )
  );

-- 5) Lista de empresas da pessoa logada (administrador: todas as suas; usuário: só a vinculada).
--    O app usa esta view em vez de filtrar por dono_id.
create or replace view public.minhas_empresas with (security_invoker = true) as
select e.id, e.dono_id, e.nome_fantasia, e.segmento_principal, e.logo_url, e.cnpj, e.criado_em
from public.empresas e
where e.id in (select public.empresas_acessiveis(auth.uid()));

grant select on public.minhas_empresas to authenticated;
