import { Component, OnInit, ViewChild } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
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
    Product,
    ProductListQueryDocument,
    TypedBaseListComponent,
} from '@vendure/admin-ui/core';
import { ID } from '@vendure/common/lib/shared-types';
import { EMPTY, firstValueFrom, lastValueFrom } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';
import { CSVUploaderComponent } from '../csv-uploader/csv-uploader.component';

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

const headersWhichAllowWhitespaces = ['description', 'name', 'productVariantName'];

const headersWhichShouldBeLowercase = ['assetIds', 'featuredAssetId'];

interface Row {
    name: string;
    slug?: string;
    enabled?: string;
    id?: ID;
    description?: string;
    assetIds?: string;
    facetValueIds?: string;
    featuredAssetId?: ID;
    productVariantName?: string;
    productVariantSKU?: string;
    productVariantPrice?: number;
    [key: string]: any;
}

interface PriceVariant {
    name: string;
    id: ID;
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
    @ViewChild('csvUploader') csvUploader!: CSVUploaderComponent;
    requiredHeaders = [...requiredHeaders];
    productsToUpdate: CreateOrUpdateProductInput[] = [];
    priceVariants: PriceVariant[] = [];
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

    openFileUpload() {
        this.csvUploader.triggerFileSelect();
    }

    async onCSVFileParsed(parsed: Row[]) {
        if (!this.validateRows(parsed)) {
            return;
        }
        const uniqueRows = this.getUniqueRows(parsed);
        await this.setUpdateProducts(uniqueRows);
        this.refresh();
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

    getPriceById(priceVariants: PriceVariantInput[], variantId: ID): string | undefined {
        if (!priceVariants) {
            return undefined;
        }
        const variant = priceVariants.find(v => v.id === variantId);
        if (!variant) {
            return undefined;
        }
        return this.formatPrice(variant.price);
    }

    formatPrice(price: number): string {
        if (!price || isNaN(Number(price))) {
            return '';
        }
        return `$${price / 100}`;
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
        const priceVariants = await this.getPriceVariants();
        if (priceVariants) {
            priceVariants.forEach(item => {
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

    private getUniqueRows(parsed: Row[]): Row[] {
        const uniqueIds = new Set<string | number>();
        const uniqueRows: Row[] = [];
        parsed.forEach(item => {
            if (item.id && !uniqueIds.has(item.id)) {
                uniqueIds.add(item.id);
                uniqueRows.push(item);
            } else {
                uniqueRows.push(item);
            }
        });
        return uniqueRows;
    }

    private validateRows(parsed: Row[]): boolean {
        for (const [index, item] of parsed.entries()) {
            if (!item.id) {
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
        }
        return true;
    }

    private async setUpdateProducts(parsed: Row[]): Promise<void> {
        const productIds = parsed.map(item => String(item.id));
        const priceVariants = await this.getPriceVariants();
        this.priceVariants = priceVariants;

        const productsToUpdate = await this.getProductsByIds(productIds);
        const productsToUpdateIds = productsToUpdate.map(product => product.id);
        const fixedRows = this.validateProductIds([...parsed], productsToUpdateIds);

        const productsToUpdateInput = fixedRows.map(_item => {
            const item = this.formatValues(_item);
            const variants: PriceVariantInput[] = [];
            priceVariants.forEach(i => {
                variants.push(
                    this.validatePriceVariantInput({
                        name: i.name,
                        id: i.id as string,
                        price: Number(item[i.name]),
                    }),
                );
            });
            if (item.id) {
                const product = productsToUpdate.find(product => product.id === item.id);
                if (product) {
                    const assetIds = item.assetIds ? item.assetIds.split(',') : product.assets.map(i => i.id);
                    const facetValueIds = item.facetValueIds
                        ? item.facetValueIds.split(',')
                        : product.facetValues.map(i => i.id);
                    const featuredAssetId = item.featuredAssetId
                        ? String(item.featuredAssetId)
                        : product.featuredAsset?.id;

                    const updatedProduct: CreateOrUpdateProductInput = {
                        id: product.id,
                        name: item.name || product.name,
                        slug: item.slug || product.slug,
                        enabled: item.enabled ? item.enabled.toLocaleLowerCase() === 'true' : product.enabled,
                        description: item.description || product.description,
                        featuredAssetId: featuredAssetId,
                        assetIds: assetIds,
                        facetValueIds: facetValueIds,
                    };

                    return updatedProduct;
                }
            }
            return {
                name: item.name ?? '',
                slug: item.slug ?? '',
                enabled: item.enabled?.toLowerCase() === 'true',
                id: String(item.id),
                description: item.description,
                featuredAssetId: String(item.featuredAssetId),
                assetIds: item.assetIds ? item.assetIds.split(',') : [],
                facetValueIds: item.facetValueIds ? item.facetValueIds.split(',') : [],
                productVariantName: item.productVariantName,
                productVariantPrice: Number(item.productVariantPrice),
                productVariantSKU: item.productVariantSKU,
                priceVariants: variants,
            };
        });
        this.productsToUpdate = [...productsToUpdateInput];
    }

    private validatePriceVariantInput(variant: PriceVariantInput): PriceVariantInput {
        const validPrice = isNaN(variant.price) ? 0 : variant.price;
        return {
            name: variant.name,
            id: variant.id,
            price: validPrice,
        };
    }

    private async getPriceVariants(): Promise<PriceVariant[]> {
        const data = await firstValueFrom(
            this.dataService.product.getPriceVariantList().mapSingle(result => result.productPriceVariants),
        );
        const priceVariants = data.items.map(item => ({
            name: item.name,
            id: item.id,
        }));
        return priceVariants as PriceVariant[];
    }

    private async getProductsByIds(productIds: ID[]): Promise<Product[]> {
        if (productIds.length <= 0) {
            return [];
        }
        const productsToUpdate = await firstValueFrom(
            this.dataService.product
                .getProductsByIds(productIds as string[])
                .mapSingle(result => result.productsByIds),
        );
        return productsToUpdate as Product[];
    }

    private validateProductIds(rows: Row[], productsToUpdateIds: ID[]) {
        rows.forEach(item => {
            if (item.id && !productsToUpdateIds.includes(String(item.id))) {
                item.id = '';
            }
        });
        return rows;
    }

    /**
     * Remove white spaces and
     * lowercase for specific values
     * @param row
     * @returns row
     */
    private formatValues(row: Row) {
        const cleanRow: Row = { ...row };
        for (const [key, value] of Object.entries(cleanRow)) {
            let newValue = value;
            if (!headersWhichAllowWhitespaces.includes(key)) {
                newValue = newValue.replace(/\s/g, '');
            }
            if (headersWhichShouldBeLowercase.includes(key)) {
                newValue = newValue.toLowerCase();
            }
            cleanRow[key] = newValue;
        }
        return cleanRow;
    }
}
