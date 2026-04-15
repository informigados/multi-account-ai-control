# Roadmap de Desenvolvimento — Multi Account AI Control (MVP)

Este roadmap foi derivado de:

- `docs/README-multi-account-ai-control.md`
- `docs/MVP-multi-account-ai-control.md`

Objetivo: iniciar um MVP local-first, modular monolith, com foco em controle operacional de multiplas contas AI com seguranca e evolucao gradual.

## 1. Direcao do Produto (resumo executivo)

- Plataforma local para gerenciar contas AI por provedor, plano, status e uso.
- Primeiro valor real: registro organizado + painel operacional + historico + backup seguro.
- Escopo MVP prioritario:
  1. autenticacao local
  2. providers CRUD
  3. accounts CRUD
  4. dashboard com filtros e cards
  5. usage manual e por importacao
  6. notas e activity log
  7. import/export e backup
  8. criptografia de dados sensiveis

## 2. Decisoes Tecnicas do MVP

- Stack base:
  1. Next.js (App Router)
  2. TypeScript
  3. Tailwind CSS
  4. shadcn/ui
  5. Prisma + SQLite
- Arquitetura:
  1. modular monolith
  2. modulos internos: `auth`, `providers`, `accounts`, `usage`, `notes`, `audit`, `imports-exports`, `settings`
- Seguranca minima obrigatoria:
  1. hash de senha (Argon2 ou bcrypt)
  2. segredo criptografado em repouso (AES-GCM via Node crypto)
  3. cookie de sessao seguro + CSRF
  4. mascaramento de campos sensiveis na UI

## 3. Fases de Execucao

## Fase 0 — Bootstrap Tecnico (Sprint 0)

Meta: deixar a base pronta para codar com velocidade e consistencia.

Entregaveis:

1. inicializacao do projeto Next.js + TypeScript
2. configuracao Tailwind + shadcn/ui
3. Prisma configurado com SQLite local
4. estrutura de pastas por feature
5. `.env.example` com chaves essenciais
6. pipeline local de qualidade (lint + typecheck)

Criterios de aceite:

1. app sobe localmente sem erro
2. migrations Prisma funcionando
3. layout base com tema claro/escuro funcional

## Fase 1 — Modelo de Dados + Seguranca Base

Meta: garantir base confiavel do dominio e seguranca.

Entregaveis:

1. schema Prisma (users, providers, accounts, usage_snapshots, notes, activity_logs, imports, app_settings)
2. seed inicial de providers (OpenAI, Gemini, Claude, Custom, Other)
3. servico de criptografia para `encrypted_secret_blob`
4. utilitarios de auditoria para eventos criticos
5. validacoes de dominio (duplicidade provider+identifier, limites de uso, timestamps)

Criterios de aceite:

1. constraints de unicidade e integridade aplicadas
2. segredo nunca persiste em texto puro
3. eventos de auditoria sao gravados em fluxos criticos

## Fase 2 — Autenticacao Local

Meta: proteger o centro de controle com login local.

Entregaveis:

1. tela de login
2. endpoint `POST /api/auth/login`
3. endpoint `POST /api/auth/logout`
4. endpoint `GET /api/auth/me`
5. sessao segura com cookie httpOnly
6. trilha de auditoria para sucesso/falha de login

Criterios de aceite:

1. usuario nao autenticado nao acessa paginas protegidas
2. login invalido nao vaza detalhes sensiveis
3. logout invalida sessao corretamente

## Fase 3 — Providers + Accounts CRUD

Meta: tornar o cadastro operacional de contas util no dia 1.

Entregaveis:

1. CRUD de providers
2. CRUD de accounts
3. modal de criar/editar conta
4. listagem de contas (card e tabela)
5. filtros por provider, status, tags e busca global
6. arquivamento de conta (`POST /api/accounts/:id/archive`)

Criterios de aceite:

1. duplicidade provider+identifier bloqueada
2. filtros funcionam em conjunto
3. campos sensiveis aparecem mascarados

## Fase 4 — Usage Tracking + Dashboard

Meta: gerar visao operacional rapida.

Entregaveis:

1. `POST /api/accounts/:id/usage` (manual)
2. `GET /api/accounts/:id/usage` e `GET /api/usage/recent`
3. cards de resumo (active/warning/exhausted/near reset)
4. barras de uso e countdown de reset
5. pagina principal de dashboard com quick actions

Criterios de aceite:

1. snapshot de uso gera historico consistente
2. percentuais e quotas validam corretamente
3. dashboard permite identificar riscos em poucos segundos

## Fase 5 — Notes + Activity Log

Meta: consolidar rastreabilidade e contexto operacional.

Entregaveis:

1. CRUD de notas por conta
2. listagem de activity logs globais e por conta
3. eventos automaticos para create/update/archive/import/export
4. marcacoes de nota (warning/operational/client ownership)

Criterios de aceite:

1. historico reflete alteracoes reais
2. metadados de evento permanecem estruturados em JSON

## Fase 6 — Import / Export + Backup

Meta: portabilidade e resiliencia local.

Entregaveis:

1. importacao CSV/JSON
2. exportacao CSV/JSON
3. backup criptografado
4. restore de backup
5. log de importacao (`imports` table)

Criterios de aceite:

1. import com relatorio de erros por linha
2. backup com segredo nao fica em plaintext
3. restore recupera dados principais sem corromper integridade

## Fase 7 — Hardening + Pronto para Empacotar

Meta: elevar confiabilidade e preparar desktop wrapper futuro.

Entregaveis:

