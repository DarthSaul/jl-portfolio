/**
 * Site chrome: wordmark, nav, footer links.
 *
 * This is not CMS content and probably never will be. It describes the shape of the site
 * itself — it changes when we change the route table, not when she edits a page. Keeping
 * it out of Sanity is one less knob in a Studio that should stay boring.
 */

export type NavItem = {
	label: string;
	to: string;
};

export type SocialIcon = 'mail' | 'linkedin' | 'substack' | 'instagram';

export type SocialLink = {
	/** Accessible name. The rendered link is icon-only, so this is the only label a screen reader gets. */
	label: string;
	href: string;
	icon: SocialIcon;
};

export const SITE = {
	title: 'Joan Lebow',
	tagline: 'Staking things out, making a few claims',
	description:
		'Essays, blog posts and street photography from Joan Lebow — a former newspaper ' +
		'reporter with a taste for the wry side of real life.',

	/**
	 * Her labels, and now her words.
	 *
	 * This used to read START / WRITING / ABOUT, on the grounds that those said the same things
	 * in words a first-time visitor already knows. She asked for her own back: COPY and BIO are
	 * what her Squarespace site called them, and they are what she calls them. The routes moved
	 * with the labels — `/copy` and `/bio` — so a label and its path still agree instead of
	 * needing translation. `web/nuxt.config.ts` redirects the old two.
	 *
	 * START has not moved and is not SHOTS yet. Renaming it was asked for and then deferred, so
	 * the top-level item still says START and still points at `/`. The galleries and ALL SHOTS
	 * hang under it, in `SiteNav`.
	 *
	 * Stored in sentence case and uppercased in CSS so that assistive tech reads "Copy"
	 * rather than spelling it out. Keep the stored value in sentence case whatever the design
	 * does — a spec that stops uppercasing them costs nothing, and one that stores them shouting
	 * cannot be undone from a stylesheet.
	 *
	 * /contact is deliberately absent — the sidebar carries contact, exactly as her current
	 * site does.
	 */
	nav: [
		{ label: 'Start', to: '/' },
		{ label: 'Copy', to: '/copy' },
		{ label: 'Bio', to: '/bio' },
	] satisfies NavItem[],

	/** Her links, with the two `http://` ones upgraded to `https://`. */
	social: [
		{ label: 'Email Joan', href: 'mailto:joanlebow@gmail.com', icon: 'mail' },
		{ label: 'Joan on LinkedIn', href: 'https://www.linkedin.com/in/joanlebow', icon: 'linkedin' },
		{ label: 'Joan on Substack', href: 'https://substack.com/@joanatstake', icon: 'substack' },
		{ label: 'Joan on Instagram', href: 'https://www.instagram.com/joanatstake', icon: 'instagram' },
	] satisfies SocialLink[],

	copyright: 'copy + images © joan lebow',
	credit: 'made with ❤️ by saul graves',
};
