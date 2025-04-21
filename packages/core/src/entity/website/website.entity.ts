import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { SoftDeletable } from '../../common/types/common-types';
import { HasCustomFields } from '../../config/custom-field/custom-field-types';
import { VendureEntity } from '../base/base.entity';
import { CustomProductFields } from '../custom-entity-fields';

import { CarousalItem } from './carousal-item.entity';
import { WebLink } from './web-link.entity';

/**
 * @description
 * Enables the landing page of the storefront to be editable
 *
 * @docsCategory entities
 */
@Entity()
export class Website extends VendureEntity implements HasCustomFields, SoftDeletable {
    constructor(input?: DeepPartial<Website>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '' })
    content: string;

    @Column({ default: '' })
    footerContent: string;

    @Column({ default: '' })
    announcementBarText: string;

    @OneToMany(() => WebLink, weblink => weblink.website)
    weblinks: WebLink[];

    @OneToMany(() => CarousalItem, carousalItem => carousalItem.website)
    carousalItems: CarousalItem[];

    @Column({ type: Date, nullable: true })
    deletedAt: Date | null;

    @Column(type => CustomProductFields)
    customFields: CustomProductFields;
}