1. idle lock screen
2. reautenticacao para revelar segredo
3. revisao de validacao server-side e CSRF
4. suite minima de testes (unitarios + integracao API critica)
5. baseline para empacotamento Tauri (sem forcar entrega final)

Criterios de aceite:

1. fluxos criticos cobertos por testes
2. sem vazamento de segredo em logs/UI/export aberto
3. aplicacao pronta para evoluir para conectores

## 4. Backlog de API (ordem de implementacao)

1. Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
2. Providers: `GET/POST/PUT/DELETE /api/providers`
3. Accounts: `GET/POST /api/accounts`, `GET/PUT/DELETE /api/accounts/:id`, `POST /api/accounts/:id/archive`
4. Usage: `GET/POST /api/accounts/:id/usage`, `GET /api/usage/recent`
5. Notes: `GET/POST /api/accounts/:id/notes`, `PUT/DELETE /api/notes/:id`
6. Logs: `GET /api/logs`, `GET /api/accounts/:id/logs`
7. Import/Export: `POST /api/import/csv`, `POST /api/import/json`, `POST /api/import/backup`, `GET /api/export/json`, `GET /api/export/csv`, `GET /api/export/backup`

## 5. Definicao de Pronto (DoD) por Feature

1. schema + migration + indexes entregues
2. validacao server-side implementada
3. evento de auditoria conectado
4. UI com estado de erro/carregamento
5. teste minimo do fluxo principal
6. documentacao curta da feature em `docs/`

## 6. Riscos e Mitigacoes

1. **Risco:** Tentar automacao completa cedo.
   Mitigacao: manter MVP em manual + import, com interface de conector apenas preparada.

2. **Risco:** Vazamento de segredo por log/UI.
   Mitigacao: mascaramento default, reveal com reauth, filtros de log e testes de seguranca.

3. **Risco:** Crescimento desorganizado.
   Mitigacao: modular monolith com fronteiras por feature e regras de ownership.

## 7. Plano de Inicio Imediato (execucao)

Sequencia recomendada para os proximos passos de implementacao:

1. criar estrutura do app (`apps/web`) e toolchain base
2. implementar schema Prisma completo e migracao inicial
3. implementar autenticacao local com sessao segura
4. entregar CRUD de providers/accounts com UI minima funcional
5. entregar dashboard inicial + update manual de usage

Quando esses 5 passos estiverem estaveis, o MVP ja passa a ter valor operacional real.

## 8. Execution Status (2026-04-11)

Completed:

