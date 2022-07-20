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
 * Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
 *
 */

/**
 * @author dieter <dieter@taotesting.com>
 * @author Hanna Dzmitryieva <hanna@taotesting.com>
 */

define([
    'jquery',
    'lodash',
    'i18n',
    'util/urlParser',
    'core/dataProvider/request',
    'tpl!taoMediaManager/qtiCreator/tpl/toolbars/cssToggler',
    'taoMediaManager/qtiCreator/helper/formatStyles',
    'util/url',
    'services/features',
    'jquery.fileDownload'
], function ($, _, __, UrlParser, request, cssTpl, formatStyles, urlUtil, featuresService) {
    'use strict';

    const styleSheetManagerVisibilityKey = 'taoMediaManager/creator/StyleSheetManager';
    let itemConfig;

    /**
     * qtiItemCreator config provided from QtiCreator
     * used for generation of the ajax uri
     */
    let globalConfig;

    /**
     * generate Ajax URI
     * @param {String} action
     * @returns {*}
     */
    const _getUri = function (action) {
        return globalConfig[`${action}CssUrl`];
    };

    /**
     * Extract the file name from a path
     * @param {String} path
     * @returns {*}
     * @private
     */
    const _basename = function (path) {
        return path.substring(path.lastIndexOf('/') + 1);
    };

    // hash class for shared stimulus styles
    const mainClassSelector = 'mainClass';
    const hashClassSelector = 'hashClass';
    const taoHashClassPrefix = 'tao-';
    let hashClass = '';
    let mainClass = '';

    // stylesheet as object
    let style = {},
        currentItem,
        customStylesheet = '';
    // DOM element to hold the style
    const $styleElem = (function () {
        let styleElem = $('#item-editor-user-styles');
        if (!styleElem.length) {
            styleElem = $('<style>', { id: 'item-editor-user-styles' });
            $('head').append(styleElem);
        } else {
            styleElem.empty();
        }
        return styleElem;
    })(),
        common = {
            title: __('Disable this stylesheet temporarily'),
            deleteTxt: __('Remove this stylesheet'),
            editLabelTxt: __('Edit stylesheet label'),
            downloadTxt: __('Download this stylesheet'),
            preparingMessageHtml: __('Preparing CSS, please wait…'),
            failMessageHtml: __('There was a problem downloading your CSS, please try again.'),
            isInValidLocalTxt: __(
                'This stylesheet has not been found on the server. you may want to delete this reference'
            )
        };
    /**
     * Delete all custom styles
     * @returns {Boolean}
     */
    const erase = function () {
        style = {};
        $styleElem.text('');
        return false;
    };

    /**
     * Create CSS and add it to DOM
     *
     * @param {Boolean} dontAppend whether or not to append the stylesheet to the DOM. This is used by the iframe preview
     * @returns {Boolean}
     */
    const create = function (dontAppend) {
        let mSelector, // selector inside a media query
            mProp, // property inside a media query
            css = '';

        if (_.isEmpty(style)) {
            return erase();
        }

        // rebuild CSS
        _.forEach(style, (value1, key1) => {
            // first level key, could be selector or media query
            css += `${key1}{`;
            _.forEach(value1, (value2, key2) => {
                // second level key, could be css property or selector
                // in the case of a surrounding media query
                if (_.isPlainObject(value2)) {
                    for (mSelector in value2) {
                        css += `${key2}{`;
                        for (mProp in value2) {
                            css += `${mProp}:${value2[mSelector]};`;
                        }
                        css += '}';
                    }
                } else {
                    // regular selectors
                    css += `${key2}:${value2};`;
                }
            });
            css += '}\n';
        });

        if (!dontAppend) {
            $styleElem.text(css);
        }
        return css;
    };

    /**
     * Apply rule to CSS
     *
     * @param {{string}} selector
     * @param {{string}} property
     * @param {{string}} value
     */
    const apply = function (selector, property, value) {
        const itemBodyClass = document.querySelector('.qti-itemBody').classList;
        itemBodyClass.forEach(function (className) {
            const searchClass = className.match(/(?<className>tao-\w+)?/);
            if (searchClass.groups.className) {
                mainClass = searchClass.groups.className;
            }
        })
        selector = selector.replace(mainClassSelector, mainClass);
        selector = selector.replace(hashClassSelector, hashClass);

        style[selector] = style[selector] || {};

        // delete this rule
        if (!value) {
            delete style[selector][property];
            if (_.size(style[selector]) === 0) {
                delete style[selector];
            }
        } else {
            // add this rule
            style[selector][property] = value;
        }

        // apply rule
        create();

        /**
         * Fires a change notification on the item style
         * @event taoQtiItem/qtiCreator/editor/styleEditor/styleEditor#stylechange.qti-creator
         * @property {Object} [detail] An object providing some additional detail on the event
         * @property {Boolean} [detail.initializing] Tells if the stylechange occurs at init time
         */
        $(document).trigger('stylechange.qti-creator');
    };

    /**
     * Has the class been initialized
     *
     * @returns {Boolean}
     */
    const verifyInit = function verifyInit() {
        if (!itemConfig) {
            throw new Error('Missing itemConfig, did you call styleEditor.init()?');
        }
        return true;
    };

    /**
     * Save the resulting CSS to a file
     * @returns {Promise}
     */
    const save = function save() {
        verifyInit();
        return request(
            _getUri('save'),
            _.extend({}, itemConfig, {
                cssJson: JSON.stringify(style),
                stylesheetUri: customStylesheet.attr('href')
            }),
            'POST'
        );
    };

    const deleteStylesheet = function (stylesheet) {
        verifyInit();
        return request(
            _getUri('save'),
            _.extend({}, itemConfig, {
                cssJson: JSON.stringify({}),
                stylesheetUri: `css/${stylesheet.attr('title')}`
            }),
            'POST'
        );
    };

    /**
     * Download CSS as file
     * @param {String} uri
     */
    const download = function (uri) {
        verifyInit();
        const downloadUrl = urlUtil.build(_getUri('download'), {
            uri: globalConfig['id'],
            stylesheet: uri
        });

        fetch(downloadUrl)
            .then(resp => resp.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = uri;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(() => common.failMessageHtml);
    };

    /**
     * Add a single stylesheet, the custom stylesheet will be loaded as object
     *
     * @param {Object} stylesheet
     */
    const addStylesheet = function (stylesheet, itemConfig) {
        let fileName, link, listEntry, parser;
        function loadStylesheet(linkElement, stylesheetObject, isLocal, isValid) {
            // in the given scenario we cannot test whether a remote stylesheet really exists
            // this would require to pipe all remote css via php curl
            const isInvalidLocal = isLocal && !isValid,
                tplData = {
                    path: stylesheetObject.attr('href'),
                    label: stylesheetObject.attr('title') || fileName,
                    title: common.title,
                    deleteTxt: common.deleteTxt,
                    downloadTxt: common.downloadTxt,
                    editLabelTxt: isInvalidLocal ? common.isInValidLocalTxt : common.editLabelTxt
                };

            // create list entry
            listEntry = $(cssTpl(tplData));

            listEntry.data('stylesheetObj', stylesheetObject);

            // initialize download button
            $('#style-sheet-toggler').append(listEntry);

            if (isInvalidLocal) {
                listEntry.addClass('not-available');
                listEntry.find('[data-role="css-download"], .style-sheet-toggler').css('visibility', 'hidden');
                return;
            }

            $styleElem.before(linkElement);

            // time difference between loading the css file and applying the styles
            setTimeout(
                function () {
                    // clean and format CSS styles with Browser API
                    const cssFile = $(`[href="${link[0].href}"]`);
                    if (cssFile && cssFile[0].sheet) {
                        formatStyles.formatStyles(cssFile[0].sheet, mainClass);
                    }

                    let isInit = false;

                    $(document).trigger('customcssloaded.styleeditor', [style]);
                    $(window).trigger('resize');
                    if (currentItem.pendingStylesheetsInit) {
                        isInit = true;
                        currentItem.pendingStylesheetsInit--;
                    }

                    /**
                     * Fires a change notification on the item style
                     * @event taoQtiItem/qtiCreator/editor/styleEditor/styleEditor#stylechange.qti-creator
                     * @property {Object} [detail] An object providing some additional detail on the event
                     * @property {Boolean} [detail.initializing] Tells if the stylechange occurs at init time
                     */
                    $(document).trigger('stylechange.qti-creator', [{ initializing: isInit }]);
                },
                isLocal ? 500 : 3500
            );
        }

        // argument is uri
        if (_.isString(stylesheet)) {
            stylesheet = currentItem.createStyleSheet(stylesheet);
        }

        fileName = _basename(stylesheet.attr('href'));
        // link with cache buster
        link = (function () {
            const _link = $(stylesheet.render());
            const _href = itemConfig && urlUtil.route('loadStylesheet', 'SharedStimulusStyling', 'taoMediaManager', { uri: itemConfig.id, stylesheet: fileName }) || _link.attr('href');
            const _sep = _href.indexOf('?') > -1 ? '&' : '?';
            _link.attr('href', _href + _sep + new Date().getTime().toString());
            return _link;
        })();

        // cache css before applying allows for a pretty good guess
        // when the stylesheet is loaded and the buttons in the style editor
        // can be changed
        parser = new UrlParser(link.attr('href'));
        if (parser.checkCORS()) {
            $.when($.ajax(link.attr('href'))).then(
                function () {
                    loadStylesheet(link, stylesheet, true, true);
                },
                // add file to list even on failure to be able to remove it from the item
                function () {
                    loadStylesheet(link, stylesheet, true, false);
                }
            );
        } else {
            // otherwise load it with a big timeout and hope for the best
            // unfortunately this dirty way is the only possibility in cross domain environments
            loadStylesheet(link, stylesheet, false);
        }
    };

    /**
     * Add style sheets to toggler
     */
    const addItemStylesheets = function () {
        let currentStylesheet;
        currentItem.pendingStylesheetsInit = _.size(currentItem.stylesheets);

        _.forEach(currentItem.stylesheets, value => {
            currentStylesheet = value;

            if ('tao-user-styles.css' === _basename(currentStylesheet.attr('href'))) {
                customStylesheet = currentStylesheet;
            } else {
                // add those that are loaded synchronously
                addStylesheet(value);
            }
        });

        // if no custom css had been found, add empty stylesheet anyway
        if (!customStylesheet) {
            customStylesheet = currentItem.createStyleSheet('css/tao-user-styles.css');
        }
    };

    /**
     * Remove orphaned stylesheets. These would be present if previously another item has been edited
     */
    const removeOrphanedStylesheets = function () {
        $('link[data-serial]').remove();
        customStylesheet = null;
        erase();
    };

    /**
     * retrieve the current item
     *
     * @returns {*}
     */
    const getItem = function () {
        return currentItem;
    };

    /**
     * Initialize class
     * @param {Object} item
     * @param {Object} config
     */
    const init = function (item, config) {
        let href;

        globalConfig = config;
        // promise
        currentItem = item;

        //prepare config object
        itemConfig = {
            uri: config.id,
            lang: config.lang
        };

        removeOrphanedStylesheets();

        // this creates at the same time customStylesheet in case it doesn't exist yet
        addItemStylesheets();

        href = customStylesheet.attr('href');

        currentItem.data('responsive', true);

        request(_getUri('load'), _.extend({}, itemConfig, { stylesheetUri: href })).then(function (_style) {
            // copy style to global style
            style = _style;

            // apply rules
            create();

            // inform editors about custom sheet
            $(document).trigger('customcssloaded.styleeditor', [style]);
        });

        if(featuresService.isVisible(styleSheetManagerVisibilityKey, false)) {
            $('#sidebar-right-css-manager').show();
        }
        
    };

    const getStyle = function () {
        return style;
    };

    const getHashClass = function () {
        return hashClass;
    };

    const getMainClass = function () {
        return mainClass;
    };

    const setHashClass = function (cssClass) {
        hashClass = cssClass;
    };

    const setMainClass = function (cssClass) {
        mainClass = cssClass;
    };

    const generateHashClass = function () {
        return (hashClass = `${taoHashClassPrefix}${Math.random().toString(36).substr(2, 9)}`);
    };

    const generateMainClass = function () {
        return (mainClass = `${taoHashClassPrefix}${Math.random().toString(36).substr(2, 9)}`);
    };

    const replaceHashClass = function (selector) {
        return hashClass && selector.replace(hashClassSelector, hashClass);
    };

    const replaceMainClass = function (selector) {
        return mainClass && selector.replace(mainClassSelector, mainClass);
    };

    const clearCache = function() {
        removeOrphanedStylesheets();
        $(document).off('customcssloaded.styleeditor');
    };

    return {
        apply: apply,
        save: save,
        deleteStylesheet: deleteStylesheet,
        download: download,
        erase: erase,
        init: init,
        create: create,
        getItem: getItem,
        getStyle: getStyle,
        addStylesheet: addStylesheet,
        getHashClass: getHashClass,
        setHashClass: setHashClass,
        generateHashClass: generateHashClass,
        replaceHashClass: replaceHashClass,
        getMainClass: getMainClass,
        setMainClass: setMainClass,
        generateMainClass: generateMainClass,
        replaceMainClass: replaceMainClass,
        clearCache: clearCache
    };
});
