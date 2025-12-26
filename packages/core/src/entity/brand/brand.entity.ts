import { DeepPartial } from '@vendure/common/lib/shared-types';
import {
    Column,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { ChannelAware, SoftDeletable } from '../../common/types/common-types';
import { LocaleString, Translatable, Translation } from '../../common/types/locale-types';
import { HasCustomFields } from '../../config/custom-field/custom-field-types';
import { Asset } from '../asset/asset.entity';
import { VendureEntity } from '../base/base.entity';
import { Channel } from '../channel/channel.entity';
import { CustomProductFields } from '../custom-entity-fields';
import { FacetValue } from '../facet-value/facet-value.entity';
import { Product } from '../product/product.entity';
import { ProductOptionGroup } from '../product-option-group/product-option-group.entity';
import { ProductVariant } from '../product-variant/product-variant.entity';

/**
 * @description
 * A Product contains one or more {@link ProductVariant}s and serves as a container for those variants,
 * providing an overall name, description etc.
 *
 * @docsCategory entities
 */
@Entity()
export class Brand extends VendureEntity {
    constructor(input?: DeepPartial<Brand>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: true })
    isActive: boolean;

    @Index()
    @ManyToOne(type => Asset, asset => asset.featuredCarousalItem, { onDelete: 'SET NULL' })
    featuredAsset: Asset;

    @OneToMany(() => Product, product => product.brand)
    products: Product[];
}
