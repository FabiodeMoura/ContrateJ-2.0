-- JÁ APLICADO no projeto Supabase "contrateja" (migração painel_master_v75). Arquivo para registro.
-- Ajustes v75 — Painel Master (acesso só do dono da plataforma).
--  * super_admins: e-mails com acesso ao painel master (fabioconsultorimobi@gmail.com)
--  * eventos_comerciais: registro de cada compra, renovação, cancelamento, reembolso e fim de acesso vindo do Hotmart
--  * links_gerados: registro de cada link que consome crédito (com a empresa), mesmo que a vaga seja apagada depois
--  * painel_master(inicio, fim): números consolidados de todos os clientes, só para super admin
-- Nenhuma dessas tabelas é acessível pela API: só pelas funções abaixo.

create table if not exists public.super_admins (
  email text primary key
);
alter table public.super_admins enable row level security;
insert into public.super_admins (email) values ('fabioconsultorimobi@gmail.com') on conflict do nothing;

create table if not exists public.eventos_comerciais (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  dono_id uuid references auth.users(id) on delete set null,
  email text,
  evento text not null,        -- compra | renovacao | cancelamento | reembolso | fim_de_acesso
  tipo text,                   -- plano_79 | plano_99 | links_avulsos
  quantidade integer not null default 0,
  valor numeric(10,2) not null default 0,
  acesso_ate timestamptz,
  transacao text
);
create index if not exists eventos_comerciais_criado_em_idx on public.eventos_comerciais (criado_em);
alter table public.eventos_comerciais enable row level security;

create table if not exists public.links_gerados (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  dono_id uuid references auth.users(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  empresa_nome text
);
create index if not exists links_gerados_criado_em_idx on public.links_gerados (criado_em);
alter table public.links_gerados enable row level security;

-- Histórico: os links já gerados (vagas existentes) entram no registro uma única vez.
insert into public.links_gerados (criado_em, dono_id, empresa_id, empresa_nome)
select v.criado_em, e.dono_id, e.id, e.nome_fantasia
from public.vagas v join public.empresas e on e.id = v.empresa_id
where not exists (select 1 from public.links_gerados);

-- Preço de tabela (o Hotmart pode aplicar cupom; o painel mostra "receita estimada")
create or replace function public.valor_tabela(p_tipo text, p_quantidade integer)
returns numeric language sql immutable as $$
  select case p_tipo when 'plano_79' then 79.90 when 'plano_99' then 99.90
                     when 'links_avulsos' then greatest(coalesce(p_quantidade, 0), 0) * 3.00 else 0 end;
$$;

create or replace function public.eh_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.super_admins s join auth.users u on lower(u.email) = lower(s.email)
    where u.id = auth.uid()
  );
$$;
revoke all on function public.eh_super_admin() from public, anon;
grant execute on function public.eh_super_admin() to authenticated;

