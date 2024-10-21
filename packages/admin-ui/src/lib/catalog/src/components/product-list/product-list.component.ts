import { Component, OnInit } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import * as Papa from 'papaparse';
import {
    CreateOrUpdateProductInput,
    DataService,
    FacetValueFormInputComponent,
    JobQueueService,
    JobState,
    LogicalOperator,
    ModalService,
    NotificationService,
    ProductListQueryDocument,
    TypedBaseListComponent,
} from '@vendure/admin-ui/core';
import { ID } from '@vendure/common/lib/shared-types';
import { EMPTY, firstValueFrom, lastValueFrom } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';

interface Row {
    name?: string;
    slug?: string;
    enabled?: string;
    id?: ID;
    description?: string;
    assetIds?: string;
    facetValueIds?: string;
    featuredAssetId: ID;
}

@Component({
    selector: 'vdr-products-list',
    templateUrl: './product-list.component.html',
    styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent
    extends TypedBaseListComponent<typeof ProductListQueryDocument, 'products'>
    implements OnInit
{
    productsToUpdate: CreateOrUpdateProductInput[] = [];
    pendingSearchIndexUpdates = 0;
    readonly customFields = this.getCustomFieldConfig('Product');
    readonly filters = this.createFilterCollection()
        .addIdFilter()
        .addDateFilters()
        .addFilters([
            {
                name: 'enabled',
                type: { kind: 'boolean' },
                label: _('common.enabled'),
                filterField: 'enabled',
            },
            {
                name: 'slug',
                type: { kind: 'text' },
                label: _('common.slug'),
                filterField: 'slug',
            },
        ])
        .addFilter({
            name: 'facetValues',
            type: {
                kind: 'custom',
                component: FacetValueFormInputComponent,
                serializeValue: value => value.map(v => v.id).join(','),
                deserializeValue: value => value.split(',').map(id => ({ id })),
                getLabel: value => {
                    if (value.length === 0) {
                        return '';
                    }
                    if (value[0].name) {
                        return value.map(v => v.name).join(', ');
                    } else {
                        return lastValueFrom(
                            this.dataService.facet
                                .getFacetValues({ filter: { id: { in: value.map(v => v.id) } } })
                                .mapSingle(({ facetValues }) =>
                                    facetValues.items.map(fv => fv.name).join(', '),
                                ),
                        );
                    }
                },
            },
            label: _('catalog.facet-values'),
            toFilterInput: (value: any[]) => ({
                facetValueId: {
                    in: value.map(v => v.id),
                },
            }),
        })
        .addCustomFieldFilters(this.customFields)
        .connectToRoute(this.route);

    readonly sorts = this.createSortCollection()
        .defaultSort('createdAt', 'DESC')
        .addSorts([
            { name: 'id' },
            { name: 'createdAt' },
            { name: 'updatedAt' },
            { name: 'name' },
            { name: 'slug' },
        ])
        .addCustomFieldSorts(this.customFields)
        .connectToRoute(this.route);

    constructor(
        protected dataService: DataService,
        private modalService: ModalService,
        private notificationService: NotificationService,
        private jobQueueService: JobQueueService,
    ) {
        super();
        this.configure({
            document: ProductListQueryDocument,
            getItems: data => data.products,
            setVariables: (skip, take) => {
                const searchTerm = this.searchTermControl.value;
                let filterInput = this.filters.createFilterInput();
                if (searchTerm) {
                    filterInput = {
                        name: {
                            contains: searchTerm,
                        },
                        sku: {
                            contains: searchTerm,
                        },
                    };
                }
                return {
                    options: {
                        skip,
                        take,
                        filter: {
                            ...(filterInput ?? {}),
                        },
                        filterOperator: searchTerm ? LogicalOperator.OR : LogicalOperator.AND,
                        sort: this.sorts.createSortInput(),
                    },
                };
            },
            refreshListOnChanges: [this.sorts.valueChanges, this.filters.valueChanges],
        });
    }

    rebuildSearchIndex() {
        this.dataService.product.reindex().subscribe(({ reindex }) => {
            this.notificationService.info(_('catalog.reindexing'));
            this.jobQueueService.addJob(reindex.id, job => {
                if (job.state === JobState.COMPLETED) {
                    const time = new Intl.NumberFormat().format(job.duration || 0);
                    this.notificationService.success(_('catalog.reindex-successful'), {
                        count: job.result.indexedItemCount,
                        time,
                    });
                    this.refresh();
                } else {
                    this.notificationService.error(_('catalog.reindex-error'));
                }
            });
        });
    }

    deleteProduct(productId: string) {
        this.modalService
            .dialog({
                title: _('catalog.confirm-delete-product'),
                buttons: [
                    { type: 'secondary', label: _('common.cancel') },
                    { type: 'danger', label: _('common.delete'), returnValue: true },
                ],
            })
            .pipe(
                switchMap(response => (response ? this.dataService.product.deleteProduct(productId) : EMPTY)),
                // Short delay to allow the product to be removed from the search index before
                // refreshing.
                delay(500),
            )
            .subscribe(
                () => {
                    this.notificationService.success(_('common.notify-delete-success'), {
                        entity: 'Product',
                    });
                    this.refresh();
                },
                err => {
                    this.notificationService.error(_('common.notify-delete-error'), {
                        entity: 'Product',
                    });
                },
            );
    }

    async onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length <= 0) {
            this.notificationService.error(_('common.notify-invalid-file-error'), {
                fileType: '"csv"',
            });
            return;
        }
        const file: File = input.files[0];
        if (file.type !== 'text/csv') {
            this.notificationService.error(_('common.notify-invalid-file-error'), {
                fileType: '"csv"',
            });
            return;
        }
        const parsed = await this.parseCSV(file);
        if (!this.validateHeaders(parsed[0])) {
            return;
        }
        if (!this.validateRows(parsed)) {
            return;
        }
        await this.setUpdateProducts(parsed);
        input.value = '';
        this.refresh();
    }

    parseCSV(file: File): Promise<Row[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                complete: result => {
                    resolve(result.data as Row[]);
                },
                error: error => {
                    reject(error);
                },
                header: true,
                skipEmptyLines: 'greedy',
            });
        });
    }

    approveUpdates() {
        const productsToUpdate = [...this.productsToUpdate];
        this.dataService.product.createOrUpdateProducts(productsToUpdate).subscribe(
            data => {
                this.notificationService.success(_('common.notify-create-update-success'), {
                    entity: 'Products',
                });
                this.productsToUpdate = [];
                this.refresh();
            },
            err => {
                this.notificationService.error(_('common.notify-create-update-error'), {
                    entity: 'Products',
                });
            },
        );
    }

    rejectUpdates() {
        this.productsToUpdate = [];
    }

    private validateHeaders(firstRow: Row): boolean {
        const requiredHeaders: Array<keyof Row> = [
            'id',
            'name',
            'slug',
            'enabled',
            'assetIds',
            'description',
            'facetValueIds',
            'featuredAssetId',
        ];
        const headersFromFile = Object.keys(firstRow);
        for (const header of requiredHeaders) {
            if (!headersFromFile.includes(header)) {
                this.notificationService.error(_('common.notify-invalid-headers-error'), {
                    column: `"${header}"`,
                });
                return false;
            }
        }
        return true;
    }

    private validateRows(parsed: Row[]): boolean {
        for (const [index, item] of parsed.entries()) {
            if (!item.name) {
                this.notificationService.error(_('common.notify-invalid-row-error'), {
                    row: index + 1,
                    column: '"name"',
                });
                return false;
            }
            item.id = item.id || '';
            item.name = item.name || '';
            item.slug = item.slug || '';
            item.enabled = item.enabled?.toLocaleLowerCase() === 'true' ? 'true' : 'false';
            item.description = item.description || '';
            item.facetValueIds = item.facetValueIds || '';
            item.assetIds = item.assetIds || '';
            item.featuredAssetId = item.featuredAssetId || '';
        }
        return true;
    }

    private async setUpdateProducts(parsed: Row[]): Promise<void> {
        const productIds = parsed.map(item => String(item.id));
        const productsToUpdate = await firstValueFrom(
            this.dataService.product.getProductsByIds(productIds).mapSingle(result => result.productsByIds),
        );
        const productsToUpdateIds = productsToUpdate
            .map(item => (item !== null ? item.id : null))
            .filter(item => item !== null);
        parsed.forEach(item => {
            if (item.id && !productsToUpdateIds.includes(String(item.id))) {
                item.id = '';
            }
        });
        this.productsToUpdate = parsed.map(item => {
            return {
                name: item.name || '',
                slug: item.slug || '',
                enabled: item.enabled?.toLowerCase() === 'true',
                id: String(item.id),
                description: item.description || '',
                featuredAssetId: String(item.featuredAssetId) || '',
                assetIds: item.assetIds?.split(',') || [],
                facetValueIds: item.facetValueIds?.split(','),
            };
        });
    }
}
