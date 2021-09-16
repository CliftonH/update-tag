const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');
async function run() {

  try {
    const { GITHUB_SHA, GITHUB_TOKEN } = process.env;
    const tagName = core.getInput('tag_name');
    const previousTagName = core.getInput('previous_tag_name');

    if (!GITHUB_SHA) {
      core.setFailed('Missing GITHUB_SHA');
      return;
    }

    if (!GITHUB_TOKEN) {
      core.setFailed('Missing GITHUB_TOKEN');
      return;
    }

    if (!tagName) {
      core.setFailed('Missing tag_name');
      return;
    }

    const octokit = new GitHub(GITHUB_TOKEN);

    async function getRef(tag) {
      try {
        return await octokit.git.getRef({
          ...context.repo,
          ref: `tags/${tag}`
        });
      } catch (e) {
        if (e.status === 404) {
          // Ignore tag not existing
        } else {
          throw e;
        }
      }
    }

    // Get the existing tag reference
    const tagRef = await getRef(tagName);

    // If there is no existing reference, create one and exit
    if (!tagRef) {
      return await octokit.git.createRef({
        ...context.repo,
        ref: `refs/tags/${tagName}`,
        sha: GITHUB_SHA
      });
    }

    // Get the sha of the existing tag
    const { data: { object: { sha } = {}} = {}} = tagRef;

    // If previous_tag_name is provided, create or update it at the current tag's sha
    if (previousTagName) {
      const previousTagRef = await getRef(previousTagName);

      if (!previousTagRef) {
        await octokit.git.createRef({
          ...context.repo,
          ref: `refs/tags/${previousTagName}`,
          sha
        });
      } else {
        await octokit.git.updateRef({
          ...context.repo,
          ref: `tags/${previousTagName}`,
          sha
        });
      }
    }

    // Finally, update the tag to the GITHUB_SHA
    await octokit.git.updateRef({
      ...context.repo,
      ref: `tags/${tagName}`,
      sha: GITHUB_SHA
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
