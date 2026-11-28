import React from 'react';
import { transportService } from '../../services/transportService';
import { TransportResourcePage } from './_shared';

export function Fees() {
  return <TransportResourcePage title="Transport Fees & Collections" subtitle="Post auditable fee collections; posted transactions are additive and cannot be deleted here."
    resourceKey="collections" fields={[
      { name: 'student_id', label: 'Student ID', type: 'number', min: 1, required: true },
      { name: 'allocation_id', label: 'Allocation ID', type: 'number', min: 1 },
      { name: 'amount', label: 'Collection amount (₹)', type: 'number', min: 0.01, step: '0.01', required: true },
      { name: 'payment_date', label: 'Payment date', type: 'date', required: true },
      { name: 'payment_method', label: 'Payment method', required: true, placeholder: 'Cash, UPI, bank transfer…' },
      { name: 'receipt_number', label: 'Receipt number' },
      { name: 'notes', label: 'Notes', multiline: true },
    ]} columns={[{ key: 'receipt_number', label: 'Receipt' }, { key: 'student_name', label: 'Student' }, { key: 'fee_amount', label: 'Fee due' }, { key: 'amount', label: 'Collected' }, { key: 'balance', label: 'Balance' }, { key: 'payment_date', label: 'Date' }, { key: 'payment_method', label: 'Method' }]}
    load={transportService.getFees} create={transportService.collectFee} addLabel="Post a fee collection" emptyMessage="No transport fee collections recorded." />;
}
