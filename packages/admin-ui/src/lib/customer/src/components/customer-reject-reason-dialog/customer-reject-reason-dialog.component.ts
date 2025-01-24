import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { Dialog } from '@vendure/admin-ui/core';

@Component({
    selector: 'vdr-customer-reject-reason-dialog',
    templateUrl: './customer-reject-reason-dialog.component.html',
    styleUrls: ['./customer-reject-reason-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerRejectReasonDialogComponent implements Dialog<{ reason: string; isPrivate?: boolean }> {
    reason = '';
    resolveWith: (result?: { reason: string }) => void;

    confirm() {
        this.resolveWith({
            reason: this.reason,
        });
    }

    cancel() {
        this.resolveWith();
    }
}
