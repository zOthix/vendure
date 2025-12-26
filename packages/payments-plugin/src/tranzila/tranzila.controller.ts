import { Body, Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import {
    Ctx,
    Logger,
    RequestContext,
    Transaction,
    LanguageCode,
    OrderService,
    RequestContextService,
    SocketGateway,
} from '@vendure/core';
import { Request, Response } from 'express';

import { loggerCtx } from './constants';

const invalidOrderIdMessage = `Order not found.`;
const invalidAmountPaidMessage = `Amount paid is invalid.`;
const blockedConfiscateCardMessage = `Blocked confiscate card. Please check and enter the credit number again.`;
const stolenConfiscateCardMessage = `Stolen confiscate card. Please check and enter the credit number again.`;
const approvalRequiredMessage = `Contact credit company to approve the transaction.`;
const incorrectIdentityMessage = `Incorrect identity number or CVV.`;
const failedTransactionMessage = `Transaction failed.`;

@Controller('payments')
export class TranzilaController {
    constructor(
        private orderService: OrderService,
        private requestContextService: RequestContextService,
        private socketGateway: SocketGateway,
    ) {}

    @Post('tranzila')
    @Transaction()
    async webhook(
        @Body('clientId') clientId: string,
        @Body('orderId') orderId: string,
        @Body('Response') status: string,
        @Body('sum') sum: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        /**
         * Creating context since this is an external api call and not a graphql.
         */
        const ctx = await this.createContext(req);

        /**
         * In reference to the Tranzila docs, the error codes have been handled.
         * https://docs.tranzila.com/docs/payments-billing/micbfsnaau9ar-transaction-response-codes
         */
        if (status === '000') {
            const order = await this.orderService.findOne(ctx, orderId);

            if (!order) {
                Logger.error(invalidOrderIdMessage, loggerCtx);
                res.status(HttpStatus.BAD_REQUEST).send(invalidOrderIdMessage);
                return;
            }

            if (order.totalWithTax !== Number(sum) * 100) {
                Logger.error(invalidAmountPaidMessage, loggerCtx);
                res.status(HttpStatus.BAD_REQUEST).send(invalidAmountPaidMessage);
                return;
            }

            if (order.state !== 'ArrangingPayment') {
                await this.orderService.transitionToState(ctx, orderId, 'ArrangingPayment');
            }

            await this.orderService.addPaymentToOrder(ctx, orderId, {
                method: 'tranzila',
                metadata: {},
            });

            this.socketGateway.sendPaymentConfirmation(clientId, order);

            if (!res.headersSent) {
                res.status(HttpStatus.OK).send('Ok');
                return;
            }
        }

        if (status === '001') {
            Logger.error(blockedConfiscateCardMessage, loggerCtx);
            res.status(HttpStatus.BAD_REQUEST).send(blockedConfiscateCardMessage);
            this.socketGateway.sendPaymentError(clientId, blockedConfiscateCardMessage);
            return;
        }

        if (status === '002') {
            Logger.error(stolenConfiscateCardMessage, loggerCtx);
            res.status(HttpStatus.BAD_REQUEST).send(stolenConfiscateCardMessage);
            this.socketGateway.sendPaymentError(clientId, stolenConfiscateCardMessage);
            return;
        }

        if (status === '003') {
            Logger.error(approvalRequiredMessage, loggerCtx);
            res.status(HttpStatus.BAD_REQUEST).send(approvalRequiredMessage);
            this.socketGateway.sendPaymentError(clientId, approvalRequiredMessage);
            return;
        }

        if (status === '006') {
            Logger.error(incorrectIdentityMessage, loggerCtx);
            res.status(HttpStatus.BAD_REQUEST).send(incorrectIdentityMessage);
            this.socketGateway.sendPaymentError(clientId, incorrectIdentityMessage);
            return;
        }

        Logger.error(failedTransactionMessage, loggerCtx);
        res.status(HttpStatus.BAD_REQUEST).send(failedTransactionMessage);
        this.socketGateway.sendPaymentError(clientId, failedTransactionMessage);

        return;
    }

    private async createContext(req: Request): Promise<RequestContext> {
        return this.requestContextService.create({
            apiType: 'admin',
            req,
            languageCode: LanguageCode.en,
        });
    }
}