1. Fase 0 (bootstrap tecnico)
2. Fase 1 base (schema, seed, crypto and audit primitives)
3. Fase 2 base (auth endpoints + login UI + session handling + admin bootstrap script)
4. Fase 3 (providers/accounts CRUD with protected pages and filters)
5. Fase 4 (usage API, dashboard metrics, reset countdown, and quick usage update)
6. Fase 5 core (notes CRUD by account, global/account logs API, audit page, and account detail workspace)
7. Fase 6 core funcional (import json/csv, export json/csv, encrypted backup export, backup restore API, and dedicated data operations page)
8. Fase 5 hardening (suite de testes de integracao para notas/logs e trilha de auditoria)
9. Fase 6 hardening (suite de testes de integracao para import/export/restore com backup criptografado)
10. Fase 7 parcial (idle lock screen, endpoint de reautenticacao e reveal seguro de segredo)
11. Fase 7 finalizada (polimento UX de fluxos criticos e baseline de empacotamento Tauri)
12. Pos-MVP hardening v2: paginacao cursor em `GET /api/accounts`, `GET /api/logs`, `GET /api/accounts/:id/logs` com suporte de UI ("Load more")
13. Pos-MVP hardening v2: migracao de `middleware` para `proxy` no Next 16 + build sem warning de deprecacao
14. Pos-MVP hardening v2: backup export em lotes (batch fetch) para reduzir risco de pico de memoria
15. Pos-MVP hardening v2: UX/a11y adicional (dialogo acessivel para delete de notas, ajustes mobile/tablet em header/accounts/data, feedback semantico)
16. Pos-MVP hardening v2: deduplicacao de tipos compartilhados (`AccountView`, `ProviderSummary`, `UsageSnapshotView`)
17. Pos-MVP hardening v2: cobertura de testes ampliada para Providers/Accounts CRUD + paginacao
18. Pos-MVP hardening v2: paginacao secundária em Notes e Usage (`/api/accounts/:id/notes`, `/api/accounts/:id/usage`, `/api/usage/recent`)
19. Pos-MVP hardening v2: skeleton loading states nos managers principais (accounts/providers/notes/audit)
20. Pos-MVP hardening v2: route-level `loading.tsx` segmentado em `/accounts`, `/accounts/:id`, `/providers`, `/audit`, `/data`
21. Pos-MVP hardening v2: filtros temporais em logs (`dateFrom`/`dateTo`) para `/api/logs` e `/api/accounts/:id/logs` + UI no viewer
22. Pos-MVP hardening v2: testes de integração para paginação de usage e filtros temporais de logs
23. Pos-MVP hardening v2: presets rápidos de período na auditoria (`Last 24h`, `Last 7d`, `Last 30d`) com limpeza de período
24. Pos-MVP hardening v2: refinamento final de acessibilidade nos managers (feedback com `role=status/alert`, loading anunciado e foco por teclado no bloco sensível)
25. Pos-MVP hardening v2: paginação cursor em `GET /api/providers` com suporte de UI ("Load more") no manager
26. Pos-MVP hardening v2: histórico operacional de importações com `GET /api/imports` (filtros + cursor) e viewer na página `/data`
27. Pós-MVP quality sweep (2026-04-12): revisão técnica completa de segurança/arquitetura/dependências + hardening de CSP e headers (`X-Frame-Options`, `Permissions-Policy`) e tratamento robusto de erro no login para banco não inicializado.
28. Pós-MVP quality sweep (2026-04-12): correção definitiva de resolução de `DATABASE_URL` SQLite em runtime Next.js para evitar divergência entre ambiente web e Prisma migrations/seeds.
29. Pós-MVP quality sweep (2026-04-12): auditoria responsiva desktop/tablet/mobile em `/`, `/providers`, `/accounts`, `/data`, `/audit`, `/settings` com eliminação de overflow horizontal em `providers` e `settings` via contenção `min-w-0` + wrappers de tabela com scroll interno.
30. Pós-MVP quality sweep (2026-04-12): internacionalização operacional PT-BR/EN concluída nos módulos críticos (`/accounts/[id]`, `/audit`, `/data`, dashboard/cards, notas, providers) com PT-BR como padrão de interface.
31. Pós-MVP quality sweep (2026-04-12): navegação mobile refeita para flyout vertical moderno (direita -> esquerda), com fechamento por `X`, clique fora e seleção de item.
32. Pós-MVP quality sweep (2026-04-12): rodapé global padronizado com ano dinâmico + assinatura "Projetado por INformigados" e link oficial.
33. Pós-MVP quality sweep (2026-04-12): página `/about` adicionada com visão institucional, atualização do sistema e seção de autores/colaboração.
34. Pós-MVP quality sweep (2026-04-12): hardening de sessão com validação estrita de assinatura do token (`verifySessionToken`) e suíte crítica 100% verde.
35. Pós-MVP quality sweep (2026-04-12): limpeza de artefatos internos para publicação (remoção de `README.md` internos em features/hooks/services/styles/desktop).
36. Pós-MVP quality sweep (2026-04-12): política de retenção de auditoria configurável em `/settings` (desativada ou 30/60/90/180/360 dias), com persistência em `app_settings` e trilha de auditoria.
37. Pós-MVP quality sweep (2026-04-12): página `/about` alinhada para produção (status "Em produção"), autores com links oficiais corretos e botão "Ver repositório" apontando para o repositório oficial.
38. Pós-MVP quality sweep (2026-04-12): remoção do botão de bloqueio manual no menu principal para reduzir ambiguidade operacional.
39. Pós-MVP quality sweep (2026-04-12): bloqueio por inatividade tornou-se configurável em `/settings` (ativar/desativar, minutos de timeout, desbloqueio com senha ou continuação de sessão sem senha).
40. Pós-MVP quality sweep (2026-04-12): admin protegido passou a poder alterar idioma para suporte a testes operacionais multilíngues.
41. Pós-MVP quality sweep (2026-04-12): recuperação de senha por e-mail implementada (`request` + `confirm`), com token seguro expirável, endpoint dedicado e suporte SMTP configurável por ambiente.
42. Pós-MVP quality sweep (2026-04-12): refinamento visual profissional com iconografia contextual em navegação e módulos-chave (`/settings`, login e menu mobile), mantendo consistência de UX.
43. Pós-MVP quality sweep (2026-04-12): correção definitiva do menu mobile (abertura/fechamento estáveis, sem overflow lateral e com comportamento consistente em viewport reduzida).
44. Pós-MVP v3 (2026-04-14): catálogo canônico de plataformas AI entregue com metadados versionados e cobertura inicial para Antigravity, Codex, Codex CLI, GitHub Copilot, Windsurf, Verdent, Kiro, Cursor, Gemini, Gemini CLI, CodeBuddy, CodeBuddy CN, Qoder, Trae, Zed, Custom e Other.
45. Pós-MVP v3 (2026-04-14): seed e APIs de providers passaram a aplicar defaults oficiais por `slug` (ícone, cor e descrição) com fallback seguro e sem quebrar personalizações existentes.
46. Pós-MVP v3 (2026-04-14): baseline de release desktop evoluído com bundle Tauri ativo para Windows (`msi` + `nsis`), preflight de `cargo tauri` e pipeline local `desktop:release` com checksums e manifesto.
47. Pós-MVP v3 (2026-04-14): seed executado com sucesso no banco local, consolidando 19 providers no catálogo operacional com iconografia/cor padronizadas.
48. Pós-MVP v3 (2026-04-14): validação prática da Fase B identificou bloqueio arquitetural de empacotamento (`Next.js SSR + API` versus expectativa de `frontendDist` estático no Tauri), formalizando próxima etapa de runtime desktop dedicado.
49. Pós-MVP v3 (2026-04-14): runtime desktop dedicado implementado para Next SSR (`desktop:prepare-runtime`), com staging de `next-runtime` + `launcher-dist` e bootstrap automático do servidor local no app Tauri.
50. Pós-MVP v3 (2026-04-14): pipeline desktop validado ponta a ponta com geração de instaladores Windows (`.msi` e `.exe`), manifest e checksums em `releases/desktop/`.
51. Pós-MVP v3 (2026-04-14): expansão inicial de i18n aplicada em domínio e UI de configurações com novos locales (`pt_PT`, `es`, `zh_CN`) e fallback operacional seguro para evitar regressão.
52. Pós-MVP v3 (2026-04-14): dicionários centrais (`shell/pages/login/idle-lock/settings`) traduzidos para `pt_PT`, `es` e `zh_CN`, com ajuste dos fluxos PT/EN legados para reconhecer também `pt_PT`.
53. Pós-MVP v3 (2026-04-14): i18n dos módulos operacionais ampliado para `es` e `zh_CN` em `accounts-manager`, `account-secret-viewer` e `data-operations-manager`, com migração do padrão legado `isPtBr` para `pickLocaleText` e validação completa (`lint`, `typecheck`, `test:critical`).
54. Pós-MVP v3 (2026-04-14): migração das páginas críticas (`/`, `/accounts`, `/accounts/[id]`, `/providers`, `/data`, `/audit`, `/settings`, `/about`) para `pickLocaleText` com cobertura `pt_PT`, `es` e `zh_CN`, removendo ramificações legadas PT/EN.
55. Pós-MVP v3 (2026-04-14): validação automatizada de i18n adicionada via suíte `test/i18n-dictionaries.unit.test.ts`, garantindo igualdade de chaves entre locales suportados e bloqueando strings vazias no pipeline de testes críticos.
56. Pós-MVP v3 (2026-04-14): hardening de backup com metadados de integridade (`metadataVersion`, `checksumAlgorithm`, `payloadChecksum`, `payloadBytes`) em export e verificação obrigatória de checksum/tamanho no restore.
57. Pós-MVP v3 (2026-04-14): redaction centralizada de metadados sensíveis em auditoria (`password`, `token`, `secret`, `apiKey`, `cookie`, `confirmPhrase`, etc.) aplicada no writer global de activity logs.
58. Pós-MVP v3 (2026-04-14): gate de conectores sensíveis implementado em Providers API com controle por role (`admin`) + confirmação explícita para conectores de alto risco (`web_automation`, `custom_script`) e trilha de auditoria para bloqueio/aprovação.
59. Pós-MVP v3 (2026-04-14): pipeline de release desktop reforçado com gate de vulnerabilidades (`npm audit` high/critical + `cargo audit --json`) via `npm run security:audit`, integrado ao `desktop:release` e validado no `desktop:preflight`, com warnings de advisories rastreados em log e bloqueio apenas para vulnerabilidades confirmadas.

