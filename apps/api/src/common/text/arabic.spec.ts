import { buildSearchText, normalizeArabic, slugify } from './arabic.js';

describe('normalizeArabic', () => {
  it('unifies letter variants, strips diacritics and converts digits', () => {
    expect(normalizeArabic('أُرز بسمتي – مُمتاز ١٢٣')).toBe('ارز بسمتي ممتاز 123');
    expect(normalizeArabic('قهوة عربية')).toBe(normalizeArabic('قهوه عربيه'));
    expect(normalizeArabic('مستشفى')).toBe('مستشفي');
    expect(buildSearchText('Green Coffee', null, 'بن أخضر')).toBe('green coffee بن اخضر');
  });
  it('slugifies', () => {
    expect(slugify('Brazil Green Coffee 17/18')).toBe('brazil-green-coffee-17-18');
  });
});
