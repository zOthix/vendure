import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    Asset,
    DataService,
    GetProductVariantPriceVariantDetailDocument,
    GetProductVariantPriceVariantDetailQuery,
    ModalService,
    NotificationService,
    TypedBaseDetailComponent,
} from '@vendure/admin-ui/core';
import { gql } from 'apollo-angular';

import { ProductDetailService } from '../../providers/product-detail/product-detail.service';

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
        private productDetailService: ProductDetailService,
        private formBuilder: FormBuilder,
        private modalService: ModalService,
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
        console.log('Save called.');
    }
}
