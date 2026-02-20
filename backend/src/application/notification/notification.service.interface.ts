/**
 * Notification service interface.
 * Defined in the application layer to avoid circular dependencies:
 * EventService can depend on this interface without knowing the concrete class.
 */
export interface INotificationService {
    /**
     * Detect and notify followers about new concerts for an artist.
     * Called by EventService after a background refresh finds new events.
     * @param artistId - Artist whose events were refreshed
     * @param since - Only consider events created after this date
     */
    notifyNewConcertsForArtist(artistId: string, since: Date): Promise<void>;

    /**
     * Send upcoming concert reminders based on user preferences.
     * Called daily by the scheduler.
     */
    sendConcertReminders(): Promise<void>;
}
