-- Ajustes v47 — JÁ APLICADOS no projeto Supabase "contrateja".
-- Este arquivo serve só de registro (e para recriar o banco do zero).

-- 1) View usada pela pesquisa de saída (/saida/[id]). Sem ela a página dava 404.
create or replace view public.colaboradores_publico as
select c.id, c.nome_completo, e.nome_fantasia as empresa_nome
from public.colaboradores c
left join public.empresas e on e.id = c.empresa_id;
grant select on public.colaboradores_publico to anon, authenticated;

-- 2) Removida a leitura pública da tabela colaboradores (expunha CPF, e-mail e WhatsApp).
drop policy if exists "Leitura publica para pesquisa de saida" on public.colaboradores;

-- 3) Coluna que o código já lia (NovaEmpresaButton), mas que não existia.
alter table public.assinaturas
  add column if not exists limite_empresas integer not null default 1;

-- 4) Plano interno "Demonstração".
alter table public.assinaturas drop constraint if exists assinaturas_plano_check;
alter table public.assinaturas
  add constraint assinaturas_plano_check
  check (plano = any (array['Gratuito'::text, 'Plano 79'::text, 'Plano 99'::text, 'Demonstração'::text]));

update public.assinaturas a
set plano = 'Demonstração', limite_links = 999999, limite_empresas = 9999, atualizado_em = now()
from auth.users u
where a.dono_id = u.id and lower(u.email) = 'fabioconsultorimobi@gmail.com';

-- 5) Contador de links: a função antiga quebrava (coluna "links_usados" ambígua),
--    fazendo o app mostrar "limite atingido" para todo mundo. Agora também exige
--    que o próprio usuário logado seja o dono do contador.
create or replace function public.incrementar_uso_link(p_dono_id uuid)
returns table(permitido boolean, links_usados integer, limite_total integer)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_dono_real uuid;
  v_assinatura public.assinaturas%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_dono_id then
    raise exception 'Não autorizado';
  end if;

  v_dono_real := public.resolver_dono_id(p_dono_id);

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

  return query select true, (v_assinatura.links_usados + 1), (v_assinatura.limite_links + v_assinatura.links_extras);
end;
$function$;

revoke execute on function public.incrementar_uso_link(uuid) from public, anon;
grant execute on function public.incrementar_uso_link(uuid) to authenticated;
