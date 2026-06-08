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

namespace oat\taoMediaManager\test\integration\model;

use core_kernel_classes_Resource;
use oat\generis\persistence\PersistenceManager;
use oat\oatbox\service\ServiceManager;
use oat\taoMediaManager\model\MediaService;
use oat\taoMediaManager\model\MediaSource;
use oat\taoMediaManager\model\relation\repository\MediaRelationRepositoryInterface;
use oat\taoMediaManager\model\TextReaderReferencesExtractorAdapter;
use oat\taoMediaManager\model\TextReaderInteractionQtiUpdater;
use oat\taoQtiItem\model\qti\event\UpdatedItemEventDispatcher;
use oat\taoQtiItem\model\qti\interaction\PortableCustomInteraction;
use oat\taoQtiItem\model\qti\Item;
use oat\taoQtiItem\model\qti\parser\TextReaderReferencesExtractor;
use oat\taoQtiItem\model\qti\Service as QtiService;
use PHPUnit\Framework\TestCase;
use oat\taoRevision\model\RepositoryService;
use Psr\Log\NullLogger;
use tao_helpers_Uri;
use taoItems_models_classes_ItemsService;

// phpcs:disable PSR1.Files.SideEffects
include_once dirname(__FILE__) . '/../../../includes/raw_start.php';
// phpcs:enable PSR1.Files.SideEffects

class TextReaderInteractionQtiUpdaterTest extends TestCase
{
    private const LANGUAGE = 'en-US';
    private const ITEM_URI = 'http://example.com/ontologies/tao.rdf#textReaderItem';
    private const ITEM_IDENTIFIER = 'item-1';
    private const MEDIA_LABEL = 'text-reader-image.png';

    private \core_kernel_classes_Class $mediaClass;
    private ?string $mediaId = null;
    private ?string $tempImagePath = null;

    protected function setUp(): void
    {
        $this->mediaClass = MediaService::singleton()->getRootClass()->createSubClass('Text Reader updater test class');

        $revisionService = $this->createMock(RepositoryService::class);
        $revisionService->method('commit');

        ServiceManager::getServiceManager()->overload(RepositoryService::SERVICE_ID, $revisionService);
    }

    protected function tearDown(): void
    {
        if ($this->mediaId !== null) {
            MediaService::singleton()->deleteResource(new core_kernel_classes_Resource($this->mediaId));
        }

        MediaService::singleton()->deleteClass($this->mediaClass);

        if ($this->tempImagePath !== null && file_exists($this->tempImagePath)) {
            unlink($this->tempImagePath);
        }
    }

    public function testRefreshByMediaIdUpdatesTextReaderContentAfterAssetReplacement(): void
    {
        $this->tempImagePath = $this->createTemporaryImage('Brazil.png');
        $this->mediaId = MediaService::singleton()->createMediaInstance(
            $this->tempImagePath,
            $this->mediaClass->getUri(),
            self::LANGUAGE,
            self::MEDIA_LABEL
        );

        $mediaLink = MediaSource::SCHEME_NAME . tao_helpers_Uri::encode($this->mediaId);
        $contentPropertyKey = 'content-' . $mediaLink;
        $item = $this->createTextReaderItem($mediaLink);
        $itemResource = new core_kernel_classes_Resource(self::ITEM_URI);
        $resourceMatchesItemUri = fn (
            core_kernel_classes_Resource $resource
        ): bool => $resource->getUri() === self::ITEM_URI;

        $qtiService = $this->createMock(QtiService::class);
        $qtiService->expects($this->exactly(2))
            ->method('getDataItemByRdfItem')
            ->with($this->callback($resourceMatchesItemUri))
            ->willReturn($item);
        $qtiService->expects($this->exactly(2))
            ->method('saveDataItemToRdfItem')
            ->with(
                $item,
                $this->callback($resourceMatchesItemUri)
            );

        $eventDispatcher = $this->createMock(UpdatedItemEventDispatcher::class);
        $eventDispatcher->expects($this->exactly(2))
            ->method('dispatch')
            ->with(
                $item,
                $this->callback($resourceMatchesItemUri)
            );

        $subject = new TextReaderInteractionQtiUpdater(
            $this->createMock(MediaRelationRepositoryInterface::class),
            $qtiService,
            $eventDispatcher,
            taoItems_models_classes_ItemsService::singleton(),
            $this->createMock(PersistenceManager::class),
            new TextReaderReferencesExtractorAdapter(new TextReaderReferencesExtractor())
        );
        $subject->setLogger(new NullLogger());
        $method = new \ReflectionMethod(TextReaderInteractionQtiUpdater::class, 'refreshItemResource');
        $method->setAccessible(true);

        $this->assertTrue($method->invoke($subject, $itemResource, $this->mediaId));
        $this->assertSame(
            $this->buildExpectedDataUrl($this->tempImagePath),
            $this->getTextReaderInteraction($item)->getProperties()[$contentPropertyKey]
        );

        $this->tempImagePath = $this->createTemporaryImage('Italy.png', $this->tempImagePath);

        MediaService::singleton()->editMediaInstance($this->tempImagePath, $this->mediaId, self::LANGUAGE);

        $this->assertTrue($method->invoke($subject, $itemResource, $this->mediaId));
        $this->assertSame(
            $this->buildExpectedDataUrl($this->tempImagePath),
            $this->getTextReaderInteraction($item)->getProperties()[$contentPropertyKey]
        );
    }

    private function createTemporaryImage(string $fixtureName, ?string $path = null): string
    {
        if ($path === null) {
            $path = tempnam(sys_get_temp_dir(), 'text-reader-image');
            if ($path === false) {
                $this->fail('Unable to create a temporary image file.');
            }
        }

        $this->assertTrue(
            copy(dirname(__DIR__) . '/sample/' . $fixtureName, $path),
            sprintf('Unable to copy fixture "%s" to temporary path.', $fixtureName)
        );

        return $path;
    }

    private function createTextReaderItem(string $mediaLink): Item
    {
        $item = new Item([
            'identifier' => self::ITEM_IDENTIFIER,
            'xml:lang' => self::LANGUAGE,
        ]);

        $interaction = new PortableCustomInteraction();
        $interaction->setTypeIdentifier('textReaderInteraction');
        $interaction->setProperties(
            [
                'pages' => json_encode(
                    [
                        [
                            'label' => 'Page 1',
                            'content' => [
                                sprintf('<img src="%s" alt="cat"/>', $mediaLink),
                            ],
                            'id' => 0,
                        ],
                    ]
                ),
            ]
        );

        $item->addInteraction(
            $interaction,
            sprintf('<div class="text-reader">%s</div>', $interaction->getPlaceholder())
        );

        return $item;
    }

    private function getTextReaderInteraction(Item $item): PortableCustomInteraction
    {
        $interactions = $item->getComposingElements(PortableCustomInteraction::class);
        $this->assertCount(1, $interactions);

        return current($interactions);
    }

    private function buildExpectedDataUrl(string $path): string
    {
        return sprintf(
            'data:image/png;base64,%s',
            base64_encode((string) file_get_contents($path))
        );
    }
}
