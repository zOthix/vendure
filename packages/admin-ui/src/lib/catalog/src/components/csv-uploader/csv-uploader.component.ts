import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Output,
    ViewChild,
    ElementRef,
    Input,
} from '@angular/core';
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

    triggerFileSelect() {
        this.fileInput.nativeElement.click();
    }

    async onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length <= 0) {
            input.value = '';
            return;
        }
        const file: File = input.files[0];
        if (file.type !== 'text/csv') {
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
                return false;
            }
        }
        return true;
    }
}
