-- Popular 5 ShiftTemplates no schema tenant_tele_engenharia_ltda_9db61a

INSERT INTO tenant_tele_engenharia_ltda_9db61a.shift_templates
  (id, type, name, "startTime", "endTime", duration, description, "isActive", "displayOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'DAY_8H', 'Dia 8h', '07:00', '15:00', 8, 'Turno diurno de 8 horas', true, 1, NOW(), NOW()),
  (gen_random_uuid(), 'AFTERNOON_8H', 'Tarde 8h', '15:00', '23:00', 8, 'Turno vespertino de 8 horas', true, 2, NOW(), NOW()),
  (gen_random_uuid(), 'NIGHT_8H', 'Noite 8h', '23:00', '07:00', 8, 'Turno noturno de 8 horas', true, 3, NOW(), NOW()),
  (gen_random_uuid(), 'DAY_12H', 'Dia 12h', '07:00', '19:00', 12, 'Turno diurno de 12 horas', true, 4, NOW(), NOW()),
  (gen_random_uuid(), 'NIGHT_12H', 'Noite 12h', '19:00', '07:00', 12, 'Turno noturno de 12 horas', true, 5, NOW(), NOW())
ON CONFLICT (type) DO NOTHING;
