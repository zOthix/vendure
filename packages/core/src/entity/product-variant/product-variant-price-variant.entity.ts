import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Column, Entity, Index, OneToMany } from 'typeorm';

import { VendureEntity } from '../base/base.entity';
import { Customer } from '../customer/customer.entity';

import { ProductVariantPriceToPriceVariant } from './product-variant-price-price-variant.entity';

@Entity()
export class ProductVariantPriceVariant extends VendureEntity {
    constructor(input?: DeepPartial<ProductVariantPriceVariant>) {
        super(input);
    }

    @Index({ unique: true })
    @Column()
    name: string;

    @OneToMany(type => Customer, customer => customer.priceVariant)
    customer?: Customer[];

    @OneToMany(type => ProductVariantPriceToPriceVariant, variant => variant.productVariantPriceVariant)
    productVariantPrice: ProductVariantPriceToPriceVariant[];
}
