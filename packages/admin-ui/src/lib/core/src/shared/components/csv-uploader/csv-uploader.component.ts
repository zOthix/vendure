import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    OnInit,
    Output,
    ViewChild,
    ElementRef,
    Input,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    CurrencyCode,
    DataService,
    DeactivateAware,
    DeletionResult,
    getDefaultUiLanguage,
    GetProductVariantOptionsQuery,
    LanguageCode,
    ModalService,
    NotificationService,
    SelectionManager,
} from '@vendure/admin-ui/core';
import { normalizeString } from '@vendure/common/lib/normalize-string';
import { unique } from '@vendure/common/lib/unique';
import { EMPTY, Observable, Subject } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

import { ProductDetailService } from '../../../../../catalog/src/providers/product-detail/product-detail.service';
import { CreateProductOptionGroupDialogComponent } from '../../../../../catalog/src/components/create-product-option-group-dialog/create-product-option-group-dialog.component';
import { CreateProductVariantDialogComponent } from '../../../../../catalog/src/components/create-product-variant-dialog/create-product-variant-dialog.component';

import * as Papa from 'papaparse';

interface Row {
    [key: string]: any;
}

@Component({
    selector: 'vdr-csv-uploader',
    templateUrl: './csv-uploader.component.html',
    styleUrls: ['./csv-uploader.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
})
export class CSVUploaderComponent {
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    @Output() fileParsed = new EventEmitter<Row[]>();
    @Input() requiredHeaders!: string[];

    constructor(private notificationService: NotificationService) {}

    triggerFileSelect() {
        this.fileInput.nativeElement.click();
    }

    async onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length <= 0) {
            this.notificationService.error(_('common.notify-invalid-file-error'), {
                fileType: '"csv"',
            });
            input.value = '';
            return;
        }
        const file: File = input.files[0];
        if (file.type !== 'text/csv') {
            this.notificationService.error(_('common.notify-invalid-file-error'), {
                fileType: '"csv"',
            });
            input.value = '';
            return;
        }
        const parsed = await this.parseCSV(file);
        if (!this.validateHeaders(parsed[0])) {
            input.value = '';
            return;
        }
        this.fileParsed.emit(parsed);
        input.value = '';
    }

    private parseCSV(file: File): Promise<Row[]> {
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

    private validateHeaders(firstRow: Row): boolean {
        const headersFromFile = Object.keys(firstRow);
        for (const header of this.requiredHeaders) {
            if (!headersFromFile.includes(header)) {
                this.notificationService.error(_('common.notify-invalid-headers-error'), {
                    column: `"${header}"`,
                });
                return false;
            }
        }
        return true;
    }
}
