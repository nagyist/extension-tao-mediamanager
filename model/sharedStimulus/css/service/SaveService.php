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
 * Copyright (c) 2021 (original work) Open Assessment Technologies SA;
 */

declare(strict_types=1);

namespace oat\taoMediaManager\model\sharedStimulus\css\service;

use Exception;
use League\Flysystem\FileNotFoundException;
use oat\taoMediaManager\model\sharedStimulus\css\SaveCommand;

class SaveService extends ConfigurableCssService
{
    public const STYLESHEET_WARNING_HEADER = " /* Do not edit */" . "\n";

    public function save(SaveCommand $command): void
    {
        $path = $this->getPath($command);

        if ($path === '.') {
            throw new Exception ('Shared stimulus stored as single file');
        }

        $cssClassesArray = $command->getCssClassesArray();

        if (empty($cssClassesArray)) {
            $this->removeStoredStylesheet($path . DIRECTORY_SEPARATOR . $command->getStylesheetUri());

            return;
        }

        $content = $this->getCssContentFromArray($cssClassesArray);
        $this->getFileSystem()->put($path . DIRECTORY_SEPARATOR . $command->getStylesheetUri(), $content);
    }

    private function removeStoredStylesheet(string $path): void
    {
        try {
            $this->getFileSystem()->delete($path);
        } catch (FileNotFoundException $exception) {
            $this->logDebug(sprintf('Stylesheet %s to delete was not found when trying to clear styles', $path));
        }
    }

    private function getCssContentFromArray(array $array): string
    {
        // Todo clarify if can we use taoQtiItem/helpers/CssHelper.php here? For now duplicating the code
        $css = self::STYLESHEET_WARNING_HEADER;

        // rebuild CSS
        foreach ($array as $key1 => $value1) {
            $css .= $key1 . '{';

            foreach ($value1 as $key2 => $value2) {
                // in the case that the code is embedded in a media query
                if (is_array($value2)) {
                    foreach ($value2 as $value3) {
                        $css .= $key2 . '{';
                        foreach ($value3 as $mProp) {
                            $css .= $mProp . ':' . $value3 . ';';
                        }
                        $css .= '}';
                    }
                } // regular selectors
                else {
                    $css .= $key2 . ':' . $value2 . ';';
                }
            }
            $css .= "}\n";
        }
        return $css;
    }
}