In progress:

1. Nenhum item pendente do MVP base.
2. Evolucoes pos-MVP em andamento: conectores automatizados, i18n completo por modulo e automacoes avancadas.

Checklist consolidado do roadmap:

- [x] Fase 0 — Bootstrap Tecnico
- [x] Fase 1 — Modelo de Dados + Seguranca Base
- [x] Fase 2 — Autenticacao Local
- [x] Fase 3 — Providers + Accounts CRUD
- [x] Fase 4 — Usage Tracking + Dashboard
- [x] Fase 5 — Notes + Activity Log
- [x] Fase 6 — Import / Export + Backup
- [x] Fase 7 — Hardening + Pronto para Empacotar
- [ ] Evolucao pos-MVP: conectores automatizados
- [x] Evolucao pos-MVP: release desktop final
- [ ] Evolucao pos-MVP: automacoes avancadas

Detailed status (feito vs pendente):

1. Fase 5: feito = CRUD de notas, logs globais/por conta, pagina `/audit`, pagina de detalhe por conta com notas/timeline, testes de integracao e UX refinada para erro/empty state + retry.
2. Fase 5: pendente = nenhum item critico do MVP.
3. Fase 6: feito = import JSON/CSV, export JSON/CSV, backup criptografado, restore com `dryRun` + confirmacao explicita, testes de integracao e UX refinada para feedback operacional.
4. Fase 6: pendente = nenhum item critico do MVP.
5. Fase 7: feito = validacao CSRF server-side em todos endpoints mutaveis + suite minima de testes (unitarios e integracao API critica) + idle lock screen (agora configuravel por politicas de inatividade) + reveal de segredo com reautenticacao + baseline Tauri.
6. Fase 7: pendente = nenhum item critico do MVP.
7. Pos-MVP hardening v2: feito = paginacao cursor para consultas operacionais pesadas (accounts/logs), resiliencia adicional no backup export, proxy auth gating no App Router, melhorias de acessibilidade para fluxos destrutivos e novos testes de CRUD para providers/accounts.
8. Pos-MVP hardening v2: pendente = avanço para conectores/automação.

Notes:

1. Prisma migration SQL was generated and added in `prisma/migrations/20260411113000_init/migration.sql`.
2. In this environment, `prisma migrate dev` / `prisma db push` can fail due schema engine execution restrictions; the critical test runner applies migration SQL directly via Prisma Client raw SQL execution.
3. New quality command: `npm run test:critical` (isolated SQLite test DB + critical API test suite).
4. Desktop baseline command: `npm run desktop:preflight` (checks Tauri scaffold and Rust toolchain availability).

## 9. Analise comparativa externa (2026-04-14) - cockpit-tools

Fontes de referencia analisadas:

1. `https://github.com/jlcodes99/cockpit-tools/blob/main/README.en.md`
2. `https://github.com/jlcodes99/cockpit-tools/`
3. `https://github.com/jlcodes99/cockpit-tools/blob/main/CHANGELOG.md`

Pontos fortes observados no projeto de referencia:

1. cobertura ampla de plataformas/IDEs com estados operacionais por provedor
2. empacotamento desktop maduro (Windows/macOS/Linux) e fluxo de distribuicao
3. i18n extensa com varias linguas e cobertura de UX
4. foco local-first com guias operacionais de seguranca e configuracao
5. cadencia de releases com ajuste rapido de estabilidade e UX

