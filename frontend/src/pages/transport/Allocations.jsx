import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

export function Allocations() {
  return <TransportResourcePage title="Student Allocations" subtitle="Assign each student to a route and pickup/drop stop for the selected academic year."
    resourceKey="allocations" fields={[
      { name: 'student_id', label: 'Student ID', type: 'number', min: 1, required: true },
      { name: 'route_id', label: 'Route ID', type: 'number', min: 1, required: true },
      { name: 'allocation_mode', label: 'Allocation mode', options: asOptions(['pickup', 'drop', 'both']), required: true },
      { name: 'stop_id', label: 'Pickup / drop stop ID', type: 'number', min: 1, required: true },
      { name: 'start_date', label: 'Effective from', type: 'date' },
      { name: 'end_date', label: 'Effective to', type: 'date' },
    ]} columns={[{ key: 'student_name', label: 'Student' }, { key: 'admission_number', label: 'Admission no.' }, { key: 'route_name', label: 'Route' }, { key: 'allocation_mode', label: 'Mode' }, { key: 'stop_name', label: 'Stop' }, { key: 'start_date', label: 'Effective from' }, { key: 'status', label: 'Status' }]}
    load={transportService.getAllocations} create={transportService.createAllocation} update={transportService.updateAllocation} remove={transportService.deleteAllocation} />;
}
