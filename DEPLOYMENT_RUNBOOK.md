# Risk Intelligence Circuit v3 Deployment Runbook

Status: release-candidate preparation only. No step in this document is authorised until the owner provides the exact approval statement in `FINAL_OWNER_REVIEW.md`.

## Current production boundaries

- GitHub Pages uses legacy branch deployment from `main:/`, with HTTPS enforced and no CNAME.
- `origin/main` and the live v2 baseline are `3ff63e37b2560e5a7f1870dd047c0a3582c87c99`.
- Vercel Production is also connected to `main` and resolves to the same baseline commit.
- `redesign/risk-intelligence-v3` creates protected Vercel Preview deployments only.
- The release candidate uses Vite output in `dist`; the repository root is source, not the approved production artifact.

Merging while either legacy Pages branch deployment or Vercel Production auto-deployment remains active could replace production before the validated artifact path is ready. That sequence is prohibited.

## Deployment-strategy decision

### Selected: GitHub Actions Pages artifact deployment

The selected strategy builds from the locked source revision, validates it and uploads only `dist` with official GitHub Pages actions. It preserves reproducibility, separates source from output and records each deployment.

The prepared workflow is `.github/workflows/deploy-pages.yml.disabled`. GitHub does not recognise that extension, so it cannot run during Phase 8.

Prepared official actions, verified 2026-08-03:

| Action | Prepared reference | Current release checked | Licence |
| --- | --- | --- | --- |
| `actions/checkout` | `@v7` | 7.0.1 | MIT |
| `actions/setup-node` | `@v7` | 7.0.0 | MIT |
| `actions/configure-pages` | `@v6` | 6.0.0 | MIT |
| `actions/upload-pages-artifact` | `@v5` | 5.0.0 | MIT |
| `actions/deploy-pages` | `@v5` | 5.0.0 | MIT |

The draft grants only `contents: read`, `pages: write` and `id-token: write`, uses the platform-managed `github-pages` environment, serialises production deployments, installs locked dependencies, runs the build/audit/HTML gates, and uploads only `dist`. It has no repository secret, third-party deploy action, `workflow_run` trigger or redesign-branch deployment trigger.

### Rejected: commit `dist` to `main`

This would mix generated artifacts with source history, increase merge conflicts and make source/output divergence easier. It is not safer than an official artifact deployment.

### Rejected: continue root-source deployment

Vite source contains module imports and transformation inputs that GitHub's legacy static branch publisher does not build. Root-source deployment is therefore not a valid release architecture even if some documents appear directly loadable.

## Required configuration changes after explicit approval

These are owner-controlled production changes and were not performed in Phase 8:

1. Contain Vercel Production before merging by disabling `main` production auto-deployment for this project or disconnecting the Production Git integration. Keep the existing aliases on the old deployment until GitHub Pages v3 is verified.
2. Rename the disabled workflow to `.github/workflows/deploy-pages.yml`, commit it on the redesign branch and wait for read-only Redesign CI.
3. In repository Settings → Pages, change Build and deployment Source from `Deploy from a branch` to `GitHub Actions` during the controlled deployment window.
4. Configure the `github-pages` environment with an owner approval gate where the repository plan supports it.
5. Apply the recommended `main` branch protection before merge where available.
6. Open the prepared pull request, complete review, and merge only when the owner confirms that steps 1–5 are complete.

Expected production URL: `https://walawala254.github.io/`.

Expected artifact: the contents of reproducible `dist`, not the directory wrapper.

Expected trigger after activation: a reviewed push/merge to `main`, or an explicitly dispatched workflow on `main`.

## Controlled merge plan

Recommend a merge commit, not squash. The branch contains meaningful phase commits, and a merge commit creates one clear release boundary that can be reverted with `git revert -m 1` while preserving the detailed audit trail.

After the required settings are confirmed:

