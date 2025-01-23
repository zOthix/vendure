import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { Dialog } from '../../../../core/src/providers/modal/modal.types';

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
