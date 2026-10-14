import { describe, expect, it } from 'vitest';
import { cleanTitle, parsePhotos, toSearch } from './commons';

const page = (pageid: number, title: string, w = 3000, h = 2000, mime = 'image/jpeg') => ({
  pageid,
  title,
  index: pageid,
  imageinfo: [
    {
      thumburl: `https://upload.wikimedia.org/thumb/x/1280px-${pageid}.jpg`,
      url: `https://upload.wikimedia.org/x/${pageid}.jpg`,
      descriptionurl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
      width: w,
      height: h,
      mime,
      extmetadata: {
        Artist: { value: '<a href="#">Jane Doe</a>' },
        LicenseShortName: { value: 'CC BY-SA 4.0' },
      },
    },
  ],
});

describe('commons', () => {
  it('builds title searches', () => {
    expect(toSearch('tea stall')).toBe('intitle:tea intitle:stall filetype:bitmap');
  });

  it('cleans file names into titles', () => {
    expect(cleanTitle('File:Durdle Door, tea stall - geograph.org.uk - 3545103.jpg')).toBe('Durdle Door, tea stall');
    expect(cleanTitle('File:Tea Stall (7168699187).jpg')).toBe('Tea Stall');
    expect(cleanTitle('File:old_street_lamp.JPG')).toBe('Old street lamp');
  });

  it('keeps large photos with credits and drops maps, small files and other formats', () => {
    const data = {
      query: {
        pages: {
          1: page(1, 'File:Roadside tea stall.jpg'),
          2: page(2, 'File:Chandni Chowk Map.jpg'),
          3: page(3, 'File:Tiny stall.jpg', 640, 480),
          4: page(4, 'File:Stall.tif', 3000, 2000, 'image/tiff'),
        },
      },
    };
    const items = parsePhotos(data, 'short');
    expect(items.map((i) => i.id)).toEqual(['c1']);
    expect(items[0]).toMatchObject({
      kind: 'photo',
      level: 'short',
      title: 'Roadside tea stall',
    });
    expect(items[0].credit).toMatchObject({
      artist: 'Jane Doe',
      license: 'CC BY-SA 4.0',
    });
  });

  it('tolerates empty or odd responses', () => {
    expect(parsePhotos({}, 'quick')).toEqual([]);
    expect(parsePhotos(null, 'quick')).toEqual([]);
  });
});
