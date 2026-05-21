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
 * Copyright (c) 2026 (original work) Open Assessment Technologies SA;
 */

declare(strict_types=1);

namespace oat\taoMediaManager\test\unit\model\task;

use oat\generis\test\ServiceManagerMockTrait;
use oat\oatbox\reporting\Report;
use oat\taoMediaManager\model\TextReaderInteractionQtiUpdater;
use oat\taoMediaManager\model\task\RefreshTextReaderInteractionQtiTask;
use PHPUnit\Framework\TestCase;

class RefreshTextReaderInteractionQtiTaskTest extends TestCase
{
    use ServiceManagerMockTrait;

    public function testInvokeReturnsErrorWhenMediaIdIsMissing(): void
    {
        $subject = new RefreshTextReaderInteractionQtiTask();
        $subject->setServiceLocator($this->getServiceManagerMock());

        $report = $subject->__invoke([]);

        $this->assertInstanceOf(Report::class, $report);
        $this->assertSame(Report::TYPE_ERROR, $report->getType());
        $this->assertSame('Parameter "mediaId" must be a non-empty string', $report->getMessage());
    }

    public function testInvokeRefreshesTextReaderQtiXmlFiles(): void
    {
        $mediaId = 'media-id';
        $updater = $this->createMock(TextReaderInteractionQtiUpdater::class);
        $updater
            ->expects($this->once())
            ->method('refreshByMediaId')
            ->with($mediaId)
            ->willReturn(2);

        $subject = new RefreshTextReaderInteractionQtiTask();
        $subject->setServiceLocator(
            $this->getServiceManagerMock([
                TextReaderInteractionQtiUpdater::class => $updater,
            ])
        );

        $report = $subject->__invoke([RefreshTextReaderInteractionQtiTask::PARAM_MEDIA_ID => $mediaId]);

        $this->assertInstanceOf(Report::class, $report);
        $this->assertSame(Report::TYPE_SUCCESS, $report->getType());
        $this->assertSame(
            'Refreshed Text Reader qti.xml files for media "media-id" in 2 item(s)',
            $report->getMessage()
        );
    }

    public function testInvokeReturnsErrorWhenUpdaterThrows(): void
    {
        $mediaId = 'media-id';
        $updater = $this->createMock(TextReaderInteractionQtiUpdater::class);
        $updater
            ->expects($this->once())
            ->method('refreshByMediaId')
            ->with($mediaId)
            ->willThrowException(new \RuntimeException('boom'));

        $subject = new RefreshTextReaderInteractionQtiTask();
        $subject->setServiceLocator(
            $this->getServiceManagerMock([
                TextReaderInteractionQtiUpdater::class => $updater,
            ])
        );

        $report = $subject->__invoke([RefreshTextReaderInteractionQtiTask::PARAM_MEDIA_ID => $mediaId]);

        $this->assertInstanceOf(Report::class, $report);
        $this->assertSame(Report::TYPE_ERROR, $report->getType());
        $this->assertSame(
            'Unable to refresh Text Reader qti.xml files for media "media-id": boom',
            $report->getMessage()
        );
    }
}
