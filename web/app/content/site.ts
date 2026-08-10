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

export type SocialIcon = 'mail' | 'linkedin' | 'threads' | 'instagram';

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
	 * Her labels, our routes.
	 *
	 * These were her Squarespace words — HOME, COPY, BIO, SHOTS — and they are not any more.
	 * START, WRITING and ABOUT say the same things in words a first-time visitor already knows,
	 * and the paths were already `/`, `/writing` and `/about`, so the labels and the routes now
	 * agree instead of needing translation.
	 *
	 * SHOTS is gone rather than renamed. Its page was a stub, and the photographs are reached
	 * through the galleries listed under START — which is a real list of her work rather than a
	 * heading with nothing behind it.
	 *
	 * Stored in sentence case and uppercased in CSS so that assistive tech reads "Writing"
	 * rather than spelling it out. Keep the stored value in sentence case whatever the design
	 * does — a spec that stops uppercasing them costs nothing, and one that stores them shouting
	 * cannot be undone from a stylesheet.
	 *
	 * /contact is deliberately absent — the sidebar carries contact, exactly as her current
	 * site does.
	 */
	nav: [
		{ label: 'Start', to: '/' },
		{ label: 'Writing', to: '/writing' },
		{ label: 'About', to: '/about' },
	] satisfies NavItem[],

	/** Her links, with the two `http://` ones upgraded to `https://`. */
	social: [
		{ label: 'Email Joan', href: 'mailto:joanlebow@gmail.com', icon: 'mail' },
		{ label: 'Joan on LinkedIn', href: 'https://www.linkedin.com/in/joanlebow', icon: 'linkedin' },
		{ label: 'Joan on Threads', href: 'https://www.threads.com/joanatstake', icon: 'threads' },
		{ label: 'Joan on Instagram', href: 'https://www.instagram.com/joanatstake', icon: 'instagram' },
	] satisfies SocialLink[],

	copyright: 'copy + images © joan lebow',
	credit: 'made with ❤️ by saul graves',
};
