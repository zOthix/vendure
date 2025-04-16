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
export class WebLink extends VendureEntity {
    constructor(input?: DeepPartial<WebLink>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    link: string;

    @Column({ default: '' })
    linkText: string;

    @Column({ type: 'int', nullable: true })
    position?: number;

    @Index()
    @ManyToOne(type => Asset, asset => asset.featuredInWeblink, { onDelete: 'SET NULL' })
    featuredAsset?: Asset;

    @ManyToOne(() => Website, website => website.weblinks, { onDelete: 'CASCADE' })
    website: Website;
}