Decisao tecnica para o nosso produto (adotar vs adaptar vs evitar):

1. adotar agora: catalogo oficial de provedores com iconografia padrao, pipeline de release instalavel, i18n escalavel, UX responsiva orientada a operacao
2. adaptar com cautela: automacoes por provedor, refresh por plataforma, diagnostico/preflight por conector
3. evitar no curto prazo: escrita/injecao automatica de tokens em clientes de terceiros sem camada robusta de permissao/auditoria e validacao juridica de ToS

## 10. Roadmap pos-MVP v3 (executavel + i18n + ecosistema de IDEs AI)

Objetivo do v3:

1. tornar o sistema mais completo para operacao multi-plataforma
2. entregar distribuicao simples para usuario final (baixar/instalar/atualizar)
3. ampliar idiomas sem perder consistencia visual, tecnica e de seguranca

### Fase A - Catalogo oficial de plataformas e iconografia

Escopo:

1. criar um registro canonico de plataformas (`provider catalog`) com metadados versionados:

   `slug`, `displayName`, `officialSite`, `iconAsset`, `brandColor`, `connectorCapabilities`, `status`

2. incluir suporte inicial organizado para:

   Antigravity, Codex, Codex CLI, GitHub Copilot, Windsurf, Verdent, Kiro, Cursor, Gemini, Gemini CLI, CodeBuddy, CodeBuddy CN, Qoder, Trae, Zed e "Custom"

3. padronizar uso de icones oficiais com fallback local seguro:

   `apps/web/public/providers/*` + validacao de formato/tamanho + fallback para icone neutro

4. atualizar tela de providers e listas relacionadas para exibir icones/cores de forma consistente
5. manter trilha de auditoria para mudancas de catalogo (ativacao/desativacao, edicao de metadados)

Criterios de aceite:

1. todos os provedores do catalogo aparecem com icone e nome padrao
2. nenhum layout quebra em mobile/tablet/desktop ao exibir icones
3. import/export preserva `provider slug` canonico sem ambiguidade

### Fase B - Release desktop instalavel (download e instalacao simples)

Escopo:

1. ativar bundle Tauri para distribuicao (`bundle.active=true`) com alvo inicial Windows
2. gerar artefatos de release por versao com nomenclatura padrao:

   `.msi` (principal) e `.exe` (alternativo)

3. preparar assinatura de build (code-signing) via variaveis de ambiente de CI
4. criar pipeline de release:

   `build -> testes criticos -> empacotamento -> checksum -> publicacao`

5. documentar fluxo de instalacao, upgrade e rollback em `docs/TAURI-BASELINE.md` e README principal
6. preparar suporte posterior para macOS/Linux apos estabilidade do canal Windows

Criterios de aceite:

1. usuario instala por instalador sem passos manuais de desenvolvimento
2. upgrade de versao nao perde banco local nem configuracoes
3. build de release bloqueia publicacao se testes criticos falharem

### Fase C - Internacionalizacao expandida (base para multiplos mercados)

Escopo:

1. expandir `UserLocale`/`AppLocale` para:

   `pt_BR`, `pt_PT`, `en`, `es`, `zh_CN` (base inicial), mantendo fallback padrao seguro

2. separar dicionarios por modulo/arquivo para reduzir risco de regressao e facilitar revisao
3. cobrir primeiro os fluxos criticos:

   login, dashboard, providers, accounts, data, audit, settings, about

4. adicionar validacao automatizada de chaves i18n no CI (detectar chave ausente ou divergente)
5. padronizar rotulos de idioma na UI (ex.: "Portugues (Portugal)", "Espanol", "Chinese (Simplified)")

Criterios de aceite:

1. usuario consegue alternar idioma sem strings quebradas/mistas
2. nenhuma chave i18n faltante passa no pipeline
3. idioma salvo por usuario persiste apos logout/login

### Fase D - Hardening de seguranca para escala operacional

Escopo:

1. adicionar permissao explicita para acoes sensiveis futuras de conectores (gates por role + confirmacao)
2. reforcar politica de redacao de segredo/token em logs de API/import/export
3. introduzir verificacao de integridade de backup (checksum + metadata version)
4. adicionar trilhas de auditoria para eventos de release/configuracao de conectores
5. incluir verificacoes de dependencia e vulnerabilidade no pipeline de release desktop

Criterios de aceite:

1. segredos nao aparecem em logs, erros e payloads de auditoria
2. backup invalido/corrompido e detectado antes de restore
3. eventos de seguranca relevantes ficam rastreaveis por usuario e timestamp

### Fase E - Modernizacao visual e responsividade final

Escopo:

1. consolidar design tokens (cores, tipografia, espacamento, densidade) para identidade visual moderna e consistente
2. aplicar iconografia de provedores em dashboard/cards/listagens com hierarquia visual clara
3. revisar componentes criticos para responsividade real:

   header, tabelas com overflow controlado, formularios em grid adaptativo, dialogs

4. reforcar acessibilidade (foco, contraste, rotulos, estados `aria`)

Criterios de aceite:

1. navegacao principal e operavel em mobile, tablet e desktop sem overflow critico
2. score de acessibilidade interno sem regressao nos fluxos chave
3. UX visual consistente entre paginas principais

## 11. Ordem de execucao recomendada (v3)

1. Fase A (catalogo + icones) - desbloqueia consistencia funcional e visual
2. Fase C (i18n expandida) - evita retrabalho de texto durante modernizacao de UI
3. Fase B (release instalavel) - entrega valor de distribuicao apos estabilizar catalogo/i18n
4. Fase D (hardening) - fecha riscos antes de escala de usuarios
5. Fase E (modernizacao final) - refinamento visual com base funcional estabilizada

