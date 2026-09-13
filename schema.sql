-- ============================================================
-- ContrateJá — Schema do banco de dados (Supabase / PostgreSQL)
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- EMPRESAS
-- Um mesmo usuário (auth.users) pode ter várias empresas
-- ------------------------------------------------------------
create table empresas (
  id uuid primary key default uuid_generate_v4(),
  dono_id uuid references auth.users(id) not null,
  nome_fantasia text not null,
  segmento_principal text not null check (segmento_principal in
    ('Restaurante','Bar','Lanchonete','Padaria','Sacolão','Pizzaria')),
  logo_url text,
  criado_em timestamptz default now()
);

-- ------------------------------------------------------------
-- PERFIS DISC (gabarito por função — cadastrado uma vez, reaproveitado)
-- ------------------------------------------------------------
create table perfis_disc (
  id uuid primary key default uuid_generate_v4(),
  funcao text not null unique,
  peso_d numeric not null,
  peso_i numeric not null,
  peso_s numeric not null,
  peso_c numeric not null,
  qtd_perguntas int not null check (qtd_perguntas in (20, 30))
);

-- ------------------------------------------------------------
-- PERGUNTAS DISC
-- ------------------------------------------------------------
create table perguntas_disc (
  id uuid primary key default uuid_generate_v4(),
  perfil_disc_id uuid references perfis_disc(id) not null,
  ordem int not null,
  texto_pergunta text not null,
  opcao_d text not null,
  opcao_i text not null,
  opcao_s text not null,
  opcao_c text not null
);

-- ------------------------------------------------------------
-- VAGAS
-- ------------------------------------------------------------
create table vagas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid references empresas(id) not null,
  funcao text not null,
  perfil_disc_id uuid references perfis_disc(id) not null,
  status text not null default 'Ativa' check (status in ('Ativa','Pausada','Encerrada')),
  token_link uuid not null default uuid_generate_v4() unique,
  link_usado boolean not null default false,
  criado_em timestamptz default now()
);

-- ------------------------------------------------------------
-- CANDIDATOS
-- ------------------------------------------------------------
create table candidatos (
  id uuid primary key default uuid_generate_v4(),
  vaga_id uuid references vagas(id) not null,
  nome_completo text not null,
  email text not null,
  whatsapp text not null,
  pontuacao_d numeric,
  pontuacao_i numeric,
  pontuacao_s numeric,
  pontuacao_c numeric,
  percentual_aderencia numeric,
  recomendacao text check (recomendacao in ('Recomendado','Avaliar','Não recomendado')),
  status text not null default 'Em análise' check (status in ('Em análise','Entrevistado','Aprovado','Reprovado')),
  criado_em timestamptz default now()
);

-- ------------------------------------------------------------
-- RESPOSTAS DO CANDIDATO (auditoria — opcional mas recomendado)
-- ------------------------------------------------------------
create table respostas_candidato (
  id uuid primary key default uuid_generate_v4(),
  candidato_id uuid references candidatos(id) not null,
  pergunta_id uuid references perguntas_disc(id) not null,
  opcao_escolhida text not null check (opcao_escolhida in ('D','I','S','C'))
);

