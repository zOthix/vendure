import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    HostBinding,
    Input,
    Output,
} from '@angular/core';
import { Asset, Permission } from '../../../common/generated-types';
import { ModalService } from '../../../providers/modal/modal.service';
import { AssetPickerDialogComponent } from '../asset-picker-dialog/asset-picker-dialog.component';
import { AssetPreviewDialogComponent } from '../asset-preview-dialog/asset-preview-dialog.component';

export interface AssetChange {
    assets: Asset[];
    featuredAsset: Asset | undefined;
}

@Component({
    selector: 'vdr-single-asset',
    templateUrl: './single-asset.component.html',
    styleUrls: ['./single-asset.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SingleAssetComponent {
    @Input()
    featuredAsset: Asset | undefined;

    @HostBinding('class.compact')
    @Input()
    compact = false;

    @Output()
    assetChange = new EventEmitter<AssetChange>();

    @Input()
    updatePermissions: string | string[] | Permission | Permission[];

    constructor(
        private modalService: ModalService,
        private changeDetector: ChangeDetectorRef,
    ) {}

    selectAsset() {
        this.modalService
            .fromComponent(AssetPickerDialogComponent, {
                size: 'xl',
            })
            .subscribe(result => {
                if (result && result.length) {
                    this.featuredAsset = result[0]; // only use the first selected asset
                    this.emitChangeEvent(this.featuredAsset ? [this.featuredAsset] : [], this.featuredAsset);
                    this.changeDetector.markForCheck();
                }
            });
    }

    previewAsset(asset: Asset) {
        this.modalService
            .fromComponent(AssetPreviewDialogComponent, {
                size: 'xl',
                closable: true,
                locals: { asset, assets: this.featuredAsset ? [this.featuredAsset] : [] },
            })
            .subscribe();
    }

    removeAsset() {
        this.featuredAsset = undefined;
        this.emitChangeEvent([], undefined);
    }

    private emitChangeEvent(assets: Asset[], featuredAsset: Asset | undefined) {
        this.assetChange.emit({
            assets,
            featuredAsset,
        });
    }
}
