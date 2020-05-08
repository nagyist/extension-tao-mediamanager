<?php

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
 * Copyright (c) 2014 (original work) Open Assessment Technologies SA;
 *
 *
 */

$extpath = dirname(__FILE__) . DIRECTORY_SEPARATOR;
$taopath = dirname(dirname(__FILE__)) . DIRECTORY_SEPARATOR . 'tao' . DIRECTORY_SEPARATOR;

return [
    'name' => 'taoMediaManager',
    'label' => 'extension-tao-mediamanager',
    'description' => 'TAO media manager extension',
    'license' => 'GPL-2.0',
    'version' => '9.5.0',
    'author' => 'Open Assessment Technologies SA',
    'requires' => [
        'tao' => '>=42.5.0',
        'generis' => '>=12.17.0',
        'taoItems' => '>=6.0.0'
    ],
    'models' => [
        'http://www.tao.lu/Ontologies/TAOMedia.rdf'
    ],
    'managementRole' => 'http://www.tao.lu/Ontologies/TAOMedia.rdf#MediaManagerRole',
    'acl' => [
        ['grant', 'http://www.tao.lu/Ontologies/TAOMedia.rdf#MediaManagerRole', ['ext' => 'taoMediaManager']],
        ['grant', 'http://www.tao.lu/Ontologies/TAOItem.rdf#ItemAuthor', ['ext' => 'taoMediaManager']],
    ],
    'install' => [
        'rdf' => [
            dirname(__FILE__) . '/model/ontology/taomedia.rdf',
        ],
        'php' => [
            dirname(__FILE__) . '/scripts/install/setMediaManager.php',
        ]
    ],
    'update' => 'oat\\taoMediaManager\\scripts\\update\\Updater',
    'uninstall' => [
        'php' => [
            dirname(__FILE__) . '/scripts/uninstall/unsetMediaManager.php',
        ]
    ],
    'classLoaderPackages' => [
        dirname(__FILE__) . '/helpers/'
    ],
    // 'autoload' => array (
    //       'psr-4' => array(
    //           'oat\\taoMediaManager\\' => dirname(__FILE__).DIRECTORY_SEPARATOR
    //       )
    //   ),
    'routes' => [
        '/taoMediaManager' => 'oat\\taoMediaManager\\controller'
    ],
    'constants' => [
        # actions directory
        "DIR_ACTIONS" => $extpath . "controller" . DIRECTORY_SEPARATOR,

        # models directory
        "DIR_MODELS" => $extpath . "models" . DIRECTORY_SEPARATOR,

        # views directory
        "DIR_VIEWS" => $extpath . "views" . DIRECTORY_SEPARATOR,

        # helpers directory
        "DIR_HELPERS" => $extpath . "helpers" . DIRECTORY_SEPARATOR,

        # default module name
        'DEFAULT_MODULE_NAME' => 'MediaManager',

        #default action name
        'DEFAULT_ACTION_NAME' => 'editMediaClass',

        #BASE PATH: the root path in the file system (usually the document root)
        'BASE_PATH' => $extpath,

        #BASE URL (usually the domain root)
        'BASE_URL' => ROOT_URL . '/taoMediaManager',

        #TAO extension Paths
        'TAOVIEW_PATH' => $taopath . 'views' . DIRECTORY_SEPARATOR,
        'TAO_TPL_PATH' => $taopath . 'views' . DIRECTORY_SEPARATOR . 'templates' . DIRECTORY_SEPARATOR,
    ],
    'extra' => [
        'structures' => __DIR__ . DIRECTORY_SEPARATOR . 'controller' . DIRECTORY_SEPARATOR . 'structures.xml',
    ]
];
