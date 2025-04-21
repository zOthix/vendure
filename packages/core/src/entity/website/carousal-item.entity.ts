import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Asset } from '../asset/asset.entity';
import { VendureEntity } from '../base/base.entity';

import { Website } from './website.entity';

/**
 * @description
 * Web links for the storefront
 *
 * @docsCategory entities
 */
@Entity()
export class CarousalItem extends VendureEntity {
    constructor(input?: DeepPartial<CarousalItem>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: true })
    position: number;

    @Column({ default: true })
    isActive: boolean;

    @Index()
    @ManyToOne(type => Asset, asset => asset.featuredCarousalItem, { onDelete: 'SET NULL' })
    featuredAsset: Asset;

    @ManyToOne(() => Website, website => website.weblinks, { onDelete: 'CASCADE' })
    website: Website;
}
