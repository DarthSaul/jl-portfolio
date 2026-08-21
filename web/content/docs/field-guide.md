# Managing Your Website

_Here's a guide_

<!--
  Screenshots: an image whose URL starts with `placeholder:` renders on /docs as a dashed
  box holding its description — no file needed yet. To swap in a real screenshot, save it
  as web/public/docs/<slug>.png and change that one line's URL from `placeholder:<slug>`
  to `/docs/<slug>.png`. Nothing else moves. See web/src/components/docs/DocImage.tsx.
-->

## 1. Overview

Your website has two parts:

**The site itself** — what visitors see: [joanatstake.com](https://joanatstake.com).

**The Studio** — your content management system. This is where you add photos, write posts, and rearrange things. Visitors never see it. You get there at [joanatstake.com/admin](https://joanatstake.com/admin), which forwards you to the Studio and asks you to sign in. Only you and Saul have access to this CMS.

Three things worth knowing before anything else:

**You can't break the design.** You choose which photos, in what order, and which layout — the site handles sizes, columns, and how everything looks on a phone. There is no setting in the Studio that can make the site ugly or broken.

**Nothing is public until you press Publish.** Everything you type is saved automatically as a draft only you can see. The site changes only when you press the blue Publish button.

**Changes take about a minute to appear.** After you publish, the site catches up within sixty seconds or so. If you don't see your change, wait a moment and refresh the page.

![Screenshot: the Studio home screen after signing in, with the sidebar visible](/docs/studio-home.png)

## 2. A map of the Studio

The left sidebar is the whole Studio. Top to bottom:

**Pages** — the four fixed pages of the site: Home, Copy, Bio, and Contact. Each exists exactly once and can't be deleted, only edited.

**Galleries** — your photo collections. Each gallery is a page on the site (like /shots/mexico-2022), and creating one automatically adds it to the site's menu. Deleting one removes the page.

**Photos** — every photograph you've uploaded, with three views: _All photos_, _Not tagged yet_ (a to-do list of sorts), and _Browse by tag_.

**Tags** — where you create and rename tags. Tags are your filing system: "Mexico 2022", "Life", "Street".

**Copy posts** — writing that lives on your site, like the hound's farewell.

**Copy links** — pointers to writing published elsewhere, like your NY Times piece. A link, not an essay — you never paste the text in.

**Site settings** — the handful of things that belong to the whole site: your name, the byline under it, and your email/Instagram/LinkedIn links.

## 3. Drafts, publishing, and undo

### Publishing

Open anything, make a change, and it saves as a draft instantly — there is no Save button to remember. When you're ready for the world to see it, press **Publish** in the bottom right.

In lists, the little dots tell you where things stand: a **green dot** means published and live; a **yellow dot** means there are edits you haven't published yet.

![Screenshot: a document with unpublished edits — yellow dot and the Publish button](/docs/draft-and-publish.png)

### Required fields and warnings

Fields marked with an asterisk are required — Publish stays greyed out until they're filled, and a **red** marker points at what's missing. An **amber** marker is only a suggestion ("worth adding a summary") — you can publish right past it.

### Undoing things

If a draft went wrong, open the menu (the ⋮ next to Publish) and choose **Discard changes** — the document returns to whatever is currently published.

If you published something and regret it, click the status text at the bottom of the editor (it says something like "Published 2 days ago"). A history panel opens showing every previous version — pick one and choose **Revert to revision**. Nothing you publish is ever truly lost.

The Studio also protects you from the classic mistakes: it won't let you delete a photo or tag that's still used somewhere (it tells you where), and the four Pages and Site settings can't be deleted at all.

## 4. Photos

One photograph is _one record_ in the Studio, no matter how many places it appears. Fix a typo in a caption once and it's fixed on the front page, in every gallery, and in every post that uses it. This is the single most useful thing to understand about how the site works.

### Uploading a photo

Go to **Photos → All photos** and press the compose/plus button. Each photo has two tabs:

The **Photo** tab:

- **The photograph** — drag the image in or click to choose a file. Full-resolution iPhone photos are fine; the site automatically serves fast, resized copies.
- **Describe the photo** — required. One line saying what's in the frame ("Two swimmers at the edge of a harbour pool at dusk"). It's read aloud for people using screen readers and shown if the image fails to load.
- **Caption** — optional. Shown under the photo on the site. Leave blank for no caption.

The **Details** tab — all optional:

- **Place** and **Date taken** — private notes for you, never shown on the site. Their job is helping you find a photo again months from now, and they power the sort menu.
- **Tags** — your filing system; more below.
- **Hide from the All Shots page** — tick this for a photo that isn't really part of your photography, like a cover image that belongs to an article. It stays visible everywhere you've placed it by hand.

![Screenshot: adding a new photo from All photos tab](/docs/add-new-photo.png)

![Screenshot: the photo editing form, Photo tab](/docs/new-photo-form.png)

### Finding photos later

In any photo list, the ⋮ menu at the top lets you sort by recently added, date taken, or place. **Browse by tag** shows photos grouped by tag, and **Not tagged yet** collects everything you haven't filed — handy after a big upload session.

## 5. Tags

A tag is a topic: a trip, a theme, a series. Tags do three things:

- They group photos in the Studio so you can find them.
- They become filter buttons on the site's All Shots page.
- A gallery can be set to "show everything with this tag" — more in the next section.

Create and rename tags freely under **Tags**. Renaming is safe: every photo carrying the tag follows automatically. The one field to leave alone once it's out in the world is the **web address** — changing it breaks links people have already shared.

You can't delete a tag that photos are still using — the Studio will name the photos and ask you to untag them first. That's a guardrail, not a bug.

## 6. Galleries

A gallery is a page of photos on the site. Creating one is the only step — the moment it exists, it has its own page and appears in the site's menu.

### The fields

- **Title** — the gallery's name, shown on the site.
- **Web address** — press Generate to make one from the title (e.g. "iceland" becomes /shots/iceland). Same rule as tags: fine to set, avoid changing later.
- **Short description** — optional; the blurb that appears when someone shares a link to the gallery.
- **Layout** — Grid (several photos across, in rows) or Stack (one at a time, down the page). Both work on a phone. You can switch anytime.

### Two ways to fill a gallery

**By hand:** leave "Fill from a tag" empty and add photos to the list yourself. **Drag to reorder** — the order in the list is the order on the page, and the first photo is the gallery's cover. This is the mode for a curated set.

**From a tag:** pick a tag in "Fill from a tag" and the gallery shows every photo carrying it, newest first — tag a new photo and it appears on the page by itself, nothing to update. This is the mode for an ongoing collection.

Pick one mode per gallery. If a gallery somehow ends up with both a tag and a hand-picked list, the Studio flags it and explains: only the tag is being used, and clearing it brings your hand-picked list back.

![Screenshot: dragging photos to reorder inside a gallery](/docs/gallery-reorder.png)

## 7. Your writing (Copy)

Your writing lives in two lists, split by where the piece lives:

### Copy posts — writing that lives here

An essay published on your own site. The fields:

- **Headline** and **Web address** (press Generate).
- **One-line summary** — recommended; it's what tells someone whether to open the piece.
- **Cover photo** — optional; shown beside the post in lists. A landscape (wide) photo works best — tall ones get cropped from the centre.
- **Date published** — the Copy page lists newest first, so this decides the order.
- **The writing** — the piece itself. You have paragraphs, a subheading style, a quote style, bold, italics, and links. To put a photo between paragraphs, use the **Insert** button and pick one of your photos, then choose how it sits: _Wrapped_ (text flows around it) or _Full width_. The photo's caption comes from the photo itself — fix it there and it's fixed everywhere.

### Copy links — writing that lives elsewhere

A pointer to a piece published by someone else (the Times, HuffPost). Headline, the publication's name, the full link, the date, a one-line summary, and an optional cover photo. You never copy the article's text in — that's their page, and yours just points at it.

## 8. The Pages

### Home

The front page, edited top-to-bottom in the order it reads:

- **Featured photos** — exactly five, at the top of the page. Drag to reorder. Open each slot to optionally make the photo _link to a gallery_ when clicked.
- **Photos section title and subtitle** — the heading over the photo row (bold, italics, and a link are allowed inside it) and the short text under it.
- **Featured writing** — exactly three pieces, posts and links mixed however you like, in the order they appear.

![Screenshot: the Home page document with the five featured photo slots](/docs/home-featured.png)

### Copy

The writing page mostly runs itself — everything in Copy posts and Copy links appears here, newest first. Two knobs: an optional **introduction** at the top, and an optional **featured piece** to lead the page. Leave "featured" empty and your most recent piece leads automatically, which needs no upkeep.

### Bio

A heading, an introduction set in larger type, and then the bio itself — written exactly like a post's body, so you can place photos between paragraphs the same way. A photo placed first sits at the top like a portrait.

### Contact

A short introduction in your own words. The actual links — email, Instagram, LinkedIn, Threads — live in **Site settings**, because they appear across the site, not just here.

### Site settings

- **Site name** and **Byline** — your name and the line under it, on every page.
- **Site description** — one sentence shown in Google results and link previews; not shown on the site itself.
- **Sharing image** — the photo that appears when someone shares a link to your site. Pick a wide one.
- **Links** — your email and social links. Drag to reorder.

## 9. When something looks off

**"I published but the site hasn't changed."** The site takes up to a minute to catch up. Wait, then refresh. If you're staring at it on your phone, close the tab and reopen it.

**"Publish is greyed out."** A required field is empty somewhere — look for the red marker. Amber markers don't block anything.

**"I can't delete this."** The Studio blocks deleting anything that's still in use, and tells you where it's used. Remove it from those places first. The four Pages and Site settings can never be deleted — the site needs them.

**"A photo won't upload."** Check your internet connection and try again; very occasionally a refresh of the browser tab is all it takes.

**"The Studio is acting strange."** Refresh the browser tab. Your work is saved continuously, so you'll lose nothing.

## 10. Asking Claude for help

You have a project space in Claude set up just for the website. When something in this guide isn't enough — or you can't remember where a thing lives — ask there, in plain English, the way you'd ask Saul:

- "How do I make a new gallery from my Chile photos?"
- "I want a different photo to lead the front page."
- "What's the difference between a Copy post and a Copy link again?"
- "I published a post but I don't see it on the site."

Claude knows how your site is put together and can walk you through the steps. Once the Sanity connection is set up in your project, Claude can also look directly at your actual content — so you can ask things like "which photos haven't I tagged yet?" or "list my galleries" and get real answers, not general ones.

And for anything Claude can't sort out: that's what Saul is for.

## 11. Handy links

- Your site: [joanatstake.com](https://joanatstake.com)
- The Studio (backstage): [joanatstake.com/admin](https://joanatstake.com/admin)
- Sanity's own quick start for editors — a good second read that covers the Studio in general: [Content operators quick start guide](https://www.sanity.io/docs/user-guides/content-operations-cheatsheet)
- More short guides from Sanity: [Sanity user guides](https://www.sanity.io/docs/user-guides)
- If you're ever curious how content-first publishing works under the hood: [Intro to Structured Content](https://www.sanity.io/learn/course/hello-structured-content) (a free short course)

_A note on what's in Sanity's general docs but not on your site: comments/tasks between teammates, Media Library, translations, and scheduled publishing aren't part of your setup — skip those sections._
