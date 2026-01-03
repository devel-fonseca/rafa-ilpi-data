-- Migration: Normalizar tags de evoluções clínicas
-- Objetivo: Substituir tags em snake_case por formato legível em português

-- ============================================================================
-- FUNÇÃO AUXILIAR: Normalizar array de tags
-- ============================================================================
CREATE OR REPLACE FUNCTION normalize_tags(tags TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  tag TEXT;
  normalized_tags TEXT[] := '{}';
  normalized_tag TEXT;
BEGIN
  FOREACH tag IN ARRAY tags
  LOOP
    -- Aplicar mapeamento de normalização
    normalized_tag := CASE
      -- Urgência e Prioridade
      WHEN tag IN ('urgente', 'URGENTE', 'urgent') THEN 'Urgente'
      WHEN tag IN ('atencao_imediata', 'atenção_imediata', 'ATENCAO_IMEDIATA') THEN 'Atenção Imediata'
      WHEN tag IN ('prioritario', 'prioritário', 'PRIORITARIO') THEN 'Prioritário'
      WHEN tag IN ('monitoramento', 'MONITORAMENTO') THEN 'Monitoramento'
      WHEN tag IN ('monitoramento_continuo', 'monitoramento_contínuo') THEN 'Monitoramento Contínuo'

      -- Sistemas
      WHEN tag IN ('cardiovascular', 'CARDIOVASCULAR') THEN 'Cardiovascular'
      WHEN tag IN ('respiratorio', 'respiratório', 'RESPIRATORIO') THEN 'Respiratório'
      WHEN tag IN ('neurologico', 'neurológico', 'NEUROLOGICO') THEN 'Neurológico'
      WHEN tag IN ('gastrointestinal', 'GASTROINTESTINAL') THEN 'Gastrointestinal'
      WHEN tag IN ('genitourinario', 'genitourinário', 'GENITOURINARIO') THEN 'Genitourinário'
      WHEN tag IN ('musculoesqueletico', 'musculoesquelético', 'MUSCULOESQUELETICO') THEN 'Musculoesquelético'
      WHEN tag IN ('dermatologico', 'dermatológico', 'DERMATOLOGICO') THEN 'Dermatológico'

      -- Sinais Vitais
      WHEN tag IN ('sinais_vitais_anormais', 'sinais_vitais_alterados', 'Sinais Vitais Anormais') THEN 'Sinais Vitais Alterados'
      WHEN tag IN ('hipertensao', 'hipertensão', 'HIPERTENSAO') THEN 'Hipertensão'
      WHEN tag IN ('hipotensao', 'hipotensão', 'HIPOTENSAO') THEN 'Hipotensão'
      WHEN tag IN ('taquicardia', 'TAQUICARDIA') THEN 'Taquicardia'
      WHEN tag IN ('bradicardia', 'BRADICARDIA') THEN 'Bradicardia'
      WHEN tag IN ('febre', 'FEBRE') THEN 'Febre'
      WHEN tag IN ('hipotermia', 'HIPOTERMIA') THEN 'Hipotermia'
      WHEN tag IN ('hipoxia', 'hipóxia', 'HIPOXIA') THEN 'Hipóxia'

      -- Condições Específicas
      WHEN tag IN ('diabetes', 'DIABETES') THEN 'Diabetes'
      WHEN tag IN ('controle_glicemico', 'controle_glicêmico', 'CONTROLE_GLICEMICO') THEN 'Controle Glicêmico'
      WHEN tag IN ('hiperglicemia', 'HIPERGLICEMIA') THEN 'Hiperglicemia'
      WHEN tag IN ('hipoglicemia', 'HIPOGLICEMIA') THEN 'Hipoglicemia'
      WHEN tag IN ('dor', 'DOR') THEN 'Dor'
      WHEN tag IN ('dor_cronica', 'dor_crônica', 'DOR_CRONICA') THEN 'Dor Crônica'
      WHEN tag IN ('dor_aguda', 'DOR_AGUDA') THEN 'Dor Aguda'

      -- Infecção e Feridas
      WHEN tag IN ('investigacao_infecciosa', 'investigação_infecciosa', 'infeccao', 'infecção', 'Infecção') THEN 'Investigação Infecciosa'
      WHEN tag IN ('antibioticoterapia', 'ANTIBIOTICOTERAPIA') THEN 'Antibioticoterapia'
      WHEN tag IN ('lesao_por_pressao', 'lesão_por_pressão', 'LESAO_POR_PRESSAO') THEN 'Lesão por Pressão'
      WHEN tag IN ('cuidados_com_feridas', 'CUIDADOS_COM_FERIDAS') THEN 'Cuidados com Feridas'

      -- Nutrição
      WHEN tag IN ('nutricao', 'nutrição', 'NUTRICAO') THEN 'Nutrição'
      WHEN tag IN ('desidratacao', 'desidratação', 'DESIDRATACAO') THEN 'Desidratação'
      WHEN tag IN ('disfagia', 'DISFAGIA') THEN 'Disfagia'
      WHEN tag IN ('avaliacao_nutricional', 'avaliação_nutricional', 'AVALIACAO_NUTRICIONAL') THEN 'Avaliação Nutricional'

      -- Mobilidade e Quedas
      WHEN tag IN ('risco_queda', 'risco_de_queda', 'RISCO_QUEDA', 'RISCO_DE_QUEDA') THEN 'Risco de Queda'
      WHEN tag IN ('mobilidade_reduzida', 'MOBILIDADE_REDUZIDA') THEN 'Mobilidade Reduzida'
      WHEN tag IN ('fisioterapia', 'FISIOTERAPIA') THEN 'Fisioterapia'
      WHEN tag IN ('reabilitacao', 'reabilitação', 'REABILITACAO') THEN 'Reabilitação'

      -- Mental e Comportamental
      WHEN tag IN ('alteracao_estado_mental', 'alteração_estado_mental', 'ALTERACAO_ESTADO_MENTAL') THEN 'Alteração do Estado Mental'
      WHEN tag IN ('agitacao', 'agitação', 'AGITACAO') THEN 'Agitação'
      WHEN tag IN ('depressao', 'depressão', 'DEPRESSAO') THEN 'Depressão'
      WHEN tag IN ('ansiedade', 'ANSIEDADE') THEN 'Ansiedade'
      WHEN tag IN ('declinio_cognitivo', 'declínio_cognitivo', 'DECLINIO_COGNITIVO') THEN 'Declínio Cognitivo'

      -- Medicação
      WHEN tag IN ('ajuste_medicamentoso', 'AJUSTE_MEDICAMENTOSO') THEN 'Ajuste Medicamentoso'
      WHEN tag IN ('reacao_adversa', 'reação_adversa', 'REACAO_ADVERSA') THEN 'Reação Adversa'
      WHEN tag IN ('polifarmacia', 'polifarmácia', 'POLIFARMACIA') THEN 'Polifarmácia'

      -- Cuidados e Intercorrências
      WHEN tag IN ('intercorrencia_clinica', 'intercorrência_clínica', 'INTERCORRENCIA_CLINICA') THEN 'Intercorrência Clínica'
      WHEN tag IN ('evolucao_favoravel', 'evolução_favorável', 'EVOLUCAO_FAVORAVEL') THEN 'Evolução Favorável'
      WHEN tag IN ('piora_quadro', 'piora_do_quadro', 'PIORA_QUADRO') THEN 'Piora do Quadro'
      WHEN tag IN ('necessita_avaliacao_medica', 'necessita_avaliação_médica', 'NECESSITA_AVALIACAO_MEDICA') THEN 'Necessita Avaliação Médica'
      WHEN tag IN ('encaminhamento', 'ENCAMINHAMENTO') THEN 'Encaminhamento'

      -- Outros
      WHEN tag IN ('familia_comunicada', 'família_comunicada', 'FAMILIA_COMUNICADA') THEN 'Família Comunicada'
      WHEN tag IN ('multidisciplinar', 'MULTIDISCIPLINAR') THEN 'Multidisciplinar'
      WHEN tag IN ('cuidados_paliativos', 'CUIDADOS_PALIATIVOS') THEN 'Cuidados Paliativos'

      -- Se não houver mapeamento, manter a tag original
      ELSE tag
    END;

    -- Adicionar tag normalizada ao array (evitar duplicatas)
    IF NOT (normalized_tag = ANY(normalized_tags)) THEN
      normalized_tags := array_append(normalized_tags, normalized_tag);
    END IF;
  END LOOP;

  RETURN normalized_tags;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ATUALIZAR TAGS EM clinical_notes
-- ============================================================================
UPDATE "clinical_notes"
SET tags = normalize_tags(tags)
WHERE array_length(tags, 1) > 0;

-- ============================================================================
-- ATUALIZAR TAGS EM clinical_notes_history
-- ============================================================================
UPDATE "clinical_notes_history"
SET tags = normalize_tags(tags)
WHERE array_length(tags, 1) > 0;

-- ============================================================================
-- REMOVER FUNÇÃO AUXILIAR
-- ============================================================================
DROP FUNCTION normalize_tags(TEXT[]);
