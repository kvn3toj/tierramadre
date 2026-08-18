import { describe, it, expect } from 'vitest';
import { pickCardImage } from '../src/utils/cardImageSource';

/**
 * Pin del orden de fuentes de la imagen de tarjeta (useTreasure):
 *
 *   galería manual → media legacy → fotoUrl (Convex/hoja) → carpeta Drive legacy
 *
 * El punto del cambio 2026-08-18: `fotoUrl` — la foto que sube el bot — va
 * ARRIBA del thumbnail de la carpeta `products/{item}`. Antes iba última, así
 * que cualquier ítem con carpeta legacy mostraba la foto vieja para siempre
 * (#97 con su foto de mayo; #233/#89 sin la foto recién subida).
 */
describe('pickCardImage — orden de fuentes', () => {
  it('fotoUrl le gana al thumbnail de la carpeta legacy', () => {
    const pick = pickCardImage({
      fotoUrl: 'https://drive/nueva.jpg',
      folderThumbUrl: 'https://drive/carpeta-vieja.jpg',
    });
    expect(pick.url).toBe('https://drive/nueva.jpg');
  });

  it('la galería manual sigue ganándole a todo', () => {
    const pick = pickCardImage({
      galleryUrl: 'https://drive/curada.jpg',
      legacyUrl: 'https://drive/legacy.jpg',
      fotoUrl: 'https://drive/nueva.jpg',
      folderThumbUrl: 'https://drive/carpeta.jpg',
    });
    expect(pick.url).toBe('https://drive/curada.jpg');
  });

  it('media legacy va arriba de fotoUrl', () => {
    const pick = pickCardImage({
      legacyUrl: 'https://drive/legacy.jpg',
      fotoUrl: 'https://drive/nueva.jpg',
    });
    expect(pick.url).toBe('https://drive/legacy.jpg');
  });

  it('sin fotoUrl, la carpeta legacy sigue siendo el fallback', () => {
    const pick = pickCardImage({
      folderThumbUrl: 'https://drive/carpeta.jpg',
    });
    expect(pick.url).toBe('https://drive/carpeta.jpg');
  });

  it('sin ninguna fuente devuelve undefined', () => {
    expect(pickCardImage({}).url).toBeUndefined();
  });
});

describe('pickCardImage — isVideoOnly', () => {
  it('carpeta con video y nada más ⇒ video', () => {
    const pick = pickCardImage({
      folderThumbUrl: 'https://drive/video-thumb.jpg',
      folderThumbIsVideo: true,
    });
    expect(pick.isVideoOnly).toBe(true);
  });

  it('si hay fotoUrl, el tipo NO se vuelve video aunque la carpeta lo sea', () => {
    // Antes `isVideoOnly` solo miraba galería y media legacy: un ítem con
    // video en la carpeta y foto nueva del bot habría quedado con
    // mediaType=video mostrando una imagen.
    const pick = pickCardImage({
      fotoUrl: 'https://drive/nueva.jpg',
      folderThumbUrl: 'https://drive/video-thumb.jpg',
      folderThumbIsVideo: true,
    });
    expect(pick.url).toBe('https://drive/nueva.jpg');
    expect(pick.isVideoOnly).toBe(false);
  });

  it('la galería manual también lo apaga', () => {
    const pick = pickCardImage({
      galleryUrl: 'https://drive/curada.jpg',
      folderThumbUrl: 'https://drive/video-thumb.jpg',
      folderThumbIsVideo: true,
    });
    expect(pick.isVideoOnly).toBe(false);
  });
});
