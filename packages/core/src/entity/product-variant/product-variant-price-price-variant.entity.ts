import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Entity, ManyToOne } from 'typeorm';

import { VendureEntity } from '../base/base.entity';
import { Money } from '../money.decorator';

import { ProductVariantPriceVariant } from './product-variant-price-variant.entity';
import { ProductVariantPrice } from './product-variant-price.entity';

@Entity()
export class ProductVariantPriceToPriceVariant extends VendureEntity {
    constructor(input?: DeepPartial<ProductVariantPriceToPriceVariant>) {
        super(input);
    }

    @Money()
    price: number;

    @ManyToOne(() => ProductVariantPriceVariant, variant => variant.productVariantPrice, { eager: true })
    productVariantPriceVariant: ProductVariantPriceVariant;

    @ManyToOne(() => ProductVariantPrice, variant => variant.productVariantPriceVariant)
    productVariantPrice: ProductVariantPrice;
}
