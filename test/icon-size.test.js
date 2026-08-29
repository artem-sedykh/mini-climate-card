/**
 * @vitest-environment jsdom
 */
// The invariant behind #287: a component that draws an `ha-icon` has to say
// how big the icon is, in terms of the card's unit.
//
// This layer cannot measure the drawing - jsdom resolves no custom properties
// and computes no `calc`, so the size of a glyph is not a question it can be
// asked. That is `test/e2e/scale.test.mjs`, against a real `ha-icon`. What is
// worth checking here is the thing that made the bug possible and that a
// browser is not needed to see: `sharedStyle` sized the icon *element* and
// never set `--mdc-icon-size`, so every icon that was not sized by its own
// component stayed at the browser's 24px default however large the card was.
//
// The list of components is read from the source rather than written out, so a
// new component that draws an icon is held to this without anyone remembering
// to add it here. And the check is against the stylesheet the class actually
// carries, not against the text of the file: `target-temperature.ts` mentions
// `sharedStyle` twice in a comment and imports it nowhere, which is exactly
// how the chevrons were missed by a first reading.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src');

// `<ha-icon` also starts `<ha-icon-button`, and an icon button without an icon
// inside it draws nothing. The character after the name is what separates them.
const DRAWS_AN_ICON = /<ha-icon[\s>.]/;
const REGISTERS = /define\(\s*'([^']+)'/;

const modules = [
  { file: 'main.ts', path: join(src, 'main.ts') },
  ...readdirSync(join(src, 'components'))
    .filter(name => name.endsWith('.ts'))
    .map(name => ({ file: `components/${name}`, path: join(src, 'components', name) })),
]
  .map(module => ({ ...module, source: readFileSync(module.path, 'utf8') }))
  .filter(module => DRAWS_AN_ICON.test(module.source))
  .map(module => ({ ...module, tag: module.source.match(REGISTERS)?.[1] }));

const cssOf = element => {
  const styles = element.styles ?? [];

  return [styles]
    .flat(Infinity)
    .map(style => style.cssText ?? '')
    .join('\n');
};

describe('every component that draws an icon sizes it', () => {
  it('finds the components to check', () => {
    // If this ever comes back empty the rest of the file passes vacuously,
    // which is the failure mode of a test that discovers its own subjects.
    expect(modules.length).toBeGreaterThanOrEqual(6);
    expect(modules.map(module => module.tag)).not.toContain(undefined);
    expect(modules.map(module => module.file)).toContain('components/target-temperature.ts');
  });

  it.each(modules)('$file sets --mdc-icon-size against the card unit', async module => {
    await import(module.path);

    const element = customElements.get(module.tag);
    expect(element, `${module.tag} is not registered`).toBeTruthy();

    const css = cssOf(element);

    // `--mdc-icon-size` rather than `--ha-icon-size`: measured on Home
    // Assistant 2026.8.3, `ha-icon` honours the first and ignores the second.
    // It was the icon *button* size that was renamed, in #188.
    expect(css, `${module.file} draws an ha-icon without sizing it`).toMatch(/--mdc-icon-size:/);

    // In terms of the unit, not in pixels - a fixed size is the bug written
    // a different way.
    expect(css).toMatch(/--mdc-icon-size:\s*calc\(\s*var\(--mc-unit\)/);
  });
});
