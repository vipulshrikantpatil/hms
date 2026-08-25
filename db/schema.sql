-- Hospital Management System — PostgreSQL DDL
-- MySQL 8 variant: replace BIGSERIAL -> BIGINT AUTO_INCREMENT, TIMESTAMP -> DATETIME,
-- NUMERIC -> DECIMAL, drop the EXCLUDE block at the bottom, and rewrite the `~` regex
-- CHECKs as REGEXP (e.g. CHECK (phone REGEXP '^[6-9][0-9]{9}$')).

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(120) NOT NULL UNIQUE,
    password    VARCHAR(120) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('PATIENT','DOCTOR','ADMIN')),
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(500),
    active      BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE patients (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(15)  NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
    date_of_birth DATE CHECK (date_of_birth IS NULL
                  OR (date_of_birth <= CURRENT_DATE AND date_of_birth >= CURRENT_DATE - INTERVAL '100 years')),
    gender        VARCHAR(10) CHECK (gender IN ('MALE','FEMALE','OTHER')),
    blood_group   VARCHAR(5),
    address       VARCHAR(255),
    status        VARCHAR(20) NOT NULL DEFAULT 'REGISTERED'
                  CHECK (status IN ('REGISTERED','ADMITTED','DISCHARGED'))
);

CREATE TABLE doctors (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    department_id    BIGINT       NOT NULL REFERENCES departments(id),
    full_name        VARCHAR(100) NOT NULL,
    specialty        VARCHAR(80)  NOT NULL,
    qualification    VARCHAR(120),
    phone            VARCHAR(15) CHECK (phone IS NULL OR phone ~ '^[6-9][0-9]{9}$'),
    years_experience INT          NOT NULL DEFAULT 1 CHECK (years_experience BETWEEN 1 AND 70),
    consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (consultation_fee BETWEEN 0 AND 10000),
    slot_minutes     INT          NOT NULL DEFAULT 30,
    available_from   TIME         NOT NULL DEFAULT '09:00',
    available_to     TIME         NOT NULL DEFAULT '17:00',
    active           BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_doctor_department ON doctors(department_id);

CREATE TABLE rooms (
    id          BIGSERIAL PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type   VARCHAR(20) NOT NULL CHECK (room_type IN ('CONSULTATION','OPERATION','WARD','ICU')),
    floor_no    INT,
    active      BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE appointments (
    id            BIGSERIAL PRIMARY KEY,
    patient_id    BIGINT      NOT NULL REFERENCES patients(id),
    doctor_id     BIGINT      NOT NULL REFERENCES doctors(id),
    room_id       BIGINT      REFERENCES rooms(id),
    start_time    TIMESTAMP   NOT NULL,
    end_time      TIMESTAMP   NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCEL_REQUESTED','CANCELLED','COMPLETED')),
    prev_status   VARCHAR(20)
                  CHECK (prev_status IS NULL OR prev_status IN ('PENDING','APPROVED')),
    reason        VARCHAR(255),
    admin_remarks VARCHAR(255),
    cancellation_reason VARCHAR(255),
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP,
    CONSTRAINT chk_appt_window CHECK (end_time > start_time)
);
CREATE INDEX idx_appt_doctor_slot  ON appointments(doctor_id, start_time, end_time);
CREATE INDEX idx_appt_room_slot    ON appointments(room_id, start_time, end_time);
CREATE INDEX idx_appt_patient      ON appointments(patient_id);
CREATE INDEX idx_appt_status       ON appointments(status);

CREATE TABLE payments (
    id              BIGSERIAL PRIMARY KEY,
    appointment_id  BIGINT       NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    amount          NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
    method           VARCHAR(20),
    transaction_ref  VARCHAR(80),
    receipt_no       VARCHAR(30) UNIQUE,
    card_last4       VARCHAR(4),          -- only the last 4 digits are ever stored
    card_holder_name VARCHAR(60),
    paid_at          TIMESTAMP,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_card_last4 CHECK (card_last4 IS NULL OR card_last4 ~ '^[0-9]{4}$')
);

-- Database-level collision guard (PostgreSQL only, recommended).
-- Service-layer validation in Phase 2 is the portable fallback for MySQL.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments ADD CONSTRAINT excl_doctor_overlap
    EXCLUDE USING gist (doctor_id WITH =, tsrange(start_time, end_time) WITH &&)
    WHERE (status IN ('PENDING','APPROVED','CANCEL_REQUESTED'));

ALTER TABLE appointments ADD CONSTRAINT excl_room_overlap
    EXCLUDE USING gist (room_id WITH =, tsrange(start_time, end_time) WITH &&)
    WHERE (room_id IS NOT NULL AND status IN ('PENDING','APPROVED','CANCEL_REQUESTED'));