## 12. Checklist consolidado do v3

- [x] v3/Fase A: catalogo oficial de plataformas AI + icones oficiais/fallback
- [x] v3/Fase B: instalador Windows (`.msi`/`.exe`) com pipeline de release
- [x] v3/Fase C: novos idiomas (`pt_PT`, `es`, `zh_CN`) com validacao automatizada
- [x] v3/Fase D: hardening extra (redacao de segredos, integridade de backup, gates sensiveis)
- [x] v3/Fase E: modernizacao visual responsiva e acessibilidade final (design tokens parcial)
- [x] v4/Fase F: importacao local de sessao + conectores Rust (desktop)
- [ ] v4/Fase F: alertas nativos do SO (tauri-plugin-notification)
- [ ] v4/Fase F: backup agendado automatico
- [ ] v4/Fase F: TOTP / 2FA Manager

---

## 15. Status de Execucao Fase F (2026-04-15)

### F.1 - Leitura local de sessao (Tauri connectors Rust)

- [x] Estrutura base (`desktop/tauri/src-tauri/src/connectors.rs`)
- [x] Conector Gemini CLI (`~/.gemini/oauth_creds.json`)
- [x] Conector Codex CLI (`~/.codex/auth.json`)
- [x] Conector Zed (`~/.config/zed/accounts.json` / `Library/Application Support/Zed`)
- [x] Conector Cursor (`state.vscdb` SQLite; requer feature `sqlite` para leitura real)
- [x] Comando Tauri `detect_local_accounts` registrado em `main.rs`
- [x] UI: `LocalImportDialog` com graceful fallback em modo web
- [x] Cursor: placeholder quando feature sqlite nao ativada (evita falha silenciosa)
- [ ] Conector GitHub Copilot (safe-storage criptografado, complexidade alta)
- [ ] Conector Windsurf (similar a Cursor, requer analise do path exato)
- [x] Feature `sqlite` ativada no Cargo.toml para Cursor leitura real do vscdb
- [ ] Leitura de multiplas contas por provedor (ex: varios perfis Zed)
- [ ] Persistir token detectado de forma segura (criptografado no banco)

### F.2 - Auto-refresh de cota por provedor

- [x] Hook `useAccountsAutoRefresh` com polling em background
- [x] Intervalo configuravel via `AppSetting` (`quota-config`)
- [x] Indicador de `ultima atualizacao` nos cards
- [x] API `GET/POST /api/settings/quota-config`
- [x] Pagina de Settings com UI para configurar intervalo de refresh e limiar de alerta
- [ ] Chamada real de API por provedor (cada provedor tem endpoint diferente)
  - Gemini: `https://generativelanguage.googleapis.com/` (autenticacao OAuth)
  - Codex / OpenAI: nao tem endpoint de quota oficial publico
  - Cursor/Windsurf/Zed: sem API de quota publica documentada
- [ ] Salvar snapshot automatico no banco a cada ciclo de polling

### F.3 - Alertas de cota

- [x] Componente `QuotaAlertBanner` in-app com limiar configuravel
- [x] Limiar salvo em `AppSetting` (`quota-config.alertThresholdPercent`)
- [x] Registro do evento `quota_alert` no `activity_log` via `POST /api/usage/quota-alert`
- [ ] Notificacao nativa do SO via `tauri-plugin-notification` (requer Tauri desktop)
- [ ] Config de alerta por provedor individual (nao apenas global)

### F.4 - Operacoes em lote

- [x] Checkbox de selecao multi-conta nos cards
- [x] Checkbox de selecao multi-conta na tabela
- [x] `BulkActionToolbar` flutuante com acoes: Arquivar, Excluir, Exportar, Mover para grupo
- [x] API `POST /api/accounts/bulk` (archive + delete)
- [x] Confirmacao explicita para acoes destrutivas
- [x] Exportar selecionados como JSON (`exportSelectedAsJson`)
- [x] Operacao em lote: Mover entre grupos (`executeBulkMoveToGroup`)
- [x] Operacao em lote em modo tabela (toolbar flutuante aparece em cards E tabela)

### F.5 - Grupos de contas

- [x] CRUD de grupos (`GET/POST /api/settings/account-groups`)
- [x] Endpoint por ID (`PATCH/DELETE /api/settings/account-groups/[id]`)
- [x] Componente `AccountGroupsManager`
- [x] Filtro por grupo na listagem principal
- [x] Persistencia em `AppSetting` com JSON
- [x] Mover contas entre grupos via UI (dropdown no form de edicao da conta)
- [x] Limite de grupos configuravel via `GET/POST /api/settings/groups-config` + UI em Settings

### F.6 - Backup Manager (agendador)

- [x] `GET/POST/DELETE /api/export/backup/schedule` — lista, salva e remove backups em AppSetting
- [x] Componente `BackupManager` premium integrado no painel `/data`
- [x] Listagem de backups com data/tamanho/checksum + badge LATEST
- [x] Botao de download e exclusao por entrada
- [ ] Background job agendado (1 backup/dia) — requer Tauri daemon
- [ ] Retencao configuravel (7/14/30 dias) com expurgo automatico
- [ ] Botao de restore a partir de backup salvo (carregar payload no campo de restauracao)
- Nota: agendamento automatico requer Tauri para rodar como daemon (nao funciona em modo web)

### F.7 - 2FA / TOTP Manager

