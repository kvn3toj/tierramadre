import { describe, it, expect, beforeEach } from 'vitest';
import { requireBotSecret } from '../convex/_lib/botAuth';

describe('requireBotSecret', () => {
  beforeEach(() => {
    process.env.ANIMA_BOT_SECRET = 'test-secret';
  });

  it('rechaza un secreto incorrecto', () => {
    expect(() => requireBotSecret('incorrecto')).toThrow(/no autorizado/i);
  });

  it('acepta el secreto correcto', () => {
    expect(() => requireBotSecret('test-secret')).not.toThrow();
  });
});
