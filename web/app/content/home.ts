/**
 * Static stand-in for the home page's content.
 *
 * This directory exists so the components can be built and reviewed before the Sanity
 * schema does. It is not `app/queries/` and must not become it: `queries/` holds GROQ,
 * which is the real contract between a route and the content model. When a section goes
 * live, its data moves from here to a `defineQuery` in `queries/home.ts` and the
 * component consuming it does not change — that is the whole point of the split.
 *
 * The copy below is verbatim from joanatstake.com, curly quotes and all.
 *
 * Placeholder imagery is Unsplash. `photo` holds a bare URL with no query string;
 * SitePhoto composes the transform params, the same way it will compose Sanity image CDN
 * params later. Every URL here was verified to return 200 before being committed.
 * `grep -rn images.unsplash.com web/` finds all of them when it is time to delete them.
 */

/** One photo. Mirrors what a dereferenced `photo` document will give us: an image and its own alt text. */
export type Photo = {
  src: string
  /** Belongs to the photo, never to the call site. See Rule 1 in CLAUDE.md. */
  alt: string
  /** CSS aspect-ratio. Reserves the box so nothing shifts as images load. */
  aspect: string
}

/**
 * A run of text inside a paragraph. A bare string is plain text; the object form carries a
 * link or emphasis.
 *
 * This is not a portable-text renderer and must not grow into one — CLAUDE.md rules out
 * long-form writing in the CMS. It exists only because two of her intro paragraphs contain
 * an inline link and an inline italic, and flattening those to plain strings would lose them.
 */
export type TextRun = string | { text: string, href?: string, em?: true }

export type Paragraph = TextRun[]

export type WritingCard = {
  title: string
  excerpt: Paragraph
  /** Where "Read more" goes. External for the NYT piece, her own site for the other two. */
  href: string
  photo: Photo
}

export const HOME = {
  hero: {
    heading: 'Welcome',
    body: [
      'I\'m a former newspaper reporter who still likes to recount what I\'ve recently seen. '
      + 'I\'ll leave fiction writing to others. My take is the wry side of real life, '
      + 'exploring, observing, weighing in.',
    ] satisfies Paragraph,
    photo: {
      src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      alt: 'Placeholder portrait of a smiling woman, standing in for Joan\'s hero photograph.',
      aspect: '4/5',
    } satisfies Photo,
  },

  intro: [
    [
      'Here on my personal site, I’m sharing essays, blog posts and photos too, most shot '
      + 'on the street with my iPhone. I like the small things that can sometimes tell a '
      + 'bigger story. Or at least that ought to be good for a laugh.',
    ],
    [
      'In my professional life, I’m focused on consulting opportunities in Communications '
      + 'and PR, handling media outreach and content. More on ',
      { text: 'LinkedIn', href: 'https://www.linkedin.com/in/joanlebow' },
      ' and in my bio.',
    ],
  ] satisfies Paragraph[],

  featuredWriting: {
    heading: 'Featured Writing',
    /**
     * Her live cards show dates of "January 1, 2030" — a Squarespace ordering hack, not
     * real publication dates. Dropped rather than reproduced; the NYT card's real date
     * already sits inside its own excerpt.
     */
    items: [
      {
        title: 'The Uncomfy Couch, a New York Times Rites of Passage Essay',
        excerpt: [
          'My personal essay in the New York Times Rites of Passage column published July 25, 2019',
        ],
        href: 'https://www.nytimes.com/2019/07/25/style/letting-go-of-the-sentimental-but-uncomfortable-couch.html',
        photo: {
          src: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
          alt: 'Placeholder photograph of a green velvet sofa in an empty room.',
          aspect: '3/2',
        },
      },
      {
        title: 'Replaceable You',
        excerpt: [
          'I see now that my first writing job would be an ideal candidate for AI obliteration. '
          + 'Its personal moments, expendable.',
        ],
        href: 'https://joanatstake.com/copy/writing-list/replaceable-you',
        photo: {
          src: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e',
          alt: 'Placeholder photograph of a closed notebook and pencil on a wooden table.',
          aspect: '3/2',
        },
      },
      {
        title: 'Sweet 15 - A Hound\'s Farewell',
        excerpt: [
          'I have decided to treat my dog like a celebrity. Taking full consideration of '
          + 'Roxy’s greatness, and of her failing senses and joints, I am writing her '
          + 'obituary in advance.',
        ],
        href: 'https://joanatstake.com/copy/writing-list/sweet15houndfarewell',
        photo: {
          src: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
          alt: 'Placeholder photograph of a beagle looking up at the camera.',
          aspect: '3/2',
        },
      },
    ] satisfies WritingCard[],
  },

  handle: {
    heading: 'Getting a Handle on @joanatstake',
    body: [
      'I\'m no heretic and I certainly don\'t know any saints. So why ',
      { text: 'joanatstake', em: true },
      '? A burning love for wordplay, I suppose. It felt like the right name to let creative '
      + 'sparks fly. Plus, there was a lot “at stake” when I first built my social '
      + 'media cred within my decades-long Communications career. You don’t have to be a '
      + 'digital native to claim a little territory.',
    ] satisfies Paragraph,
  },

  /** The five-across strip that closes her home page. */
  strip: [
    {
      src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      alt: 'Placeholder street portrait of a man in a white t-shirt against a concrete wall.',
      aspect: '3/4',
    },
    {
      src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      alt: 'Placeholder street portrait of a man in a grey sweater.',
      aspect: '3/4',
    },
    {
      src: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
      alt: 'Placeholder portrait of a woman with short hair beside water.',
      aspect: '3/4',
    },
    {
      src: 'https://images.unsplash.com/photo-1502764613149-7f1d229e230f',
      alt: 'Placeholder street portrait of a woman in an orange top against a brick wall.',
      aspect: '3/4',
    },
    {
      src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
      alt: 'Placeholder portrait of a man with curly hair on a dark background.',
      aspect: '3/4',
    },
  ] satisfies Photo[],
}
