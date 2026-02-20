import { ObjectId } from 'mongodb';
import { Notification } from '../../domain/notification/notification.entity';
import { INotificationRepository } from '../../domain/notification/notification.repository.interface';
import { IFollowRepository } from '../../domain/follow/follow.repository.interface';
import { IUserRepository } from '../../domain/user/user.repository.interface';
import { IEventRepository } from '../../domain/event/event.repository.interface';
import { IEmailService } from '../../domain/shared/email.service.interface';
import { INotificationService } from './notification.service.interface';
import { logger } from '../../shared/utils/logger';

/**
 * NotificationService - Business logic for the notification system.
 *
 * Two entry points:
 * 1. notifyNewConcertsForArtist() — called by EventService after background refresh
 * 2. sendConcertReminders()       — called daily by the scheduler at 9 AM
 */
export class NotificationService implements INotificationService {
    constructor(
        private notificationRepository: INotificationRepository,
        private followRepository: IFollowRepository,
        private userRepository: IUserRepository,
        private eventRepository: IEventRepository,
        private emailService: IEmailService,
    ) {}

    /**
     * Detect new concerts for an artist and notify their followers.
     * Called by EventService right after a background refresh completes.
     *
     * @param artistId - Artist whose events were just refreshed
     * @param since    - Timestamp before the refresh started; only events created after this are "new"
     */
    async notifyNewConcertsForArtist(artistId: string, since: Date): Promise<void> {
        try {
            const newEvents = await this.eventRepository.findCreatedAfter(since, artistId);
            if (newEvents.length === 0) return;

            // getFollowerUserIds already filters notificationsEnabled: true
            const followerIds = await this.followRepository.getFollowerUserIds(artistId);
            if (followerIds.length === 0) return;

            let notified = 0;

            for (const event of newEvents) {
                const eventId = event._id!.toString();

                for (const userId of followerIds) {
                    const user = await this.userRepository.findById(userId);
                    if (!user?.notificationPreferences?.newConcerts) continue;

                    // Prevent duplicate notifications for the same user + event
                    const alreadySent = await this.notificationRepository.existsForUserEvent(
                        userId,
                        eventId,
                        'new_concert'
                    );
                    if (alreadySent) continue;

                    await this.notificationRepository.create({
                        userId: new ObjectId(userId),
                        type: 'new_concert',
                        title: `${event.artistName} has a new concert!`,
                        body: `${event.title} · ${event.venue.name}, ${event.venue.city} · ${event.date.toLocaleDateString('en-GB')}`,
                        eventId: event._id,
                        artistId: new ObjectId(artistId),
                        artistName: event.artistName,
                        read: false,
                        createdAt: new Date(),
                    });

                    await this.emailService.sendNewConcertEmail(user.email, {
                        artistName: event.artistName,
                        eventTitle: event.title,
                        eventDate: event.date,
                        venueName: event.venue.name,
                        venueCity: event.venue.city,
                        ticketUrl: event.ticketUrl,
                    });

                    notified++;
                }
            }

            logger.info('New concert notifications sent', {
                artistId,
                newEvents: newEvents.length,
                notified,
            });
        } catch (error) {
            logger.error('Failed to notify new concerts', {
                artistId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Send upcoming concert reminders based on each user's daysBeforeConcert preference.
     * Called daily by the scheduler.
     */
    async sendConcertReminders(): Promise<void> {
        try {
            const now = new Date();

            // Query events spanning 1–7 days out to cover all possible preferences
            const from = new Date(now);
            from.setDate(from.getDate() + 1);
            from.setHours(0, 0, 0, 0);

            const to = new Date(now);
            to.setDate(to.getDate() + 7);
            to.setHours(23, 59, 59, 999);

            // Empty artistIds → no artist filter (all events in range)
            const upcomingEvents = await this.eventRepository.findUpcomingInDateRange([], from, to);
            if (upcomingEvents.length === 0) return;

            let reminders = 0;

            for (const event of upcomingEvents) {
                const artistId = event.artistId.toString();
                const eventId = event._id!.toString();
                const followerIds = await this.followRepository.getFollowerUserIds(artistId);

                for (const userId of followerIds) {
                    const user = await this.userRepository.findById(userId);
                    if (!user?.notificationPreferences?.concertReminders) continue;

                    const daysBeforeConcert = user.notificationPreferences.daysBeforeConcert ?? 3;

                    // Target date: today + user preference
                    const targetDate = new Date(now);
                    targetDate.setDate(targetDate.getDate() + daysBeforeConcert);

                    // Check if the event falls on that day
                    const eventDate = new Date(event.date);
                    const isTargetDay =
                        eventDate.getFullYear() === targetDate.getFullYear() &&
                        eventDate.getMonth() === targetDate.getMonth() &&
                        eventDate.getDate() === targetDate.getDate();

                    if (!isTargetDay) continue;

                    // Prevent duplicate reminders
                    const alreadySent = await this.notificationRepository.existsForUserEvent(
                        userId,
                        eventId,
                        'concert_reminder'
                    );
                    if (alreadySent) continue;

                    await this.notificationRepository.create({
                        userId: new ObjectId(userId),
                        type: 'concert_reminder',
                        title: `${event.artistName} is playing in ${daysBeforeConcert} day${daysBeforeConcert !== 1 ? 's' : ''}!`,
                        body: `${event.title} · ${event.venue.name}, ${event.venue.city}`,
                        eventId: event._id,
                        artistId: event.artistId,
                        artistName: event.artistName,
                        read: false,
                        createdAt: new Date(),
                    });

                    await this.emailService.sendReminderEmail(user.email, {
                        artistName: event.artistName,
                        eventTitle: event.title,
                        eventDate: event.date,
                        venueName: event.venue.name,
                        venueCity: event.venue.city,
                        daysUntil: daysBeforeConcert,
                        ticketUrl: event.ticketUrl,
                    });

                    reminders++;
                }
            }

            logger.info('Concert reminders processed', {
                events: upcomingEvents.length,
                reminders,
            });
        } catch (error) {
            logger.error('Failed to send concert reminders', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // -------------------------------------------------------------------------
    // Read methods (used by NotificationController)
    // -------------------------------------------------------------------------

    async getForUser(userId: string, unreadOnly = false): Promise<Notification[]> {
        return this.notificationRepository.findByUser(userId, unreadOnly);
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationRepository.getUnreadCount(userId);
    }

    async markAsRead(notificationId: string): Promise<boolean> {
        return this.notificationRepository.markAsRead(notificationId);
    }

    async markAllAsRead(userId: string): Promise<number> {
        return this.notificationRepository.markAllAsRead(userId);
    }
}
