import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type EventType = 'check_in' | 'like' | 'match' | 'message';

export const trackEvent = async (type: EventType, eventId: string, metadata: any = {}) => {
  try {
    const eventsRef = collection(db, 'events');
    await addDoc(eventsRef, {
      type,
      eventId,
      metadata,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};
