import { Component, OnInit } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    DataService,
    LogicalOperator,
    ProductPriceVariantListDocument,
    TypedBaseListComponent,
} from '@vendure/admin-ui/core';

@Component({
    selector: 'vdr-price-variant-list',
    templateUrl: './price-variant-list.component.html',
    styleUrls: ['./price-variant-list.component.scss'],
})
export class PriceVariantListComponent
    extends TypedBaseListComponent<typeof ProductPriceVariantListDocument, 'productPriceVariants'>
    implements OnInit
{
    pendingSearchIndexUpdates = 0;
    readonly customFields = this.getCustomFieldConfig('ProductVariantPriceVariant');
    readonly filters = this.createFilterCollection()
        .addIdFilter()
        .addDateFilters()
        .addFilter({
            name: 'name',
            type: { kind: 'text' },
            label: _('catalog.price-variant'),
            filterField: 'name',
        })
        .addCustomFieldFilters(this.customFields)
        .connectToRoute(this.route);

    readonly sorts = this.createSortCollection()
        .defaultSort('createdAt', 'DESC')
        .addSorts([{ name: 'id' }, { name: 'createdAt' }, { name: 'updatedAt' }, { name: 'name' }])
        .addCustomFieldSorts(this.customFields)
        .connectToRoute(this.route);

    constructor(protected dataService: DataService) {
        super();
        this.configure({
            document: ProductPriceVariantListDocument,
            getItems: data => data.productPriceVariants,
            setVariables: (skip, take) => ({
                options: {
                    skip,
                    take,
                    filter: {
                        ...(this.searchTermControl.value
                            ? {
                                  name: {
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
}
