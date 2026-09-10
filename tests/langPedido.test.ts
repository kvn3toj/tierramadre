import { describe, it, expect } from 'vitest';
import { resolverLangPedido } from '../src/utils/langPedido';

describe('resolverLangPedido — ?lang → handoff → contexto → es', () => {
  it('el query explícito gana', () => {
    expect(resolverLangPedido('?lang=fr', 'en', 'es')).toBe('fr');
  });
  it('sin query, manda el idioma guardado por la hoja de pago', () => {
    expect(resolverLangPedido('', 'en', 'es')).toBe('en');
  });
  it('sin query ni handoff, el contexto', () => {
    expect(resolverLangPedido('', null, 'pt')).toBe('pt');
  });
  it('un valor desconocido en cualquier nivel se ignora, nunca rompe', () => {
    expect(resolverLangPedido('?lang=klingon', 'nope', 'it')).toBe('it');
    expect(resolverLangPedido('?lang=klingon', null, 'zz' as never)).toBe('es');
  });
});
