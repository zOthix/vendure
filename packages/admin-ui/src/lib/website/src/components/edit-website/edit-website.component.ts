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
    GetWebsiteQuery,
    Website,
    UpdateWebLinksInput,
    UpdateWebLinkInput,
    UpdateCarousalItemsInput,
    UpdateCarousalItemInput,
} from '@vendure/admin-ui/core';
import { ID } from '@vendure/common/lib/shared-types';
import { shareReplay, Observable, switchMap, forkJoin } from 'rxjs';

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

    website$: Observable<GetWebsiteQuery['getWebsite']>;

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

    getWebsiteDate() {
        this.website$ = this.dataService.website
            .getWebsite()
            .mapSingle(result => result.getWebsite)
            .pipe(shareReplay(1));

        this.website$.subscribe(website => {
            if (website) {
                this.setFormValues(website as Website);
                this.populateWebLinks(website.weblinks);
                this.populateCarousalItems(website.carousalItems);
                this.changeDetector.markForCheck();
            }
        });
    }

    ngOnInit(): void {
        this.getWebsiteDate();
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

    onCarousalItemChange(index: number, field: keyof CarousalItem, value: any) {
        const item = this.carousalItems[index];
        if (item) {
            if (field === 'isActive') {
                item['isActive'] = value;
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
        const link = this.webLinks[index];
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

    onCarousalItemAssetChange(event: { featuredAsset: MinimalAsset }, item: CarousalItem) {
        item.featuredAsset = event.featuredAsset;
        this.detailForm.markAsDirty();
    }

    save() {
        const input = {
            content: this.detailForm.get('content')?.value || '',
            footerContent: this.detailForm.get('footerContent')?.value || '',
            announcementBarText: this.detailForm.get('announcementBarText')?.value || '',
        };

        const carousalItemsInput: UpdateCarousalItemsInput = {
            items: this.carousalItems.map(
                item =>
                    ({
                        id: item.id,
                        featuredAsset: item.featuredAsset?.id,
                        isActive: item.isActive,
                        position: item.position,
                    }) as UpdateCarousalItemInput,
            ),
        };

        const webLinksInput: UpdateWebLinksInput = {
            links: this.webLinks.map(
                link =>
                    ({
                        id: link.id,
                        link: link.link,
                        linkText: link.linkText,
                        position: link.position,
                        featuredAsset: link.featuredAsset?.id || null,
                    }) as UpdateWebLinkInput,
            ),
        };

        this.dataService.website
            .updateWebsite(input)
            .pipe(
                switchMap(() => {
                    this.notificationService.success(_('common.notify-update-success'), {
                        entity: 'Website',
                    });
                    return forkJoin([
                        this.dataService.website.updateCarousalItems(carousalItemsInput),
                        this.dataService.website.updateWebLinks(webLinksInput),
                    ]);
                }),
            )
            .subscribe({
                next: ([carousalRes, webLinksRes]) => {
                    this.notificationService.success(_('common.notify-update-success'), {
                        entity: 'Carousal Items',
                    });
                    this.notificationService.success(_('common.notify-update-success'), {
                        entity: 'WebLinks',
                    });

                    this.detailForm.markAsPristine();
                    this.changeDetector.markForCheck();
                    this.refreshWebsite();
                },
                error: err => {
                    this.notificationService.error(_('common.notify-update-error'), {
                        entity: 'Website',
                    });
                    this.refreshWebsite();
                },
            });
    }

    protected setFormValues(entity: Website): void {
        this.detailForm.patchValue({
            content: entity.content,
            footerContent: entity.footerContent,
            announcementBarText: entity.announcementBarText,
        });
    }

    private populateCarousalItems(items: any[]): void {
        this.carousalItems = [];
        this.carousalItemTabs = [];

        if (items.length === 0) {
            this.carousalItems.push({
                id: 0,
                isActive: true,
                featuredAsset: null,
                position: 0,
            });
            this.carousalItemTabs.push({
                index: 0,
                active: true,
                title: `Item ${0 + 1}`,
            });
        } else {
            items?.filter(Boolean).forEach((item, index) => {
                this.carousalItems.push({
                    id: item.id,
                    isActive: item.isActive,
                    featuredAsset: item.featuredAsset,
                    position: item.position,
                });
                this.carousalItemTabs.push({
                    index,
                    active: index === 0,
                    title: `Item ${index + 1}`,
                });
            });
            this.activeCarousalItemTab = 0;
        }
    }

    private populateWebLinks(links: any[]): void {
        const lengthOfLinks = 4;

        this.webLinks = [];
        this.webLinkTabs = [];

        for (let i = 0; i < lengthOfLinks; i++) {
            this.webLinks.push({
                id: 0,
                link: '',
                linkText: '',
                featuredAsset: null,
                position: 0,
            });
            this.webLinkTabs.push({
                index: i,
                active: i === 0,
                title: `Link ${i + 1}`,
            });
        }
        links.forEach((item, i) => {
            if (item !== null) {
                this.webLinks[i] = { ...item };
            }
        });
        this.activeWeblinkItemTab = 0;
    }

    private refreshWebsite() {
        this.dataService.website
            .getWebsite()
            .mapSingle(result => result.getWebsite)
            .subscribe(website => {
                if (website) {
                    this.setFormValues(website as Website);
                    this.populateWebLinks(website.weblinks);
                    this.populateCarousalItems(website.carousalItems);
                    this.changeDetector.markForCheck();
                }
            });
    }
}
