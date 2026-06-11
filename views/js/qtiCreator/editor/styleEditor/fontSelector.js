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
 * Copyright (c) 2021 (original work) Open Assessment Technologies SA;
 *
 */

define([
    'jquery',
    'lodash',
    'json!taoQtiItem/qtiCreator/editor/resources/font-stacks.json',
    'taoMediaManager/qtiCreator/editor/styleEditor/styleEditor',
    'i18n',
    'select2'
], function ($, _, fontStacks, styleEditor, __) {
    'use strict';

    /**
     * Populate a select box with a list of fonts to select from.
     * On change apply the selected font to the specified target.
     *
     * @param {JQuery} $container
     */
    const fontSelector = function ($container) {
        const isTextBlockPanel = $container.is('#item-editor-text-property-bar');
        const selector = 'select#item-editor-font-selector';
        const $selector = $container.find(selector);
        const target = styleEditor.replaceHashClass(styleEditor.replaceMainClass($selector.data('target')));
        const normalize = function (font) {
                return font.replace(/"/g, "'").replace(/, /g, ',');
            },
            clean = function (font) {
                return font.substring(0, font.indexOf(',')).replace(/'/g, '').replace(/"/g, '');
            },
            resetButton = $selector.parent().find('[data-role="font-selector-reset"]'),
            toLabel = function (font) {
                font = font.replace(/-/g, ' ');
                return font.replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function ($1) {
                    return $1.toUpperCase();
                });
            },
            format = function (state) {
                const originalOption = state.element;
                if (!state.id) {
                    return state.text;
                }
                return `<span style="font-size: 12px;${$(originalOption).attr('style')}">${state.text}</span>`;
            };

        const getCssVariablesRootSelector = function () {
            if (isTextBlockPanel) {
                return styleEditor.replaceHashClass(
                    styleEditor.replaceMainClass('body div.qti-item .custom-text-box.hashClass')
                );
            }
            return styleEditor.getConfig().cssVariablesRootSelector;
        };

        const styleEditorApply = function (val) {
            const varName = '--styleeditor-font-family';
            const cssVariablesRootSelector = getCssVariablesRootSelector();
            styleEditor.apply(cssVariablesRootSelector, varName, val);
            styleEditor.apply(target, 'font-family', val ? `var(${varName})` : null);
        };

        const resolveFontFamilyValue = function (style) {
            const cssVariablesRootSelector = getCssVariablesRootSelector();
            let shouldFireStyleChange = false;
            let val = style[cssVariablesRootSelector] && style[cssVariablesRootSelector]['--styleeditor-font-family'];
            if (!val) {
                const propVal = style[target] && style[target]['font-family'];
                if (propVal) {
                    const normalizedVal = propVal.replace(' !important', '');
                    const varMatch = normalizedVal.match(/^var\(([^)]+)\)/);
                    if (varMatch && style[cssVariablesRootSelector]) {
                        val = style[cssVariablesRootSelector][varMatch[1].trim()];
                    } else if (!normalizedVal.startsWith('var(')) {
                        val = normalizedVal;
                        shouldFireStyleChange = true; // migrate older stylesheets
                    }
                }
            }
            return { val, shouldFireStyleChange };
        };

        $selector.empty();
        $selector.append(`<option value="">${__('Default')}</option>`);

        const styles = styleEditor.getStyle() || {};
        const { val: selectedFontFamily } = resolveFontFamilyValue(styles);

        _.forEach(fontStacks, (value, key) => {
            const optGroup = $('<optgroup>', { label: toLabel(key) });
            _.forEach(value, font => {
                const normalizeFont = normalize(font);
                const option = $('<option>', {
                    value: normalizeFont,
                    text: clean(normalizeFont)
                }).css({
                    fontFamily: normalizeFont
                });
                if (selectedFontFamily && clean(normalizeFont) === clean(selectedFontFamily)) {
                    option.attr('selected', true);
                }
                optGroup.append(option);
            });
            $selector.append(optGroup);
        });

        resetButton.off('click').on('click', function () {
            styleEditorApply(null);
            $selector.select2('val', '');
        });

        $selector.select2({
            formatResult: format,
            formatSelection: format,
            width: 'resolve'
        });

        $selector.off('change').on('change', function () {
            styleEditorApply($(this).val());
            $container.find(`${selector} option:selected`).first().attr('selected', 'selected');
        });

        $(document).on('customcssloaded.styleeditor', function (e, style) {
            const { val, shouldFireStyleChange } = resolveFontFamilyValue(style);
            if (val) {
                $selector.select2('val', val);
                $container.find(`${selector} option:selected`).first().attr('selected', 'selected');
                if (shouldFireStyleChange) {
                    styleEditorApply(val);
                }
            }
        });
    };

    return fontSelector;
});
