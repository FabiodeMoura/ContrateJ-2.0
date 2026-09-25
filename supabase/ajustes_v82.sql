-- JÁ APLICADO no Supabase (migração compras_pendentes_v82). Arquivo para registro.
-- Ajustes v82 — Compra antes do cadastro.
-- Antes: se o cliente pagava na Hotmart ANTES de criar a conta no ContrateJá, o aviso do webhook era
-- descartado ("usuário não encontrado") e o plano nunca era liberado.
-- Agora: a compra fica guardada em compras_pendentes e é aplicada automaticamente quando a conta
-- com o mesmo e-mail é criada (gatilho em auth.users). Cancelamento/reembolso antes do cadastro também são tratados.

create table if not exists public.compras_pendentes (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  email text not null,
  tipo text not null,
  quantidade integer not null default 0,
  transacao text unique,
  renovacao boolean not null default false,
  chave text,
  acesso_ate timestamptz,          -- preenchido se a assinatura foi cancelada antes do cadastro
  aplicada_em timestamptz,
  erro text
);
create index if not exists compras_pendentes_email_idx on public.compras_pendentes (lower(email)) where aplicada_em is null;
alter table public.compras_pendentes enable row level security;

-- Núcleo da compra (mesmas regras de antes), sem conferência de segredo: uso interno.
create or replace function public.aplicar_compra_hotmart(
  p_user_id uuid, p_email text, p_tipo text, p_quantidade integer,
  p_transacao text default null, p_renovacao boolean default false, p_chave text default null,
  p_registrar_evento boolean default true)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_plano_atual text;
  v_plano_nome text;
  v_chave text;
begin
  if p_transacao is not null then
    insert into public.compras_hotmart (transacao, dono_id, tipo)
    values (p_transacao, p_user_id, p_tipo)
    on conflict (transacao) do nothing;
    if not found then
      return;
    end if;
  end if;

  insert into public.assinaturas (dono_id, plano, limite_links)
  values (p_user_id, 'Gratuito', 20)
  on conflict (dono_id) do nothing;

  if p_tipo in ('plano_79', 'plano_99') then
    v_plano_nome := case p_tipo when 'plano_79' then 'Plano 79' else 'Plano 99' end;
    v_chave := coalesce(nullif(p_chave, ''), lower(p_email) || '|' || p_tipo);

    insert into public.assinaturas_hotmart (dono_id, chave, plano)
    values (p_user_id, v_chave, v_plano_nome)
    on conflict (chave) do update
      set status = 'ativa', acesso_ate = null, plano = excluded.plano,
          ultimo_pagamento_em = now(), atualizado_em = now();

    update public.assinaturas set links_usados = 0, atualizado_em = now()
      where dono_id = p_user_id and plano <> 'Demonstração';

    perform public.recalcular_assinatura(p_user_id);

  elsif p_tipo = 'links_avulsos' then
    select plano into v_plano_atual from public.assinaturas where dono_id = p_user_id;
    if v_plano_atual = 'Gratuito' or v_plano_atual is null then
      raise exception 'Compra de links avulsos exige um plano pago (Plano 79 ou Plano 99). E-mail: %', p_email;
    end if;
    update public.assinaturas set links_extras = links_extras + p_quantidade, atualizado_em = now()
      where dono_id = p_user_id;

  else
    raise exception 'Tipo de compra desconhecido: %', p_tipo;
  end if;

  if p_registrar_evento then
    insert into public.eventos_comerciais (dono_id, email, evento, tipo, quantidade, valor, transacao)
    values (p_user_id, lower(p_email), case when p_renovacao then 'renovacao' else 'compra' end, p_tipo,
            coalesce(p_quantidade, 0), public.valor_tabela(p_tipo, p_quantidade), p_transacao);
  end if;
end;
$function$;
revoke all on function public.aplicar_compra_hotmart(uuid, text, text, integer, text, boolean, text, boolean) from public, anon, authenticated;

