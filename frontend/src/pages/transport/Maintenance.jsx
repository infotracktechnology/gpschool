import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

export function Maintenance() {
  return <TransportResourcePage title="Vehicle Maintenance" subtitle="Schedule servicing and record completed repairs, costs and next due dates."
    resourceKey="maintenance" fields={[
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'number', min: 1, required: true },
      { name: 'service_type', label: 'Service / repair', required: true },
      { name: 'service_date', label: 'Service date', type: 'date', required: true },
      { name: 'next_due_date', label: 'Next due date', type: 'date' },
      { name: 'cost', label: 'Cost (₹)', type: 'number', min: 0, step: '0.01' },
      { name: 'status', label: 'Status', options: asOptions(['scheduled', 'in_progress', 'completed']) },
      { name: 'notes', label: 'Work notes', multiline: true },
    ]} columns={[{ key: 'vehicle_registration', label: 'Vehicle' }, { key: 'service_type', label: 'Service' }, { key: 'service_date', label: 'Service date' }, { key: 'next_due_date', label: 'Next due' }, { key: 'cost', label: 'Cost' }, { key: 'status', label: 'Status' }]}
    load={transportService.getMaintenance} create={transportService.createMaintenance} update={transportService.updateMaintenance} remove={transportService.deleteMaintenance} />;
}
