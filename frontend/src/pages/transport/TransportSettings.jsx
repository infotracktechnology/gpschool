import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage } from './_shared';

const fields = [
  { name: 'default_pickup_time', label: 'Default pickup time', type: 'time' },
  { name: 'default_drop_time', label: 'Default drop time', type: 'time' },
  { name: 'grace_period_minutes', label: 'Late grace period (minutes)', type: 'number', min: 0 },
  { name: 'contact_phone', label: 'Transport contact phone' },
  { name: 'policy_notes', label: 'Transport policy / notes', multiline: true },
];

export function TransportSettings() {
  return <TransportResourcePage title="Transport Settings" subtitle="Configure campus transport operations and default timings."
    resourceKey="settings" fields={fields} columns={[{ key: 'contact_phone', label: 'Contact' }, { key: 'default_pickup_time', label: 'Pickup' }, { key: 'default_drop_time', label: 'Drop' }, { key: 'grace_period_minutes', label: 'Grace (min)' }, { key: 'policy_notes', label: 'Policy' }]}
    load={transportService.getSettings} create={transportService.saveSettings} update={(_id, data) => transportService.saveSettings(data)} addLabel="Save campus settings" />;
}
