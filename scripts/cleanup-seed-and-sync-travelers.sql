-- Rotina de limpeza única (rodar uma vez, no banco real) para:
--
--   1) remover os dados fixos do seed de testes automatizados (CI) que
--      foram parar no ambiente real -- o serviço "migrate" do compose.yaml
--      rodava "pnpm db:seed" toda vez que o stack subia, e esse script foi
--      corrigido para não fazer mais isso (ver patch do compose.yaml);
--   2) deduplicar os tipos de manutenção;
--   3) deduplicar o cadastro de viajantes/condutores e sincronizá-lo com
--      o cadastro de usuários (um viajante por usuário com perfil
--      "traveler" ou "traveler_approver").
--
-- Como rodar (a partir do host, com o compose no ar):
--   docker compose cp scripts/cleanup-seed-and-sync-travelers.sql postgres:/tmp/cleanup.sql
--   docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/cleanup.sql
--
-- (ajuste $POSTGRES_USER/$POSTGRES_DB se não estiverem exportados no shell
-- -- os valores padrão do compose.yaml são "controle" e "controle_viagens").
--
-- É seguro rodar mais de uma vez: cada bloco só age se ainda houver algo
-- para corrigir, e nada é removido se tiver viagem/reserva real vinculada
-- -- nesse caso o bloco avisa (RAISE NOTICE) e pula, sem interromper o
-- resto do script. Acompanhe as mensagens NOTICE na saída do psql.

BEGIN;

-- 1) Veículo fixo do seed de CI (placa ABC1D23, "Toyota Corolla") -------
DO $$
DECLARE
  v_id bigint;
  v_refs int;
BEGIN
  SELECT id INTO v_id FROM vehicles WHERE plate = 'ABC1D23';
  IF v_id IS NULL THEN
    RAISE NOTICE '[veiculo] placa ABC1D23 não encontrada, nada a fazer.';
  ELSE
    SELECT count(*) INTO v_refs FROM (
      SELECT 1 FROM fleet_reservations WHERE vehicle_id = v_id
      UNION ALL
      SELECT 1 FROM fleet_work_orders WHERE vehicle_id = v_id
    ) refs;
    IF v_refs > 0 THEN
      RAISE NOTICE '[veiculo] placa ABC1D23 (id %) tem % vínculo(s) real(is) -- NÃO removida, revise manualmente.', v_id, v_refs;
    ELSE
      DELETE FROM vehicles WHERE id = v_id;
      RAISE NOTICE '[veiculo] placa ABC1D23 (id %) removida (sem vínculos).', v_id;
    END IF;
  END IF;
END $$;

-- 2) Viajante fixo do seed de CI ("Viajante Teste CI") -------------------
-- (roda antes da limpeza de unidades abaixo -- esse viajante de teste é
-- justamente quem estava "segurando" a Unidade São Paulo/Curitiba como se
-- fosse um vínculo real)
DO $$
DECLARE
  t_id bigint;
  refs int;
BEGIN
  SELECT id INTO t_id FROM travelers WHERE name = 'Viajante Teste CI';
  IF t_id IS NULL THEN
    RAISE NOTICE '[viajante-teste] "Viajante Teste CI" não encontrado, nada a fazer.';
  ELSE
    SELECT count(*) INTO refs FROM (
      SELECT 1 FROM trips WHERE traveler_id = t_id
      UNION ALL
      SELECT 1 FROM fleet_reservations WHERE driver_id = t_id
    ) r;
    IF refs > 0 THEN
      RAISE NOTICE '[viajante-teste] "Viajante Teste CI" (id %) tem % vínculo(s) real(is) -- NÃO removido, revise manualmente.', t_id, refs;
    ELSE
      DELETE FROM travelers WHERE id = t_id;
      RAISE NOTICE '[viajante-teste] "Viajante Teste CI" (id %) removido (sem vínculos).', t_id;
    END IF;
  END IF;
END $$;

-- 3) Unidades fixas do seed de CI ----------------------------------------
DO $$
DECLARE
  u RECORD;
  refs int;
BEGIN
  FOR u IN SELECT id, name FROM units WHERE name IN ('Unidade São Paulo', 'Unidade Curitiba') LOOP
    SELECT count(*) INTO refs FROM (
      SELECT 1 FROM vehicles WHERE unit_id = u.id
      UNION ALL
      SELECT 1 FROM travelers WHERE unit_id = u.id
      UNION ALL
      SELECT 1 FROM trips WHERE unit_id = u.id
    ) r;
    IF refs > 0 THEN
      RAISE NOTICE '[unidade] "%" (id %) tem % vínculo(s) real(is) -- NÃO removida, revise manualmente.', u.name, u.id, refs;
    ELSE
      DELETE FROM units WHERE id = u.id;
      RAISE NOTICE '[unidade] "%" (id %) removida (sem vínculos).', u.name, u.id;
    END IF;
  END LOOP;
END $$;

