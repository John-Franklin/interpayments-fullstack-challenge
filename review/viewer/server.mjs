// Local "GitHub-style" viewer for review/PR-231.{md,diff}. Comments and the verdict are stored in REVIEW.md
// at the repo root, which stays a plain, readable markdown document.
//
//   node review/viewer/server.mjs        then open http://localhost:4231
//
// No dependencies. Listens on 127.0.0.1 only.

import { createServer } from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const files = {
  page: path.join(here, 'index.html'),
  description: path.join(repoRoot, 'review', 'PR-231.md'),
  diff: path.join(repoRoot, 'review', 'PR-231.diff'),
  review: process.env.REVIEW_FILE ? path.resolve(process.env.REVIEW_FILE) : path.join(repoRoot, 'REVIEW.md'),
};
const PORT = Number(process.env.PORT ?? 4231);

const VERDICTS = ['Comment', 'Approve', 'Request changes'];

// ---- REVIEW.md <-> { verdict, summary, comments, other } ----
//
// # Review: PR #231 — Daily settlement report
//
// ## Verdict
//
// **Request changes**
//
// Summary text...
//
// ## Comments
//
// ### `bff/src/controllers/reports.controller.ts:12`
//
// Comment body...
//
// ### `web/src/App.tsx:8` (removed line)
//
// ...
//
// Any other `## ` section (e.g. one you add by hand) is kept as-is and written back after the comments.

const COMMENT_HEADING = /^### `([^`]+?):(\d+)`( \(removed line\))?\s*$/;

export function parseReview(markdown) {
  const review = { verdict: 'Comment', summary: '', comments: [], other: '' };
  const sections = [];
  let current = null;

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const h2 = /^## (.+?)\s*$/.exec(line);
    if (h2) {
      current = { title: h2[1], lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }

  const others = [];
  for (const section of sections) {
    const title = section.title.toLowerCase();
    if (title === 'verdict') {
      const body = section.lines.join('\n').trim();
      const verdict = /^\*\*(.+?)\*\*\s*(?:\n|$)/.exec(body);
      if (verdict && VERDICTS.includes(verdict[1])) {
        review.verdict = verdict[1];
        review.summary = body.slice(verdict[0].length).trim();
      } else {
        review.summary = body;
      }
    } else if (title === 'comments') {
      let comment = null;
      for (const line of section.lines) {
        const heading = COMMENT_HEADING.exec(line);
        if (heading) {
          comment = { file: heading[1], line: Number(heading[2]), side: heading[3] ? 'old' : 'new', body: [] };
          review.comments.push(comment);
        } else if (comment) {
          comment.body.push(line);
        }
      }
      for (const c of review.comments) c.body = c.body.join('\n').trim();
    } else {
      others.push(`## ${section.title}\n${section.lines.join('\n')}`.trimEnd());
    }
  }

  review.other = others.join('\n\n');
  review.comments.forEach((c, i) => (c.id = i));
  return review;
}

export function serializeReview(review) {
  const comments = [...review.comments].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  const parts = [
    '# Review: PR #231 — Daily settlement report',
    '## Verdict',
    `**${review.verdict}**`,
  ];
  if (review.summary.trim()) parts.push(review.summary.trim());
  parts.push('## Comments');
  if (comments.length === 0) parts.push('_No comments yet._');
  for (const c of comments) {
    parts.push(`### \`${c.file}:${c.line}\`${c.side === 'old' ? ' (removed line)' : ''}`);
    parts.push(c.body.trim());
  }
  if (review.other.trim()) parts.push(review.other.trim());
  return parts.join('\n\n') + '\n';
}

function validate(input) {
  if (!input || typeof input !== 'object') throw new Error('body must be an object');
  const verdict = VERDICTS.includes(input.verdict) ? input.verdict : 'Comment';
  const comments = (Array.isArray(input.comments) ? input.comments : []).map((c) => {
    if (typeof c.file !== 'string' || !/^[^`\n]+$/.test(c.file)) throw new Error('bad comment file');
    if (!Number.isInteger(c.line) || c.line < 1) throw new Error('bad comment line');
    if (typeof c.body !== 'string' || !c.body.trim()) throw new Error('comment body is empty');
    // A line starting with "## " or "### `" inside a body would be read back as a new section or comment
    const body = c.body.replace(/^(#{2,3} )/gm, '\\$1');
    return { file: c.file, line: c.line, side: c.side === 'old' ? 'old' : 'new', body };
  });
  const summary = String(input.summary ?? '').replace(/^(#{2,3} )/gm, '\\$1');
  return { verdict, summary, comments, other: String(input.other ?? '') };
}

async function loadReview() {
  try {
    return parseReview(await readFile(files.review, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return { verdict: 'Comment', summary: '', comments: [], other: '' };
    throw err;
  }
}

async function saveReview(review) {
  const tmp = `${files.review}.tmp`;
  await writeFile(tmp, serializeReview(review), 'utf8');
  await rename(tmp, files.review);
}

// ---- HTTP ----

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function readBody(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 1_000_000) throw new Error('body too large');
  }
  return JSON.parse(data);
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && pathname === '/') return send(res, 200, await readFile(files.page, 'utf8'), 'text/html; charset=utf-8');
    if (req.method === 'GET' && pathname === '/api/pr') {
      const [description, diff] = await Promise.all([readFile(files.description, 'utf8'), readFile(files.diff, 'utf8')]);
      return send(res, 200, { description, diff });
    }
    // Raw files, so the relative link in the PR description works
    if (req.method === 'GET' && pathname === '/PR-231.diff') return send(res, 200, await readFile(files.diff, 'utf8'), 'text/plain; charset=utf-8');
    if (req.method === 'GET' && pathname === '/REVIEW.md') return send(res, 200, serializeReview(await loadReview()), 'text/plain; charset=utf-8');
    if (req.method === 'GET' && pathname === '/api/review') return send(res, 200, await loadReview());
    if (req.method === 'PUT' && pathname === '/api/review') {
      let review;
      try {
        review = validate(await readBody(req));
      } catch (err) {
        return send(res, 400, { error: err.message });
      }
      await saveReview(review);
      return send(res, 200, await loadReview());
    }
    send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`PR #231 review: http://localhost:${PORT}  (comments are saved to ${path.relative(process.cwd(), files.review) || 'REVIEW.md'})`);
  });
}
