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

use oat\taoQtiItem\model\qti\interaction\ImsPortableCustomInteraction;
use oat\taoQtiItem\model\qti\interaction\PortableCustomInteraction;
use oat\taoQtiItem\model\qti\Item;
use oat\taoQtiItem\model\qti\parser\TextReaderReferencesExtractor;

class TextReaderReferencesExtractorAdapter implements TextReaderReferencesExtractorInterface
{
    public function __construct(
        private readonly TextReaderReferencesExtractor $extractor
    ) {
    }

    public function extract(Item $qtiItem): array
    {
        return $this->extractor->extract($qtiItem);
    }

    public function getTextReaderInteractions(Item $qtiItem): array
    {
        return $this->extractor->getTextReaderInteractions($qtiItem);
    }

    public function extractFromInteraction(
        PortableCustomInteraction|ImsPortableCustomInteraction $interaction
    ): array {
        return $this->extractor->extractFromInteraction($interaction);
    }
}
