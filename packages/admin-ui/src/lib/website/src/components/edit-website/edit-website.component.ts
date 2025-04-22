import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
    ViewChild,
    TemplateRef,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    DataService,
    NotificationService,
    Asset,
    GetWebsiteQuery,
    Website,
    UpdateWebLinksInput,
    UpdateWebLinkInput,
} from '@vendure/admin-ui/core';
import { ID } from '@vendure/common/lib/shared-types';
import { shareReplay, Observable } from 'rxjs';

interface SelectedAssets {
    assets?: Asset[];
    featuredAsset?: Asset;
}

interface MinimalAsset {
    id: ID;
    preview: string;
    createdAt: Date;
    updatedAt: Date;
    focalPoint?: { x: number; y: number } | null;
}

interface Tab {
    index: number;
    title: string;
    active: boolean;
}

interface WebLink {
    id: ID;
    link: string;
    linkText: string;
    featuredAsset?: MinimalAsset | null;
    position?: number | null;
}

interface CarousalItem {
    id: ID;
    position?: number | null;
    featuredAsset?: MinimalAsset | null;
    isActive: boolean;
}

@Component({
    selector: 'vdr-edit-website',
    templateUrl: './edit-website.component.html',
    styleUrls: ['./edit-website.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditWebsiteComponent implements OnInit {
    @ViewChild('tabTemplate', { static: true }) tabTemplate!: TemplateRef<any>;

    detailForm = this.formBuilder.group({
        content: ['', Validators.required],
        footerContent: ['', Validators.required],
        announcementBarText: ['', Validators.required],
    });

    constructor(
        private formBuilder: FormBuilder,
        protected dataService: DataService,
        private changeDetector: ChangeDetectorRef,
        private notificationService: NotificationService,
    ) {}

    website: Observable<GetWebsiteQuery['getWebsite']>;

    activeCarousalItemTab = 0;
    carousalItems: CarousalItem[] = [];
    carousalItemTabs: Tab[] = [];

    activeWeblinkItemTab = 0;
    webLinks: WebLink[] = [];
    webLinkTabs: Tab[] = [];

    updateCarousalItemTab(tab: Tab) {
        this.activeCarousalItemTab = tab.index;
    }

    updateWeblinkTab(tab: Tab) {
        this.activeWeblinkItemTab = tab.index;
    }

    ngOnInit(): void {
        this.website = this.dataService.website
            .getWebsite()
            .mapSingle(result => result.getWebsite)
            .pipe(shareReplay(1));

        this.website.subscribe(website => {
            if (website) {
                this.setFormValues(website as Website);
                website.carousalItems.forEach((item, index) => {
                    if (item !== null) {
                        this.carousalItems.push({
                            id: item.id,
                            isActive: item.isActive,
                            featuredAsset: item?.featuredAsset,
                            position: item.position,
                        });
                        this.carousalItemTabs.push({
                            index: index,
                            active: index === 0,
                            title: `Item ${index + 1}`,
                        });
                    }
                });
                website.weblinks.forEach((link, index) => {
                    if (link !== null) {
                        this.webLinks.push({
                            id: link.id,
                            link: link.link,
                            linkText: link.linkText,
                            featuredAsset: link.featuredAsset,
                            position: link.position,
                        });
                        this.webLinkTabs.push({
                            index: index,
                            active: index === 0,
                            title: `Link ${index + 1}`,
                        });
                    }
                });
                this.changeDetector.markForCheck();
            }
        });
    }

    addNewCarousalItem() {
        this.carousalItemTabs.push({
            index: this.carousalItemTabs.length,
            active: false,
            title: `Item ${this.carousalItemTabs.length + 1}`,
        });
        const newItem: CarousalItem = {
            id: 0,
            isActive: true,
            featuredAsset: null,
            position: 0,
        };
        this.carousalItems.push(newItem);
    }

    protected setFormValues(entity: Website): void {
        this.detailForm.patchValue({
            content: entity.content,
            footerContent: entity.footerContent,
            announcementBarText: entity.announcementBarText,
        });
    }

    onCarousalItemChange(index: number, field: keyof CarousalItem, value: any) {
        const item = this.carousalItems.find((_, i) => i === index);
        if (item) {
            if (field === 'isActive') {
                item['position'] = Number(value);
            }
            if (field === 'position') {
                item['position'] = Number(value);
            }
            if (field === 'featuredAsset') {
                item['featuredAsset'] = value;
            }
            this.detailForm.markAsDirty();
        }
    }

    onWeblinkChange(index: number, field: keyof WebLink, value: any) {
        const link = this.webLinks.find((_, i) => i === index);
        if (link) {
            if (field === 'link') {
                link['link'] = value;
            }
            if (field === 'linkText') {
                link['linkText'] = value;
            }
            if (field === 'position') {
                link['position'] = Number(value);
            }
            if (field === 'featuredAsset') {
                link['featuredAsset'] = value;
            }
            this.detailForm.markAsDirty();
        }
    }

    onWeblinkAssetChange(event: { featuredAsset: MinimalAsset }, weblink: WebLink) {
        weblink.featuredAsset = event.featuredAsset;
        this.detailForm.markAsDirty();
    }

    onCarousalItemssetChange(event: { featuredAsset: MinimalAsset }, item: CarousalItem) {
        item.featuredAsset = event.featuredAsset;
        this.detailForm.markAsDirty();
    }

    range(n: number): number[] {
        return Array.from({ length: n }, (_, i) => i);
    }

    save() {
        const input = {
            content: this.detailForm.get('content')?.value || '',
            footerContent: this.detailForm.get('footerContent')?.value || '',
            announcementBarText: this.detailForm.get('announcementBarText')?.value || '',
        };
        this.dataService.website.updateWebsite(input).subscribe({
            next: res => {
                this.notificationService.success(_('common.notify-update-success'), {
                    entity: 'Website',
                });
                const input: UpdateWebLinksInput = {
                    links: this.webLinks.map(
                        link =>
                            ({
                                id: link.id,
                                link: link.link,
                                linkText: link.linkText,
                                position: link.position,
                                featuredAsset: link.featuredAsset ? link.featuredAsset.id : null,
                            }) as UpdateWebLinkInput,
                    ),
                };
                this.dataService.website.updateWebLinks(input).subscribe({
                    next: res => {
                        this.notificationService.success(_('common.notify-update-success'), {
                            entity: 'WebLinks',
                        });
                    },
                    error: err => {
                        this.notificationService.error(_('common.notify-update-error'), {
                            entity: 'WebLinks',
                        });
                    },
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
