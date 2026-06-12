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

define([], function () {
    'use strict';

    /**
     * Resolve the font-family value from a style sheet object.
     *
     * @param {Object} style
     * @param {String} cssVariablesRootSelector
     * @param {String} target
     * @returns {{val: String|undefined, shouldFireStyleChange: Boolean}}
     */
    const resolveFontFamilyValue = function (style, cssVariablesRootSelector, target) {
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

    return { resolveFontFamilyValue };
});
