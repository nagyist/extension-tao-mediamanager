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
 * Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
 *
 */

define([
    'lodash',
    'i18n',
    'jquery',
    'core/promise',
    'util/url',
    'taoQtiItem/qtiCreator/widgets/Widget',
    'taoMediaManager/qtiCreator/widgets/item/states/states',
    'taoQtiItem/qtiItem/core/Element',
    'taoQtiItem/qtiCreator/helper/creatorRenderer',
    'taoQtiItem/qtiCreator/model/helper/container',
    'taoQtiItem/qtiCreator/editor/gridEditor/content',
    'taoQtiItem/qtiCreator/helper/xmlRenderer',
    'taoQtiItem/qtiCreator/helper/devTools',
    'taoQtiItem/qtiCreator/widgets/static/text/Widget',
    'taoQtiItem/qtiCreator/editor/styleEditor/styleEditor',
    'taoQtiItem/qtiItem/helper/xmlNsHandler',
    'tpl!taoQtiItem/qtiCreator/tpl/notifications/genericFeedbackPopup',
    'taoQtiItem/qtiCreator/editor/jquery.gridEditor'
], function(
    _,
    __,
    $,
    Promise,
    urlUtil,
    Widget,
    states,
    Element,
    creatorRenderer,
    containerHelper,
    contentHelper,
    xmlRenderer,
    devTools,
    TextWidget,
    styleEditor,
    xmlNsHandler,
    genericFeedbackPopup
    ){

    'use strict';

    const ItemWidget = Widget.clone();

    ItemWidget.initCreator = function(config) {
        const self = this;
        this.registerStates(states);

        Widget.initCreator.call(this);

        if (!config || !config.uri) {
            throw new Error('missing required config parameter uri in item widget initialization');
        }

        this.saveItemUrl = config.saveItemUrl;

        this.renderer = config.renderer;

        this.itemUri = config.uri;

        //this.initUiComponents();

        return new Promise(function(resolve) {
            self.initTextWidgets(function() {

                //when the text widgets are ready:
                this.initGridEditor();

                //active debugger
                this.debug({
                    state : false,
                    xml : false
                });

                resolve();
            });
        });
    };

    ItemWidget.buildContainer = function() {
        this.$container = this.$original;
    };

    /**
     * Save the item by sending the XML in a POST request to the server
     * @TODO saving mechanism should be independent, ie. moved into the itemCreator, in order to configure endpoint, etc.
     *
     * @returns {Promise} that wraps the request
     */
    ItemWidget.save = function() {
        const self = this;
        return new Promise(function(resolve, reject) {
            let xml;

            // transform application errors into object Error in order to make them displayable
            function rejectError(err) {
                if (err.type === 'Error') {
                    err = new Error(__('The item has not been saved!') + (err.message ? '\n' + err.message : ''));
                }
                reject(err);
            }

            xml = xmlNsHandler.restoreNs(xmlRenderer.render(self.element), self.element.getNamespaces());

            //@todo : remove this hotfix : prevent unsupported custom interaction to be saved
            if (hasUnsupportedInteraction(xml)) {
                return reject(new Error(__('The item cannot be saved because it contains an unsupported custom interaction.')));
            }

            // TO DO
            // Shared stimulus save
            // should be moved in save plugin
            // should be created xmlRenderer for item
            // send it to the server

            $.ajax({
                url : urlUtil.build(self.saveItemUrl, {uri: self.itemUri}),
                type : 'POST',
                contentType : 'text/xml',
                dataType : 'json',
                data : xml
            })
            .done(function(data) {
                if (!data || data.success) {
                    resolve(data);
                } else {
                    rejectError(data);
                }
            })
            .fail(rejectError);
        });
    };

    ItemWidget.initUiComponents = function() {

        const _widget = this,
            element = _widget.element,
            $saveBtn = $('#save-trigger');

        //listen to invalid states:
        _widget.on('metaChange', function(data){
            if (data.element.getSerial() === element.getSerial() && data.key === 'invalid') {
                const invalid = element.data('invalid');
                if (_.size(invalid)) {
                    $saveBtn.addClass('disabled');
                } else {
                    $saveBtn.removeClass('disabled');
                }
            }
        }, true);

    };

    ItemWidget.initGridEditor = function() {

        const _this = this,
            item = this.element,
            $itemBody = this.$container.find('.qti-itemBody'),
            $itemEditorPanel = $('#item-editor-panel');

        $itemBody.gridEditor();
        $itemBody.gridEditor('resizable');
        $itemBody.gridEditor('addInsertables', $('.tool-list > [data-qti-class]:not(.disabled)'), {
            helper : function() {
                return $(this).find('.icon').clone().addClass('dragging');
            }
        });

        $itemBody.on('beforedragoverstart.gridEdit', function() {

            $itemEditorPanel.addClass('dragging');
            $itemBody.removeClass('hoverable').addClass('inserting');

        }).on('dragoverstop.gridEdit', function() {

            $itemEditorPanel.removeClass('dragging');
            $itemBody.addClass('hoverable').removeClass('inserting');

        }).on('dropped.gridEdit.insertable', function(e, qtiClass, $placeholder) {

            //a new qti element has been added: update the model + render
            $placeholder.removeAttr('id');//prevent it from being deleted

            if (qtiClass === 'rubricBlock') {
                //qti strange exception: a rubricBlock must be the first child of itemBody, nothing else...
                //so in this specific case, consider the whole row as the rubricBlock
                //by the way, in our grid system, rubricBlock can only have a width of col-12
                $placeholder = $placeholder.parent('.col-12').parent('.grid-row');
            }

            $placeholder.addClass('widget-box');//required for it to be considered as a widget during container serialization
            $placeholder.attr({
                'data-new' : true,
                'data-qti-class' : qtiClass
            });//add data attribute to get the dom ready to be replaced by rendering

            const $widget = $placeholder.parent().closest('.widget-box, .qti-item');
            const $editable = $placeholder.closest('[data-html-editable], .qti-itemBody');
            const widget = $widget.data('widget');
            const element = widget.element;
            const container = Element.isA(element, '_container') ? element : element.getBody();

            if (!element || !$editable.length) {
                throw new Error('cannot create new element');
            }

            containerHelper.createElements(container, contentHelper.getContent($editable), function(newElts) {

                creatorRenderer.get().load(function() {
                    const self = this;

                    _.forEach(newElts, function(elt){
                        let $widget,
                            widget,
                            $colParent = $placeholder.parent();


                        elt.setRenderer(self);

                        if (Element.isA(elt, '_container')) {
                            $colParent.empty();//clear the col content, and leave an empty text field
                            $colParent.html(elt.render());
                            widget = _this.initTextWidget(elt, $colParent);
                            $widget = widget.$container;
                        } else {
                            elt.render($placeholder);

                            //TODO resolve the promise it returns
                            elt.postRender();
                            widget = elt.data('widget');
                            if (Element.isA(elt, 'blockInteraction')) {
                                $widget = widget.$container;
                            } else {
                                //leave the container in place
                                $widget = widget.$original;
                            }
                        }

                        //inform height modification
                        $widget.trigger('contentChange.gridEdit');
                        $widget.trigger('resize.gridEdit');

                        //active it right away:
                        if (Element.isA(elt, 'interaction')) {
                            widget.changeState('question');
                        } else {
                            widget.changeState('active');
                        }

                    });
                }, this.getUsedClasses());
            });

        }).on('resizestop.gridEdit', function() {

            item.body($itemBody.gridEditor('getContent'));

        });

    };

    ItemWidget.initTextWidgets = function(callback) {

        let _this = this,
            item = this.element,
            $originalContainer = this.$container,
            i = 1,
            subContainers = [];

        callback = callback || _.noop;

        //temporarily tag col that need to be transformed into
        $originalContainer.find('.qti-itemBody > .grid-row').each(function() {

            const $row = $(this);

            if (!$row.hasClass('widget-box')) {//not a rubricBlock
                $row.children().each(function() {

                    let $col = $(this),
                        isTextBlock = false;

                    $col.contents().each(function() {
                        if(this.nodeType === 3 && this.nodeValue && this.nodeValue.trim()){
                            isTextBlock = true;
                            return false;
                        }
                    });

                    const $widget = $col.children();
                    if ($widget.length > 1 || !$widget.hasClass('widget-blockInteraction')) {//not an immediate qti element
                        if ($widget.hasClass('colrow')) {
                            $widget.each(function() {
                                const $subElement = $(this);
                                const $subWidget = $subElement.children();
                                if ($subWidget.length > 1 || !$subWidget.hasClass('widget-blockInteraction')) {
                                    $subElement.attr('data-text-block-id', 'text-block-' + i);
                                    i++;
                                }
                            });
                        } else {
                            isTextBlock = true;
                        }
                    }

                    if (isTextBlock) {
                        $col.attr('data-text-block-id', 'text-block-' + i);
                        i++;
                    }
                });
            }
        });

        //clone the container to create the new container model:
        const $clonedContainer = $originalContainer.clone();
        $clonedContainer.find('.qti-itemBody > .grid-row [data-text-block-id]').each(function() {

            const $originalTextBlock = $(this),
                textBlockId = $originalTextBlock.data('text-block-id'),
                $subContainer = $originalTextBlock.clone(),
                subContainerElements = contentHelper.serializeElements($subContainer),
                subContainerBody = $subContainer.html();//get serialized body

            $originalTextBlock.removeAttr('data-text-block-id').html('{{_container:new}}');

            subContainers.push({
                body : subContainerBody,
                elements : subContainerElements,
                $original : $originalContainer.find('[data-text-block-id="' + textBlockId + '"]').removeAttr('data-text-block-id')
            });
        });

        //create new container model with the created sub containers
        contentHelper.serializeElements($clonedContainer);

        const serializedItemBody = $clonedContainer.find('.qti-itemBody').html(),
            itemBody = item.getBody();

        if (subContainers.length) {

            containerHelper.createElements(itemBody, serializedItemBody, function(newElts) {

                if (_.size(newElts) !== subContainers.length) {

                    throw 'number of sub-containers mismatch';

                } else {

                    _.each(newElts, function(container){

                        const containerData = subContainers.shift();//get data in order
                        const containerElements = _detachElements(itemBody, containerData.elements);

                        container.setElements(containerElements, containerData.body);

                        _this.initTextWidget(container, containerData.$original);

                    });

                    _.defer(function(){
                        callback.call(_this);
                    });
                }
            });

        } else {

            callback.call(_this);
        }

    };

    const _detachElements = function(container, elements) {

        const containerElements = {};
        _.each(elements, function(elementSerial){
            containerElements[elementSerial] = container.elements[elementSerial];
            delete container.elements[elementSerial];
        });
        return containerElements;
    };

    ItemWidget.initTextWidget = function(container, $col) {
        return TextWidget.build(container, $col, this.renderer.getOption('textOptionForm'), {});
    };

    /**
     * Enable debugging
     *
     * @param {Boolean} [options.state = false] - log state change in console
     * @param {Boolean} [options.xml = false] - real-time qti xml display under the creator
     */
    ItemWidget.debug = function(options) {

        options = options || {};

        if (options.state) {
            devTools.listenStateChange();
        }

        if (options.xml) {
            const $code = $('<code>', {'class' : 'language-markup'}),
                $pre = $('<pre>', {'class' : 'line-numbers'}).append($code);

            $('#item-editor-wrapper').append($pre);
            devTools.liveXmlPreview(this.element, $code);
        }

    };

    function hasUnsupportedInteraction(xml) {
        const $qti = $(xml);
        return ($qti.find('div.qti-interaction.qti-customInteraction[data-serial]').length > 0);
    }

    return ItemWidget;
});
