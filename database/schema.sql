-- ============================================================
-- CAG Bus Booking System - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS cag_bus_booking;
USE cag_bus_booking;

-- ============================================================
-- Users Table (Customer accounts)
-- ============================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  address TEXT,
  date_of_birth DATE,
  profile_pic VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Admins Table
-- ============================================================
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('super_admin', 'admin', 'manager') DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Buses Table
-- ============================================================
CREATE TABLE buses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_number VARCHAR(20) UNIQUE NOT NULL,
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  bus_type ENUM('standard', 'luxury', 'sleeper', 'ac', 'non_ac') DEFAULT 'standard',
  capacity INT NOT NULL,
  seat_layout VARCHAR(50) DEFAULT '2x2',
  amenities JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Drivers Table
-- ============================================================
CREATE TABLE drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  license_number VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  assigned_bus_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_bus_id) REFERENCES buses(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Routes Table
-- ============================================================
CREATE TABLE routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  distance_km DECIMAL(10,2),
  duration_minutes INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Schedules Table
-- ============================================================
CREATE TABLE schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  bus_id INT NOT NULL,
  driver_id INT,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  operating_days SET('mon','tue','wed','thu','fri','sat','sun') DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Seats Table (per schedule per date)
-- ============================================================
CREATE TABLE seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  travel_date DATE NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  seat_row INT NOT NULL,
  seat_column INT NOT NULL,
  seat_type ENUM('window', 'aisle', 'middle') DEFAULT 'aisle',
  is_booked BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  UNIQUE KEY unique_seat (schedule_id, travel_date, seat_number)
) ENGINE=InnoDB;

-- ============================================================
-- Bookings Table
-- ============================================================
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  schedule_id INT NOT NULL,
  travel_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  final_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'refunded') DEFAULT 'pending',
  passenger_count INT NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  contact_email VARCHAR(100) NOT NULL,
  special_requests TEXT,
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Booking Passengers Table
-- ============================================================
CREATE TABLE booking_passengers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  seat_id INT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  age INT,
  gender ENUM('male', 'female', 'other'),
  id_proof_type VARCHAR(50),
  id_proof_number VARCHAR(100),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Payments Table
-- ============================================================
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cash') DEFAULT 'credit_card',
  payment_status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
  gateway_response TEXT,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  refund_date TIMESTAMP NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- Tickets Table (e-Ticket)
-- ============================================================
CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  passenger_id INT,
  seat_number VARCHAR(10) NOT NULL,
  qr_code TEXT,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (passenger_id) REFERENCES booking_passengers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Reviews Table
-- ============================================================
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bus_id INT NOT NULL,
  booking_id INT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(travel_date);
CREATE INDEX idx_schedules_route ON schedules(route_id);
CREATE INDEX idx_schedules_bus ON schedules(bus_id);
CREATE INDEX idx_seats_schedule ON seats(schedule_id);
CREATE INDEX idx_seats_date ON seats(travel_date);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_tickets_booking ON tickets(booking_id);

-- ============================================================
-- Insert default admin
-- ============================================================
-- Password: admin123 (bcrypt hash - replace with generated hash)
INSERT INTO admins (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@cagbus.com', '$2b$10$placeholder_hash_admin123', 'System Admin', 'super_admin');
