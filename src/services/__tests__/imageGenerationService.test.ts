import { describe, it, expect } from 'vitest';
import { 
  FORMATOS_PRESETS, 
  ESTILOS_VISUALES, 
  construirPromptNanoBanana, 
  construirUrlNanoBanana 
} from '../imageGenerationService';

describe('imageGenerationService - Gemini & Nano Banana Visual Studio', () => {
  it('debe contener los 5 formatos oficiales para Instagram, WhatsApp y Web', () => {
    expect(FORMATOS_PRESETS.length).toBe(5);

    const feed = FORMATOS_PRESETS.find(f => f.id === 'instagram_feed');
    expect(feed).toBeDefined();
    expect(feed?.width).toBe(1080);
    expect(feed?.height).toBe(1080);
    expect(feed?.aspectRatioLabel).toBe('1:1');

    const portrait = FORMATOS_PRESETS.find(f => f.id === 'instagram_portrait');
    expect(portrait).toBeDefined();
    expect(portrait?.width).toBe(1080);
    expect(portrait?.height).toBe(1350);
    expect(portrait?.aspectRatioLabel).toBe('4:5');

    const story = FORMATOS_PRESETS.find(f => f.id === 'instagram_story');
    expect(story).toBeDefined();
    expect(story?.width).toBe(1080);
    expect(story?.height).toBe(1920);
    expect(story?.aspectRatioLabel).toBe('9:16');

    const whatsapp = FORMATOS_PRESETS.find(f => f.id === 'whatsapp_catalog');
    expect(whatsapp).toBeDefined();
    expect(whatsapp?.width).toBe(800);
    expect(whatsapp?.height).toBe(800);
  });

  it('debe ofrecer los 5 estilos visuales de manufactura y coleccionismo 3D', () => {
    expect(ESTILOS_VISUALES.length).toBe(5);
    const ids = ESTILOS_VISUALES.map(e => e.id);
    expect(ids).toContain('estudio_comercial');
    expect(ids).toContain('diorama_epico');
    expect(ids).toContain('taller_artesanal');
    expect(ids).toContain('resina_cyberpunk');
    expect(ids).toContain('vitrina_coleccionista');
  });

  it('debe construir un prompt enriquecido para Nano Banana con el estilo seleccionado', () => {
    const prompt = construirPromptNanoBanana('Goku Ultra Instinct', 'diorama_epico', 'base con rocas');
    expect(prompt).toContain('Goku Ultra Instinct');
    expect(prompt).toContain('base con rocas');
    expect(prompt).toContain('cinematic anime diorama scene');
    expect(prompt).toContain('magical energy aura');
  });

  it('debe construir la URL de renderizado con los parámetros de resolución y semilla especificados', () => {
    const prompt = 'Figura Tanjiro Kamado 8k';
    const url = construirUrlNanoBanana(prompt, 1080, 1350, 424242);

    expect(url).toContain('https://image.pollinations.ai/prompt/');
    expect(url).toContain('width=1080');
    expect(url).toContain('height=1350');
    expect(url).toContain('seed=424242');
    expect(url).toContain('nologo=true');
    expect(url).toContain('enhance=true');
    expect(url).toContain('model=flux');
  });

  it('debe generar una semilla aleatoria si no se proporciona una específica', () => {
    const url = construirUrlNanoBanana('Batman Busto', 1080, 1080);
    const match = url.match(/seed=(\d+)/);
    expect(match).not.toBeNull();
    const seed = Number(match?.[1]);
    expect(seed).toBeGreaterThan(0);
  });
});
