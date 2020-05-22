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
 * Copyright (c) 2020 (original work) Open Assessment Technologies SA;
 */

declare(strict_types=1);

namespace oat\taoMediaManager\test\unit\model\relation\repository\rdf\map;

use core_kernel_classes_Resource;
use oat\generis\test\TestCase;
use oat\taoMediaManager\model\relation\repository\rdf\map\RdfMediaRelationMap;
use ReflectionMethod;

class RdfMediaRelationMapTest extends TestCase
{
    public function testGetMediaRelationPropertyUri(): void
    {
        $map = new RdfMediaRelationMap();
        $method = new ReflectionMethod($map, 'getMediaRelationPropertyUri');
        $method->setAccessible(true);
        $this->assertSame('http://www.tao.lu/Ontologies/TAOMedia.rdf#RelatedMedia', $method->invoke($map));
    }

    public function testCreateMediaRelation(): void
    {
        $resource = $this->createMock(core_kernel_classes_Resource::class);
        $resource->method('getUri')
            ->willReturn('id');
        $resource->method('getLabel')
            ->willReturn('label');

        $mediaRelation = (new RdfMediaRelationMap())->createMediaRelation($resource, 'sourceId');

        $this->assertSame('media', $mediaRelation->getType());
        $this->assertSame('id', $mediaRelation->getId());
        $this->assertSame('label', $mediaRelation->getLabel());
        $this->assertSame('sourceId', $mediaRelation->getSourceId());
    }
}
