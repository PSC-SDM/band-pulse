/**
 * Data required to send a "new concert" email notification.
 */
export interface ConcertEmailData {
    artistName: string;
    eventTitle: string;
    eventDate: Date;
    venueName: string;
    venueCity: string;
    ticketUrl?: string;
}

/**
 * Data required to send a "concert reminder" email notification.
 */
export interface ReminderEmailData {
    artistName: string;
    eventTitle: string;
    eventDate: Date;
    venueName: string;
    venueCity: string;
    daysUntil: number;
    ticketUrl?: string;
}

/**
 * Email service interface.
 * Abstracted so the provider (Resend, SendGrid, SMTP, etc.) can be swapped
 * by changing only the infrastructure implementation without touching business logic.
 */
export interface IEmailService {
    sendNewConcertEmail(to: string, data: ConcertEmailData): Promise<void>;
    sendReminderEmail(to: string, data: ReminderEmailData): Promise<void>;
}
