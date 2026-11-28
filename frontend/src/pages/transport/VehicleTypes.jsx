import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

const service = transportService;
export function VehicleTypes() {
  return <TransportResourcePage title="Vehicle Types" subtitle="Define fleet classes and passenger capacity."
    resourceKey="vehicle_types" fields={[
      { name: 'name', label: 'Type name', required: true },
      { name: 'capacity', label: 'Passenger capacity', type: 'number', min: 1, required: true },
      { name: 'description', label: 'Description', multiline: true },
      { name: 'status', label: 'Status', options: asOptions(['active', 'inactive']) },
    ]} columns={[{ key: 'name', label: 'Type' }, { key: 'capacity', label: 'Capacity' }, { key: 'description', label: 'Description' }, { key: 'status', label: 'Status' }]}
    load={service.getVehicleTypes} create={service.createVehicleType} update={service.updateVehicleType} remove={service.deleteVehicleType} />;
}
