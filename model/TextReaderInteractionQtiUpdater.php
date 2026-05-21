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

namespace oat\taoMediaManager\model;

use core_kernel_classes_Resource;
use common_persistence_SqlPersistence;
use oat\generis\persistence\PersistenceManager;
use oat\oatbox\log\LoggerAwareTrait;
use oat\taoItems\model\media\ItemMediaResolver;
use oat\taoQtiItem\model\qti\event\UpdatedItemEventDispatcher;
use oat\taoQtiItem\model\qti\interaction\ImsPortableCustomInteraction;
use oat\taoQtiItem\model\qti\interaction\PortableCustomInteraction;
use oat\taoQtiItem\model\qti\Item;
use oat\taoQtiItem\model\qti\Service as QtiService;
use oat\tao\model\resources\relation\FindAllQuery;
use oat\taoMediaManager\model\relation\repository\MediaRelationRepositoryInterface;
use taoItems_models_classes_ItemsService;
use Throwable;
use tao_helpers_Uri;

class TextReaderInteractionQtiUpdater
{
    use LoggerAwareTrait;

    private const CONTENT_PROPERTY_PREFIX = 'content-';
    private const ITEM_RELATION_TYPE = 'item';

    public function __construct(
        private readonly MediaRelationRepositoryInterface $mediaRelationRepository,
        private readonly QtiService $qtiService,
        private readonly UpdatedItemEventDispatcher $updatedItemEventDispatcher,
        private readonly taoItems_models_classes_ItemsService $itemsService,
        private readonly PersistenceManager $persistenceManager,
        private readonly TextReaderReferencesExtractorInterface $textReaderReferencesExtractor
    ) {
    }

    public function refreshByMediaId(string $mediaId): int
    {
        $updatedItemsCount = 0;

        foreach ($this->getTargetItems($mediaId) as $item) {
            try {
                if ($this->refreshItemResource($item, $mediaId)) {
                    $updatedItemsCount++;
                }
            } catch (Throwable $throwable) {
                $this->logWarning(
                    sprintf(
                        'Unable to refresh Text Reader interaction references for item "%s": %s',
                        $item->getUri(),
                        $throwable->getMessage()
                    )
                );
            }
        }

        return $updatedItemsCount;
    }

    private function getTargetItems(string $mediaId): array
    {
        $items = [];

        foreach ($this->getMediaRelationRepository()->findAll(new FindAllQuery($mediaId))->getIterator() as $relation) {
            if ($relation->getType() !== self::ITEM_RELATION_TYPE) {
                continue;
            }

            $items[$relation->getId()] = new core_kernel_classes_Resource($relation->getId());
        }

        return array_values($items);
    }

    private function refreshItemResource(core_kernel_classes_Resource $rdfItem, string $mediaId): bool
    {
        $this->ensureQtiProductNameIsDefined();

        $qtiItem = $this->getQtiService()->getDataItemByRdfItem($rdfItem);
        if (!$qtiItem instanceof Item) {
            error_log(sprintf('Resource "%s" is not associated with a valid QTI item', $rdfItem->getUri()));
            return false;
        }

        return $this->refreshItem($qtiItem, $rdfItem, $mediaId);
    }

    private function refreshItem(Item $qtiItem, core_kernel_classes_Resource $rdfItem, string $mediaId): bool
    {
        $resolver = new ItemMediaResolver($rdfItem, $this->extractLanguage($qtiItem));
        $interactions = $this->getTextReaderReferencesExtractor()->getTextReaderInteractions($qtiItem);
        $itemWasUpdated = false;

        $this->logInfo(sprintf('Refreshing item "%s" for media "%s"', $qtiItem->getIdentifier(), $mediaId));
        $this->logInfo(
            sprintf(
                'Found %d Text Reader interaction(s) in item "%s"',
                count($interactions),
                $qtiItem->getIdentifier()
            )
        );

        foreach ($interactions as $interaction) {
            $interactionIdentifier = $this->getInteractionLogIdentifier($interaction);
            $this->logInfo(
                sprintf(
                    'Refreshing interaction "%s" in item "%s"',
                    $interactionIdentifier,
                    $qtiItem->getIdentifier()
                )
            );
            $interactionWasUpdated = $this->refreshInteractionProperties($interaction, $resolver, $mediaId);
            if ($interactionWasUpdated) {
                $itemWasUpdated = true;
            }
            $this->logInfo(
                sprintf(
                    'Interaction "%s" in item "%s" was %supdated',
                    $interactionIdentifier,
                    $qtiItem->getIdentifier(),
                    $interactionWasUpdated ? '' : 'not '
                )
            );
        }

        if (!$itemWasUpdated) {
            return false;
        }

        $this->getQtiService()->saveDataItemToRdfItem($qtiItem, $rdfItem);
        $this->getUpdatedItemEventDispatcher()->dispatch($qtiItem, $rdfItem);

        return true;
    }