-- ------------------------------------------------------------
-- CONTROLE DE USO (para a cobrança de R$1,00 por link excedente)
-- ------------------------------------------------------------
create table uso_mensal (
  id uuid primary key default uuid_generate_v4(),
  dono_id uuid references auth.users(id) not null,
  mes_referencia date not null, -- sempre dia 1 do mês, ex: 2026-09-01
  links_gerados int not null default 0,
  unique (dono_id, mes_referencia)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — isolamento entre gestores
-- ============================================================

alter table empresas enable row level security;
alter table vagas enable row level security;
alter table candidatos enable row level security;
alter table respostas_candidato enable row level security;
alter table uso_mensal enable row level security;

-- Gestor só vê/edita as próprias empresas
create policy "Gestor gerencia suas empresas"
  on empresas for all
  using (dono_id = auth.uid());

-- Gestor só vê/edita vagas das suas empresas
create policy "Gestor gerencia vagas das suas empresas"
  on vagas for all
  using (empresa_id in (select id from empresas where dono_id = auth.uid()));

-- Acesso público (candidato sem login) só para LEITURA de vagas ativas via token
create policy "Candidato le vaga pelo token"
  on vagas for select
  using (true);

-- Gestor só vê candidatos das suas vagas
create policy "Gestor ve candidatos das suas vagas"
  on candidatos for select
  using (vaga_id in (
    select v.id from vagas v
    join empresas e on e.id = v.empresa_id
    where e.dono_id = auth.uid()
  ));

-- Gestor pode atualizar status do candidato
create policy "Gestor atualiza status do candidato"
  on candidatos for update
  using (vaga_id in (
    select v.id from vagas v
    join empresas e on e.id = v.empresa_id
    where e.dono_id = auth.uid()
  ));

-- Candidato (público, sem login) pode CRIAR seu próprio registro
create policy "Candidato publico pode se cadastrar"
  on candidatos for insert
  with check (true);

-- Uso mensal: só o dono vê o próprio consumo
create policy "Gestor ve seu uso mensal"
  on uso_mensal for all
  using (dono_id = auth.uid());

-- Perfis e perguntas DISC: leitura pública (candidato precisa ler as perguntas)
alter table perfis_disc enable row level security;
alter table perguntas_disc enable row level security;
create policy "Leitura publica de perfis" on perfis_disc for select using (true);
create policy "Leitura publica de perguntas" on perguntas_disc for select using (true);

-- ============================================================
-- FUNÇÃO: calcular aderência ao concluir o teste
-- ============================================================
create or replace function calcular_aderencia(
  p_candidato_id uuid
) returns void as $$
declare
  v_vaga_id uuid;
  v_perfil_id uuid;
  v_total int;
  v_d numeric; v_i numeric; v_s numeric; v_c numeric;
  v_peso_d numeric; v_peso_i numeric; v_peso_s numeric; v_peso_c numeric;
  v_aderencia numeric;
  v_recomendacao text;
begin
  select vaga_id into v_vaga_id from candidatos where id = p_candidato_id;
  select perfil_disc_id into v_perfil_id from vagas where id = v_vaga_id;

  select count(*) into v_total from respostas_candidato where candidato_id = p_candidato_id;

  select
    round(count(*) filter (where opcao_escolhida = 'D') * 100.0 / v_total, 1),
    round(count(*) filter (where opcao_escolhida = 'I') * 100.0 / v_total, 1),
    round(count(*) filter (where opcao_escolhida = 'S') * 100.0 / v_total, 1),
    round(count(*) filter (where opcao_escolhida = 'C') * 100.0 / v_total, 1)
  into v_d, v_i, v_s, v_c
  from respostas_candidato where candidato_id = p_candidato_id;

  select peso_d, peso_i, peso_s, peso_c into v_peso_d, v_peso_i, v_peso_s, v_peso_c
  from perfis_disc where id = v_perfil_id;

  v_aderencia := 100 - (
    (abs(v_d - v_peso_d) + abs(v_i - v_peso_i) + abs(v_s - v_peso_s) + abs(v_c - v_peso_c)) / 2
  );

  v_recomendacao := case
    when v_aderencia >= 80 then 'Recomendado'
    when v_aderencia >= 60 then 'Avaliar'
    else 'Não recomendado'
  end;

  update candidatos set
    pontuacao_d = v_d,
    pontuacao_i = v_i,
    pontuacao_s = v_s,
    pontuacao_c = v_c,
    percentual_aderencia = v_aderencia,
    recomendacao = v_recomendacao
  where id = p_candidato_id;

  update vagas set link_usado = true where id = v_vaga_id;
end;
$$ language plpgsql security definer;
