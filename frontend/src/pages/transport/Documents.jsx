import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage, asOptions } from './_shared';

export function Documents() {
  return <TransportResourcePage title="Documents & Insurance" subtitle="Track vehicle permits, insurance and other compliance expiry dates."
    resourceKey="documents" fields={[
      { name: 'vehicle_id', label: 'Vehicle ID', type: 'number', min: 1, required: true },
      { name: 'document_type', label: 'Document type', options: asOptions(['insurance', 'permit', 'fitness', 'pollution', 'other']), required: true },
      { name: 'document_number', label: 'Document / policy number' },
      { name: 'issued_on', label: 'Issued on', type: 'date' },
      { name: 'expires_on', label: 'Expires on', type: 'date', required: true },
      { name: 'file_url', label: 'Document link' },
      { name: 'notes', label: 'Notes', multiline: true },
    ]} columns={[{ key: 'vehicle_registration', label: 'Vehicle' }, { key: 'document_type', label: 'Document' }, { key: 'document_number', label: 'Number' }, { key: 'issued_on', label: 'Issued' }, { key: 'expires_on', label: 'Expires' }, { key: 'status', label: 'Status' }]}
    load={transportService.getDocuments} create={transportService.createDocument} update={transportService.updateDocument} remove={transportService.deleteDocument} />;
}
