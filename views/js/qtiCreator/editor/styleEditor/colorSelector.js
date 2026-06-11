define([
    'jquery',
    'lodash',
    'i18n',
    'taoMediaManager/qtiCreator/editor/styleEditor/styleEditor',
    'taoQtiItem/qtiCreator/helper/popup',
    'lib/farbtastic/farbtastic'
], function ($, _, __, styleEditor) {
    'use strict';

    // based on http://stackoverflow.com/a/14238466
    // this conversion is required to communicate with farbtastic
    function rgbToHex(color) {
        function toHexPair(inp) {
            return `0${parseInt(inp, 10).toString(16)}`.slice(-2);
        }

        // undefined can happen when no color is defined for a particular element
        // isString on top of that should cover all sorts of weird input
        if (!_.isString(color)) {
            return color;
        }

        const rgbArr = /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i.exec(color);

        // color is not rgb
        if (!_.isArray(rgbArr) || rgbArr.length !== 4) {
            return color;
        }

        return `#${toHexPair(rgbArr[1])}${toHexPair(rgbArr[2])}${toHexPair(rgbArr[3])}`;
    }

    const passageColorBindings = {
        'background-color': {
            varName: '--styleeditor-bg-color',
            propSelector: 'body div.qti-item',
            propName: 'background-color',
            additional: { padding: '20px' }
        },
        'text-color': {
            varName: '--styleeditor-text-color',
            propSelector: 'body div.qti-item',
            propName: 'color'
        },
        'border-color': {
            varName: '--styleeditor-border-color',
            propSelector: 'body div.qti-item',
            propName: 'border-color',
            additional: { 'border-width': '4px', 'border-style': 'solid', padding: '20px' }
        },
        'table-heading-color': {
            varName: '--styleeditor-table-heading-bg-color',
            propSelector: 'body div.qti-item table th',
            propName: 'background-color'
        }
    };

    const textBlockColorBindings = {
        'background-color': {
            varName: '--styleeditor-bg-color',
            propSelector: 'body div.qti-item .custom-text-box.hashClass',
            propName: 'background-color',
            additional: { padding: '20px', 'margin-bottom': '0' }
        },
        'text-color': {
            varName: '--styleeditor-text-color',
            propSelector: 'body div.qti-item .custom-text-box.hashClass',
            propName: 'color'
        },
        'border-color': {
            varName: '--styleeditor-border-color',
            propSelector: 'body div.qti-item .custom-text-box.hashClass',
            propName: 'border-color',
            additional: { 'border-width': '4px', 'border-style': 'solid', padding: '20px' }
        },
        'table-heading-color': {
            varName: '--styleeditor-table-heading-bg-color',
            propSelector: 'body div.qti-item .custom-text-box.hashClass table th',
            propName: 'background-color'
        }
    };

    const colorSelector = function ($container) {
        const isTextBlockPanel = $container.is('#item-editor-text-property-bar');
        const colorBindings = isTextBlockPanel ? textBlockColorBindings : passageColorBindings;
        const colorPicker = $container.find('.item-editor-color-picker'),
            widget = colorPicker.find('.color-picker'),
            widgetBox = colorPicker.find('.color-picker-container'),
            titleElement = colorPicker.find('.color-picker-title'),
            input = colorPicker.find('.color-picker-input'),
            resetButtons = colorPicker.find('.reset-button'),
            colorTriggers = colorPicker.find('.color-trigger'),
            colorTriggerLabels = colorPicker.find('label'),
            $doc = $(document),
            additionalStyles = {};
        let widgetObj;

        const resolveSelector = function (selector) {
            return styleEditor.replaceHashClass(styleEditor.replaceMainClass(selector));
        };

        const getCssVariablesRootSelector = function () {
            if (isTextBlockPanel) {
                return resolveSelector('body div.qti-item .custom-text-box.hashClass');
            }
            return styleEditor.getConfig().cssVariablesRootSelector;
        };

        /**
         * Widget title
         *
         * @param {JQueryElement} trigger
         */
        const setTitle = function (trigger) {
            titleElement.text(trigger.parent().find('label').text());
        };

        const applyAdditionalStyles = function (propSelector, additional, val) {
            if (!additional) {
                return;
            }
            Object.keys(additional).forEach(key => {
                styleEditor.apply(propSelector, key, val ? additional[key] : null);
            });
        };

        const styleEditorApply = function (target, val) {
            const { varName, propSelector, propName, additional } = colorBindings[target];
            const resolvedPropSelector = resolveSelector(propSelector);
            const cssVariablesRootSelector = getCssVariablesRootSelector();

            styleEditor.apply(cssVariablesRootSelector, varName, val);
            styleEditor.apply(resolvedPropSelector, propName, val ? `var(${varName})` : null);
            if (val) {
                applyAdditionalStyles(resolvedPropSelector, additional, val);
            }
        };

        /**
         * Trigger button background
         */
        const setTriggerColor = function () {
            const cssVariablesRootSelector = getCssVariablesRootSelector();

            colorTriggers.each(function () {
                const $trigger = $(this),
                    target = $trigger.data('target'),
                    style = styleEditor.getStyle() || {};

                let shouldFireStyleChange = false;
                const { varName, propSelector, propName } = colorBindings[target];
                const resolvedPropSelector = resolveSelector(propSelector);
                let val = style[cssVariablesRootSelector] && style[cssVariablesRootSelector][varName];
                if (!val) {
                    const propVal = style[resolvedPropSelector] && style[resolvedPropSelector][propName];
                    if (propVal) {
                        const normalizedVal = propVal.replace(' !important', '');
                        const varMatch = normalizedVal.match(/^var\(([^)]+)\)/);
                        if (varMatch && style[cssVariablesRootSelector]) {
                            val = style[cssVariablesRootSelector][varMatch[1].trim()];
                        } else {
                            val = normalizedVal;
                            shouldFireStyleChange = true; // migrate older stylesheets
                        }
                    }
                }

                if (val) {
                    $trigger.css('background-color', val);
                    $trigger.attr('title', rgbToHex(val));
                    if (shouldFireStyleChange) {
                        styleEditorApply(target, val);
                    }
                } else {
                    $trigger.css('background-color', '');
                    $trigger.attr('title', __('No value set'));
                }
            });
        };

        const collectCommonAdditionalStyles = function () {
            Object.keys(colorBindings).forEach(target => {
                const { propSelector, propName, additional } = colorBindings[target];
                if (!additional) {
                    return;
                }
                const resolvedSelector = resolveSelector(propSelector);
                Object.keys(additional).forEach(key => {
                    if (!additionalStyles[key]) {
                        additionalStyles[key] = [{ propSelector: resolvedSelector, propName }];
                    } else {
                        additionalStyles[key].push({ propSelector: resolvedSelector, propName });
                    }
                });
            });
        };

        widgetObj = $.farbtastic(widget).linkTo(input);

        // event received from modified farbtastic
        widget.on('colorchange.farbtastic', function (e, color) {
            styleEditorApply(widget.prop('target'), color);
            setTriggerColor();
        });

        // open color picker
        setTriggerColor();
        collectCommonAdditionalStyles();
        colorTriggers.add(colorTriggerLabels).on('click', function () {
            const $tmpTrigger = $(this),
                $trigger =
                    this.nodeName.toLowerCase() === 'label' ? $tmpTrigger.parent().find('.color-trigger') : $tmpTrigger;

            widget.prop('target', $trigger.data('target'));
            widgetBox.hide();
            setTitle($trigger);
            widgetObj.setColor(rgbToHex($trigger.css('background-color')));
            widgetBox.show();
        });

        // close color picker, when clicking somewhere outside or on the x
        $doc.on('mouseup', function (e) {
            if ($(e.target).hasClass('closer')) {
                widgetBox.hide();
                return false;
            }

            if (!widgetBox.is(e.target) && widgetBox.has(e.target).length === 0) {
                widgetBox.hide();
                return false;
            }
        });

        // close color picker on escape
        $doc.on('keyup', function (e) {
            if (e.keyCode === 27) {
                widgetBox.hide();
                return false;
            }
        });

        // reset to default
        resetButtons.on('click', function () {
            const $this = $(this),
                $colorTrigger = $this.parent().find('.color-trigger'),
                target = $colorTrigger.data('target'),
                { propSelector, additional } = colorBindings[target],
                resolvedPropSelector = resolveSelector(propSelector);

            styleEditorApply(target, null);

            if (additional) {
                Object.keys(additional).forEach(key => {
                    if (additionalStyles[key].length === 1) {
                        styleEditor.apply(resolvedPropSelector, key);
                    } else {
                        const style = styleEditor.getStyle() || {};
                        let needToRemove = true;
                        additionalStyles[key].forEach(element => {
                            if (
                                (resolvedPropSelector !== element.propSelector ||
                                    colorBindings[target].propName !== element.propName) &&
                                style[element.propSelector] &&
                                style[element.propSelector][element.propName]
                            ) {
                                needToRemove = false;
                            }
                        });
                        if (needToRemove) {
                            styleEditor.apply(resolvedPropSelector, key);
                        }
                    }
                });
            }
            setTriggerColor();
        });

        $doc.on('customcssloaded.styleeditor', setTriggerColor);
    };

    return colorSelector;
});
