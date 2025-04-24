import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    Brand,
    CreateBrandInput,
    DataService,
    GetBrandDetailDocument,
    NotificationService,
    TypedBaseDetailComponent,
    UpdateBrandInput,
    UpdatePriceVariantInput,
} from '@vendure/admin-ui/core';
import { ID } from '@vendure/common/lib/shared-types';
import { gql } from 'apollo-angular';
import { map, mergeMap, of, take } from 'rxjs';

interface MinimalAsset {
    id: ID;
    preview: string;
    createdAt: Date;
    updatedAt: Date;
    focalPoint?: { x: number; y: number } | null;
}

export const GET_BRAND_DETAIL = gql`
    query GetBrandDetail($id: ID!) {
        brand(id: $id) {
            id
            name
            description
            isActive
            slug
            featuredAsset {
                id
                createdAt
                updatedAt
                name
                fileSize
                mimeType
                type
                preview
                source
                width
                height
                focalPoint {
                    x
                    y
                }
            }
        }
    }
`;

@Component({
    selector: 'vdr-brand-detail',
    templateUrl: './brand-detail.component.html',
    styleUrls: ['./brand-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandDetailComponent
    extends TypedBaseDetailComponent<typeof GetBrandDetailDocument, 'brand'>
    implements OnInit, OnDestroy
{
    readonly customFields = this.getCustomFieldConfig('ProductVariantPriceVariant');
    detailForm = this.formBuilder.group({
        name: ['', Validators.required],
        slug: ['', Validators.required],
        description: '',
        isActive: [true, Validators.required],
    });

    featuredAsset: MinimalAsset | null = null;

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

    onAssetChange(event: { featuredAsset: MinimalAsset }) {
        this.featuredAsset = event.featuredAsset;
        this.detailForm.markAsDirty();
    }

    protected setFormValues(brand: Brand) {
        this.detailForm.patchValue({
            name: brand.name,
            slug: brand.slug,
            isActive: brand.isActive,
            description: brand.description,
        });
        this.featuredAsset = brand.featuredAsset;
    }

    create() {
        const brandForm = this.detailForm;

        if (!brandForm.dirty || !this.featuredAsset) {
            return;
        }

        const input: CreateBrandInput = {
            name: brandForm.value.name ?? '',
            description: brandForm.value.description ?? '',
            featuredAsset: this.featuredAsset.id as string,
            isActive: brandForm.value.isActive ?? true,
            slug: brandForm.value.slug ?? '',
        };

        this.dataService.product.createBrand(input).subscribe(
            data => {
                this.notificationService.success(_('common.notify-create-success'), {
                    entity: 'Brand',
                });
                this.detailForm.markAsPristine();
                this.changeDetector.markForCheck();
                this.router.navigate(['../', data.createBrand.id], { relativeTo: this.route });
            },
            err => {
                this.notificationService.error(_('common.notify-create-error'), {
                    entity: 'Brand',
                });
            },
        );
    }

    save() {
        this.entity$
            .pipe(
                take(1),
                mergeMap(({ id }) => {
                    const brandForm = this.detailForm;
                    if (brandForm && brandForm.dirty) {
                        const input: UpdateBrandInput = {
                            id,
                            name: brandForm.value.name,
                            description: brandForm.value.description,
                            featuredAsset: this.featuredAsset ? (this.featuredAsset.id as string) : undefined,
                            isActive: brandForm.value.isActive,
                            slug: brandForm.value.slug,
                        };
                        return this.dataService.product.updateBrand(input).pipe(map(res => res.updateBrand));
                    }
                    return of(null);
                }),
            )
            .subscribe(
                result => {
                    if (result) {
                        this.notificationService.success(_('common.notify-update-success'), {
                            entity: 'Brand',
                        });
                        this.detailForm.markAsPristine();
                        this.changeDetector.markForCheck();
                    }
                },
                err => {
                    this.notificationService.error(_('common.notify-update-error'), {
                        entity: 'Brand',
                    });
                },
            );
    }
}
