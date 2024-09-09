import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    DataService,
    GetProductVariantPriceVariantDetailDocument,
    GetProductVariantPriceVariantDetailQuery,
    NotificationService,
    TypedBaseDetailComponent,
    UpdatePriceVariantInput,
} from '@vendure/admin-ui/core';
import { gql } from 'apollo-angular';
import { map, mergeMap, of, take } from 'rxjs';

export const GET_PRODUCT_VARIANT_PRICE_VARIANT_DETAIL = gql`
    query GetProductVariantPriceVariantDetail($id: ID!) {
        productPriceVariant(id: $id) {
            id
            name
        }
    }
`;

@Component({
    selector: 'vdr-product-detail2',
    templateUrl: './price-variant-detail.component.html',
    styleUrls: ['./price-variant-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceVariantDetailComponent
    extends TypedBaseDetailComponent<
        typeof GetProductVariantPriceVariantDetailDocument,
        'productPriceVariant'
    >
    implements OnInit, OnDestroy
{
    readonly customFields = this.getCustomFieldConfig('ProductVariantPriceVariant');
    detailForm = this.formBuilder.group({
        name: ['', Validators.required],
    });
    constructor(
        private formBuilder: FormBuilder,
        private notificationService: NotificationService,
        protected dataService: DataService,
        private changeDetector: ChangeDetectorRef,
    ) {
        super();
    }

    ngOnInit() {
        this.init();
    }

    ngOnDestroy() {
        this.destroy();
    }

    protected setFormValues(
        productPriceVariant: NonNullable<GetProductVariantPriceVariantDetailQuery['productPriceVariant']>,
    ) {
        this.detailForm.patchValue({
            name: productPriceVariant.name,
        });
    }

    create() {
        const productGroup = this.detailForm;
        if (!productGroup.dirty) {
            return;
        }

        const newPriceVariant = {
            name: productGroup.value.name ?? '',
        };

        this.dataService.product.createPriceVariant(newPriceVariant.name).subscribe(
            data => {
                this.notificationService.success(_('common.notify-create-success'), {
                    entity: 'Price Variant',
                });
                this.detailForm.markAsPristine();
                this.changeDetector.markForCheck();
                this.router.navigate(['../', data.createPriceVariant.id], { relativeTo: this.route });
            },
            err => {
                this.notificationService.error(_('common.notify-create-error'), {
                    entity: 'Price Variant',
                });
            },
        );
    }

    save() {
        this.entity$
            .pipe(
                take(1),
                mergeMap(({ id }) => {
                    const variantForm = this.detailForm;
                    if (variantForm && variantForm.dirty) {
                        const variantInput: UpdatePriceVariantInput = {
                            id,
                            name: variantForm.value.name,
                        };
                        return this.dataService.product
                            .updatePriceVariant(variantInput)
                            .pipe(map(res => res.updatePriceVariant));
                    }
                    return of(null);
                }),
            )
            .subscribe(
                result => {
                    if (result) {
                        this.notificationService.success(_('common.notify-update-success'), {
                            entity: 'Price variant',
                        });
                        this.detailForm.markAsPristine();
                        this.changeDetector.markForCheck();
                    }
                },
                err => {
                    this.notificationService.error(_('common.notify-update-error'), {
                        entity: 'Price variant',
                    });
                },
            );
    }
}
