import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

export function TransportNotifications() {
  return <TransportResourcePage title="Transport Notifications" subtitle="Send operational updates and review notification delivery history."
    resourceKey="notifications" fields={[
      { name: 'title', label: 'Notification title', required: true },
      { name: 'message', label: 'Message', multiline: true, required: true },
      { name: 'audience', label: 'Audience', options: asOptions(['all_students', 'route', 'vehicle', 'student']), required: true },
      { name: 'audience_id', label: 'Route / vehicle / student ID' },
      { name: 'notification_type', label: 'Type', options: asOptions(['general', 'delay', 'pickup', 'drop', 'fee', 'maintenance']) },
    ]} columns={[{ key: 'created_at', label: 'Sent' }, { key: 'title', label: 'Title' }, { key: 'audience', label: 'Audience' }, { key: 'notification_type', label: 'Type' }, { key: 'delivery_status', label: 'Delivery' }, { key: 'message', label: 'Message' }]}
    load={transportService.getNotifications} create={transportService.sendNotification} addLabel="Compose and send update" emptyMessage="No transport notifications sent." />;
}
