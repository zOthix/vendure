import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    LogicalOperator,
    SendCustomerNotificationListQueryDocument,
    TypedBaseListComponent,
    GetPriceVariantListQuery,
    GetCollectionListQuery,
    NotificationService,
} from '@vendure/admin-ui/core';
import { gql } from 'apollo-angular';
import { Observable, shareReplay } from 'rxjs';

export const SEND_CUSTOMER_NOTIFICATION_LIST_QUERY = gql`
    query SendCustomerNotificationListQuery($options: CustomerListOptions) {
        customers(options: $options) {
            items {
                ...CustomerListItemWithPriceVariant
            }
            totalItems
        }
    }

    fragment CustomerListItemWithPriceVariant on Customer {
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
        priceVariant {
            id
            name
        }
        category {
            id
            name
        }
    }
`;

@Component({
    selector: 'vdr-send-customer-notification-list',
    templateUrl: './send-customer-notification-list.component.html',
    styleUrls: ['./send-customer-notification-list.component.scss'],
})
export class SendCustomerNotificationListComponent
    extends TypedBaseListComponent<typeof SendCustomerNotificationListQueryDocument, 'customers'>
    implements OnInit
{
    loading = false;
    priceVariantOptions$: Observable<GetPriceVariantListQuery['productPriceVariants']['items']>;
    categories$: Observable<GetCollectionListQuery['collections']['items']>;
    categories: string[] = [];
    notificationForm = this.formBuilder.group({
        title: ['', Validators.required],
        subtitle: '',
        body: ['', Validators.required],
        category: null,
        priceVariant: null,
        days: 0,
        noOrder: false,
    });
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
        private notificationService: NotificationService,
        private formBuilder: FormBuilder,
    ) {
        super();
        this.priceVariantOptions$ = this.dataService.product
            .getPriceVariantList()
            .mapSingle(result => result.productPriceVariants.items)
            .pipe(shareReplay(1));
        this.categories$ = this.dataService.collection
            .getCollections()
            .mapSingle(result => result.collections.items)
            .pipe(shareReplay(1));
        this.configure({
            document: SendCustomerNotificationListQueryDocument,
            getItems: data => data.customers,
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

    onSelectedOptionsChange(updatedSelectedOptions: string[]): void {
        this.categories = updatedSelectedOptions;
        this.notificationForm.markAsDirty();
    }

    sendNotification() {
        this.loading = true;
        const customerIds = this.selectionManager.selection.map(item => item.id);
        const notificationForm = this.notificationForm.value;
        const notificationBody = {
            title: notificationForm.title ?? '',
            body: notificationForm.body ?? '',
            subtitle: notificationForm.subtitle ?? '',
        };
        this.dataService.customer
            .sendNotificationToCustomer(
                notificationBody,
                customerIds,
                this.categories,
                notificationForm.priceVariant ?? undefined,
                notificationForm.days ?? undefined,
                notificationForm.noOrder ?? undefined,
            )
            .subscribe(
                data => {
                    this.notificationService.success(_('common.notify-notification-sent-success'));
                    this.loading = false;
                    this.notificationForm.patchValue({
                        title: '',
                        subtitle: '',
                        body: '',
                        category: null,
                        days: 0,
                        noOrder: false,
                        priceVariant: null,
                    });
                    this.selectionManager.clearSelection();
                    this.categories = [];
                    this.notificationForm.markAsPristine();
                    this.loading = false;
                    this.refresh();
                },
                err => {
                    this.notificationService.error(_('common.notify-notification-sent-error'));
                    this.loading = false;
                    this.refresh();
                },
            );
    }
}