-- Webhook de compra: com conta -> aplica na hora; sem conta -> guarda para o cadastro.
create or replace function public.processar_compra_hotmart(p_email text, p_tipo text, p_quantidade integer, p_segredo text, p_transacao text default null::text, p_renovacao boolean default false, p_chave text default null::text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
begin
  perform public.verificar_segredo_webhook(p_segredo);

  if p_tipo not in ('plano_79', 'plano_99', 'links_avulsos') then
    raise exception 'Tipo de compra desconhecido: %', p_tipo;
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;

  if v_user_id is null then
    insert into public.compras_pendentes (email, tipo, quantidade, transacao, renovacao, chave)
    values (lower(p_email), p_tipo, coalesce(p_quantidade, 0), p_transacao, coalesce(p_renovacao, false), p_chave)
    on conflict (transacao) do nothing;
    if found then
      -- a venda aconteceu: entra no Painel Master já agora (o dono é ligado quando a conta for criada)
      insert into public.eventos_comerciais (dono_id, email, evento, tipo, quantidade, valor, transacao)
      values (null, lower(p_email), case when p_renovacao then 'renovacao' else 'compra' end, p_tipo,
              coalesce(p_quantidade, 0), public.valor_tabela(p_tipo, p_quantidade), p_transacao);
    end if;
    return;
  end if;

  perform public.aplicar_compra_hotmart(v_user_id, p_email, p_tipo, p_quantidade, p_transacao, p_renovacao, p_chave, true);
end;
$function$;

-- Cancelamento: sem conta ainda -> registra na compra guardada até quando vale o acesso.
create or replace function public.cancelar_assinatura_hotmart(p_email text, p_tipo text, p_segredo text, p_chave text default null::text, p_acesso_ate timestamp with time zone default null::timestamp with time zone)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_linha public.assinaturas_hotmart%rowtype;
  v_fim timestamptz;
  v_pend public.compras_pendentes%rowtype;
begin
  perform public.verificar_segredo_webhook(p_segredo);

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;

  if v_user_id is null then
    select * into v_pend from public.compras_pendentes
      where lower(email) = lower(p_email) and tipo = p_tipo and aplicada_em is null
      order by criado_em desc limit 1;
    if found and v_pend.acesso_ate is null then
      v_fim := coalesce(p_acesso_ate, v_pend.criado_em + interval '32 days');
      update public.compras_pendentes set acesso_ate = v_fim where id = v_pend.id;
      insert into public.eventos_comerciais (dono_id, email, evento, tipo, acesso_ate)
      values (null, lower(p_email), 'cancelamento', p_tipo, v_fim);
    end if;
    return;
  end if;

  select * into v_linha
  from public.assinaturas_hotmart h
  where h.dono_id = v_user_id and h.status <> 'encerrada'
    and (h.chave = p_chave or h.chave = lower(p_email) || '|' || p_tipo)
  order by h.criado_em
  limit 1;

  if not found then
    return;
  end if;

  v_fim := coalesce(p_acesso_ate, v_linha.ultimo_pagamento_em + interval '32 days');

  if v_linha.status <> 'cancelamento_agendado' then
    insert into public.eventos_comerciais (dono_id, email, evento, tipo, acesso_ate)
    values (v_user_id, lower(p_email), 'cancelamento', p_tipo, v_fim);
  end if;

  if v_fim <= now() then
    update public.assinaturas_hotmart set status = 'encerrada', acesso_ate = v_fim, atualizado_em = now()
      where id = v_linha.id;
    perform public.recalcular_assinatura(v_user_id);
  else
    update public.assinaturas_hotmart set status = 'cancelamento_agendado', acesso_ate = v_fim, atualizado_em = now()
      where id = v_linha.id;
  end if;
end;
$function$;

-- Reembolso: sem conta ainda -> a compra guardada é descartada.
create or replace function public.encerrar_assinatura_hotmart(p_email text, p_tipo text, p_segredo text, p_chave text default null::text, p_quantidade integer default 0, p_transacao text default null::text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_linha public.assinaturas_hotmart%rowtype;
begin
  perform public.verificar_segredo_webhook(p_segredo);

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;

  if v_user_id is null then
    delete from public.compras_pendentes
      where aplicada_em is null and lower(email) = lower(p_email) and tipo = p_tipo
        and (p_transacao is null or transacao = p_transacao);
    if found then
      insert into public.eventos_comerciais (dono_id, email, evento, tipo, quantidade, valor, acesso_ate, transacao)
      values (null, lower(p_email), 'reembolso', p_tipo, coalesce(p_quantidade, 0),
              public.valor_tabela(p_tipo, p_quantidade), now(), p_transacao);
    end if;
    return;
  end if;

  if p_transacao is not null then
    insert into public.compras_hotmart (transacao, dono_id, tipo)
    values ('estorno:' || p_transacao, v_user_id, 'estorno')
    on conflict (transacao) do nothing;
    if not found then
      return;
    end if;
  end if;

  insert into public.eventos_comerciais (dono_id, email, evento, tipo, quantidade, valor, acesso_ate, transacao)
  values (v_user_id, lower(p_email), 'reembolso', p_tipo, coalesce(p_quantidade, 0),
          public.valor_tabela(p_tipo, p_quantidade), now(), p_transacao);

  if p_tipo = 'links_avulsos' then
    update public.assinaturas
      set links_extras = greatest(0, links_extras - greatest(p_quantidade, 0)), atualizado_em = now()
      where dono_id = v_user_id;
    return;
  end if;

  select * into v_linha
  from public.assinaturas_hotmart h
  where h.dono_id = v_user_id and h.status <> 'encerrada'
    and (h.chave = p_chave or h.chave = lower(p_email) || '|' || p_tipo)
  order by h.criado_em
  limit 1;

  if not found then
    return;
  end if;

  update public.assinaturas_hotmart set status = 'encerrada', acesso_ate = now(), atualizado_em = now()
    where id = v_linha.id;
  perform public.recalcular_assinatura(v_user_id);
end;
$function$;

-- Aplica as compras guardadas de um e-mail (chamada no cadastro).
create or replace function public.aplicar_compras_pendentes(p_user_id uuid, p_email text)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  r public.compras_pendentes%rowtype;
  n integer := 0;
begin
  for r in
    select * from public.compras_pendentes
    where aplicada_em is null and lower(email) = lower(p_email)
    order by (tipo = 'links_avulsos'), criado_em      -- planos antes dos links avulsos
  loop
    begin
      perform public.aplicar_compra_hotmart(p_user_id, r.email, r.tipo, r.quantidade, r.transacao, r.renovacao, r.chave, false);

      -- assinatura cancelada antes do cadastro: acesso só até o fim do período pago
      if r.acesso_ate is not null and r.tipo in ('plano_79', 'plano_99') then
        update public.assinaturas_hotmart
          set status = case when r.acesso_ate <= now() then 'encerrada' else 'cancelamento_agendado' end,
              acesso_ate = r.acesso_ate, atualizado_em = now()
          where dono_id = p_user_id and chave = coalesce(nullif(r.chave, ''), lower(r.email) || '|' || r.tipo);
        perform public.recalcular_assinatura(p_user_id);
      end if;

      update public.compras_pendentes set aplicada_em = now(), erro = null where id = r.id;
      update public.eventos_comerciais set dono_id = p_user_id
        where dono_id is null and lower(email) = lower(r.email);
      n := n + 1;
    exception when others then
      update public.compras_pendentes set erro = sqlerrm where id = r.id;
    end;
  end loop;
  return n;
end;
$function$;
revoke all on function public.aplicar_compras_pendentes(uuid, text) from public, anon, authenticated;

-- Gatilho do cadastro: cria a assinatura gratuita e, em seguida, aplica compras já pagas.
create or replace function public.criar_assinatura_gratuita()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  begin
    insert into public.assinaturas (dono_id, plano, limite_links)
    values (new.id, 'Gratuito', 20)
    on conflict (dono_id) do nothing;
  exception when others then
    -- nunca deixa a criação do usuário falhar por causa dessa etapa
    raise warning 'Falha ao criar assinatura gratuita para %: %', new.id, sqlerrm;
  end;

  begin
    if new.email is not null then
      perform public.aplicar_compras_pendentes(new.id, new.email);
    end if;
  exception when others then
    raise warning 'Falha ao aplicar compras pendentes para %: %', new.id, sqlerrm;
  end;

  return new;
end;
$function$;