    private function refreshInteractionProperties(
        PortableCustomInteraction|ImsPortableCustomInteraction $interaction,
        ItemMediaResolver $resolver,
        string $mediaId
    ): bool {
        $properties = $interaction->getProperties();
        $matchingSources = $this->extractMatchingImageSources($interaction, $resolver, $mediaId);
        if ($matchingSources === []) {
            return false;
        }

        $updatedProperties = $properties;
        $hasChanges = false;

        foreach ($matchingSources as $source) {
            $contentPropertyKey = self::CONTENT_PROPERTY_PREFIX . $source;
            $dataUrl = $this->buildDataUrl($resolver, $source);

            if (($updatedProperties[$contentPropertyKey] ?? null) !== $dataUrl) {
                $updatedProperties[$contentPropertyKey] = $dataUrl;
                $hasChanges = true;
            }
        }

        if ($hasChanges) {
            $interaction->setProperties($updatedProperties);
        }

        return $hasChanges;
    }

    private function extractMatchingImageSources(
        PortableCustomInteraction|ImsPortableCustomInteraction $interaction,
        ItemMediaResolver $resolver,
        string $mediaId
    ): array {
        $sources = [];

        foreach ($this->getTextReaderReferencesExtractor()->extractFromInteraction($interaction) as $source) {
            if ($this->isReferenceToMedia($source, $resolver, $mediaId)) {
                $sources[$source] = $source;
            }
        }

        return array_values($sources);
    }

    private function isReferenceToMedia(string $reference, ItemMediaResolver $resolver, string $mediaId): bool
    {
        try {
            $asset = $resolver->resolve($reference);

            return $asset->getMediaSource() instanceof MediaSource
                && tao_helpers_Uri::decode($asset->getMediaIdentifier()) === $mediaId;
        } catch (Throwable $_) {
            return false;
        }
    }

    private function buildDataUrl(ItemMediaResolver $resolver, string $reference): string
    {
        $asset = $resolver->resolve($reference);
        $mediaSource = $asset->getMediaSource();
        $mediaIdentifier = $asset->getMediaIdentifier();
        $fileInfo = $mediaSource->getFileInfo($mediaIdentifier);
        $content = $mediaSource->getFileStream($mediaIdentifier)->getContents();

        return sprintf(
            'data:%s;base64,%s',
            $fileInfo['mime'] ?? 'application/octet-stream',
            base64_encode($content)
        );
    }

    private function extractLanguage(Item $qtiItem): string
    {
        if ($qtiItem->hasAttribute('xml:lang')) {
            return (string)$qtiItem->getAttributeValue('xml:lang');
        }

        return '';
    }

    private function getQtiService(): QtiService
    {
        return $this->qtiService;
    }

    private function getMediaRelationRepository(): MediaRelationRepositoryInterface
    {
        return $this->mediaRelationRepository;
    }

    private function getInteractionLogIdentifier(
        PortableCustomInteraction|ImsPortableCustomInteraction $interaction
    ): string {
        if (method_exists($interaction, 'getIdentifier')) {
            return (string) $interaction->getIdentifier();
        }

        try {
            $response = $interaction->getResponse();
            if ($response !== null && method_exists($response, 'getIdentifier')) {
                return (string) $response->getIdentifier();
            }
        } catch (Throwable $_) {
        }

        return $interaction->getTypeIdentifier();
    }

    private function ensureQtiProductNameIsDefined(): void
    {
        if (!defined('PRODUCT_NAME')) {
            define('PRODUCT_NAME', 'TAO');
        }
    }

    private function getUpdatedItemEventDispatcher(): UpdatedItemEventDispatcher
    {
        return $this->updatedItemEventDispatcher;
    }

    private function getTextReaderReferencesExtractor(): TextReaderReferencesExtractorInterface
    {
        return $this->textReaderReferencesExtractor;
    }

    private function getPersistence(): common_persistence_SqlPersistence
    {
        return $this->persistenceManager->getPersistenceById('default');
    }
}
