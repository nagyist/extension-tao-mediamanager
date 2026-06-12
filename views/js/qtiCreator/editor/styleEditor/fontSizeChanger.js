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
 * Copyright (c) 2021-2022 (original work) Open Assessment Technologies SA ;
 *
 */

/**
 *
 * @author dieter <dieter@taotesting.com>
 * @author Hanna Dzmitryieva <hanna@taotesting.com>
 */
define(['jquery', 'lodash', 'taoMediaManager/qtiCreator/editor/styleEditor/styleEditor'], function ($, _, styleEditor) {
    'use strict';

    /**
     * Changes the font size in the Style Editor
     * @param {JQuery} $container
     */
    const fontSizeChanger = function ($container) {
        const isTextBlockPanel = $container.is('#item-editor-text-property-bar');
        const $fontSizeChanger = $container.find('#item-editor-font-size-changer');
        const itemSelector = styleEditor.replaceHashClass(
            styleEditor.replaceMainClass($fontSizeChanger.data('target'))
        );
        const itemSelectorOld = itemSelector.replace(' *', ''); // previous version was without *
        const figcaptionSelector = `${itemSelector} figure figcaption`;
        const $resetBtn = $fontSizeChanger.parents('.reset-group').find('[data-role="font-size-reset"]');
        const $input = $container.find('.item-editor-font-size-text');
        let itemFontSize = parseInt($(itemSelector).css('font-size'), 10) || 14;

        const getCssVariablesRootSelector = function () {
            if (isTextBlockPanel) {
                return styleEditor.replaceHashClass(
                    styleEditor.replaceMainClass('body div.qti-item .custom-text-box.hashClass')
                );
            }
            return styleEditor.getConfig().cssVariablesRootSelector;
        };

        const styleEditorApply = function (val) {
            const valStr = val ? `${val.toString()}px` : null;
            const varName = '--styleeditor-font-size';
            const cssVariablesRootSelector = getCssVariablesRootSelector();
            styleEditor.apply(cssVariablesRootSelector, varName, valStr);
            styleEditor.apply(itemSelector, 'font-size', valStr ? `var(${varName})` : null);
            if (val) {
                const figcaptionSize = val > 14 ? (val - 2).toString() : Math.min(val, 12).toString();
                styleEditor.apply(figcaptionSelector, 'font-size', `${figcaptionSize}px`);
            } else {
                styleEditor.apply(figcaptionSelector, 'font-size');
            }
        };

        const resolveFontSizeValue = function (style) {
            const cssVariablesRootSelector = getCssVariablesRootSelector();
            let shouldFireStyleChange = false;
            let val = style[cssVariablesRootSelector] && style[cssVariablesRootSelector]['--styleeditor-font-size'];
            if (!val) {
                let propVal = style[itemSelector] && style[itemSelector]['font-size'];
                if (!propVal && style[itemSelectorOld]) {
                    propVal = style[itemSelectorOld]['font-size'];
                }
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

        const styles = styleEditor.getStyle() || {};
        const { val: initialFontSize } = resolveFontSizeValue(styles);
        if (initialFontSize) {
            itemFontSize = parseInt(initialFontSize, 10);
            $input.val(itemFontSize);
        } else {
            $input.val('');
        }

        $fontSizeChanger
            .find('button')
            .off('click')
            .on('click', function (e) {
                e.preventDefault();
                if ($(this).data('action') === 'reduce') {
                    if (itemFontSize <= 10) {
                        return;
                    }
                    itemFontSize--;
                } else {
                    itemFontSize++;
                }
                styleEditorApply(itemFontSize);
                $input.val(itemFontSize);
                $(this).parent().blur();
            });

        $input.off('blur').on('blur', function () {
            if (this.value) {
                itemFontSize = parseInt(this.value, 10);
                styleEditorApply(itemFontSize);
            } else {
                styleEditorApply(null);
            }
        });

        $input.off('keydown').on('keydown', function (e) {
            const c = e.keyCode;
            if (c === 13) {
                $input.trigger('blur');
            }
            return _.includes([8, 37, 39, 46], c) || (c >= 48 && c <= 57) || (c >= 96 && c <= 105);
        });

        $resetBtn.off('click').on('click', function () {
            $input.val('');
            styleEditorApply(null);
            itemFontSize = parseInt($(itemSelector).css('font-size'), 10) || 14;
        });

        $(document).on('customcssloaded.styleeditor', function (e, style) {
            const { val, shouldFireStyleChange } = resolveFontSizeValue(style);
            if (val) {
                itemFontSize = parseInt(val, 10);
                $input.val(itemFontSize);
                if (shouldFireStyleChange) {
                    styleEditorApply(itemFontSize);
                }
            } else {
                itemFontSize = parseInt($(itemSelector).css('font-size'), 10) || 14;
                $input.val('');
            }
        });
    };

    return fontSizeChanger;
});
