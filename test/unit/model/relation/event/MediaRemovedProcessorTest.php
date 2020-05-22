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

namespace oat\taoMediaManager\test\unit\model\relation\event;

use LogicException;
use oat\generis\test\TestCase;
use oat\taoMediaManager\model\relation\event\MediaRemovedEvent;
use oat\taoMediaManager\model\relation\event\MediaSavedEvent;
use oat\taoMediaManager\model\relation\event\processor\InvalidEventException;
use oat\taoMediaManager\model\relation\event\processor\MediaRemovedEventProcessor;
use oat\taoMediaManager\model\relation\service\ItemRelationUpdateService;
use PHPUnit\Framework\MockObject\MockObject;

class MediaRemovedProcessorTest extends TestCase
{
    /** @var MediaRemovedEventProcessor */
    private $subject;

    /** @var ItemRelationUpdateService|MockObject */
    private $updateService;

    public function setUp(): void
    {
        $this->updateService = $this->createMock(ItemRelationUpdateService::class);
        $this->subject = new MediaRemovedEventProcessor();
        $this->subject->setServiceLocator(
            $this->getServiceLocatorMock(
                [
                    ItemRelationUpdateService::class => $this->updateService,
                ]
            )
        );
    }

    public function testProcess(): void
    {
        $this->updateService
            ->expects($this->once())
            ->method('removeMedia')
            ->with('mediaId');

        $this->subject->process(new MediaRemovedEvent('mediaId'));
    }

    public function testInvalidEventWillThrowException(): void
    {
        $this->expectException(InvalidEventException::class);

        $this->subject->process(new MediaSavedEvent());
    }
}
