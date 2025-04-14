import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { SoftDeletable } from '../../common/types/common-types';
import { HasCustomFields } from '../../config/custom-field/custom-field-types';
import { VendureEntity } from '../base/base.entity';
import { CustomProductFields } from '../custom-entity-fields';

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

    @Column({ type: Date, nullable: true })
    deletedAt: Date | null;

    @Column(type => CustomProductFields)
    customFields: CustomProductFields;
}
