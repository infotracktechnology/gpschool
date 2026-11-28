import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

export function Routes() {
  return <TransportResourcePage title="Routes & Stops" subtitle="Create route plans with ordered pickup/drop points and scheduled times."
    resourceKey="routes" fields={[
      { name: 'name', label: 'Route name', required: true },
      { name: 'route_code', label: 'Route code', required: true },
      { name: 'direction', label: 'Service direction', options: asOptions(['pickup', 'drop', 'both']) },
      { name: 'start_time', label: 'Start time', type: 'time' },
      { name: 'end_time', label: 'End time', type: 'time' },
      {
        name: 'stops',
        label: 'Stops in order (name, pickup time, drop time, fee per line)',
        multiline: true,
        hint: 'Enter one stop per line: stop name, pickup time, drop time, fee. Sequence is saved in line order.',
        fromRecord: (stops) => Array.isArray(stops) ? stops.map((stop) => [stop.name || stop.stop_name, stop.pickup_time, stop.drop_time, stop.fee].filter((value) => value !== undefined && value !== null && value !== '').join(', ')).join('\n') : (stops || ''),
        toPayload: (value) => String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
          const [name, pickup_time = '', drop_time = '', fee = ''] = line.split(',').map((part) => part.trim());
          return { name, sequence: index + 1, pickup_time, drop_time, fee: fee ? Number(fee) : 0 };
        }),
      },
    ]} columns={[{ key: 'route_code', label: 'Code' }, { key: 'name', label: 'Route' }, { key: 'direction', label: 'Direction' }, { key: 'stops_summary', label: 'Stops' }, { key: 'start_time', label: 'Start' }, { key: 'end_time', label: 'End' }, { key: 'status', label: 'Status' }]}
    load={transportService.getRoutes} create={transportService.createRoute} update={transportService.updateRoute} remove={transportService.deleteRoute} />;
}