-- 4) Deduplicar tipos de manutenção --------------------------------------
-- Compara por nome normalizado (sem espaços nas pontas, minúsculo, forma
-- Unicode NFC) para pegar duplicidades mesmo quando o texto "parece" igual
-- mas difere por baixo dos panos (encoding de acento, espaço a mais etc).
DO $$
DECLARE
  g RECORD;
  keep_id bigint;
  lose_ids bigint[];
BEGIN
  FOR g IN
    SELECT lower(trim(normalize(name, NFC))) AS norm, array_agg(id ORDER BY id) AS ids
    FROM maintenance_reasons
    GROUP BY 1
    HAVING count(*) > 1
  LOOP
    keep_id := g.ids[1];
    lose_ids := g.ids[2:array_length(g.ids, 1)];
    UPDATE fleet_work_orders SET reason_id = keep_id WHERE reason_id = ANY(lose_ids);
    DELETE FROM maintenance_reasons WHERE id = ANY(lose_ids);
    RAISE NOTICE '[manutencao] motivo "%": mantido id %, removido(s) %.', g.norm, keep_id, lose_ids;
  END LOOP;
END $$;

-- 5) Deduplicar viajantes/condutores por nome ----------------------------
-- Mesma pessoa cadastrada mais de uma vez (ex.: uma vez manualmente como
-- "Condutor" e outra vez automaticamente como "Viajante" ao criar a
-- primeira viagem). Mescla mantendo o registro já ligado a um usuário
-- como principal, soma "pode dirigir" e migra viagens/reservas para ele.
-- Se duas linhas do mesmo nome estiverem ligadas a usuários DIFERENTES
-- (duas pessoas reais de mesmo nome), não mescla -- só avisa.
DO $$
DECLARE
  g RECORD;
  keep_id bigint;
  lose_ids bigint[];
  merged_can_drive boolean;
  distinct_users int;
BEGIN
  FOR g IN
    SELECT lower(trim(normalize(name, NFC))) AS norm, array_agg(id ORDER BY (user_id IS NULL), id) AS ids
    FROM travelers
    GROUP BY 1
    HAVING count(*) > 1
  LOOP
    SELECT count(DISTINCT user_id) INTO distinct_users FROM travelers WHERE id = ANY(g.ids) AND user_id IS NOT NULL;
    IF distinct_users > 1 THEN
      RAISE NOTICE '[viajante] "%": % registros ligados a usuários DIFERENTES -- não mesclado, revise manualmente: %.', g.norm, array_length(g.ids, 1), g.ids;
      CONTINUE;
    END IF;

    keep_id := g.ids[1];
    lose_ids := g.ids[2:array_length(g.ids, 1)];

    SELECT bool_or(can_drive) INTO merged_can_drive FROM travelers WHERE id = ANY(g.ids);

    UPDATE trips SET traveler_id = keep_id WHERE traveler_id = ANY(lose_ids);
    UPDATE fleet_reservations SET driver_id = keep_id WHERE driver_id = ANY(lose_ids);
    UPDATE travelers SET can_drive = merged_can_drive WHERE id = keep_id;
    UPDATE travelers t SET user_id = lose.user_id
      FROM (SELECT user_id FROM travelers WHERE id = ANY(lose_ids) AND user_id IS NOT NULL LIMIT 1) lose
      WHERE t.id = keep_id AND t.user_id IS NULL AND lose.user_id IS NOT NULL;
    DELETE FROM travelers WHERE id = ANY(lose_ids);
    RAISE NOTICE '[viajante] "%": mantido id % (pode dirigir: %), removido(s) %.', g.norm, keep_id, merged_can_drive, lose_ids;
  END LOOP;
END $$;

-- 6) Ligar/criar o viajante de cada usuário com perfil viajante ---------
-- Depois da deduplicação acima: todo usuário com perfil "traveler" ou
-- "traveler_approver" passa a ter exatamente um viajante vinculado --
-- religando a um cadastro já existente com o mesmo nome (se houver e
-- ainda não tiver dono) ou criando um novo.
DO $$
DECLARE
  u RECORD;
  match_id bigint;
BEGIN
  FOR u IN SELECT id, name, email FROM users WHERE profile IN ('traveler', 'traveler_approver') LOOP
    IF EXISTS (SELECT 1 FROM travelers WHERE user_id = u.id) THEN
      CONTINUE;
    END IF;

    SELECT id INTO match_id FROM travelers
    WHERE user_id IS NULL AND lower(trim(normalize(name, NFC))) = lower(trim(normalize(u.name, NFC)))
    LIMIT 1;

    IF match_id IS NOT NULL THEN
      UPDATE travelers SET user_id = u.id WHERE id = match_id;
      RAISE NOTICE '[sincronia] usuário "%" (id %) ligado ao viajante existente id %.', u.name, u.id, match_id;
    ELSE
      INSERT INTO travelers (user_id, name, can_drive, active)
      VALUES (u.id, coalesce(nullif(trim(u.name), ''), u.email, 'Viajante ' || u.id), false, true);
      RAISE NOTICE '[sincronia] usuário "%" (id %): criado novo viajante.', u.name, u.id;
    END IF;
  END LOOP;
END $$;

COMMIT;
