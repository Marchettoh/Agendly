import { describe, expect, it } from 'vitest';
import { nextRecurringDate, occurrencesInRange } from '../src/lib/time';

describe('ricorrenze lato app', () => {
  it('completare una voce giornaliera in ritardo salta a oggi', () => {
    expect(nextRecurringDate('2026-11-09', '2026-11-09', 'daily', '2026-11-13')).toBe('2026-11-13');
  });

  it('una voce mensile del 31 non slitta dopo febbraio', () => {
    const feb = nextRecurringDate('2026-01-31', '2026-01-31', 'monthly', '2026-01-01');
    expect(feb).toBe('2026-02-28');
    expect(nextRecurringDate('2026-01-31', feb, 'monthly', '2026-01-01')).toBe('2026-03-31');
    expect(occurrencesInRange(feb, 'monthly', '2026-02-01', '2026-04-30', '2026-01-31')).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('le occorrenze non precedono la data corrente della serie', () => {
    expect(occurrencesInRange('2026-11-12', 'weekly', '2026-11-01', '2026-11-30', '2026-10-29')).toEqual(['2026-11-12', '2026-11-19', '2026-11-26']);
  });
});

describe('impegni su più giorni', () => {
  it('compaiono in ogni giorno coperto', async () => {
    const { expandOccurrences } = await import('../src/lib/selectors');
    const item = {
      id: 'v', agendaId: null, type: 'evento', title: 'Vacanza', description: '', date: '2026-11-13', time: '10:00', endDate: '2026-11-15', endTime: '18:00',
      timezone: 'Europe/Rome', startAt: new Date('2026-11-13T09:00:00Z'), endAt: new Date('2026-11-15T17:00:00Z'), category: 'famiglia', priority: 'media',
      status: 'da_fare', reminderMinutes: null, remindAt: null, recurrence: 'none', completedAt: null, createdAt: null, updatedAt: null,
    } as const;
    const occ = expandOccurrences([item as never], '2026-11-14', '2026-11-20');
    expect(occ.map((o) => [o.date, o.continued])).toEqual([['2026-11-14', true], ['2026-11-15', true]]);
  });
});
