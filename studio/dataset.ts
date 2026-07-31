/**
 * The dataset is never inferred. Both the Studio app and the CLI resolve it here so
 * there is exactly one place where "which content am I touching" is decided.
 *
 * There is deliberately no fallback. A default of `production` means a machine with no
 * studio/.env silently edits Joan's real photos; a default of `development` means a
 * deploy silently ships a Studio pointed at stock content. Both have happened in this
 * repo's short history — so neither is the default, and an unset value is an error.
 */
export function requireDataset(): string {
  const dataset = process.env.SANITY_STUDIO_DATASET

  if (!dataset) {
    throw new Error(
      'SANITY_STUDIO_DATASET is not set.\n' +
        '  Local work:  cp .env.example .env   (sets development)\n' +
        '  Deploying:   use `npm run deploy`, which pins production explicitly.',
    )
  }

  return dataset
}
