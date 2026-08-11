import type { Metadata } from 'next'

import { Intro } from '@/components/about/Intro'
import { ProseBody } from '@/components/ProseBody'
import { MissingDocumentError } from '@/sanity/errors'
import { orThrow, sanityFetch } from '@/sanity/fetch'
import { ABOUT_QUERY } from '@/sanity/queries/about'

/**
 * BIO — a heading and introduction, then a few paragraphs with photographs among them.
 *
 * `ProseBody` is the same renderer a writing post uses, because it is the same field shape: it
 * handles the prose, the links inside it, and the photographs that wrap text around themselves.
 * The page adds the column they sit in and nothing else.
 *
 * **Every photograph on this page comes from the body.** There is no separate photo field and no
 * photo rendered outside the prose — she places them by typing around them, which is `aboutPage`'s
 * design and the reason it has no `portrait`. A pinned portrait briefly appeared below the body,
 * read across from `homePage.introPhoto` because the front page had stopped showing it; both that
 * field and the cross-document read are gone.
 *
 * No page heading beyond her own: the nav already says BIO, so a second "Bio" under the tab you
 * just clicked is a heading worth deleting. `introHeading` is hers and is something else —
 * "Welcome" — which is why it renders and a route-name heading would not. The `title` field is the
 * browser tab only, which is what the Studio tells her it is, and it is used bare because its
 * initial value already ends in her name and the default template would append it twice.
 *
 * The route is `/bio` and the document type is still `aboutPage`; only her word and the address
 * moved. Same for the component directory, which is still `about/`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { data } = await sanityFetch(ABOUT_QUERY)
  return data ? { title: { absolute: data.title } } : {}
}

export default async function BioPage() {
  const about = orThrow(await sanityFetch(ABOUT_QUERY))

  /**
   * `aboutPage` is a singleton the Studio will not let her delete, so a missing document means the
   * dataset is wrong — the wrong name, or one never seeded. It throws rather than rendering an
   * empty page, the same call the front page makes and for the same reason. That is the difference
   * from /copy, where a missing singleton only costs an optional intro.
   */
  if (!about) throw new MissingDocumentError('aboutPage')

  return (
    /*
      `max-w-read` and no `mx-auto`: the prose measure sits flush left in the main column, under the
      sidenav's alignment rather than floating in the middle of the page.

      `space-y` rather than a margin on the body, so the gap disappears along with the intro when
      both of its fields are empty — both are optional in the schema.
    */
    <div className="max-w-read space-y-5">
      <Intro
        heading={about.introHeading}
        intro={about.intro}
        className="border-b border-hairline pb-4"
      />

      <ProseBody value={about.body} className="type-body-serif-lg" />
    </div>
  )
}
