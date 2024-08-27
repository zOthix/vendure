import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Column, Entity, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';

import { HasCustomFields } from '../../config/custom-field/custom-field-types';
import { VendureEntity } from '../base/base.entity';
import { CustomProductVariantPriceVariantFields } from '../custom-entity-fields';

import { ProductVariantPrice } from './product-variant-price.entity';

@Entity()
export class ProductVariantPriceVariant extends VendureEntity implements HasCustomFields {
    constructor(input?: DeepPartial<ProductVariantPriceVariant>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @ManyToMany(type => ProductVariantPrice, price => price.priceVariant)
    productVariant: ProductVariantPrice[];

    @Column(type => CustomProductVariantPriceVariantFields)
    customFields: CustomProductVariantPriceVariantFields;
}
