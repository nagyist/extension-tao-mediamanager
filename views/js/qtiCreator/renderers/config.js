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
 * Copyright (c) 2020 (original work) Open Assessment Technologies SA;
 */

define([
    'lodash',
    'taoQtiItem/qtiCommonRenderer/renderers/config',
    'taoItems/assets/manager',
    'taoItems/assets/strategies'
], function(_, commonRenderConfig, assetManagerFactory, assetStrategies) {
    'use strict';

    //asset manager using base url
    const assetManager = assetManagerFactory([
        assetStrategies.taomedia,
        assetStrategies.external,
        assetStrategies.base64,
        assetStrategies.baseUrl
    ], {baseUrl : ''});

    const locations = _.defaults({
        '_container' : 'taoQtiItem/qtiCreator/renderers/Container',
        '_tooltip' : 'taoQtiItem/qtiCreator/renderers/Tooltip',
        'assessmentItem' : 'taoMediaManager/qtiCreator/renderers/Item',
        'img' : 'taoMediaManager/qtiCreator/renderers/Img',
        'math' : 'taoQtiItem/qtiCreator/renderers/Math',
        'object' : 'taoMediaManager/qtiCreator/renderers/Object',
        'table' : 'taoMediaManager/qtiCreator/renderers/Table'
    }, commonRenderConfig.locations);

    return {
        name : 'creatorRenderer',
        locations : locations,
        options : {
            assetManager : assetManager
        }
    };
});
