-- ============================================================
-- ContrateJá — Seed dos Perfis DISC (pesos ideais por função)
-- Rode este script depois do schema.sql
-- ============================================================

insert into perfis_disc (funcao, peso_d, peso_i, peso_s, peso_c, qtd_perguntas) values
('Garçom', 15, 40, 30, 15, 20),
('Cozinheiro', 20, 10, 30, 40, 20),
('Auxiliar de Cozinha', 15, 10, 35, 40, 20),
('Gerente', 35, 25, 15, 25, 30),
('Subgerente', 25, 20, 25, 30, 30),
('Supervisor de Operações', 30, 20, 20, 30, 30),
('Caixa', 10, 20, 25, 45, 20),
('Recepcionista', 10, 45, 30, 15, 20),
('Bartender', 20, 40, 25, 15, 20),
('Segurança', 35, 15, 30, 20, 20),
('Atendente', 15, 35, 30, 20, 20),
('Chapeiro', 20, 10, 30, 40, 20),
('Motoboy/Entregador', 25, 20, 30, 25, 20),
('Padeiro', 15, 10, 35, 40, 20),
('Confeiteiro', 15, 15, 30, 40, 20),
('Atendente/Repositor', 20, 15, 35, 30, 20),
('Repositor', 20, 10, 35, 35, 20),
('Açougueiro', 15, 10, 30, 45, 20),
('Motorista', 25, 15, 30, 30, 20),
('Pizzaiolo', 20, 10, 30, 40, 20),
('Serviços Gerais', 15, 10, 40, 35, 20),
('Financeiro', 15, 10, 25, 50, 20),
('Analista Fiscal', 15, 5, 25, 55, 20);

-- Nota: as perguntas (perguntas_disc) de cada perfil devem ser importadas
-- a partir dos arquivos .md gerados na etapa de conteúdo (20 ou 30 por função).
-- Um script de importação em Node/Python pode ler os .md e popular esta tabela.
