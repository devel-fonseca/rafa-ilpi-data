-- Script para popular sinais vitais com dados realistas
-- Período: 26/10/2025 a 25/11/2025 (30 dias)
-- Registros 2x ao dia (08:00 e 20:00)

-- IDs dos residentes e informações
-- Adriana Ferreira: 32c5b1c5-a537-4c0e-b158-3b9cea5813e2 (HTA controlada)
-- Camila dos Santos: c104139b-a225-40aa-9854-2d1bc8101ea1 (DM2)
-- Tereza Heloisa Assunção: a9f8165a-b405-4f76-a497-8441730386fb (Grau II)

DO $$
DECLARE
    tenant_id UUID := '150803eb-c4fb-4dcc-a438-7d5e4a02f898';
    user_id UUID := '11b945f1-8185-4545-baa6-5cf11f72b871';
    adriana_id UUID := '32c5b1c5-a537-4c0e-b158-3b9cea5813e2';
    camila_id UUID := 'c104139b-a225-40aa-9854-2d1bc8101ea1';
    tereza_id UUID := 'a9f8165a-b405-4f76-a497-8441730386fb';
    record_date DATE;
    morning_time TEXT := '08:00';
    evening_time TEXT := '20:00';

    -- Variáveis para valores de sinais vitais
    pa_sys INT;
    pa_dia INT;
    temp NUMERIC(3,1);
    fc INT;
    spo2 NUMERIC(4,1);
    glicemia INT;

