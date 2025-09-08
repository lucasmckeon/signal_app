import { Signal } from './types/signal';

export const signals: Signal[] = [
  {
    id: 'a7b10f7e-d5c3-4b89-aef4-203cf77e3019',
    creatorId: 'user-123',
    mood: 'green',
    note: 'Just wrapped up the sprint planning. Feeling good about the roadmap.',
    tags: ['planning', 'sprint'],
    followUpRequired: false,
    createdAt: new Date('2025-09-08T07:42:00Z').toISOString(),
  },
  {
    id: '3c9c5a80-ec38-4e71-8b50-94d9a48f98ea',
    creatorId: 'user-456',
    mood: 'yellow',
    note: 'A few team members are struggling with context on the new feature.',
    tags: ['onboarding', 'feature-x'],
    followUpRequired: true,
    createdAt: new Date('2025-09-08T07:42:00Z').toISOString(),
  },
  {
    id: 'd4e5c1f9-8e12-4374-9d4c-d9bdcdf0fa11',
    creatorId: 'user-789',
    mood: 'red',
    note: 'Blocked on backend API — cannot proceed with integration.',
    tags: ['blocker', 'backend'],
    followUpRequired: true,
    createdAt: new Date('2025-09-08T07:42:00Z').toISOString(),
  },
];
