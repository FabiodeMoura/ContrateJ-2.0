# ContrateJá

Sistema de avaliação comportamental (DISC) para contratação em restaurantes,
bares, lanchonetes, padarias, sacolões e pizzarias.

## Stack

- **Next.js 14** (App Router) — frontend + rotas de API
- **Supabase** — banco de dados PostgreSQL, autenticação e Row Level Security
- **Tailwind CSS** — estilização responsiva (funciona igual em PC e celular)
- **Vercel ou Render** — hospedagem

---

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto (gratuito pra começar)
2. Vá em **SQL Editor** e rode, nesta ordem:
   - o conteúdo de `supabase/schema.sql`
   - o conteúdo de `supabase/seed_perfis_disc.sql`
3. Vá em **Project Settings → API** e copie:
   - `Project URL`
   - `anon public key`

### 2. Configurar o projeto localmente
```bash
# instalar dependências
npm install

# copiar o arquivo de variáveis de ambiente
cp .env.example .env.local
```
Abra `.env.local` e cole a URL e a chave do Supabase que você copiou.

```bash
# rodar localmente
npm run dev
```
Acesse `http://localhost:3000/login` para testar.

### 3. Subir o código pro GitHub
```bash
git init
git add .
git commit -m "Primeira versão do ContrateJá"
# crie um repositório vazio no GitHub e depois:
git remote add origin https://github.com/SEU-USUARIO/contrateja.git
git push -u origin main
```

### 4. Publicar (deploy)
**Opção A — Vercel (mais simples para Next.js):**
1. Acesse [vercel.com](https://vercel.com), conecte sua conta do GitHub
2. Importe o repositório `contrateja`
3. Em "Environment Variables", adicione as mesmas duas variáveis do `.env.local`
4. Clique em Deploy

**Opção B — Render:**
1. Acesse [render.com](https://render.com), crie um "Web Service"
2. Conecte o repositório do GitHub
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Adicione as variáveis de ambiente na aba "Environment"

### 5. Importar as perguntas DISC
As 20-30 perguntas de cada uma das 22 funções (que já criamos nos arquivos
`.md` anteriores) precisam ser inseridas na tabela `perguntas_disc`, vinculadas
ao `perfil_disc_id` correspondente (que já foi criado pelo seed). Isso pode
ser feito:
- manualmente pelo painel do Supabase (Table Editor), ou
- por um script simples de importação (posso gerar esse script quando as
  perguntas estiverem prontas pra importar)

---

## Estrutura de pastas

```
src/
  app/
    login/              → tela de login/cadastro do gestor
    dashboard/           → painel principal (protegido)
    segmento/[slug]/     → lista de funções de um segmento
    vagas/                → lista geral de vagas
    candidatos/           → lista geral de candidatos
    relatorios/           → funil, aderência por função
    avaliar/[token]/      → tela pública: candidato preenche dados
    quiz/[token]/         → tela pública: perguntas DISC
    resultado/[token]/    → tela pública: resultado do candidato
  lib/
    supabaseClient.ts     → cliente Supabase (browser)
    supabaseServer.ts     → cliente Supabase (servidor)
    discCalculo.ts        → lógica de cálculo de aderência (referência)
supabase/
  schema.sql              → todas as tabelas + Row Level Security
  seed_perfis_disc.sql     → pesos ideais (D/I/S/C) das 22 funções
```

## Responsividade

Todo o layout foi construído com Tailwind CSS usando classes utilitárias
responsivas (`sm:`, `md:`), então as mesmas páginas se adaptam automaticamente
entre celular e desktop — não é necessário manter versões separadas.

## Páginas ainda a implementar (próximos passos)

- `segmento/[slug]` — lista de funções com botão "Gerar link"
- `vagas` — lista + seletor de empresas
- `candidatos` — lista + exportação Excel + mudança de status
- `relatorios` — funil e gráficos de aderência

O design de todas essas telas já foi validado nas etapas anteriores do
projeto — esses arquivos seguem a mesma estrutura de dados já implementada
(`empresas`, `vagas`, `candidatos`).
