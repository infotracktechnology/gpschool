import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

export function Personnel() {
  return <TransportResourcePage title="Transport Personnel" subtitle="Maintain driver and attendant contacts, licensing and assignments."
    resourceKey="personnel" fields={[
      { name: 'full_name', label: 'Full name', required: true },
      { name: 'role', label: 'Role', options: asOptions(['driver', 'attendant']), required: true },
      { name: 'phone', label: 'Phone', required: true },
      { name: 'license_number', label: 'Driving licence number' },
      { name: 'license_expiry', label: 'Licence expiry', type: 'date' },
      { name: 'status', label: 'Status', options: asOptions(['active', 'inactive']) },
    ]} columns={[{ key: 'full_name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'phone', label: 'Phone' }, { key: 'license_number', label: 'Licence' }, { key: 'license_expiry', label: 'Licence expiry' }, { key: 'status', label: 'Status' }]}
    load={transportService.getPersonnel} create={transportService.createPersonnel} update={transportService.updatePersonnel} />;
}
