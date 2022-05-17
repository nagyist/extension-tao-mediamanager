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
 * Copyright (c) 2022 (original work) Open Assessment Technologies SA.
 */

namespace oat\taoMediaManager\model\classes\Copier;

use oat\tao\model\resources\Contract\InstanceContentCopierInterface;
use oat\tao\model\resources\Contract\InstanceCopierInterface;
use oat\taoItems\model\Copier\InstanceContentCopier;
use core_kernel_classes_Resource;
use core_kernel_classes_Class;

class AssetInstanceCopier
{
    /** @var InstanceCopierInterface */
    private $taoInstanceCopier;

    /** @var InstanceContentCopier */
    private $instanceContentCopier;

    public function __construct(
        InstanceCopierInterface $taoInstanceCopier,
        InstanceContentCopierInterface $instanceContentCopier
    ) {
        $this->taoInstanceCopier = $taoInstanceCopier;
        $this->instanceContentCopier = $instanceContentCopier;
    }

    public function copy(
        core_kernel_classes_Resource $instance,
        core_kernel_classes_Class $destinationClass
    ): core_kernel_classes_Resource {
        $newInstance = $this->taoInstanceCopier->copy($instance, $destinationClass);
        $this->instanceContentCopier->copy($instance, $newInstance);

        return $newInstance;
    }
}