- [x] API `GET/POST /api/totp` — lista e cria entradas TOTP
- [x] API `PATCH/DELETE /api/totp/[id]` — editar/remover entrada
- [x] API `GET /api/totp/[id]/code` — gerar codigo OTP atual + remainingSeconds
- [x] Geracao RFC 6238 (HMAC-SHA1) sem biblioteca externa via Web Crypto API
- [x] Armazenamento Base32 normalizado (segredo via `encryptSecret`)
- [x] Interface premium: countdown ring SVG, formato `123 456`, copy-with-feedback, favoritos, busca, skeleton
- [ ] Importar/Exportar registros TOTP como JSON criptografado (fase futura)
- Nota: esta fase funciona em modo web (nao requer Tauri)

---

## 16. O que ainda falta para o sistema estar "completo" (priorizado)

### Prioridade ALTA (bloqueia experiencia completa)

1. ~~**Settings UI para quota-config**~~ — ✅ Implementado. UI em `/settings` para configurar `refreshIntervalMinutes` e `alertThresholdPercent`.

2. ~~**Feature sqlite no Cargo.toml**~~ — ✅ Implementado. `default = ["sqlite"]` ativa leitura real do `state.vscdb`.

3. **Fase E: modernizacao visual final** — 🔄 Parcial. Design tokens (sombras, duracoes, escala tipografica, z-index) adicionados em `globals.css`. Falta consolidar componentes para usar as variaveis.

4. **Providers em `/settings`** — a tela de Settings ainda nao tem secao para configurar quota-config por provedor individualmente.

### Prioridade MEDIA (melhora funcionalidade)

5. ~~**Mover contas entre grupos via UI**~~ — ✅ Implementado. Dropdown `Grupo` aparece no form de edicao da conta.

6. **Unarchive via API dedicada** — o botao `Desarquivar` usa `/api/accounts/:id` com `PUT { status: "active" }`. Validar que o endpoint aceita esse payload (pode precisar de tratamento especial para contas arquivadas).

7. **Tauri notification plugin** — registrar `tauri-plugin-notification` no `Cargo.toml` e `main.rs` para habilitar alertas nativos do SO quando cota ultrapassa o limiar.

8. **Conector GitHub Copilot e Windsurf** — os caminhos de sessao sao diferentes e requerem analise. Copilot usa safe-storage (criptografado pelo SO), o que pode exigir permissoes extras.

### Prioridade BAIXA (evolucao futura)

9. **F.6 Backup Manager agendado** — requer Tauri com acesso ao sistema de arquivos e um daemon em background.

10. **F.7 TOTP Manager** — pode ser implementado em web (nao requer Tauri). Valor operacional real para usuarios com 2FA em multiplas contas.

11. **Leitura de multiplas sessoes por provedor** — hoje cada conector retorna apenas a primeira conta detectada. Evoluir para retornar uma lista e o usuario escolher qual importar.

12. **Viewer de logs em tempo real** — tail do arquivo de log do app (Tauri only).

13. **macOS e Linux** — o pipeline desktop atual e apenas Windows. Adicionar targets em `tauri.conf.json` apos estabilidade do canal Windows.

---

## 13. Analise comparativa cockpit-tools v2 (2026-04-15)

### 13.1 O sistema atual consegue importar contas logadas no app local (Zed, Cursor etc.)?

Resposta direta: NAO, ainda nao.

O sistema atual possui dois modos de adicao de conta:

1. Cadastro manual: o usuario preenche identifier/display name/plan manualmente.
2. Importar JSON: o usuario cola um JSON com os campos da conta.

O que falta (e que o cockpit-tools chama de "local import"):

Leitura dos arquivos de sessao/credencial que os proprios clientes AI deixam no disco local.
Cada provedor tem um caminho canonico diferente:

| Provedor | Arquivo local (exemplo) | Sistema operacional |
|---|---|---|
| Zed | ~/.config/zed/accounts.json | Linux/macOS |
| Cursor | %APPDATA%\Cursor\User\globalStorage\state.vscdb (SQLite) | Windows |
| Gemini CLI | ~/.gemini/oauth_creds.json | Todos |
| GitHub Copilot | VS Code state.vscdb -> github.auth (criptografado) | Todos |
| Windsurf | Similar ao VS Code (safe-storage / Firebase JWT) | Todos |
| Codex | ~/.codex/auth.json | Todos |

Isso requer acesso ao sistema de arquivos local, o que:

- Numa app web pura (Next.js rodando no servidor): e IMPOSSIVEL. O servidor nao ve o disco do usuario.
- Numa app desktop Tauri: e PLENAMENTE VIAVEL. O runtime Rust tem acesso ao FS local.

Conclusao tecnica: A importacao local de sessao e uma funcionalidade de aplicativo desktop, nao web.
O caminho correto e implementa-la na Fase F como um comando Tauri nativo, disponivel apenas quando
o usuario roda o executavel desktop (.msi/.exe).

### 13.2 Funcionalidades do cockpit-tools a adotar no nosso roadmap

Classificacao por prioridade e viabilidade:

Adotar agora (alto valor, viavel):

| Funcionalidade | Status cockpit-tools | Destino |
|---|---|---|
| Importacao local de sessao por provedor | Core feature | Fase F (Tauri) |
| Alertas de cota (notificacao quando % ultrapassa limiar) | Implementado | Fase F |
| Auto-refresh de cota por provedor (intervalo configuravel) | Implementado | Fase F |
| Grupos de contas (pastas editaveis) | Implementado | Fase F |
| Operacoes em lote (select multiplas > deletar/exportar/mover) | Implementado | Fase F |
| Backup Manager agendado (1 backup/dia, retencao configuravel) | Implementado | Fase F |
| Ordenacao persistente de contas | Implementado | Melhoria pontual |
| Multi-select em filtro de plano | Implementado | UX simples |
| Viewer de logs em tempo real (tail app.log) | Implementado | Fase F (desktop) |

