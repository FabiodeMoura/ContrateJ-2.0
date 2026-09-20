-- Ajustes v51 — JÁ APLICADOS no projeto Supabase "contrateja" (registro, e para recriar o banco do zero).
-- Regra: 1 empresa no plano gratuito; cada pacote pago libera o cadastro de +1 empresa
-- (e 2 usuários por empresa, ver ajustes_v50.sql).
-- ATENÇÃO: no banco real o segredo da função é o mesmo da versão anterior; aqui está como <SEGREDO_INTERNO>.

create table if not exists public.compras_hotmart (
  transacao text primary key,
  dono_id uuid not null references auth.users(id),
  tipo text not null,
  criado_em timestamptz not null default now()
);
alter table public.compras_hotmart enable row level security;

drop function if exists public.processar_compra_hotmart(text, text, integer, text);

create or replace function public.processar_compra_hotmart(
  p_email text,
  p_tipo text,
  p_quantidade integer,
  p_segredo text,
  p_transacao text default null,
  p_renovacao boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $body$
declare
  v_user_id uuid;
  v_plano_atual text;
  v_mais_empresa integer;
begin
  if p_segredo <> '<SEGREDO_INTERNO>' then
    raise exception 'Segredo inválido';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;

  if v_user_id is null then
    raise exception 'Usuário com e-mail % não encontrado', p_email;
  end if;

  -- Cada transação do Hotmart só vale uma vez (o Hotmart pode reenviar o aviso).
  if p_transacao is not null then
    insert into public.compras_hotmart (transacao, dono_id, tipo)
    values (p_transacao, v_user_id, p_tipo)
    on conflict (transacao) do nothing;
    if not found then
      return;
    end if;
  end if;

  -- Cada pacote novo libera o cadastro de +1 empresa (renovação mensal não soma).
  v_mais_empresa := case when p_renovacao then 0 else 1 end;

  if p_tipo = 'plano_79' then
    update public.assinaturas
      set plano = 'Plano 79', limite_links = 50,
          limite_empresas = limite_empresas + v_mais_empresa, atualizado_em = now()
      where dono_id = v_user_id;

  elsif p_tipo = 'plano_99' then
    update public.assinaturas
      set plano = 'Plano 99', limite_links = 80,
          limite_empresas = limite_empresas + v_mais_empresa, atualizado_em = now()
      where dono_id = v_user_id;

  elsif p_tipo = 'links_avulsos' then
    select plano into v_plano_atual from public.assinaturas where dono_id = v_user_id;

    if v_plano_atual = 'Gratuito' or v_plano_atual is null then
      raise exception 'Compra de links avulsos exige um plano pago (Plano 79 ou Plano 99). E-mail: %', p_email;
    end if;

    update public.assinaturas
      set links_extras = links_extras + p_quantidade, atualizado_em = now()
      where dono_id = v_user_id;

  else
    raise exception 'Tipo de compra desconhecido: %', p_tipo;
  end if;
end;
$body$;
