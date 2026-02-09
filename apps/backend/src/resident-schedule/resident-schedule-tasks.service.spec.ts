import {
  matchRecordsToSuggestedTimes,
  ResidentScheduleTasksService,
} from './resident-schedule-tasks.service';

describe('matchRecordsToSuggestedTimes', () => {
  const baseDate = new Date('2026-02-09T08:00:00.000Z');

  it('faz match exato por horário quando disponível', () => {
    const records = [
      { time: '10:00', createdAt: new Date('2026-02-09T10:05:00.000Z') },
      { time: '08:00', createdAt: new Date('2026-02-09T08:10:00.000Z') },
    ];

    const matched = matchRecordsToSuggestedTimes(records, ['08:00', '10:00']);

    expect(matched[0]?.time).toBe('08:00');
    expect(matched[1]?.time).toBe('10:00');
  });

  it('não reutiliza o mesmo registro para múltiplos horários', () => {
    const records = [{ time: '08:00', createdAt: baseDate }];

    const matched = matchRecordsToSuggestedTimes(records, ['08:00', '12:00']);

    expect(matched[0]?.time).toBe('08:00');
    expect(matched[1]).toBeUndefined();
  });

  it('usa fallback ordenado por horário e createdAt quando não há match exato', () => {
    const records = [
      { time: '09:00', createdAt: new Date('2026-02-09T09:10:00.000Z') },
      { time: '09:00', createdAt: new Date('2026-02-09T09:05:00.000Z') },
      { time: '11:00', createdAt: new Date('2026-02-09T11:00:00.000Z') },
    ];

    const matched = matchRecordsToSuggestedTimes(records, ['07:00', '11:00', '12:00']);

    expect(matched[0]?.time).toBe('09:00');
    expect(matched[0]?.createdAt.toISOString()).toBe('2026-02-09T09:05:00.000Z');
    expect(matched[1]?.time).toBe('11:00');
    expect(matched[2]?.time).toBe('09:00');
  });
});

describe('ResidentScheduleTasksService - recurring tasks matching', () => {
  const createService = () =>
    new ResidentScheduleTasksService(
      {} as any,
      {} as any,
      {} as any,
    );

  it('não reutiliza o mesmo registro em múltiplas configs do mesmo residente/tipo', () => {
    const service = createService();
    const configs = [
      {
        id: 'cfg-1',
        residentId: 'res-1',
        recordType: 'HIDRATACAO',
        suggestedTimes: ['10:00'],
        metadata: null,
        resident: { fullName: 'Residente 1' },
      },
      {
        id: 'cfg-2',
        residentId: 'res-1',
        recordType: 'HIDRATACAO',
        suggestedTimes: ['10:00'],
        metadata: null,
        resident: { fullName: 'Residente 1' },
      },
    ];
    const existingRecords = [
      {
        residentId: 'res-1',
        type: 'HIDRATACAO',
        time: '10:00',
        data: {},
        createdAt: new Date('2026-02-09T10:00:00.000Z'),
        user: { name: 'Cuidador' },
      },
    ];

    const recurringTasks = (service as any).buildRecurringTasks(
      configs,
      existingRecords,
    );

    expect(recurringTasks).toHaveLength(2);
    expect(recurringTasks.filter((task: any) => task.isCompleted)).toHaveLength(1);
    expect(recurringTasks.filter((task: any) => !task.isCompleted)).toHaveLength(1);
  });

  it('reconhece refeicao como fallback de mealType para ALIMENTACAO', () => {
    const service = createService();
    const configs = [
      {
        id: 'cfg-almoco',
        residentId: 'res-1',
        recordType: 'ALIMENTACAO',
        suggestedTimes: ['12:00'],
        metadata: { mealType: 'ALMOCO' },
        resident: { fullName: 'Residente 1' },
      },
    ];
    const existingRecords = [
      {
        residentId: 'res-1',
        type: 'ALIMENTACAO',
        time: '12:00',
        data: { refeicao: 'ALMOCO' },
        createdAt: new Date('2026-02-09T12:01:00.000Z'),
        user: { name: 'Cuidador' },
      },
    ];

    const recurringTasks = (service as any).buildRecurringTasks(
      configs,
      existingRecords,
    );

    expect(recurringTasks).toHaveLength(1);
    expect(recurringTasks[0].isCompleted).toBe(true);
  });
});