BEGIN
    -- Loop através de 30 dias
    FOR i IN 0..29 LOOP
        record_date := '2025-10-26'::DATE + INTERVAL '1 day' * i;

        -- ========== ADRIANA FERREIRA (HTA controlada) ==========
        -- Manhã
        -- PA variando entre 125-145/75-90 (HTA controlada mas com variações)
        pa_sys := 125 + (RANDOM() * 20)::INT;
        pa_dia := 75 + (RANDOM() * 15)::INT;
        -- Temperatura normal
        temp := 36.0 + (RANDOM() * 0.8)::NUMERIC(3,1);
        -- FC normal-alta (medicação HTA)
        fc := 68 + (RANDOM() * 15)::INT;
        -- SpO2 normal
        spo2 := 96 + (RANDOM() * 3)::NUMERIC(4,1);
        -- Glicemia normal
        glicemia := 85 + (RANDOM() * 25)::INT;

        INSERT INTO daily_records (
            id, "tenantId", "residentId", type, date, time, data,
            "recordedBy", "userId", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            adriana_id,
            'MONITORAMENTO',
            record_date,
            morning_time,
            jsonb_build_object(
                'pressaoArterial', pa_sys || '/' || pa_dia,
                'temperatura', temp::TEXT,
                'frequenciaCardiaca', fc::TEXT,
                'saturacaoO2', spo2::TEXT,
                'glicemia', glicemia::TEXT
            ),
            'Enfermagem',
            user_id,
            record_date + TIME '08:00:00',
            record_date + TIME '08:00:00'
        );

        -- Inserir também na tabela vital_signs
        INSERT INTO vital_signs (
            id, "tenantId", "residentId", "userId", timestamp,
            "systolicBloodPressure", "diastolicBloodPressure",
            temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
            "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            adriana_id,
            user_id,
            record_date + TIME '08:00:00',
            pa_sys,
            pa_dia,
            temp,
            fc,
            spo2,
            glicemia,
            record_date + TIME '08:00:00',
            record_date + TIME '08:00:00'
        );

        -- Noite (valores ligeiramente diferentes)
        pa_sys := 128 + (RANDOM() * 17)::INT;
        pa_dia := 78 + (RANDOM() * 12)::INT;
        temp := 36.2 + (RANDOM() * 0.6)::NUMERIC(3,1);
        fc := 70 + (RANDOM() * 12)::INT;
        spo2 := 95 + (RANDOM() * 4)::NUMERIC(4,1);
        glicemia := 95 + (RANDOM() * 30)::INT;

        INSERT INTO daily_records (
            id, "tenantId", "residentId", type, date, time, data,
            "recordedBy", "userId", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            adriana_id,
            'MONITORAMENTO',
            record_date,
            evening_time,
            jsonb_build_object(
                'pressaoArterial', pa_sys || '/' || pa_dia,
                'temperatura', temp::TEXT,
                'frequenciaCardiaca', fc::TEXT,
                'saturacaoO2', spo2::TEXT,
                'glicemia', glicemia::TEXT
            ),
            'Enfermagem',
            user_id,
            record_date + TIME '20:00:00',
            record_date + TIME '20:00:00'
        );

        INSERT INTO vital_signs (
            id, "tenantId", "residentId", "userId", timestamp,
            "systolicBloodPressure", "diastolicBloodPressure",
            temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
            "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            adriana_id,
            user_id,
            record_date + TIME '20:00:00',
            pa_sys,
            pa_dia,
            temp,
            fc,
            spo2,
            glicemia,
            record_date + TIME '20:00:00',
            record_date + TIME '20:00:00'
        );

        -- ========== CAMILA DOS SANTOS (DM2) ==========
        -- Manhã (jejum - glicemia mais alta)
        pa_sys := 118 + (RANDOM() * 12)::INT;
        pa_dia := 70 + (RANDOM() * 10)::INT;
        temp := 36.0 + (RANDOM() * 0.6)::NUMERIC(3,1);
        fc := 65 + (RANDOM() * 15)::INT;
        spo2 := 96 + (RANDOM() * 3)::NUMERIC(4,1);
        -- Glicemia de jejum (DM2 - valores mais altos)
        glicemia := 110 + (RANDOM() * 40)::INT;

        INSERT INTO daily_records (
            id, "tenantId", "residentId", type, date, time, data,
            "recordedBy", "userId", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            camila_id,
            'MONITORAMENTO',
            record_date,
            morning_time,
            jsonb_build_object(
                'pressaoArterial', pa_sys || '/' || pa_dia,
                'temperatura', temp::TEXT,
                'frequenciaCardiaca', fc::TEXT,
                'saturacaoO2', spo2::TEXT,
                'glicemia', glicemia::TEXT
            ),
            'Enfermagem',
            user_id,
            record_date + TIME '08:00:00',
            record_date + TIME '08:00:00'
        );

        INSERT INTO vital_signs (
            id, "tenantId", "residentId", "userId", timestamp,
            "systolicBloodPressure", "diastolicBloodPressure",
            temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
            "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            camila_id,
            user_id,
            record_date + TIME '08:00:00',
            pa_sys,
            pa_dia,
            temp,
            fc,
            spo2,
            glicemia,
            record_date + TIME '08:00:00',
            record_date + TIME '08:00:00'
        );

        -- Noite (pós-prandial)
        pa_sys := 120 + (RANDOM() * 10)::INT;
        pa_dia := 72 + (RANDOM() * 8)::INT;
        temp := 36.3 + (RANDOM() * 0.5)::NUMERIC(3,1);
        fc := 68 + (RANDOM() * 12)::INT;
        spo2 := 95 + (RANDOM() * 4)::NUMERIC(4,1);
        -- Glicemia pós-prandial (mais elevada)
        glicemia := 130 + (RANDOM() * 50)::INT;

        INSERT INTO daily_records (
            id, "tenantId", "residentId", type, date, time, data,
            "recordedBy", "userId", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            camila_id,
            'MONITORAMENTO',
            record_date,
            evening_time,
            jsonb_build_object(
                'pressaoArterial', pa_sys || '/' || pa_dia,
                'temperatura', temp::TEXT,
                'frequenciaCardiaca', fc::TEXT,
                'saturacaoO2', spo2::TEXT,
                'glicemia', glicemia::TEXT
            ),
            'Enfermagem',
            user_id,
            record_date + TIME '20:00:00',
            record_date + TIME '20:00:00'
        );

        INSERT INTO vital_signs (
            id, "tenantId", "residentId", "userId", timestamp,
            "systolicBloodPressure", "diastolicBloodPressure",
            temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
            "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            camila_id,
            user_id,
            record_date + TIME '20:00:00',
            pa_sys,
            pa_dia,
            temp,
            fc,
            spo2,
            glicemia,
            record_date + TIME '20:00:00',
            record_date + TIME '20:00:00'
        );

        -- ========== TEREZA HELOISA (Grau II - Parcialmente Dependente) ==========
        -- Manhã
        -- PA normal-baixa (idosa fragilizada)
        pa_sys := 110 + (RANDOM() * 15)::INT;
        pa_dia := 65 + (RANDOM() * 10)::INT;
        temp := 35.8 + (RANDOM() * 0.8)::NUMERIC(3,1);
        -- FC mais baixa (sedentária)
        fc := 60 + (RANDOM() * 12)::INT;
        -- SpO2 ligeiramente menor (menos mobilidade)
        spo2 := 94 + (RANDOM() * 3)::NUMERIC(4,1);
        glicemia := 80 + (RANDOM() * 20)::INT;

        INSERT INTO daily_records (
            id, "tenantId", "residentId", type, date, time, data,
            "recordedBy", "userId", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            tereza_id,
            'MONITORAMENTO',
            record_date,
            morning_time,
            jsonb_build_object(
                'pressaoArterial', pa_sys || '/' || pa_dia,
                'temperatura', temp::TEXT,
                'frequenciaCardiaca', fc::TEXT,
                'saturacaoO2', spo2::TEXT,
                'glicemia', glicemia::TEXT
            ),
            'Enfermagem',
            user_id,
            record_date + TIME '08:00:00',
            record_date + TIME '08:00:00'
        );

        INSERT INTO vital_signs (
            id, "tenantId", "residentId", "userId", timestamp,
            "systolicBloodPressure", "diastolicBloodPressure",
            temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
            "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            tereza_id,
            user_id,
            record_date + TIME '08:00:00',
            pa_sys,
            pa_dia,
            temp,
            fc,
            spo2,
            glicemia,
            record_date + TIME '08:00:00',
            record_date + TIME '08:00:00'
        );

        -- Noite
        pa_sys := 112 + (RANDOM() * 13)::INT;
        pa_dia := 68 + (RANDOM() * 8)::INT;
        temp := 36.0 + (RANDOM() * 0.6)::NUMERIC(3,1);
        fc := 62 + (RANDOM() * 10)::INT;
        spo2 := 93 + (RANDOM() * 4)::NUMERIC(4,1);
        glicemia := 85 + (RANDOM() * 25)::INT;

        INSERT INTO daily_records (
            id, "tenantId", "residentId", type, date, time, data,
            "recordedBy", "userId", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            tereza_id,
            'MONITORAMENTO',
            record_date,
            evening_time,
            jsonb_build_object(
                'pressaoArterial', pa_sys || '/' || pa_dia,
                'temperatura', temp::TEXT,
                'frequenciaCardiaca', fc::TEXT,
                'saturacaoO2', spo2::TEXT,
                'glicemia', glicemia::TEXT
            ),
            'Enfermagem',
            user_id,
            record_date + TIME '20:00:00',
            record_date + TIME '20:00:00'
        );

        INSERT INTO vital_signs (
            id, "tenantId", "residentId", "userId", timestamp,
            "systolicBloodPressure", "diastolicBloodPressure",
            temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
            "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            tenant_id,
            tereza_id,
            user_id,
            record_date + TIME '20:00:00',
            pa_sys,
            pa_dia,
            temp,
            fc,
            spo2,
            glicemia,
            record_date + TIME '20:00:00',
            record_date + TIME '20:00:00'
        );

    END LOOP;

    -- Adicionar alguns eventos especiais para tornar mais realista

    -- Adriana: episódio de PA alta (dia 15/11)
    INSERT INTO daily_records (
        id, "tenantId", "residentId", type, date, time, data,
        "recordedBy", "userId", notes, "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        tenant_id,
        adriana_id,
        'MONITORAMENTO',
        '2025-11-15',
        '14:00',
        jsonb_build_object(
            'pressaoArterial', '158/95',
            'temperatura', '36.5',
            'frequenciaCardiaca', '88',
            'saturacaoO2', '96',
            'glicemia', '105'
        ),
        'Enfermagem',
        user_id,
        'PA elevada - administrado captopril SL conforme prescrição médica',
        '2025-11-15 14:00:00',
        '2025-11-15 14:00:00'
    );

    INSERT INTO vital_signs (
        id, "tenantId", "residentId", "userId", timestamp,
        "systolicBloodPressure", "diastolicBloodPressure",
        temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
        "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        tenant_id,
        adriana_id,
        user_id,
        '2025-11-15 14:00:00',
        158, 95, 36.5, 88, 96, 105,
        '2025-11-15 14:00:00',
        '2025-11-15 14:00:00'
    );

    -- Camila: hipoglicemia (dia 10/11)
    INSERT INTO daily_records (
        id, "tenantId", "residentId", type, date, time, data,
        "recordedBy", "userId", notes, "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        tenant_id,
        camila_id,
        'MONITORAMENTO',
        '2025-11-10',
        '06:00',
        jsonb_build_object(
            'pressaoArterial', '115/72',
            'temperatura', '36.2',
            'frequenciaCardiaca', '78',
            'saturacaoO2', '97',
            'glicemia', '62'
        ),
        'Enfermagem',
        user_id,
        'Hipoglicemia - oferecido suco de laranja, glicemia reavaliada em 15min: 95mg/dL',
        '2025-11-10 06:00:00',
        '2025-11-10 06:00:00'
    );

    INSERT INTO vital_signs (
        id, "tenantId", "residentId", "userId", timestamp,
        "systolicBloodPressure", "diastolicBloodPressure",
        temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
        "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        tenant_id,
        camila_id,
        user_id,
        '2025-11-10 06:00:00',
        115, 72, 36.2, 78, 97, 62,
        '2025-11-10 06:00:00',
        '2025-11-10 06:00:00'
    );

    -- Tereza: febre baixa (dia 20/11)
    INSERT INTO daily_records (
        id, "tenantId", "residentId", type, date, time, data,
        "recordedBy", "userId", notes, "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        tenant_id,
        tereza_id,
        'MONITORAMENTO',
        '2025-11-20',
        '16:00',
        jsonb_build_object(
            'pressaoArterial', '118/75',
            'temperatura', '37.8',
            'frequenciaCardiaca', '75',
            'saturacaoO2', '95',
            'glicemia', '98'
        ),
        'Enfermagem',
        user_id,
        'Febrícula - administrado dipirona conforme prescrição',
        '2025-11-20 16:00:00',
        '2025-11-20 16:00:00'
    );

    INSERT INTO vital_signs (
        id, "tenantId", "residentId", "userId", timestamp,
        "systolicBloodPressure", "diastolicBloodPressure",
        temperature, "heartRate", "oxygenSaturation", "bloodGlucose",
        "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(),
        tenant_id,
        tereza_id,
        user_id,
        '2025-11-20 16:00:00',
        118, 75, 37.8, 75, 95, 98,
        '2025-11-20 16:00:00',
        '2025-11-20 16:00:00'
    );

END $$;

-- Verificar totais
SELECT
    'Total daily_records' as info,
    COUNT(*) as total
FROM daily_records
WHERE type = 'MONITORAMENTO'
UNION ALL
SELECT
    'Total vital_signs' as info,
    COUNT(*) as total
FROM vital_signs;