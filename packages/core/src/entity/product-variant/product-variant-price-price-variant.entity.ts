import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { Entity, ManyToOne } from 'typeorm';

import { VendureEntity } from '../base/base.entity';
import { EntityId } from '../entity-id.decorator';
import { Money } from '../money.decorator';

import { ProductVariantPriceVariant } from './product-variant-price-variant.entity';
import { ProductVariantPrice } from './product-variant-price.entity';

@Entity()
export class ProductVariantPriceToPriceVariant extends VendureEntity {
    constructor(input?: DeepPartial<ProductVariantPriceToPriceVariant>) {
        super(input);
    }

    @EntityId()
    productVariantPriceVariantId: ID;

    @Money()
    price: number;

    @ManyToOne(() => ProductVariantPriceVariant, variant => variant.productVariantPrice, { eager: true })
    productVariantPriceVariant: ProductVariantPriceVariant;

    @ManyToOne(() => ProductVariantPrice, variant => variant.productVariantPriceVariant)
    productVariantPrice: ProductVariantPrice;
}
