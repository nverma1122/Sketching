import { describe, expect, it } from 'vitest';
import { artSearchUrl, classifyMedium, imageUrls, parseArtworks } from './artworks';

describe('classifyMedium', () => {
  it.each([
    ['Pen and black ink over graphite', 'ink'],
    ['Pen and brown ink, brush and brown wash, over black chalk', 'ink-wash'],
    ['Watercolor, pen and black ink, over graphite', 'ink-wash'],
    ['Watercolor over graphite', 'watercolour'],
    ['aquarelle | croquis | sète', 'watercolour'],
    ['Gouache and watercolor on paper', 'gouache'],
    ['Graphite on paper', 'pencil'],
    ['pencil sketch | street', 'pencil'],
    ['Oil on canvas', undefined],
    ['Etching', undefined],
    ['Black chalk', undefined],
  ])('%s → %s', (text, medium) => {
    expect(classifyMedium(text)).toBe(medium);
  });
});

const museum = (id: string, title: string, medium: string, extra: Record<string, unknown> = {}) => ({
  id,
  title,
  url: `https://images.metmuseum.org/CRDImages/dp/original/${id}.jpg`,
  foreign_landing_url: `https://www.metmuseum.org/art/collection/search/${id}`,
  creator: 'Thomas Girtin',
  license: 'cc0',
  license_version: '1.0',
  provider: 'met',
  source: 'met',
  width: null,
  height: null,
  mature: false,
  tags: [{ name: 'Drawings' }, { name: medium }, { name: 'Streets' }],
  ...extra,
});

const flickr = (id: string, title: string, tags: string[], extra: Record<string, unknown> = {}) => ({
  id,
  title,
  url: `https://live.staticflickr.com/${id}_b.jpg`,
  foreign_landing_url: `https://www.flickr.com/photos/x/${id}`,
  creator: 'Sketcher',
  license: 'by',
  license_version: '2.0',
  provider: 'flickr',
  source: 'flickr',
  width: 1024,
  height: 730,
  mature: false,
  tags: tags.map((name) => ({ name, unstable__provider: 'flickr' })),
  ...extra,
});

describe('parseArtworks', () => {
  const data = {
    results: [
      museum('m1', "St. Paul's Cathedral", 'Watercolor, pen and black ink, over graphite'),
      museum('m2', 'A Sunny Street at Tivoli', 'Pen and black ink, brush and gray wash, over graphite'),
      museum('m3', 'View of the Borsa, Rome', 'Pen and black ink over graphite'),
      flickr('f1', '140608 USK Sète', ['aquarelle', 'croquis', 'sketch']),
      flickr('f2', 'Cafe captures', ['ink', 'pen', 'sketch']),
      flickr('f3', 'Erotic girl painting', ['watercolor', 'sketch']),
      flickr('f4', 'LIBRE COLLAGE', ['ink', 'sketch'], { unstable__sensitivity: ['sensitive_text'] }),
      flickr('f5', 'Kid cartoon character', ['ink', 'drawing']),
      flickr('f6', 'Spam', ['ink', 'sketch', ...Array.from({ length: 40 }, (_, i) => `t${i}`)]),
      flickr('f7', 'Tiny ink sketch', ['ink', 'sketch'], { width: 500, height: 333 }),
      flickr('f8', 'Sunset photo', ['ink', 'sunset']),
      flickr('f9', 'Eye of the Artist', ['artist', 'drawing', 'pencil', 'canon', 'candid']),
      museum('m4', 'Jersey Street, New York', 'Drawings', { source: 'smithsonian_cooper_hewitt_museum', provider: 'smithsonian' }),
      museum('m5', 'Street Scene', 'Oil on canvas'),
      museum('m6', 'Design for Ornamental Glass', 'Pen and ink and watercolor'),
      museum('m7', 'Scene, Milsom Street, Bath', 'Pen and brown ink and graphite', {
        tags: [{ name: 'Men' }, { name: 'Women' }, { name: 'Pen and brown ink and graphite' }],
      }),
    ],
  };

  it('keeps only artworks in the wanted medium (museum items without medium text trust the search)', () => {
    expect(parseArtworks(data, 'long', 'ink').map((i) => i.id)).toEqual(['am3', 'af2', 'am4', 'am7']);
    expect(parseArtworks(data, 'long', 'pencil').map((i) => i.id)).toEqual(['am4']);
    expect(parseArtworks(data, 'long', 'ink-wash').map((i) => i.id)).toEqual(['am1', 'am2', 'am4']);
    expect(parseArtworks(data, 'long', 'watercolour').map((i) => i.id)).toEqual(['af1', 'am4']);
    expect(parseArtworks(data, 'long', 'gouache').map((i) => i.id)).toEqual(['am4']);
  });

  it('labels each artwork with its medium, credit and a display-size image', () => {
    const [m3] = parseArtworks(data, 'deep', 'ink');
    expect(m3).toMatchObject({ kind: 'art', level: 'deep', medium: 'ink', title: 'View of the Borsa, Rome' });
    expect(m3.src).toBe('https://images.metmuseum.org/CRDImages/dp/web-large/m3.jpg');
    expect(m3.large).toBe('https://images.metmuseum.org/CRDImages/dp/web-large/m3.jpg');
    expect(m3.credit).toMatchObject({ artist: 'Thomas Girtin', license: 'CC0', source: 'The Met via Openverse' });
  });

  it('lists each artwork once even when the museum has several photos of it', () => {
    const twice = {
      results: [
        museum('d1', 'Houses', 'Graphite'),
        { ...museum('d1', 'Houses', 'Graphite'), id: 'd1b', url: 'https://images.metmuseum.org/CRDImages/dp/original/other.jpg' },
      ],
    };
    expect(parseArtworks(twice, 'short', 'pencil')).toHaveLength(1);
  });

  it('tolerates empty or odd responses', () => {
    expect(parseArtworks({}, 'quick', 'ink')).toEqual([]);
    expect(parseArtworks(null, 'quick', 'ink')).toEqual([]);
  });
});

describe('image sizes and search URLs', () => {
  it('asks the Smithsonian for a display-size image', () => {
    expect(imageUrls({ url: 'https://ids.si.edu/ids/deliveryService?id=CHSDM-1' }).src).toBe('https://ids.si.edu/ids/deliveryService?id=CHSDM-1&max=1400');
  });

  it('searches museums or sketchbooks within the anonymous limit', () => {
    const m = new URL(artSearchUrl('museum', 'watercolour', 'street'));
    expect(m.searchParams.get('q')).toBe('watercolor street');
    expect(m.searchParams.get('source')).toContain('met');
    expect(Number(m.searchParams.get('page_size'))).toBeLessThanOrEqual(20);
    const s = new URL(artSearchUrl('sketchbook', 'ink', 'cafe'));
    expect(s.searchParams.get('q')).toBe('ink sketch cafe');
    expect(s.searchParams.get('source')).toBe('flickr');
  });
});
