import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { DataService, GetWebsiteDocument, Website, NotificationService } from '@vendure/admin-ui/core';
import { takeUntil, Subject } from 'rxjs';

@Component({
    selector: 'vdr-edit-website',
    templateUrl: './edit-website.component.html',
    styleUrls: ['./edit-website.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditWebsiteComponent implements OnInit {
    detailForm = this.formBuilder.group({
        content: ['', Validators.required],
        footerContent: ['', Validators.required],
    });

    constructor(
        private formBuilder: FormBuilder,
        protected dataService: DataService,
        private changeDetector: ChangeDetectorRef,
        private notificationService: NotificationService,
    ) {}

    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        this.dataService
            .query(GetWebsiteDocument, {})
            .single$.pipe(takeUntil(this.destroy$))
            .subscribe(({ getWebsite }) => {
                if (getWebsite) {
                    this.setFormValues(getWebsite);
                }
            });
    }

    protected setFormValues(entity: Website): void {
        this.detailForm.patchValue({
            content: entity.content,
            footerContent: entity.footerContent,
        });
    }

    save() {
        const input = {
            content: this.detailForm.get('content')?.value || '',
            footerContent: this.detailForm.get('footerContent')?.value || '',
        };
        this.dataService.website.updateWebsite(input).subscribe({
            next: res => {
                this.notificationService.success(_('common.notify-update-success'), {
                    entity: 'Website',
                });
                this.detailForm.markAsPristine();
                this.changeDetector.markForCheck();
            },
            error: err => {
                this.notificationService.error(_('common.notify-update-error'), {
                    entity: 'Website',
                });
            },
        });
    }
}
