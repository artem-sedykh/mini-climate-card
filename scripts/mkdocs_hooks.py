"""Build-time fixes that keep `docs/` readable in both places it is read.

The same markdown files are read on GitHub, where there is no sidebar, and on
the site, where there is one. Rather than choose - or keep two copies, which is
what a wiki would have been - the two differences are patched here, while the
files on disk stay exactly as they are.

Registered from `mkdocs.yml` under `hooks:`; MkDocs imports this module and
calls whichever `on_*` functions it defines.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The hand-written breadcrumb under the title of every page in `docs/`. It is
# there for people reading the files on GitHub, where nothing else links the
# pages together. On the site the navigation does that job, and the line would
# be a row of duplicate links under every heading.
NAV_LINE = re.compile(r'^\[Home\]\(\.\./README\.md\)\s*\|.*\n+', re.MULTILINE)

# Links in README.md are absolute, because HACS renders that file outside of
# GitHub and resolves relative paths against a URL of its own (see AGENTS.md).
# On the site the same links should stay on the site.
README_DOCS_LINK = re.compile(
    r'https://github\.com/artem-sedykh/mini-climate-card/blob/master/docs/([\w-]+\.md(?:#[\w-]+)?)'
)

# A link out of `docs/` - `../README.md`, `../AGENTS.md`. Correct on GitHub,
# where the reader is standing in the repository, and broken on the site, where
# nothing above `docs/` is published. MkDocs says so in strict mode, which is
# how these get found rather than shipped.
ESCAPING_LINK = re.compile(r'\]\(\.\./([^)\s]+)\)')

BLOB = 'https://github.com/artem-sedykh/mini-climate-card/blob/master/'


def _resolve_escaping_link(match):
    """Send a link out of `docs/` somewhere that exists.

    README.md is on the site - it is the front page, generated below - so those
    resolve locally, anchor and all. Everything else lives only in the
    repository, and the repository is where the reader is sent.
    """
    target = match.group(1)

    if target == 'README.md' or target.startswith('README.md#'):
        return '](' + target.replace('README.md', 'index.md', 1) + ')'

    return f']({BLOB}{target})'


def sync_index():
    """Publish README.md as the site's front page.

    The alternative was a hand-written `docs/index.md`, which would have been a
    second description of the card to keep level with the first. This way the
    front page is the README, and there is one of it. The result is git-ignored.
    """
    content = README_DOCS_LINK.sub(r'\1', (ROOT / 'README.md').read_text(encoding='utf-8'))
    index = ROOT / 'docs' / 'index.md'

    if not index.exists() or index.read_text(encoding='utf-8') != content:
        index.write_text(content, encoding='utf-8')

    return index


def on_config(config):
    """Put the front page in place before anything reads the file tree."""
    sync_index()

    return config


def on_page_markdown(markdown, page, config, files):
    """Drop the breadcrumb line, and repoint the links that leave `docs/`."""
    markdown = NAV_LINE.sub('', markdown, count=1)

    return ESCAPING_LINK.sub(_resolve_escaping_link, markdown)
