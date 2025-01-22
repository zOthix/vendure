import axios from 'axios';

import { EmailDetails } from '../types';

import { EmailSender } from './email-sender';

/**
 * @description
 * Uses the configured transport to send the generated email.
 *
 * @docsCategory core plugins/EmailPlugin
 * @docsPage EmailSender
 */
export class TurboSMTPEmailSender implements EmailSender {
    async send(email: EmailDetails) {
        const fromAddress = process.env.fromAddress ?? '';
        const url = process.env.turboURL ?? '';
        const consumerKey = process.env.consumerKey ?? '';
        const consumerSecret = process.env.consumerSecret ?? '';

        await axios.post(
            url,
            {
                from: fromAddress,
                to: email.recipient,
                subject: email.subject,
                cc: email.cc,
                bcc: email.bcc,
                html_content: email.body,
            },
            {
                headers: {
                    Accept: 'application/json',
                    Consumerkey: consumerKey,
                    Consumersecret: consumerSecret,
                    'Content-Type': 'application/json',
                },
            },
        );
    }
}