-- ---------- Hotmart: mesmas regras de antes + registro do evento ----------
create or replace function public.processar_compra_hotmart(p_email text, p_tipo text, p_quantidade integer, p_segredo text, p_transacao text default null::text, p_renovacao boolean default false, p_chave text default null::text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_plano_atual text;
  v_plano_nome text;
  v_chave text;
begin
  perform public.verificar_segredo_webhook(p_segredo);

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'Usuário com e-mail % não encontrado', p_email;
  end if;

  if p_transacao is not null then
    insert into public.compras_hotmart (transacao, dono_id, tipo)
    values (p_transacao, v_user_id, p_tipo)
    on conflict (transacao) do nothing;
    if not found then
      return;
    end if;
  end if;

  insert into public.assinaturas (dono_id, plano, limite_links)
  values (v_user_id, 'Gratuito', 20)
  on conflict (dono_id) do nothing;

  if p_tipo in ('plano_79', 'plano_99') then
    v_plano_nome := case p_tipo when 'plano_79' then 'Plano 79' else 'Plano 99' end;
    v_chave := coalesce(nullif(p_chave, ''), lower(p_email) || '|' || p_tipo);

    insert into public.assinaturas_hotmart (dono_id, chave, plano)
    values (v_user_id, v_chave, v_plano_nome)
    on conflict (chave) do update
      set status = 'ativa', acesso_ate = null, plano = excluded.plano,
          ultimo_pagamento_em = now(), atualizado_em = now();

    update public.assinaturas set links_usados = 0, atualizado_em = now()
      where dono_id = v_user_id and plano <> 'Demonstração';

    perform public.recalcular_assinatura(v_user_id);

  elsif p_tipo = 'links_avulsos' then
    select plano into v_plano_atual from public.assinaturas where dono_id = v_user_id;
    if v_plano_atual = 'Gratuito' or v_plano_atual is null then
      raise exception 'Compra de links avulsos exige um plano pago (Plano 79 ou Plano 99). E-mail: %', p_email;
    end if;
    update public.assinaturas set links_extras = links_extras + p_quantidade, atualizado_em = now()
      where dono_id = v_user_id;

  else
    raise exception 'Tipo de compra desconhecido: %', p_tipo;
  end if;

  insert into public.eventos_comerciais (dono_id, email, evento, tipo, quantidade, valor, transacao)
  values (v_user_id, lower(p_email), case when p_renovacao then 'renovacao' else 'compra' end, p_tipo,
          coalesce(p_quantidade, 0), public.valor_tabela(p_tipo, p_quantidade), p_transacao);
end;
$function$;

create or replace function public.cancelar_assinatura_hotmart(p_email text, p_tipo text, p_segredo text, p_chave text default null::text, p_acesso_ate timestamp with time zone default null::timestamp with time zone)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_linha public.assinaturas_hotmart%rowtype;
  v_fim timestamptz;
begin
  perform public.verificar_segredo_webhook(p_segredo);

  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_user_id is null then
    raise exception 'Usuário com e-mail % não encontrado', p_email;
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

  -- Aviso repetido do mesmo cancelamento não conta duas vezes no painel
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
    raise exception 'Usuário com e-mail % não encontrado', p_email;
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

create or replace function public.expirar_assinaturas_hotmart(p_dono uuid default null::uuid)
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  r record;
  n integer := 0;
begin
  for r in
    select distinct h.dono_id
    from public.assinaturas_hotmart h
    where h.status = 'cancelamento_agendado' and h.acesso_ate <= now()
      and (p_dono is null or h.dono_id = p_dono)
  loop
    insert into public.eventos_comerciais (dono_id, email, evento, tipo, acesso_ate)
    select h.dono_id, lower(u.email), 'fim_de_acesso',
           case h.plano when 'Plano 79' then 'plano_79' else 'plano_99' end, h.acesso_ate
    from public.assinaturas_hotmart h left join auth.users u on u.id = h.dono_id
    where h.dono_id = r.dono_id and h.status = 'cancelamento_agendado' and h.acesso_ate <= now();

    update public.assinaturas_hotmart
      set status = 'encerrada', atualizado_em = now()
      where dono_id = r.dono_id and status = 'cancelamento_agendado' and acesso_ate <= now();
    perform public.recalcular_assinatura(r.dono_id);
    n := n + 1;
  end loop;
  return n;
end;
$function$;

-- ---------- Uso de links: agora registra a empresa ----------
drop function if exists public.incrementar_uso_link(uuid);

create or replace function public.incrementar_uso_link(p_dono_id uuid, p_empresa_id uuid default null)
 returns table(permitido boolean, links_usados integer, limite_total integer)
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_dono_real uuid;
  v_assinatura public.assinaturas%rowtype;
  v_empresa public.empresas%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_dono_id then
    raise exception 'Não autorizado';
  end if;

  v_dono_real := public.resolver_dono_id(p_dono_id);
  perform public.expirar_assinaturas_hotmart(v_dono_real);

  insert into public.assinaturas (dono_id, plano, limite_links)
  values (v_dono_real, 'Gratuito', 20)
  on conflict (dono_id) do nothing;

  select * into v_assinatura from public.assinaturas a where a.dono_id = v_dono_real for update;

  if v_assinatura.links_usados >= (v_assinatura.limite_links + v_assinatura.links_extras) then
    return query select false, v_assinatura.links_usados, (v_assinatura.limite_links + v_assinatura.links_extras);
    return;
  end if;

  update public.assinaturas a
    set links_usados = a.links_usados + 1, atualizado_em = now()
    where a.dono_id = v_dono_real;

  -- Registro para o painel master (só aceita empresa da própria conta)
  if p_empresa_id is not null then
    select * into v_empresa from public.empresas e where e.id = p_empresa_id and e.dono_id = v_dono_real;
  end if;
  insert into public.links_gerados (dono_id, empresa_id, empresa_nome)
  values (v_dono_real, v_empresa.id, v_empresa.nome_fantasia);

  return query select true, (v_assinatura.links_usados + 1), (v_assinatura.limite_links + v_assinatura.links_extras);
end;
$function$;
revoke all on function public.incrementar_uso_link(uuid, uuid) from public, anon;
grant execute on function public.incrementar_uso_link(uuid, uuid) to authenticated;

-- ---------- Painel master ----------
create or replace function public.painel_master(p_inicio timestamptz default null, p_fim timestamptz default null)
returns json language plpgsql stable security definer set search_path = public as $function$
declare
  v_ini timestamptz := coalesce(p_inicio, '2000-01-01'::timestamptz);
  v_fim timestamptz := coalesce(p_fim, now() + interval '1 day');
  v_json json;
begin
  if not public.eh_super_admin() then
    raise exception 'Acesso restrito';
  end if;

  with contas as (
    select a.dono_id, a.plano, a.links_usados, a.limite_links, a.links_extras, a.criado_em,
           lower(u.email) email,
           exists (select 1 from public.assinaturas_hotmart h where h.dono_id = a.dono_id and h.status = 'ativa') ativa,
           exists (select 1 from public.assinaturas_hotmart h where h.dono_id = a.dono_id and h.status = 'cancelamento_agendado') cancelando,
           (select max(h.acesso_ate) from public.assinaturas_hotmart h where h.dono_id = a.dono_id and h.status = 'cancelamento_agendado') acesso_ate
    from public.assinaturas a left join auth.users u on u.id = a.dono_id
    where a.plano <> 'Demonstração'
  ),
  ev as (select * from public.eventos_comerciais where criado_em >= v_ini and criado_em < v_fim),
  lk as (select * from public.links_gerados l
         where l.criado_em >= v_ini and l.criado_em < v_fim
           and coalesce((select a.plano from public.assinaturas a where a.dono_id = l.dono_id), '') <> 'Demonstração')
  select json_build_object(
    'clientes', json_build_object(
      'total', (select count(*) from contas),
      'pagantes_ativos', (select count(*) from contas where ativa or cancelando),
      'plano_79', (select count(*) from contas where (ativa or cancelando) and plano = 'Plano 79'),
      'plano_99', (select count(*) from contas where (ativa or cancelando) and plano = 'Plano 99'),
      'gratuitos', (select count(*) from contas where not ativa and not cancelando),
      'cancelamento_agendado', (select count(*) from contas where cancelando and not ativa),
      'novos_no_periodo', (select count(*) from contas where criado_em >= v_ini and criado_em < v_fim)
    ),
    'vendas', json_build_object(
      'plano_79', (select count(*) from ev where evento = 'compra' and tipo = 'plano_79'),
      'plano_99', (select count(*) from ev where evento = 'compra' and tipo = 'plano_99'),
      'renovacoes', (select count(*) from ev where evento = 'renovacao'),
      'pacotes_avulsos', (select count(*) from ev where evento = 'compra' and tipo = 'links_avulsos'),
      'links_avulsos_vendidos', (select coalesce(sum(quantidade), 0) from ev where evento = 'compra' and tipo = 'links_avulsos'),
      'cancelamentos', (select count(*) from ev where evento = 'cancelamento'),
      'reembolsos', (select count(*) from ev where evento = 'reembolso'),
      'receita_bruta', (select coalesce(sum(valor), 0) from ev where evento in ('compra', 'renovacao')),
      'reembolsado', (select coalesce(sum(valor), 0) from ev where evento = 'reembolso')
    ),
    'links_total', (select count(*) from lk),
    'links_por_empresa', coalesce((
      select json_agg(x order by x.links desc) from (
        select coalesce(l.empresa_nome, e.nome_fantasia, 'Empresa não informada') empresa,
               lower(u.email) cliente, count(*) links
        from lk l left join public.empresas e on e.id = l.empresa_id left join auth.users u on u.id = l.dono_id
        group by 1, 2
      ) x), '[]'::json),
    'movimentos', coalesce((
      select json_agg(json_build_object('data', criado_em, 'email', email, 'evento', evento, 'tipo', tipo,
                                        'quantidade', quantidade, 'valor', valor, 'acesso_ate', acesso_ate) order by criado_em desc)
      from (select * from ev order by criado_em desc limit 300) m), '[]'::json),
    'lista_clientes', coalesce((
      select json_agg(json_build_object(
        'email', c.email, 'plano', c.plano,
        'situacao', case when c.ativa then 'Ativo' when c.cancelando then 'Cancelado (acesso até o fim do período)' else 'Gratuito' end,
        'acesso_ate', c.acesso_ate,
        'empresas', (select count(*) from public.empresas e where e.dono_id = c.dono_id),
        'links_periodo', (select count(*) from lk where lk.dono_id = c.dono_id),
        'links_usados', c.links_usados, 'limite', c.limite_links + c.links_extras,
        'desde', c.criado_em) order by (c.ativa or c.cancelando) desc, c.criado_em desc)
      from contas c), '[]'::json),
    'serie', coalesce((
      select json_agg(json_build_object('dia', dia, 'links', links, 'vendas', vendas) order by dia)
      from (
        select d.dia,
               (select count(*) from lk where (lk.criado_em at time zone 'America/Sao_Paulo')::date = d.dia) links,
               (select count(*) from ev where ev.evento in ('compra', 'renovacao') and (ev.criado_em at time zone 'America/Sao_Paulo')::date = d.dia) vendas
        from (
          select distinct (criado_em at time zone 'America/Sao_Paulo')::date dia from lk
          union
          select distinct (criado_em at time zone 'America/Sao_Paulo')::date from ev
        ) d
      ) s), '[]'::json)
  ) into v_json;

  return v_json;
end;
$function$;
revoke all on function public.painel_master(timestamptz, timestamptz) from public, anon;
grant execute on function public.painel_master(timestamptz, timestamptz) to authenticated;