Adaptar com cautela (valor alto, complexidade elevada):

| Funcionalidade | Risco / Observacao |
|---|---|
| OAuth flow no app (browser embutido, redirect capture) | Requer Tauri WebView + port listener local. Nao funciona em web pura. |
| Injecao de credencial no cliente (escrever auth.json de volta) | Alto risco legal (ToS). Requer gate de confirmacao + auditoria. |
| Wake-up tasks (agendar chamadas para acordar quota) | Depende de APIs nao-oficiais. Avaliar por provedor. |
| Multi-instance (janelas isoladas com contas diferentes) | Depende de Tauri isolatedProfiles. Alta complexidade. |
| 2FA / TOTP Manager (segredos Base32, OTP codes) | Pode ser feito em web. Requer cripto forte no armazenamento. |
| Floating account card (card flutuante na area de trabalho) | Exclusivo de desktop. Interessante para v4+. |

Evitar no curto prazo:

| Funcionalidade | Motivo |
|---|---|
| Injecao automatica de token sem confirmacao | Risco legal (ToS dos provedores) + seguranca |
| Device fingerprints | Fora do escopo do produto. |
| Acesso a keychains do SO (Keychain, Credential Store) | Requer code-signing + permissoes avancadas de SO. |

---

## 14. Fase F - Conectores Desktop e Importacao Local de Sessao (v4)

### Objetivo

Transformar o sistema de um gerenciador de cadastro manual em uma ferramenta que
le automaticamente as contas ja logadas na maquina do usuario,
disponivel no app desktop Tauri.

### F.1 - Leitura local de sessao por provedor (Tauri only)

Para cada provedor suportado, implementar um comando Tauri em Rust que:

1. Detecta o caminho canonico do arquivo de sessao na maquina local
2. Le e parseia o arquivo (JSON, TOML, SQLite, etc.)
3. Retorna os dados de conta detectados (identifier, token mascarado, plan, etc.)
4. Permite o usuario confirmar/editar antes de salvar no nosso banco

Provedores de primeira linha:

| Provedor | Arquivo | Formato |
|---|---|---|
| Gemini CLI | ~/.gemini/oauth_creds.json | JSON |
| Zed | ~/.config/zed/accounts.json (Linux) / ~/Library/... (macOS) | JSON |
| Cursor | %APPDATA%\Cursor\User\globalStorage\state.vscdb | SQLite |
| GitHub Copilot | state.vscdb -> chave github.auth (safe-storage) | Binario/JSON |
| Windsurf | Similar Cursor/VS Code | SQLite |
| Codex | ~/.codex/auth.json | JSON |

### F.2 - Auto-refresh de cota por provedor (intervalo configuravel)

- Por provider, definir intervalo de refresh (1 min / 5 min / 10 min) em /settings
- Background job que chama as APIs oficiais de quota de cada provedor
- Salva snapshot de uso no banco (tabela usage_snapshots)
- UI: indicador de "ultima atualizacao" e loading inline no card

### F.3 - Alertas de cota (notificacao nativa)

- Limiar configuravel por provedor (ex: > 80% usado)
- Notificacao nativa do SO (via Tauri notification plugin)
- Registro no activity_log como evento quota_alert
- UI: badge de alerta no card do dashboard

### F.4 - Operacoes em lote nas contas

- Checkbox de selecao multi-conta nas views card e tabela
- Acoes em lote: Arquivar selecionadas, Excluir selecionadas, Exportar selecionadas
- Barra de acoes flutuante que aparece quando ha itens selecionados
- Confirmacao explicita para acoes destrutivas em lote

### F.5 - Grupos de contas

- Criar grupos/pastas por nome (ex: "Trabalho / Personal / Testes")
- Mover contas entre grupos
- Filtrar lista por grupo
- Persistir em AppSetting com JSON de estrutura de grupos

### F.6 - Backup Manager (scheduler)

- Executar 1 backup criptografado por dia automaticamente
- Retencao configuravel (7 / 14 / 30 dias)
- Listagem de backups com data/tamanho + botao de restore e exclusao
- Integrar ao painel /data existente

### F.7 - 2FA / TOTP Manager

- Armazenar segredos TOTP (Base32) no banco criptografado com AES-256-GCM
- Gerar codigos OTP de 6 digitos com countdown de 30s
- Interface: lista de registros, favoritos, copiar codigo
- Importar/Exportar registros como JSON criptografado

### Criterios de Aceite (Fase F)

1. Usuario clica "Importar sessao local" e ve as contas detectadas na maquina
2. Refresh automatico de cota roda em background sem travar a UI
3. Alerta de cota dispara notificacao nativa e registra no log de auditoria
4. Operacoes em lote funcionam com confirmacao e sem perda de dados
5. Backup automatico roda silenciosamente e e listado no painel /data
6. Codigo TOTP gerado esta correto e sincronizado com relogio do sistema

### Pre-requisitos

- Tauri desktop instalado e em execucao (nao funciona em modo web puro)
- Plugin tauri-plugin-fs para leitura de FS local
- Plugin tauri-plugin-notification para alertas nativos
- Cada conector de provedor requer documentacao/analise dos ToS antes de implementacao


