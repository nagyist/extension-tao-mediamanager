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

namespace oat\taoMediaManager\model\task;

use Exception;
use oat\oatbox\reporting\Report as Report;
use oat\oatbox\extension\AbstractAction;
use oat\taoMediaManager\model\TextReaderInteractionQtiUpdater;

class RefreshTextReaderInteractionQtiTask extends AbstractAction
{
    public const PARAM_MEDIA_ID = 'mediaId';

    public function __invoke($params): Report
    {
        $mediaId = $params[self::PARAM_MEDIA_ID] ?? null;
        if (!is_string($mediaId) || $mediaId === '') {
            return Report::createError('Parameter "mediaId" must be a non-empty string');
        }

        try {
            $updatedItemsCount = $this->getUpdater()->refreshByMediaId($mediaId);

            $message = sprintf(
                'Refreshed Text Reader qti.xml files for media "%s" in %d item(s)',
                $mediaId,
                $updatedItemsCount
            );
            $this->logInfo($message);

            return Report::createSuccess($message);
        } catch (Exception $exception) {
            $message = sprintf(
                'Failed to refresh Text Reader qti.xml files for media "%s": %s: %s',
                $mediaId,
                $exception::class,
                $exception->getMessage()
            );
            $this->logError($message);

            return Report::createError($message);
        }
    }

    private function getUpdater(): TextReaderInteractionQtiUpdater
    {
        return $this->getServiceLocator()->get(TextReaderInteractionQtiUpdater::class);
    }
}
