/**
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
 * Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
 */
define([
    'lodash',
    'jquery',
    'uri',
    'util/url',
    'core/dataProvider/request',
    'taoMediaManager/qtiCreator/helper/formatStyles',
    'taoMediaManager/qtiCreator/editor/styleEditor/styleEditor',
], function (_, $, uri, urlUtil, request, formatStyles, styleEditor) {
    'use strict';

    return function xincludeRendererAddStyles(passageHref, passageClassName, serial, head = $('head')) {
        if (/taomedia:\/\/mediamanager\//.test(passageHref)) {
            // check rich passage styles and inject them to item
            const passageUri = uri.decode(passageHref.replace('taomedia://mediamanager/', ''));
            request(urlUtil.route('getStylesheets', 'SharedStimulusStyling', 'taoMediaManager'), {
                uri: passageUri
            })
                .then(response => {
                    response.children.forEach(element => {
                        // check different names of elements
                        const link = urlUtil.route('loadStylesheet', 'SharedStimulusStyling', 'taoMediaManager', {
                            uri: passageUri,
                            stylesheet: element.name
                        });
                        const styleElem = $('<link>', {
                            rel: 'stylesheet',
                            type: 'text/css',
                            href: link,
                            'data-serial': passageUri
                        });

                        const layout = head.find(`link[href="${link}"]`);
                        if (!layout.length) {
                            head.append(styleElem[0]);
                            if (element.name !== 'tao-user-styles.css' && serial.length) {
                                setTimeout(() => {
                                    if (!passageClassName) {
                                        passageClassName = styleEditor.generateMainClass();
                                        const layout = $(`[data-serial="${serial}"] .qti-include > div`);
                                        const hasClass = layout.className && layout.className.match(/[\w-]*tao-[\w-]*/g);
                                        if (!hasClass) {
                                            layout.addClass(passageClassName);
                                        }
                                    }
                                    const cssFile = $(`link[href="${link}"]`);
                                    cssFile.each((i, e) => {
                                        const isFormat = e.dataset && e.dataset.format;
                                        if (!isFormat && e) {
                                            e.dataset.format = true;
                                            formatStyles.formatStyles(e.sheet, passageClassName);
                                        }
                                    })
                                }, 500)
                            }
                        }

                    });
                })
                .catch();
        }
    };
});
