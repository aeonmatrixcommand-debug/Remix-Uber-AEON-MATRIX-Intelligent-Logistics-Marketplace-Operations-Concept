import { getAccessToken } from './googleAuth';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  location?: string;
  startDateTimeIso: string;
  endDateTimeIso: string;
  attendees?: string[];
  colorId?: string;
}

export async function createGoogleCalendarEvent(
  payload: CalendarEventPayload
): Promise<{ success: boolean; eventId?: string; htmlLink?: string }> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('No Google OAuth access token available. Please sign in with Google to access Google Calendar.');
  }

  const eventResource = {
    summary: payload.summary,
    description: payload.description,
    location: payload.location || 'AEON MATRIX Logistics Operations Hub',
    start: {
      dateTime: payload.startDateTimeIso,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    },
    end: {
      dateTime: payload.endDateTimeIso,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    },
    attendees: payload.attendees ? payload.attendees.map((email) => ({ email })) : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
    colorId: payload.colorId || '9', // Blueberry / dark blue
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventResource),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || response.statusText;
    throw new Error(`Google Calendar API error (${response.status}): ${message}`);
  }

  const data = await response.json();
  return {
    success: true,
    eventId: data.id,
    htmlLink: data.htmlLink,
  };
}
