/**
 * Attribution for the photographs of Malpica.
 *
 * They come from Wikimedia Commons under CC BY 3.0, which requires the title,
 * the author, the source, the licence and a note that the work was modified -
 * all of them are cropped to the aspect ratios the layout needs. The footer
 * renders this on every page, which is what discharges that obligation.
 *
 * Grouped by author and licence, because repeating "JCNazza, CC BY 3.0" once
 * per file reads like a bug rather than a credit.
 *
 * If these are replaced by the project's own photographs, delete this file
 * and the block in Footer.astro along with it.
 */
export interface PhotoSource {
  /** Title of the work, as given on Commons. */
  title: string;
  url: string;
  /** Which files in src/assets/malpica/ were cut from it. */
  files: string[];
}

export interface PhotoCredit {
  author: string;
  licence: string;
  licenceUrl: string;
  sources: PhotoSource[];
}

export const PHOTO_CREDITS: PhotoCredit[] = [
  {
    author: 'JCNazza',
    licence: 'CC BY 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sources: [
      {
        title: 'Malpica — panoramio (1)',
        url: 'https://commons.wikimedia.org/wiki/File:Malpica_-_panoramio_(1).jpg',
        files: ['hero.jpg', 'porto.jpg'],
      },
      {
        title: 'Malpica — panoramio (3)',
        url: 'https://commons.wikimedia.org/wiki/File:Malpica_-_panoramio_(3).jpg',
        files: ['peirao.jpg'],
      },
    ],
  },
];
