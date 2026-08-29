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

from mkdocs.exceptions import PluginError

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

# The generated files are written with LF, whatever the machine building them.
NL = chr(10)

# The `# Title` a page opens with.
TITLE_LINE = re.compile(r'\A#\s+.*\n+')

# One line per page, for `llms.txt` (#292). Hand-written rather than taken from
# the first paragraph of a page: those are written for a reader who already has
# the sidebar in front of them, and say little on their own. Every page in the
# navigation needs one - `write_llms_files` fails the build otherwise, which is
# what keeps this level with `nav` as pages are added.
PAGE_SUMMARIES = {
    'index.md': 'What the card is, how to install it with HACS, and how to update it.',
    'configuration.md': (
        'Every card option, in one table, with the version each arrived in - plus the '
        'toggle and the theme variables. An option that is not here does not exist.'
    ),
    'controls.md': (
        'The controls the card is made of: temperature, target temperature, hvac mode '
        'and fan mode, each with the functions it takes.'
    ),
    'indicators.md': 'The read-only values under the entity name, and what each one can read.',
    'buttons.md': (
        'Buttons and dropdowns of your own: what they call, when they are hidden or '
        'disabled, and which row they are drawn in.'
    ),
    'functions.md': (
        'The reference for options written as functions: the arguments each one is '
        'called with, what it returns, and the context it runs in.'
    ),
    'tap-action.md': 'What a tap on the card or on an indicator does.',
    'secondary-info.md': 'The line under the entity name, and the types it can show.',
    'examples.md': (
        'A complete configuration, and the recipes this tracker has been asked for more '
        'than once - each one a card on the test bench.'
    ),
    'ai-assistants.md': (
        'Writing a card configuration with an AI assistant: how to hand it this '
        'documentation, and the four things about this card an assistant gets wrong.'
    ),
    'development.md': 'Building the card from source, and what to do when it errors.',
    'visual-editor-parameters.md': (
        'Which options the built-in visual editor exposes, and which stay YAML only.'
    ),
}

# A link from one page to another (`buttons.md`, `examples.md#location`). Inside
# `llms-full.txt` there is no file tree to resolve it against, so it becomes the
# page's address on the site.
PAGE_LINK = re.compile(
    r'\]\((' + '|'.join(re.escape(name) for name in PAGE_SUMMARIES) + r')(#[\w-]+)?\)'
)


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


def _page_url(name, site_url):
    """Where a page in `docs/` is served from, with directory urls on."""
    if name == 'index.md':
        return site_url

    return f'{site_url}{name[: -len(".md")]}/'


def _nav_pages(config):
    """The navigation, flattened to (title, filename) in the order it is read."""
    pages = []

    for entry in config['nav'] or []:
        for title, target in entry.items():
            if isinstance(target, str) and target.endswith('.md'):
                pages.append((title, target))

    return pages


def _for_assistants(name, site_url):
    """A page as it reads with nothing around it.

    The same two edits the site gets - the breadcrumb dropped, the links that
    leave `docs/` sent to the repository - plus two this file needs and the site
    does not. A link to another page has no file tree to resolve against here,
    so it becomes an address; and the page's own title goes, because the entry
    above it already carries the navigation's and two `#` headings for one page
    read as two documents.
    """
    markdown = (ROOT / 'docs' / name).read_text(encoding='utf-8')
    markdown = NAV_LINE.sub('', markdown, count=1)
    markdown = ESCAPING_LINK.sub(_resolve_escaping_link, markdown)
    markdown = TITLE_LINE.sub('', markdown, count=1)

    return PAGE_LINK.sub(
        lambda match: f']({_page_url(match.group(1), site_url)}{match.group(2) or ""})',
        markdown,
    ).strip()


def write_llms_files(config):
    """Publish the documentation in the shape an assistant can read (#292).

    People write this card's YAML with an assistant, and the assistants do not
    know the card: it is a small project, so what comes back names options that
    do not exist. The card is unusually bad at saying so - an unknown key inside
    an indicator or a button is spread into the template context rather than
    rejected, because that is the extension point, and a configuration that does
    throw draws a red square whose message only reaches the console.

    So the answer is not validation, it is handing the assistant the
    documentation: `llms.txt` as an index and `llms-full.txt` as the whole of it
    in one fetch. Both are generated from the files the site is built from,
    which is the point - a hand-written copy would be a second set of
    documentation to keep level with the first.
    """
    site_url = config['site_url']
    site_dir = Path(config['site_dir'])
    pages = _nav_pages(config)

    missing = [name for _, name in pages if name not in PAGE_SUMMARIES]
    if missing:
        raise PluginError(
            'llms.txt: no summary for '
            + ', '.join(missing)
            + ' - add one to PAGE_SUMMARIES in scripts/mkdocs_hooks.py'
        )

    index = [
        f'# {config["site_name"]}',
        '',
        f'> {config["site_description"]}',
        '',
        'The card is configured in YAML rather than coded, and several of its options are',
        'JavaScript written as text - arrow functions the card compiles and calls with a',
        'context of its own. Two things are worth knowing before writing one: every option',
        'the card has is a row in the Configuration table, and a key the card does not know',
        'is handed to the templates rather than rejected, so a wrong option does nothing at',
        'all instead of complaining.',
        '',
        '## Documentation',
        '',
    ]
    index += [
        f'- [{title}]({_page_url(name, site_url)}): {PAGE_SUMMARIES[name]}' for title, name in pages
    ]
    index += [
        '',
        '## Everything at once',
        '',
        f'- [{config["site_name"]}, whole]({site_url}llms-full.txt): every page above, '
        'concatenated, for grounding an answer in one fetch.',
        '',
    ]

    full = [
        f'# {config["site_name"]}',
        '',
        f'> {config["site_description"]}',
        '',
        f'Generated from {site_url} - every page of the documentation, in navigation order.',
        '',
    ]
    for title, name in pages:
        full += [
            '---',
            '',
            f'# {title}',
            '',
            f'Source: {_page_url(name, site_url)}',
            '',
            _for_assistants(name, site_url),
            '',
        ]

    (site_dir / 'llms.txt').write_text(NL.join(index), encoding='utf-8')
    (site_dir / 'llms-full.txt').write_text(NL.join(full), encoding='utf-8')


def on_post_build(config):
    """Write the assistant-readable copies, once the site itself is on disk."""
    write_llms_files(config)
