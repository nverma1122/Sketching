import { describe, expect, it } from 'vitest';
import { parseOpenverse } from './openverse';

const r = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: 'Laxmi tea stall',
  url: `https://live.staticflickr.com/${id}_b.jpg`,
  foreign_landing_url: `https://www.flickr.com/photos/x/${id}`,
  creator: 'Abhisek Sarda',
  license: 'by',
  license_version: '2.0',
  license_url: 'https://creativecommons.org/licenses/by/2.0/',
  provider: 'flickr',
  width: 1024,
  height: 768,
  mature: false,
  ...extra,
});

describe('openverse', () => {
  it('keeps large, safe, titled photos with credits', () => {
    const items = parseOpenverse(
      {
        results: [
          r('a'),
          r('b', { width: 500, height: 388 }),
          r('c', { mature: true }),
          r('d', { unstable__sensitivity: ['sensitive_text'] }),
          r('e', { title: '' }),
          r('f', { title: 'City map' }),
          r('g', { license: 'cc0', license_version: '1.0', provider: 'wikimedia' }),
        ],
      },
      'short',
    );
    expect(items.map((i) => i.id)).toEqual(['oa', 'og']);
    expect(items[0]).toMatchObject({ kind: 'photo', level: 'short', title: 'Laxmi tea stall' });
    expect(items[0].credit).toMatchObject({ artist: 'Abhisek Sarda', license: 'CC BY 2.0', source: 'Flickr via Openverse' });
    expect(items[1].credit).toMatchObject({ license: 'CC0', source: 'Wikimedia via Openverse' });
  });

  it('tolerates empty or odd responses', () => {
    expect(parseOpenverse({}, 'quick')).toEqual([]);
    expect(parseOpenverse(null, 'quick')).toEqual([]);
  });
});
