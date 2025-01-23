import { RequestContext } from '../../api/common/request-context';
import { Customer } from '../../entity/customer/customer.entity';
import { VendureEvent } from '../vendure-event';

/**
 * @description
 * This event is fired when the admin declines a user on the basis of invalid
 * data or an admin provided reason.
 *
 * @docsCategory events
 * @docsPage Event Types
 */
export class CustomerRejectedEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public customer: Customer,
        public reason?: string,
    ) {
        super();
    }
}
