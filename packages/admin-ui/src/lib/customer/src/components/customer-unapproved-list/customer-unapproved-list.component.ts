import { Component, OnInit } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    LogicalOperator,
    TypedBaseListComponent,
    CustomerUnapprovedListQueryDocument,
    DataService,
    NotificationService,
} from '@vendure/admin-ui/core';
import { gql } from 'apollo-angular';

export const CUSTOMER_UNAPPROVED_LIST_QUERY = gql`
    query CustomerUnapprovedListQuery($options: CustomerListOptions) {
        unapprovedCustomers(options: $options) {
            items {
                ...CustomerListItem
            }
            totalItems
        }
    }

    fragment CustomerListItem on Customer {
        id
        createdAt
        updatedAt
        title
        firstName
        lastName
        emailAddress
        user {
            id
            verified
        }
    }
`;

@Component({
    selector: 'vdr-customer-unapproved-list',
    templateUrl: './customer-unapproved-list.component.html',
    styleUrls: ['./customer-unapproved-list.component.scss'],
})
export class CustomerUnapprovedListComponent
    extends TypedBaseListComponent<typeof CustomerUnapprovedListQueryDocument, 'unapprovedCustomers'>
    implements OnInit
{
    readonly customFields = this.getCustomFieldConfig('Customer');
    readonly filters = this.createFilterCollection()
        .addIdFilter()
        .addDateFilters()
        .addFilter({
            name: 'firstName',
            type: { kind: 'text' },
            label: _('customer.first-name'),
            filterField: 'firstName',
        })
        .addFilter({
            name: 'lastName',
            type: { kind: 'text' },
            label: _('customer.last-name'),
            filterField: 'lastName',
        })
        .addFilter({
            name: 'emailAddress',
            type: { kind: 'text' },
            label: _('customer.email-address'),
            filterField: 'emailAddress',
        })
        .addCustomFieldFilters(this.customFields)
        .connectToRoute(this.route);

    readonly sorts = this.createSortCollection()
        .defaultSort('createdAt', 'DESC')
        .addSort({ name: 'createdAt' })
        .addSort({ name: 'updatedAt' })
        .addSort({ name: 'lastName' })
        .addSort({ name: 'emailAddress' })
        .addCustomFieldSorts(this.customFields)
        .connectToRoute(this.route);

    constructor(
        protected dataService: DataService,
        private notificationService: NotificationService,
    ) {
        super();
        this.configure({
            document: CustomerUnapprovedListQueryDocument,
            getItems: data => data.unapprovedCustomers,
            setVariables: (skip, take) => ({
                options: {
                    skip,
                    take,
                    filter: {
                        ...(this.searchTermControl.value
                            ? {
                                  emailAddress: {
                                      contains: this.searchTermControl.value,
                                  },
                                  lastName: {
                                      contains: this.searchTermControl.value,
                                  },
                                  postalCode: {
                                      contains: this.searchTermControl.value,
                                  },
                              }
                            : {}),
                        ...this.filters.createFilterInput(),
                    },
                    filterOperator: this.searchTermControl.value ? LogicalOperator.OR : LogicalOperator.AND,
                    sort: this.sorts.createSortInput(),
                },
            }),
            refreshListOnChanges: [this.sorts.valueChanges, this.filters.valueChanges],
        });
    }

    approveCustomer(customerId: string, customerFirstName: string, customerLastName: string) {
        this.dataService.customer.approveCustomer(customerId).subscribe(
            data => {
                this.notificationService.success(_('common.notify-approve-customer-success'), {
                    user: `${customerFirstName} ${customerLastName}`,
                });
            },
            err => {
                this.notificationService.error(_('common.notify-approve-customer-error'), {
                    user: `${customerFirstName} ${customerLastName}`,
                });
            },
        );
    }
}
