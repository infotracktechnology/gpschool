import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

export function Vehicles() {
  return <TransportResourcePage title="Vehicles" subtitle="Manage registered vehicles, capacity, assignment and roadworthiness."
    resourceKey="vehicles" fields={[
      { name: 'registration_number', label: 'Registration number', required: true },
      { name: 'vehicle_type_id', label: 'Vehicle type ID', type: 'number', min: 1, required: true },
      { name: 'make', label: 'Make' },
      { name: 'model', label: 'Model' },
      { name: 'capacity', label: 'Seating capacity', type: 'number', min: 1 },
      { name: 'status', label: 'Status', options: asOptions(['active', 'maintenance', 'inactive']) },
      { name: 'notes', label: 'Notes', multiline: true },
    ]} columns={[{ key: 'registration_number', label: 'Registration' }, { key: 'make', label: 'Make' }, { key: 'model', label: 'Model' }, { key: 'vehicle_type_name', label: 'Type' }, { key: 'capacity', label: 'Seats' }, { key: 'status', label: 'Status' }]}
    load={transportService.getVehicles} create={transportService.createVehicle} update={transportService.updateVehicle} remove={transportService.deleteVehicle} />;
}
