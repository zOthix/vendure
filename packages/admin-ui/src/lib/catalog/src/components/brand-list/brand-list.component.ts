import { Component, OnInit } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    BrandListQueryDocument,
    DataService,
    TypedBaseListComponent,
    LogicalOperator,
} from '@vendure/admin-ui/core';

@Component({
    selector: 'vdr-brand-list',
    templateUrl: './brand-list.component.html',
    styleUrls: ['./brand-list.component.scss'],
})
export class BrandListComponent
    extends TypedBaseListComponent<typeof BrandListQueryDocument, 'brands'>
    implements OnInit
{
    readonly filters = this.createFilterCollection()
        .addIdFilter()
        .addFilter({
            name: 'name',
            type: { kind: 'text' },
            label: _('common.name'),
            filterField: 'name',
        })
        .addFilter({
            name: 'slug',
            type: { kind: 'text' },
            label: _('common.slug'),
            filterField: 'slug',
        })
        .connectToRoute(this.route);

    readonly sorts = this.createSortCollection()
        .defaultSort('name', 'DESC')
        .addSorts([{ name: 'id' }, { name: 'name' }, { name: 'id' }, { name: 'slug' }])
        .connectToRoute(this.route);

    constructor(protected dataService: DataService) {
        super();
        this.configure({
            document: BrandListQueryDocument,
            getItems: data => data.brands,
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
