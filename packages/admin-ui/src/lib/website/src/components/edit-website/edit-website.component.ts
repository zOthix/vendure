import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { DataService, GetWebsiteDocument, Website, GetWebsiteQuery } from '@vendure/admin-ui/core';
import { gql } from 'apollo-angular';
import { Observable, shareReplay, takeUntil, Subject } from 'rxjs';

@Component({
    selector: 'vdr-edit-website',
    templateUrl: './edit-website.component.html',
    styleUrls: ['./edit-website.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditWebsiteComponent implements OnInit {
    detailForm = this.formBuilder.group({
        content: '',
        footerContent: '',
    });
    websiteDetails$ = Observable<GetWebsiteQuery['getWebsite']>;

    constructor(
        private formBuilder: FormBuilder,
        protected dataService: DataService,
        private changeDetector: ChangeDetectorRef,
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
}
