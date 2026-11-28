import { query, initDatabase } from '../config/database.js';

const tables = [
  `CREATE TABLE IF NOT EXISTS transport_settings (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL, setting_value JSON NULL, description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_transport_setting (branch_id, academic_year_id, setting_key),
    INDEX idx_transport_settings_scope (branch_id, academic_year_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_vehicle_types (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    name VARCHAR(100) NOT NULL, capacity INT NOT NULL DEFAULT 0, description TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_vehicle_types_scope (branch_id, academic_year_id), INDEX idx_transport_vehicle_types_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    vehicle_type_id INT NULL, registration_number VARCHAR(40) NOT NULL, make VARCHAR(100) NULL, model VARCHAR(100) NULL,
    capacity INT NOT NULL DEFAULT 0, fuel_type VARCHAR(40) NULL, insurance_expiry DATE NULL, permit_expiry DATE NULL,
    fitness_expiry DATE NULL, status ENUM('active','maintenance','inactive') NOT NULL DEFAULT 'active', notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_transport_vehicle_registration (branch_id, registration_number),
    INDEX idx_transport_vehicles_scope (branch_id, academic_year_id), INDEX idx_transport_vehicles_type (vehicle_type_id),
    INDEX idx_transport_vehicles_status (status), INDEX idx_transport_vehicles_expiry (insurance_expiry, permit_expiry, fitness_expiry)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_drivers (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    name VARCHAR(160) NOT NULL, phone VARCHAR(30) NULL, license_number VARCHAR(80) NULL, license_expiry DATE NULL,
    address TEXT NULL, emergency_contact VARCHAR(100) NULL, status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_drivers_scope (branch_id, academic_year_id), INDEX idx_transport_drivers_status (status), INDEX idx_transport_drivers_license (license_expiry)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_attendants (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    name VARCHAR(160) NOT NULL, phone VARCHAR(30) NULL, address TEXT NULL, emergency_contact VARCHAR(100) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_attendants_scope (branch_id, academic_year_id), INDEX idx_transport_attendants_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_routes (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    name VARCHAR(160) NOT NULL, route_code VARCHAR(40) NULL, description TEXT NULL, vehicle_id INT NULL,
    driver_id INT NULL, attendant_id INT NULL, start_time TIME NULL, end_time TIME NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_routes_scope (branch_id, academic_year_id), INDEX idx_transport_routes_vehicle (vehicle_id),
    INDEX idx_transport_routes_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_route_stops (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL, route_id INT NOT NULL,
    name VARCHAR(160) NOT NULL, address VARCHAR(255) NULL, sequence_no INT NOT NULL DEFAULT 1,
    pickup_time TIME NULL, drop_time TIME NULL, latitude DECIMAL(10,7) NULL, longitude DECIMAL(10,7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_transport_route_stop_sequence (route_id, sequence_no), INDEX idx_transport_stops_scope (branch_id, academic_year_id),
    INDEX idx_transport_stops_route (route_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL, student_id INT NOT NULL,
    route_id INT NOT NULL, stop_id INT NULL, allocation_mode ENUM('pickup','drop','both') NOT NULL DEFAULT 'both',
    start_date DATE NULL, end_date DATE NULL, status ENUM('active','inactive','cancelled') NOT NULL DEFAULT 'active',
    notes TEXT NULL, created_by INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_allocations_scope (branch_id, academic_year_id), INDEX idx_transport_allocations_student (student_id, status),
    INDEX idx_transport_allocations_route (route_id), INDEX idx_transport_allocations_stop (stop_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_fees (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL, allocation_id INT NOT NULL,
    student_id INT NOT NULL, fee_name VARCHAR(120) NOT NULL, amount DECIMAL(12,2) NOT NULL,
    due_date DATE NULL, frequency ENUM('monthly','term','annual','one_time','custom') NOT NULL DEFAULT 'monthly',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active', notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_fees_scope (branch_id, academic_year_id), INDEX idx_transport_fees_student (student_id),
    INDEX idx_transport_fees_allocation (allocation_id), INDEX idx_transport_fees_due (due_date, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_fee_collections (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    fee_id INT NOT NULL, student_id INT NOT NULL, amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL, payment_method VARCHAR(40) NULL, receipt_number VARCHAR(60) NULL,
    reference_number VARCHAR(100) NULL, notes TEXT NULL, collected_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_transport_receipt (branch_id, receipt_number), INDEX idx_transport_collections_scope (branch_id, academic_year_id),
    INDEX idx_transport_collections_fee (fee_id), INDEX idx_transport_collections_student (student_id), INDEX idx_transport_collections_date (payment_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_trips (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL, route_id INT NOT NULL,
    vehicle_id INT NULL, driver_id INT NULL, attendant_id INT NULL, trip_date DATE NOT NULL,
    trip_type ENUM('pickup','drop') NOT NULL, start_time DATETIME NULL, end_time DATETIME NULL,
    status ENUM('scheduled','in_progress','completed','cancelled','delayed') NOT NULL DEFAULT 'scheduled',
    delay_minutes INT NOT NULL DEFAULT 0, notes TEXT NULL, created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_trips_scope (branch_id, academic_year_id), INDEX idx_transport_trips_route (route_id),
    INDEX idx_transport_trips_date (trip_date, status), INDEX idx_transport_trips_vehicle (vehicle_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_trip_stops (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    trip_id INT NOT NULL, stop_id INT NOT NULL, reached_at DATETIME NULL, status ENUM('pending','reached','skipped') NOT NULL DEFAULT 'pending',
    notes TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_transport_trip_stop (trip_id, stop_id), INDEX idx_transport_trip_stops_scope (branch_id, academic_year_id),
    INDEX idx_transport_trip_stops_trip (trip_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_documents (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    vehicle_id INT NULL, driver_id INT NULL, document_type VARCHAR(80) NOT NULL, document_number VARCHAR(100) NULL,
    issue_date DATE NULL, expiry_date DATE NULL, file_url VARCHAR(500) NULL, notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_documents_scope (branch_id, academic_year_id), INDEX idx_transport_documents_vehicle (vehicle_id),
    INDEX idx_transport_documents_expiry (expiry_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_maintenance (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL, vehicle_id INT NOT NULL,
    maintenance_type VARCHAR(100) NOT NULL, description TEXT NULL, service_date DATE NOT NULL, next_service_date DATE NULL,
    cost DECIMAL(12,2) NOT NULL DEFAULT 0, vendor VARCHAR(160) NULL,
    status ENUM('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
    created_by INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transport_maintenance_scope (branch_id, academic_year_id), INDEX idx_transport_maintenance_vehicle (vehicle_id),
    INDEX idx_transport_maintenance_dates (service_date, next_service_date), INDEX idx_transport_maintenance_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    title VARCHAR(180) NOT NULL, message TEXT NOT NULL, notification_type VARCHAR(60) NOT NULL DEFAULT 'general',
    audience ENUM('all','students','selected') NOT NULL DEFAULT 'selected', sent_by INT NULL, sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_transport_notifications_scope (branch_id, academic_year_id),
    INDEX idx_transport_notifications_sent (sent_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_notification_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    notification_id INT NOT NULL, student_id INT NOT NULL, delivery_status ENUM('queued','sent','failed','read') NOT NULL DEFAULT 'queued',
    fcm_status VARCHAR(40) NULL, error_message VARCHAR(500) NULL, read_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_transport_notification_recipient (notification_id, student_id),
    INDEX idx_transport_recipients_scope (branch_id, academic_year_id), INDEX idx_transport_recipients_student (student_id, delivery_status),
    INDEX idx_transport_recipients_notification (notification_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS transport_audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY, branch_id INT NOT NULL, academic_year_id INT NOT NULL,
    entity_type VARCHAR(60) NOT NULL, entity_id INT NOT NULL, action VARCHAR(30) NOT NULL,
    old_values JSON NULL, new_values JSON NULL, changed_by INT NULL, ip_address VARCHAR(50) NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_transport_audit_scope (branch_id, academic_year_id),
    INDEX idx_transport_audit_entity (entity_type, entity_id), INDEX idx_transport_audit_changed (changed_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const run = async () => {
  try {
    await initDatabase();
    for (const statement of tables) {
      await query(statement);
      const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      console.log(`[Transport Migration] Verified ${match?.[1]}`);
    }
    console.log('[Transport Migration] All tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Transport Migration] Failed:', error);
    process.exit(1);
  }
};

run();
