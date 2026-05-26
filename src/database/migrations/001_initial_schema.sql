-- Migration: 001_initial_schema
-- Description: Schema inicial completo do sistema de assistência técnica
-- Created: 2024-01-01

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMs
CREATE TYPE user_role AS ENUM ('admin', 'technician', 'attendant');

CREATE TYPE service_order_status AS ENUM (
  'open', 'in_diagnosis', 'waiting_approval', 'approved',
  'in_progress', 'waiting_parts', 'completed', 'cancelled', 'delivered'
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE payment_method AS ENUM (
  'cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'partial', 'paid', 'cancelled', 'refunded'
);

CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment', 'return');

-- Users & Auth
CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'attendant',
  phone         VARCHAR(20),
  avatar_url    VARCHAR(500),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE user_refresh_tokens (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE permissions (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role          user_role NOT NULL,
  permission_id INTEGER   NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- Clients
CREATE TABLE clients (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(150) NOT NULL,
  cpf             VARCHAR(14)  UNIQUE,
  email           VARCHAR(200),
  phone           VARCHAR(20),
  phone_secondary VARCHAR(20),
  notes           TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE client_addresses (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  street       VARCHAR(200) NOT NULL,
  number       VARCHAR(20),
  complement   VARCHAR(100),
  neighborhood VARCHAR(100),
  city         VARCHAR(100) NOT NULL,
  state        CHAR(2)      NOT NULL,
  zip_code     VARCHAR(10),
  is_primary   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Devices
CREATE TABLE device_brands (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE devices (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID        NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  category      VARCHAR(50) NOT NULL,
  brand_id      INTEGER     REFERENCES device_brands(id) ON DELETE SET NULL,
  brand_name    VARCHAR(100),
  model         VARCHAR(150),
  serial_number VARCHAR(100),
  color         VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Technicians
CREATE TABLE technicians (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialties     TEXT[],
  commission_rate NUMERIC(5,2) DEFAULT 0,
  is_available    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Suppliers
CREATE TABLE suppliers (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(200) NOT NULL,
  cnpj         VARCHAR(18)  UNIQUE,
  email        VARCHAR(200),
  phone        VARCHAR(20),
  contact_name VARCHAR(150),
  website      VARCHAR(255),
  notes        TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

-- Parts & Stock
CREATE TABLE parts (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200)  NOT NULL,
  description TEXT,
  part_number VARCHAR(100),
  category    VARCHAR(100),
  unit        VARCHAR(20)   DEFAULT 'unit',
  cost_price  NUMERIC(10,2),
  sale_price  NUMERIC(10,2),
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE stock (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id          UUID          UNIQUE NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  quantity         NUMERIC(10,3) NOT NULL DEFAULT 0,
  minimum_quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  location         VARCHAR(100),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_movements (
  id             UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id        UUID                NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  user_id        UUID                REFERENCES users(id) ON DELETE SET NULL,
  supplier_id    UUID                REFERENCES suppliers(id) ON DELETE SET NULL,
  movement_type  stock_movement_type NOT NULL,
  quantity       NUMERIC(10,3)       NOT NULL,
  unit_cost      NUMERIC(10,2),
  reference_id   UUID,
  reference_type VARCHAR(50),
  notes          TEXT,
  created_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Service Orders
CREATE TABLE service_orders (
  id                        UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number              VARCHAR(20)          UNIQUE NOT NULL,
  client_id                 UUID                 NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  device_id                 UUID                 NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
  technician_id             UUID                 REFERENCES technicians(id) ON DELETE SET NULL,
  created_by                UUID                 NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status                    service_order_status NOT NULL DEFAULT 'open',
  priority                  priority_level       NOT NULL DEFAULT 'medium',
  reported_issue            TEXT                 NOT NULL,
  diagnosis                 TEXT,
  solution                  TEXT,
  internal_notes            TEXT,
  warranty_days             INTEGER              DEFAULT 0,
  estimated_completion_date DATE,
  completed_at              TIMESTAMPTZ,
  delivered_at              TIMESTAMPTZ,
  labor_cost                NUMERIC(10,2)        DEFAULT 0,
  total_parts_cost          NUMERIC(10,2)        DEFAULT 0,
  total_amount              NUMERIC(10,2)        DEFAULT 0,
  discount                  NUMERIC(10,2)        DEFAULT 0,
  final_amount              NUMERIC(10,2)        DEFAULT 0,
  created_at                TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

CREATE TABLE service_order_parts (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID          NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  part_id          UUID          NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  quantity         NUMERIC(10,3) NOT NULL,
  unit_price       NUMERIC(10,2) NOT NULL,
  total_price      NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE service_order_status_history (
  id               UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID                 NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  changed_by       UUID                 REFERENCES users(id) ON DELETE SET NULL,
  status_from      service_order_status,
  status_to        service_order_status NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE TABLE service_order_photos (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID         NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  uploaded_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
  url              VARCHAR(500) NOT NULL,
  filename         VARCHAR(255),
  description      TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID           NOT NULL REFERENCES service_orders(id) ON DELETE RESTRICT,
  received_by      UUID           REFERENCES users(id) ON DELETE SET NULL,
  amount           NUMERIC(10,2)  NOT NULL,
  method           payment_method NOT NULL,
  status           payment_status NOT NULL DEFAULT 'pending',
  installments     INTEGER        DEFAULT 1,
  notes            TEXT,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_installments (
  id                 UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id         UUID           NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  installment_number INTEGER        NOT NULL,
  amount             NUMERIC(10,2)  NOT NULL,
  due_date           DATE           NOT NULL,
  paid_at            TIMESTAMPTZ,
  status             payment_status NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Audit
CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email           ON users(email);
CREATE INDEX idx_users_role            ON users(role);
CREATE INDEX idx_refresh_tokens_user   ON user_refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash   ON user_refresh_tokens(token_hash);
CREATE INDEX idx_clients_cpf           ON clients(cpf);
CREATE INDEX idx_clients_email         ON clients(email);
CREATE INDEX idx_clients_phone         ON clients(phone);
CREATE INDEX idx_clients_name_gin      ON clients USING GIN (to_tsvector('portuguese', name));
CREATE INDEX idx_devices_client        ON devices(client_id);
CREATE INDEX idx_devices_serial        ON devices(serial_number);
CREATE INDEX idx_so_order_number       ON service_orders(order_number);
CREATE INDEX idx_so_client             ON service_orders(client_id);
CREATE INDEX idx_so_technician         ON service_orders(technician_id);
CREATE INDEX idx_so_status             ON service_orders(status);
CREATE INDEX idx_so_created_at         ON service_orders(created_at DESC);
CREATE INDEX idx_so_parts_order        ON service_order_parts(service_order_id);
CREATE INDEX idx_so_parts_part         ON service_order_parts(part_id);
CREATE INDEX idx_payments_order        ON payments(service_order_id);
CREATE INDEX idx_payments_status       ON payments(status);
CREATE INDEX idx_stock_part            ON stock(part_id);
CREATE INDEX idx_stock_mov_part        ON stock_movements(part_id);
CREATE INDEX idx_stock_mov_created_at  ON stock_movements(created_at DESC);
CREATE INDEX idx_audit_user            ON audit_logs(user_id);
CREATE INDEX idx_audit_entity          ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at      ON audit_logs(created_at DESC);

-- Função updated_at
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at             BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_clients_updated_at           BEFORE UPDATE ON clients           FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_client_addresses_updated_at  BEFORE UPDATE ON client_addresses  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_devices_updated_at           BEFORE UPDATE ON devices           FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_technicians_updated_at       BEFORE UPDATE ON technicians       FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_suppliers_updated_at         BEFORE UPDATE ON suppliers         FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_parts_updated_at             BEFORE UPDATE ON parts             FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_service_orders_updated_at    BEFORE UPDATE ON service_orders    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
CREATE TRIGGER trg_payments_updated_at          BEFORE UPDATE ON payments          FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- Geração automática de número da OS
CREATE SEQUENCE IF NOT EXISTS service_order_seq START 1;

CREATE OR REPLACE FUNCTION fn_generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number = 'OS-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                       LPAD(NEXTVAL('service_order_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_so_generate_order_number
  BEFORE INSERT ON service_orders
  FOR EACH ROW EXECUTE FUNCTION fn_generate_order_number();

-- Trigger de estoque
CREATE OR REPLACE FUNCTION fn_update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock (part_id, quantity, updated_at)
  VALUES (NEW.part_id, 0, NOW())
  ON CONFLICT (part_id) DO NOTHING;

  IF NEW.movement_type IN ('in', 'return') THEN
    UPDATE stock SET quantity = quantity + NEW.quantity, updated_at = NOW()
    WHERE part_id = NEW.part_id;
  ELSIF NEW.movement_type IN ('out', 'adjustment') THEN
    UPDATE stock SET quantity = quantity - NEW.quantity, updated_at = NOW()
    WHERE part_id = NEW.part_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_update
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION fn_update_stock_on_movement();

-- Trigger de recálculo de totais da OS
CREATE OR REPLACE FUNCTION fn_recalculate_order_totals()
RETURNS TRIGGER AS $$
DECLARE v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.service_order_id, OLD.service_order_id);
  UPDATE service_orders
  SET
    total_parts_cost = (SELECT COALESCE(SUM(total_price), 0) FROM service_order_parts WHERE service_order_id = v_order_id),
    total_amount     = labor_cost + (SELECT COALESCE(SUM(total_price), 0) FROM service_order_parts WHERE service_order_id = v_order_id),
    final_amount     = labor_cost + (SELECT COALESCE(SUM(total_price), 0) FROM service_order_parts WHERE service_order_id = v_order_id) - discount
  WHERE id = v_order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_so_parts_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON service_order_parts
  FOR EACH ROW EXECUTE FUNCTION fn_recalculate_order_totals();

-- Dados iniciais
INSERT INTO users (name, email, password_hash, role)
VALUES ('Administrador', 'admin@assistencia.com', '$2b$10$CHANGE_THIS_HASH_IN_APP_BEFORE_USING', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
  ('clients:create', 'Criar clientes'), ('clients:read', 'Visualizar clientes'),
  ('clients:update', 'Editar clientes'), ('clients:delete', 'Excluir clientes'),
  ('devices:create', 'Cadastrar aparelhos'), ('devices:read', 'Visualizar aparelhos'),
  ('devices:update', 'Editar aparelhos'),
  ('orders:create', 'Criar ordens de serviço'), ('orders:read', 'Visualizar ordens de serviço'),
  ('orders:update', 'Editar ordens de serviço'), ('orders:delete', 'Excluir ordens de serviço'),
  ('orders:assign', 'Atribuir técnico a OS'), ('orders:status', 'Alterar status de OS'),
  ('technicians:manage', 'Gerenciar técnicos'),
  ('stock:read', 'Visualizar estoque'), ('stock:manage', 'Gerenciar estoque'),
  ('payments:create', 'Registrar pagamentos'), ('payments:read', 'Visualizar pagamentos'),
  ('payments:manage', 'Gerenciar pagamentos'),
  ('reports:read', 'Visualizar relatórios'),
  ('users:manage', 'Gerenciar usuários do sistema'),
  ('settings:manage', 'Gerenciar configurações')
ON CONFLICT (name) DO NOTHING;

INSERT INTO device_brands (name) VALUES
  ('Apple'), ('Samsung'), ('Motorola'), ('Xiaomi'), ('LG'),
  ('Sony'), ('Dell'), ('HP'), ('Lenovo'), ('Asus'),
  ('Acer'), ('Microsoft'), ('Huawei'), ('OnePlus'), ('Positivo'),
  ('TCL'), ('Philips'), ('JBL'), ('Canon'), ('Epson')
ON CONFLICT (name) DO NOTHING;
