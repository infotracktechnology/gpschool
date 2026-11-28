import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

export function Trips() {
  return <TransportResourcePage title="Trips" subtitle="Log scheduled runs and operational status for pickup and drop services."
    resourceKey="trips" fields={[
      { name: 'route_id', label: 'Route ID', type: 'number', min: 1, required: true },
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'number', min: 1, required: true },
      { name: 'driver_id', label: 'Driver ID', type: 'number', min: 1 },
      { name: 'trip_date', label: 'Trip date', type: 'date', required: true },
      { name: 'trip_type', label: 'Direction', options: asOptions(['pickup', 'drop']), required: true },
      { name: 'status', label: 'Status', options: asOptions(['scheduled', 'in_progress', 'completed', 'delayed', 'cancelled']) },
      { name: 'notes', label: 'Trip notes', multiline: true },
    ]} columns={[{ key: 'trip_date', label: 'Date' }, { key: 'route_name', label: 'Route' }, { key: 'trip_type', label: 'Direction' }, { key: 'vehicle_registration', label: 'Vehicle' }, { key: 'driver_name', label: 'Driver' }, { key: 'start_time', label: 'Started' }, { key: 'end_time', label: 'Ended' }, { key: 'status', label: 'Status' }]}
    load={transportService.getTrips} create={transportService.createTrip} update={transportService.updateTrip} />;
}