1. Activate the workflow on the redesign branch and push it normally.
2. Open `redesign/risk-intelligence-v3 → main` using `PULL_REQUEST_TEMPLATE_PHASE8.md`.
3. Require the branch to be up to date and the `Redesign CI / Release validation` check to pass.
4. Complete content, device, accessibility and deployment review.
5. Use GitHub's **Create a merge commit** option. Do not rebase, force-push or push directly to `main`.
6. Watch the Pages workflow build, artifact upload, environment approval and deployment.
7. Verify every public route, metadata, assets and browser console at the production URL.
8. Verify Vercel Production and its aliases were not moved.

## Branch-protection audit and recommendation

Current state: GitHub's protection API reports that `main` is not protected.

Recommended controls, subject to repository-plan availability:

- Require a pull request and at least one approval.
- Require the branch to be up to date.
- Require `Redesign CI / Release validation` and conversation resolution.
- Block force pushes and branch deletion.
- Restrict direct pushes where practical.
- Keep deployment approval separate through the `github-pages` environment.

These settings were not changed in Phase 8.

## Vercel recommendation

Keep Vercel as a protected Preview platform through launch review. Before the GitHub Pages merge, prevent `main` from creating or promoting a Vercel Production deployment. After a stable GitHub Pages launch, either retain Vercel as preview-only or remove the production connection. Do not use it as an undocumented second production origin.

## Verification after deployment

1. Confirm the Pages workflow conclusion and deployed commit SHA.
2. Fetch `/`, every `.html` route, the nested case study, `404.html`, `robots.txt`, `sitemap.xml` and the favicon over HTTPS.
3. Run the release browser, accessibility, link, metadata and console checks against the production origin.
4. Confirm canonical and Open Graph URLs still use `https://walawala254.github.io/`.
5. Confirm prototypes remain noindex, absent from the sitemap and absent from production navigation/request graphs.
6. Record deployment ID, reviewer, approval, timestamp and verification evidence.

## Rollback layers

### Before merge

Production is unchanged. Correct the redesign branch with normal commits or close the proposed PR. Do not delete history or force-push.

### Accidental merge before boundary changes

Treat this as a deployment incident because legacy Pages and Vercel can react to `main`. Stop further changes, record the merge SHA, create an authorised revert PR immediately and verify both providers. Do not assume the old site remained live.

### After the GitHub Pages v3 deployment

1. Record the release merge SHA, failed deployment ID and last known good production SHA.
2. Create a rollback branch from current `main`.
3. Prepare a normal merge revert without committing:

   ```powershell
   git revert --no-commit -m 1 <release-merge-sha>
   git restore --source=<release-merge-sha> -- .github/workflows/deploy-pages.yml
   git commit -m "revert: restore portfolio v2 production"
   ```

   Retaining the deployment workflow is intentional. Its locked-build path deploys v3 revisions; its allowlisted legacy fallback stages the restored v2 HTML, CSS, JavaScript and root images into `dist`.

4. Run the static v2 checks in a detached worktree and inspect the rollback diff.
5. Open and merge the rollback PR after approval. The retained Pages workflow publishes the allowlisted legacy artifact.
6. If Actions cannot deploy, after the revert reaches `main` explicitly switch Pages back to `main:/` as an emergency owner-approved fallback.
7. Verify Home, About, Services, Portfolio, Contact, assets, HTTPS, Pages status and Vercel aliases.
8. Record the incident, cause, recovery SHA, deployment ID and follow-up work.

Emergency known-good content reference: `3ff63e37b2560e5a7f1870dd047c0a3582c87c99`.

Never use `git reset --hard`, force-push, history rewriting or deletion of `main` as a rollback mechanism.

## Phase 8 rollback rehearsal

The allowlisted legacy branch of the disabled workflow was reproduced from `3ff63e37b2560e5a7f1870dd047c0a3582c87c99` in a detached worktree. It produced 17 files / 712,586 bytes, contained all five public version-two documents plus their required CSS, JavaScript and root images, and had no missing local HTML references. The temporary worktree was unregistered and cleaned without changing a branch. This demonstrates artifact preparation only; no production deployment or rollback was executed.
