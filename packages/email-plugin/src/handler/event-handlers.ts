/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    AccountRegistrationEvent,
    AccountVerifiedEvent,
    NativeAuthenticationMethod,
    CustomerRejectedEvent,
} from '@vendure/core';

import { EmailEventListener } from '../event-listener';

import { EmailEventHandler } from './event-handler';

/**
 * Extending the default email handlers.
 */

export const customerRegistrationHandler = new EmailEventListener('customer-registration')
    .on(AccountRegistrationEvent)
    .filter(event => !!event.user.getNativeAuthenticationMethod().identifier)
    .filter(event => {
        const nativeAuthMethod = event.user.authenticationMethods.find(
            m => m instanceof NativeAuthenticationMethod,
        ) as NativeAuthenticationMethod | undefined;
        return (nativeAuthMethod && !!nativeAuthMethod.identifier) || false;
    })
    .setRecipient(event => event.user.identifier)
    .setFrom('{{ fromAddress }}')
    .setSubject('Welcome to the Business Club');

export const customerVerifiedHandler = new EmailEventListener('customer-verified')
    .on(AccountVerifiedEvent)
    .setRecipient(event => event.customer.emailAddress)
    .setFrom('{{ fromAddress }}')
    .setSubject('Account verified');

export const customerDeclinedHandler = new EmailEventListener('customer-rejected')
    .on(CustomerRejectedEvent)
    .setRecipient(event => event.customer.emailAddress)
    .setFrom('{{ fromAddress }}')
    .setTemplateVars(event => ({
        reason: event.reason ?? 'the data you provided is invalid',
    }))
    .setSubject('Your account has been rejected');

export const eventHandlers: Array<EmailEventHandler<any, any>> = [
    customerRegistrationHandler,
    customerVerifiedHandler,
    customerDeclinedHandler,
];
