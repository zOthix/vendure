import { DeepPartial } from '@vendure/common/lib/shared-types';
import { Column, Entity } from 'typeorm';

import { VendureEntity } from '../base/base.entity';

/**
 * @description
 * Represents a notification token for a customer
 *
 * @docsCategory entities
 */
@Entity()
export class NotificationToken extends VendureEntity {
    constructor(input: DeepPartial<NotificationToken>) {
        super(input);
    }

    @Column({ unique: true })
    token: string;
}
