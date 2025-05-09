import { Component, OnInit } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    DataService,
    FACET_WITH_VALUE_LIST_FRAGMENT,
    GetFacetListDocument,
    GetFacetListQuery,
    ItemOf,
    LanguageCode,
    TypedBaseListComponent,
} from '@vendure/admin-ui/core';
import { gql } from 'apollo-angular';

export const FACET_LIST_QUERY = gql`
    query GetFacetList($options: FacetListOptions, $facetValueListOptions: FacetValueListOptions) {
        facets(options: $options) {
            items {
                ...FacetWithValueList
            }
            totalItems
        }
    }
    ${FACET_WITH_VALUE_LIST_FRAGMENT}
`;

interface FacetValue {
    code: string;
    name: string;
}

interface Facet {
    code: string;
    name: string;
    values: FacetValue[];
}

@Component({
    selector: 'vdr-facet-list',
    templateUrl: './facet-list.component.html',
    styleUrls: ['./facet-list.component.scss'],
})
export class FacetListComponent
    extends TypedBaseListComponent<typeof GetFacetListDocument, 'facets'>
    implements OnInit
{
    facets: Facet[] = [];
    readonly initialLimit = 3;
    displayLimit: { [id: string]: number } = {};

    readonly customFields = this.getCustomFieldConfig('Facet');
    readonly filters = this.createFilterCollection()
        .addIdFilter()
        .addDateFilters()
        .addFilter({
            name: 'visibility',
            type: { kind: 'boolean' },
            label: _('common.visibility'),
            toFilterInput: value => ({
                isPrivate: { eq: !value },
            }),
        })
        .addCustomFieldFilters(this.customFields)
        .connectToRoute(this.route);

    readonly sorts = this.createSortCollection()
        .defaultSort('createdAt', 'DESC')
        .addSort({ name: 'id' })
        .addSort({ name: 'createdAt' })
        .addSort({ name: 'updatedAt' })
        .addSort({ name: 'name' })
        .addSort({ name: 'code' })
        .addCustomFieldSorts(this.customFields)
        .connectToRoute(this.route);

    constructor(protected dataService: DataService) {
        super();
        super.configure({
            document: GetFacetListDocument,
            getItems: data => data.facets,
            setVariables: (skip, take) => ({
                options: {
                    skip,
                    take,
                    filter: {
                        name: {
                            contains: this.searchTermControl.value,
                        },
                        ...this.filters.createFilterInput(),
                    },
                    sort: this.sorts.createSortInput(),
                },
                facetValueListOptions: {
                    take: 100,
                },
            }),
            refreshListOnChanges: [this.filters.valueChanges, this.sorts.valueChanges],
        });
        this.getAllFacetValues();
    }

    getAllFacetValues() {
        this.dataService.facet
            .allFacets()
            .mapSingle(result => result.allFacets)
            .subscribe(facets => {
                if (facets) {
                    this.facets = facets;
                }
            });
    }

    downloadTemplate() {
        const headers: string[] = ['facetName', 'facetCode', 'facetValueName', 'facetId'];
        const filename = 'facets.csv';
        const csvRows = [headers.join(',')];
        this.facets.forEach(f => {
            f.values.forEach(fv => {
                csvRows.push([f.name, f.code, fv.name, fv.code].join(','));
            });
        });
        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    toggleDisplayLimit(facet: ItemOf<GetFacetListQuery, 'facets'>) {
        if (this.displayLimit[facet.id] === facet.valueList.items.length) {
            this.displayLimit[facet.id] = this.initialLimit;
        } else {
            this.displayLimit[facet.id] = facet.valueList.items.length;
        }
    }

    setLanguage(code: LanguageCode) {
        this.dataService.client.setContentLanguage(code).subscribe();
    }
}
