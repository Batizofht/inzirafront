/**
 * Submits the sitemap URLs to IndexNow once the deploy is actually live.
 *
 * This has to run on onSuccess, not during the build: IndexNow verifies
 * ownership by fetching the key file from the site, and the new sitemap has to
 * be the one being served. Running it in the build step would submit the
 * previous deploy's URLs against a key file that may not exist yet.
 */
const { execFile } = require('child_process');
const path = require('path');
const { promisify } = require('util');

const run = promisify(execFile);

module.exports = {
  async onSuccess({ utils }) {
    const script = path.join(process.cwd(), 'scripts', 'ping-search-engines.js');

    try {
      const { stdout } = await run(process.execPath, [script], {
        env: process.env,
        timeout: 60_000,
      });
      console.log(stdout);
    } catch (error) {
      // Never fail a deploy because a search engine was unreachable.
      utils.status.show({
        title: 'Search engine ping skipped',
        summary: error.message,
      });
    }
  },
};
