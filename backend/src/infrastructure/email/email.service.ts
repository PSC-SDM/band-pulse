import { IEmailService, ConcertEmailData, ReminderEmailData } from '../../domain/shared/email.service.interface';
import { logger } from '../../shared/utils/logger';

/**
 * Stub email service implementation.
 *
 * Currently logs to console. To switch provider, create a new class
 * implementing IEmailService (e.g. ResendEmailService, SendGridEmailService)
 * and swap it in index.ts — no business logic changes required.
 *
 * Example with Resend:
 *   import { Resend } from 'resend';
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({ from, to, subject, html });
 */
export class EmailService implements IEmailService {
    async sendNewConcertEmail(to: string, data: ConcertEmailData): Promise<void> {
        logger.info('[EMAIL] New concert notification', {
            to,
            artistName: data.artistName,
            eventTitle: data.eventTitle,
            eventDate: data.eventDate.toISOString(),
            venue: `${data.venueName}, ${data.venueCity}`,
        });
        // TODO: implement with Resend / SendGrid / Nodemailer
    }

    async sendReminderEmail(to: string, data: ReminderEmailData): Promise<void> {
        logger.info('[EMAIL] Concert reminder notification', {
            to,
            artistName: data.artistName,
            eventTitle: data.eventTitle,
            eventDate: data.eventDate.toISOString(),
            daysUntil: data.daysUntil,
        });
        // TODO: implement with Resend / SendGrid / Nodemailer
    }
}
