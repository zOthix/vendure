import { Component, OnInit } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { DataService, ProductPriceVariantListDocument, TypedBaseListComponent } from '@vendure/admin-ui/core';

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
        });
    }
}
