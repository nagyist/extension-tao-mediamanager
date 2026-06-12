/*
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; under version 2
 * of the License (non-upgradable).
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Copyright (c) 2026 (original work) Open Assessment Technologies SA;
 *
 */

define([
    'jquery',
    'taoMediaManager/qtiCreator/editor/styleEditor/fontFamilyValueResolver',
    'taoMediaManager/test/qtiCreator/editor/styleEditor/fontSelector/styleEditorMock',
    'taoMediaManager/qtiCreator/editor/styleEditor/fontSelector'
], function ($, fontFamilyValueResolver, styleEditorMock, fontSelector) {
    'use strict';

    const { resolveFontFamilyValue } = fontFamilyValueResolver;
    const cssRoot = styleEditorMock.cssVariablesRootSelector;
    const target = `${cssRoot} *`;
    const legacyFont = 'Georgia, serif';

    QUnit.module('fontFamilyValueResolver');

    QUnit.test('returns var-backed font-family from css variables root', function (assert) {
        const style = {
            [cssRoot]: {
                '--styleeditor-font-family': legacyFont
            }
        };

        assert.deepEqual(resolveFontFamilyValue(style, cssRoot, target), {
            val: legacyFont,
            shouldFireStyleChange: false
        });
    });

    QUnit.test('resolves var() reference from font-family property', function (assert) {
        const style = {
            [cssRoot]: {
                '--styleeditor-font-family': legacyFont
            },
            [target]: {
                'font-family': 'var(--styleeditor-font-family)'
            }
        };

        assert.deepEqual(resolveFontFamilyValue(style, cssRoot, target), {
            val: legacyFont,
            shouldFireStyleChange: false
        });
    });

    QUnit.test('migrates legacy direct font-family values', function (assert) {
        const style = {
            [target]: {
                'font-family': `${legacyFont} !important`
            }
        };

        assert.deepEqual(resolveFontFamilyValue(style, cssRoot, target), {
            val: legacyFont,
            shouldFireStyleChange: true
        });
    });

    QUnit.test('returns empty result when no font override exists', function (assert) {
        assert.deepEqual(resolveFontFamilyValue({}, cssRoot, target), {
            val: undefined,
            shouldFireStyleChange: false
        });
    });

    QUnit.test('does not resolve var() when css variables root is missing', function (assert) {
        const style = {
            [target]: {
                'font-family': 'var(--styleeditor-font-family)'
            }
        };

        assert.deepEqual(resolveFontFamilyValue(style, cssRoot, target), {
            val: undefined,
            shouldFireStyleChange: false
        });
    });

    QUnit.module('fontSelector customcssloaded');

    const setupSelect2Mock = function () {
        $.fn.select2 = function (method, val) {
            if (method === 'val') {
                if (arguments.length > 1) {
                    this.data('select2-val', val);
                }
                return this.data('select2-val') || '';
            }
            return this;
        };
    };

    const initPassagePanel = function () {
        const $container = $('#item-editor-item-property-bar');
        $container.find('#item-editor-font-selector').empty();
        fontSelector($container);
        return $container;
    };

    QUnit.test('migrates legacy font-family after customcssloaded.styleeditor', function (assert) {
        setupSelect2Mock();
        styleEditorMock.setStyle({});
        styleEditorMock.resetApplyCalls();
        $(document).off('customcssloaded.styleeditor');

        const $container = initPassagePanel();
        const $selector = $container.find('#item-editor-font-selector');

        styleEditorMock.resetApplyCalls();
        $(document).trigger('customcssloaded.styleeditor', [
            {
                [target]: {
                    'font-family': legacyFont
                }
            }
        ]);

        assert.strictEqual($selector.select2('val'), legacyFont, 'select2 receives the legacy font');
        assert.deepEqual(styleEditorMock.getApplyCalls(), [
            {
                selector: cssRoot,
                property: '--styleeditor-font-family',
                value: legacyFont
            },
            {
                selector: target,
                property: 'font-family',
                value: 'var(--styleeditor-font-family)'
            }
        ], 'legacy font is migrated to css variables');
    });

    QUnit.test('resets selector when customcssloaded has no font value', function (assert) {
        setupSelect2Mock();
        styleEditorMock.setStyle({});
        styleEditorMock.resetApplyCalls();
        $(document).off('customcssloaded.styleeditor');

        const $container = initPassagePanel();
        const $selector = $container.find('#item-editor-font-selector');
        const previousFont = $selector.find('option[value!=""]').first().val();

        $selector.select2('val', previousFont);
        $selector.find('option[selected]').removeAttr('selected');
        $selector.find(`option[value="${previousFont}"]`).attr('selected', 'selected');
        styleEditorMock.resetApplyCalls();
        $(document).trigger('customcssloaded.styleeditor', [{}]);

        assert.strictEqual($selector.select2('val'), '', 'select2 is reset to the default empty value');
        assert.strictEqual($selector.find('option[value=""]').attr('selected'), 'selected', 'default option is selected');
        assert.strictEqual($selector.find(`option[value="${previousFont}"]`).attr('selected'), undefined, 'previous font option is deselected');
        assert.strictEqual(styleEditorMock.getApplyCalls().length, 0, 'no migration apply is triggered');
    });

    QUnit.test('uses var-backed font without migration after customcssloaded.styleeditor', function (assert) {
        setupSelect2Mock();
        styleEditorMock.setStyle({});
        styleEditorMock.resetApplyCalls();
        $(document).off('customcssloaded.styleeditor');

        const $container = initPassagePanel();
        const $selector = $container.find('#item-editor-font-selector');

        styleEditorMock.resetApplyCalls();
        $(document).trigger('customcssloaded.styleeditor', [
            {
                [cssRoot]: {
                    '--styleeditor-font-family': legacyFont
                },
                [target]: {
                    'font-family': 'var(--styleeditor-font-family)'
                }
            }
        ]);

        assert.strictEqual($selector.select2('val'), legacyFont, 'select2 receives the var-backed font');
        assert.strictEqual(styleEditorMock.getApplyCalls().length, 0, 'no migration apply is triggered');
    });
});
