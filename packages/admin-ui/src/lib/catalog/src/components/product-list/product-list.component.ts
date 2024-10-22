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
    PriceVariantInput,
    ProductListQueryDocument,
    ProductVariantPriceVariant,
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
    productVariantName?: string;
    productVariantSKU?: string;
    productVariantPrice?: number;
    [key: string]: any;
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
    priceVariants: ProductVariantPriceVariant[] = [];
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
        const uniqueRows = this.getUniqueRows(parsed);
        await this.setUpdateProducts(uniqueRows);
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

    createOrUpdate(row: CreateOrUpdateProductInput) {
        const productsToUpdate = [...this.productsToUpdate];
        const productToUpdateIndex = productsToUpdate.findIndex(
            item => JSON.stringify(item) === JSON.stringify(row),
        );
        if (productToUpdateIndex === -1) {
            return this.notificationService.error(_('common.notify-create-update-error'), {
                entity: 'Product',
            });
        }
        const productToUpdate = productsToUpdate[productToUpdateIndex];
        this.dataService.product.createOrUpdateProducts([productToUpdate]).subscribe(
            data => {
                this.notificationService.success(_('common.notify-create-update-success'), {
                    entity: 'Product',
                });
                productsToUpdate.splice(productToUpdateIndex, 1);
                this.productsToUpdate = [...productsToUpdate];
                this.refresh();
            },
            err => {
                this.notificationService.error(_('common.notify-create-update-error'), {
                    entity: 'Product',
                });
            },
        );
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

    getPriceById(priceVariants: PriceVariantInput[], variantId: ID): number | undefined {
        console.log(priceVariants);
        const variant = priceVariants.find(v => v.id === variantId);
        return variant ? variant.price : undefined;
    }

    async downloadTemplate() {
        const headers: string[] = [
            'id',
            'name',
            'slug',
            'enabled',
            'assetIds',
            'description',
            'facetValueIds',
            'featuredAssetId',
            'productVariantName',
            'productVariantSKU',
            'productVariantPrice',
        ];
        const priceVariants = await firstValueFrom(
            this.dataService.product.getPriceVariantList().mapSingle(result => result.productPriceVariants),
        );
        if (priceVariants.items) {
            priceVariants.items.forEach(item => {
                headers.push(item.name);
            });
        }
        const filename = 'products.csv';
        const csvContent = headers.join(',') + '\n';
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

    private validateHeaders(firstRow: Row): boolean {
        const requiredHeaders = [
            'id',
            'name',
            'slug',
            'enabled',
            'assetIds',
            'description',
            'facetValueIds',
            'featuredAssetId',
            'productVariantSKU',
            'productVariantName',
            'productVariantPrice',
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

    private getUniqueRows(parsed: Row[]): Row[] {
        const map = new Set();
        const rows: Row[] = [];
        parsed.forEach(item => {
            if (item.id) {
                if (!map.has(item.id)) {
                    map.add(item.id);
                    rows.push(item);
                }
            } else {
                if (!map.has(item.name)) {
                    map.add(item.name);
                    rows.push(item);
                }
            }
        });
        return rows;
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
            if (item.productVariantName) {
                if (!item.productVariantPrice) {
                    this.notificationService.error(_('common.notify-invalid-row-error'), {
                        row: index + 1,
                        column: '"productVariantPrice"',
                    });
                    return false;
                }
                if (!item.productVariantSKU) {
                    this.notificationService.error(_('common.notify-invalid-row-error'), {
                        row: index + 1,
                        column: '"productVariantSKU"',
                    });
                    return false;
                }
            }
        }
        return true;
    }

    private async setUpdateProducts(parsed: Row[]): Promise<void> {
        const productIds = parsed.map(item => String(item.id));
        const productsToUpdate = await firstValueFrom(
            this.dataService.product.getProductsByIds(productIds).mapSingle(result => result.productsByIds),
        );
        const priceVariants = await firstValueFrom(
            this.dataService.product.getPriceVariantList().mapSingle(result => result.productPriceVariants),
        );
        this.priceVariants = priceVariants.items as ProductVariantPriceVariant[];
        const productsToUpdateIds = productsToUpdate
            .map(item => (item !== null ? item.id : null))
            .filter(item => item !== null);
        parsed.forEach(item => {
            if (item.id && !productsToUpdateIds.includes(String(item.id))) {
                item.id = '';
            }
        });
        this.productsToUpdate = parsed.map(item => {
            const variants: PriceVariantInput[] = [];
            priceVariants.items.forEach(i => {
                if (!isNaN(item[i.name]) && Number(item[i.name]) !== 0) {
                    variants.push({
                        name: i.name,
                        id: i.id,
                        price: Number(item[i.name]),
                    });
                }
            });
            console.log(variants);
            return {
                name: item.name ?? '',
                slug: item.slug ?? '',
                enabled: item.enabled?.toLowerCase() === 'true',
                id: String(item.id),
                description: item.description ?? '',
                featuredAssetId: String(item.featuredAssetId) ?? '',
                assetIds: item.assetIds?.split(','),
                facetValueIds: item.facetValueIds?.split(','),
                productVariantName: item.productVariantName,
                productVariantPrice: Number(item.productVariantPrice),
                productVariantSKU: item.productVariantSKU,
                priceVariants: variants,
            };
        });
    }
}
