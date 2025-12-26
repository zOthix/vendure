import { UpdatePriceVariantInput } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';

import { RequestContext } from '../../api/common/request-context';
import { ProductVariantPriceVariant } from '../../entity';
import { VendureEntityEvent } from '../vendure-entity-event';

type CreatePriceVariantInput = {
    name: string;
};

type ProductVariantPriceVariantInputTypes = CreatePriceVariantInput | UpdatePriceVariantInput | ID;

/**
 * @description
 * This event is fired whenever a {@link ProductVariantPriceVariant} is added, updated
 * or deleted.
 *
 * @docsCategory events
 * @docsPage Event Types
 */
export class PriceVariantEvent extends VendureEntityEvent<
    ProductVariantPriceVariant,
    ProductVariantPriceVariantInputTypes
> {
    constructor(
        ctx: RequestContext,
        entity: ProductVariantPriceVariant,
        type: 'created' | 'updated' | 'deleted',
        input?: ProductVariantPriceVariantInputTypes,
    ) {
        super(entity, type, ctx, input);
    }

    /**
     * Return an customer field to become compatible with the
     * deprecated old version of CustomerEvent
     * @deprecated Use `entity` instead
     * @since 1.4
     */
    get priceVariant(): ProductVariantPriceVariant {
        return this.entity;
    }
}
