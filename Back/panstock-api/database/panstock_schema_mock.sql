-- =========================================================
-- PanStock: datos reales + estructura mock
-- Backend MVP - Java 21 + Spring Boot 4.x + Spring Data JPA + MariaDB/MySQL
-- Uso Linux/Mac:
--   mariadb -u root -p < panstock_schema_mock.sql
--   sudo /usr/bin/mariadb < panstock_schema_mock.sql
-- Uso Windows:
--   mysql -u root -p < panstock_schema_mock.sql
-- =========================================================

DROP DATABASE IF EXISTS panstock_db;
CREATE DATABASE panstock_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';
ALTER USER 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';
CREATE USER IF NOT EXISTS 'panstock_user'@'127.0.0.1' IDENTIFIED BY 'panstock123';
ALTER USER 'panstock_user'@'127.0.0.1' IDENTIFIED BY 'panstock123';
GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';
GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'127.0.0.1';
FLUSH PRIVILEGES;

USE panstock_db;

-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE TABLE product_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE TABLE suppliers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    supplier_type VARCHAR(30) NOT NULL,
    contact_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    category_id BIGINT NOT NULL,
    default_supplier_id BIGINT,
    origin VARCHAR(30) NOT NULL,
    perishable BOOLEAN NOT NULL,
    unit_type VARCHAR(30) NOT NULL,
    cost_price DECIMAL(12,2),
    sale_price DECIMAL(12,2),
    minimum_stock DECIMAL(12,3),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories(id),
    CONSTRAINT fk_products_supplier FOREIGN KEY (default_supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE product_shelf_life_rules (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    duration_days INT,
    duration_hours INT,
    notes VARCHAR(255),
    CONSTRAINT fk_shelf_life_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE inventory_batches (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    supplier_id BIGINT,
    received_date DATE NOT NULL,
    expiration_date DATE,
    initial_quantity DECIMAL(12,3) NOT NULL,
    current_quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,2),
    unit_sale_price DECIMAL(12,2),
    storage_type VARCHAR(30),
    batch_status VARCHAR(30) NOT NULL,
    notes TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_batches_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_batches_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE stock_movements (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    batch_id BIGINT,
    user_id BIGINT,
    movement_type VARCHAR(30) NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    movement_date DATETIME NOT NULL,
    notes TEXT,
    related_waste_record_id BIGINT,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_movements_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_movements_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
    CONSTRAINT fk_movements_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE waste_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    batch_id BIGINT NOT NULL,
    created_by_id BIGINT,
    quantity DECIMAL(12,3) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    waste_date DATETIME NOT NULL,
    unit_cost DECIMAL(12,2),
    unit_sale_price DECIMAL(12,2),
    economic_loss DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_waste_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_waste_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
    CONSTRAINT fk_waste_user FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE promotions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    product_id BIGINT NOT NULL,
    batch_id BIGINT,
    created_by_id BIGINT,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    discount_type VARCHAR(30) NOT NULL,
    discount_percentage DECIMAL(5,2),
    promotional_price DECIMAL(12,2),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL,
    suggested_by_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_promotions_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_promotions_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
    CONSTRAINT fk_promotions_user FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    alert_type VARCHAR(40) NOT NULL,
    product_id BIGINT NOT NULL,
    batch_id BIGINT,
    message VARCHAR(255) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at DATETIME NOT NULL,
    resolved_at DATETIME,
    CONSTRAINT fk_alerts_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_alerts_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id)
);

CREATE TABLE app_settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value VARCHAR(255) NOT NULL,
    description VARCHAR(255)
);

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_enabled ON users(enabled);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_categories_active ON product_categories(active);

CREATE INDEX idx_suppliers_type ON suppliers(supplier_type);
CREATE INDEX idx_suppliers_active ON suppliers(active);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(default_supplier_id);
CREATE INDEX idx_products_origin ON products(origin);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_perishable ON products(perishable);

CREATE INDEX idx_shelf_life_product ON product_shelf_life_rules(product_id);
CREATE INDEX idx_shelf_life_condition ON product_shelf_life_rules(condition_type);

CREATE INDEX idx_batches_product ON inventory_batches(product_id);
CREATE INDEX idx_batches_supplier ON inventory_batches(supplier_id);
CREATE INDEX idx_batches_expiration ON inventory_batches(expiration_date);
CREATE INDEX idx_batches_status ON inventory_batches(batch_status);
CREATE INDEX idx_batches_current_quantity ON inventory_batches(current_quantity);

CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_batch ON stock_movements(batch_id);
CREATE INDEX idx_movements_user ON stock_movements(user_id);
CREATE INDEX idx_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_movements_date ON stock_movements(movement_date);

CREATE INDEX idx_waste_product ON waste_records(product_id);
CREATE INDEX idx_waste_batch ON waste_records(batch_id);
CREATE INDEX idx_waste_reason ON waste_records(reason);
CREATE INDEX idx_waste_date ON waste_records(waste_date);

CREATE INDEX idx_promotions_product ON promotions(product_id);
CREATE INDEX idx_promotions_batch ON promotions(batch_id);
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);

CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_product ON alerts(product_id);
CREATE INDEX idx_alerts_batch ON alerts(batch_id);

-- =========================================================
-- DATOS
-- =========================================================

-- -------------------------------------------------------
-- USUARIOS
-- Contraseña de todos los usuarios: 1234
-- Hash BCrypt de '1234': $2a$10$mSv6/GckMyWULmp27zj9XeH6raDO4o/wM2Y8teHyAfPqI0n9Eud.S
-- Para autenticarse: POST /auth/authenticate { "username": "lorena", "password": "1234" }
-- -------------------------------------------------------
INSERT INTO users (id, username, first_name, last_name, email, password, role, enabled, created_at, updated_at) VALUES
(1, 'lorena',   'Lorena',   'Elmallian', 'lorena@panstock.local',
 '$2a$10$mSv6/GckMyWULmp27zj9XeH6raDO4o/wM2Y8teHyAfPqI0n9Eud.S',
 'OWNER', TRUE, NOW(), NOW()),
(2, 'gabriel',  'Gabriel',  'Arias',     'gabriel@panstock.local',
 '$2a$10$mSv6/GckMyWULmp27zj9XeH6raDO4o/wM2Y8teHyAfPqI0n9Eud.S',
 'OWNER', TRUE, NOW(), NOW()),
(3, 'martina',  'Martina',  'Lopez',     'martina@panstock.local',
 '$2a$10$mSv6/GckMyWULmp27zj9XeH6raDO4o/wM2Y8teHyAfPqI0n9Eud.S',
 'EMPLOYEE', TRUE, NOW(), NOW()),
(4, 'federico', 'Federico', 'Temporal',  'federico.temporal@panstock.local',
 '$2a$10$mSv6/GckMyWULmp27zj9XeH6raDO4o/wM2Y8teHyAfPqI0n9Eud.S',
 'EMPLOYEE', FALSE, NOW(), NOW());

-- -------------------------------------------------------
-- CATEGORÍAS
-- -------------------------------------------------------
INSERT INTO product_categories (id, name, description, active, created_at, updated_at) VALUES
(1, 'Panadería',               'Productos principales de panadería de la franquicia.',          TRUE,  NOW(), NOW()),
(2, 'Pastelería',              'Tortas, postres y productos dulces refrigerados o de mostrador.',TRUE,  NOW(), NOW()),
(3, 'Sector salado',           'Tostados, sandwiches, ensaladas, tartas y wraps.',              TRUE,  NOW(), NOW()),
(4, 'Bebidas',                 'Bebidas de mayorista o proveedores externos.',                  TRUE,  NOW(), NOW()),
(5, 'Café e infusiones',       'Café, té, submarino e infusiones varias.',                      TRUE,  NOW(), NOW()),
(6, 'Sin TACC',                'Productos externos aptos para personas celíacas.',              TRUE,  NOW(), NOW()),
(7, 'Chocolates y golosinas',  'Alfajores, chocolates y productos de kiosco externos.',         TRUE,  NOW(), NOW()),
(8, 'Insumos',                 'Vasos, servilletas y descartables no comestibles.',             TRUE,  NOW(), NOW()),
(9, 'Insumos cafetería',       'Granos de café, azúcar, edulcorante, canela, cacao.',           TRUE,  NOW(), NOW());

-- -------------------------------------------------------
-- PROVEEDORES
-- -------------------------------------------------------
INSERT INTO suppliers (id, name, supplier_type, contact_name, phone, email, notes, active, created_at, updated_at) VALUES
(1, 'Dulce Hora Franquicia',             'FRANCHISE',  'Distribuidora Dulce Hora', NULL, NULL,
    'Proveedor oficial de productos de franquicia.',                                            TRUE, NOW(), NOW()),
(2, 'Macro',                             'WHOLESALER', NULL, NULL, NULL,
    'Leche, té, agua sin gas Cellier, agua con gas Cellier, jugo Citric, agua sin gas Smart, cerveza.',
                                                                                                TRUE, NOW(), NOW()),
(3, 'Mayorista de bebidas El Clásico',   'WHOLESALER', NULL, NULL, NULL,
    'Agua, gaseosa línea Coca Cola, agua saborizada, soda.',                                    TRUE, NOW(), NOW()),
(4, 'Guajira',                           'EXTERNAL',   NULL, NULL, NULL,
    'Granos de café, azúcar, edulcorante.',                                                     TRUE, NOW(), NOW()),
(5, 'Estancias del Sur',                 'EXTERNAL',   NULL, NULL, NULL,
    'Jugo Estancias.',                                                                          TRUE, NOW(), NOW()),
(6, 'Mayorista de chocolate Gustavo Acuña','WHOLESALER',NULL, NULL, NULL,
    'Alfajor sin TACC, cubanito, alfajor 70 negro o blanco.',                                   TRUE, NOW(), NOW()),
(7, 'Campiña',                           'EXTERNAL',   NULL, NULL, NULL,
    'Canela, cacao y fiambres.',                                                                TRUE, NOW(), NOW()),
(8, 'D&D Panificados',                   'EXTERNAL',   NULL, NULL, NULL,
    'Pan de miga para tostados y sandwiches.',                                                  TRUE, NOW(), NOW());

-- -------------------------------------------------------
-- PRODUCTOS
--
-- FRANQUICIA (origen FRANCHISE, proveedor Dulce Hora):
--   Panadería, Pastelería, Sector salado
--
-- EXTERNOS (origen EXTERNAL):
--   Bebidas, Café e infusiones, Sin TACC, Chocolates, Insumos, Insumos cafetería
--
-- ACLARACIÓN DEL NEGOCIO:
--   El café, submarino, té con leche, etc. se preparan en el momento.
--   El stock que se controla es el de los INSUMOS (granos de café, leche, té, etc.),
--   no el de la bebida preparada. Por eso esos productos tienen perishable=TRUE
--   y se cargan como insumos de cafetería, no como productos de venta directa.
--   Los precios de venta de los preparados se listan igual para referencia,
--   pero el control de stock pasa por los insumos.
-- -------------------------------------------------------

-- --- PANADERÍA (franquicia) ---
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(1,  'Medialunas de manteca',  'Medialuna de manteca de franquicia.',                   1, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,    24.000, TRUE, NOW(), NOW()),
(2,  'Medialunas de grasa',    'Medialuna de grasa de franquicia.',                     1, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,    24.000, TRUE, NOW(), NOW()),
(3,  'Medialuna rellena jyq',  'Medialuna rellena jamón y queso, 1 unidad.',            1, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, 2500.00,  12.000, TRUE, NOW(), NOW()),
(4,  'Pan de campo',           'Pan de campo de franquicia.',                           1, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     5.000, TRUE, NOW(), NOW()),
(5,  'Chipa',                  'Chipa de franquicia.',                                  1, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,    20.000, TRUE, NOW(), NOW()),
(6,  'Prepizza',               'Prepizza de franquicia.',                               1, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     8.000, TRUE, NOW(), NOW());

-- --- PASTELERÍA (franquicia) ---
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(7,  'Postre cheesecake frutos rojos', 'Postre refrigerado de franquicia.',             2, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     3.000, TRUE, NOW(), NOW()),
(8,  'Chocotorta',             'Torta/postre de franquicia.',                           2, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     3.000, TRUE, NOW(), NOW()),
(9,  'Lemon pie',              'Tarta dulce de franquicia.',                            2, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     3.000, TRUE, NOW(), NOW()),
(10, 'Mini rogel',             'Mini torta/postre de franquicia.',                      2, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     4.000, TRUE, NOW(), NOW());

-- --- SECTOR SALADO (franquicia) ---
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(11, 'Tostado de miga',        '4 triángulos. Pan de miga de D&D.',                    3, 8, 'FRANCHISE', TRUE,  'UNIT', NULL, 7500.00,  4.000, TRUE, NOW(), NOW()),
(12, 'Sandwich de miga jyq',   '4 unidades jamón y queso. Pan de miga de D&D.',        3, 8, 'FRANCHISE', TRUE,  'UNIT', NULL, 7500.00,  6.000, TRUE, NOW(), NOW()),
(13, 'Tarta de jamón y queso', 'Tarta salada de franquicia.',                          3, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     3.000, TRUE, NOW(), NOW()),
(14, 'Wrap Caprese',           'Wrap salado de franquicia.',                           3, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     4.000, TRUE, NOW(), NOW()),
(15, 'Tarta Caprese',          'Tarta salada de franquicia.',                          3, 1, 'FRANCHISE', TRUE,  'UNIT', NULL, NULL,     3.000, TRUE, NOW(), NOW());

-- --- BEBIDAS (externas) ---
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(101, 'Agua sin gas Cellier 600ml',    'Agua sin gas. Proveedor: Macro.',               4, 2, 'EXTERNAL',  TRUE,  'UNIT', NULL, 1500.00, 12.000, TRUE, NOW(), NOW()),
(102, 'Agua con gas Cellier 600ml',    'Agua con gas. Proveedor: Macro.',               4, 2, 'EXTERNAL',  TRUE,  'UNIT', NULL, 1500.00, 12.000, TRUE, NOW(), NOW()),
(103, 'Agua sin gas Smart 500ml',      'Agua sin gas. Proveedor: Macro.',               4, 2, 'EXTERNAL',  TRUE,  'UNIT', NULL, 2000.00, 12.000, TRUE, NOW(), NOW()),
(104, 'Gaseosa línea Coca Cola',       'Gaseosa 500ml. Proveedor: El Clásico.',         4, 3, 'EXTERNAL',  TRUE,  'UNIT', NULL, 2500.00, 12.000, TRUE, NOW(), NOW()),
(105, 'Agua saborizada Levite/Aquarius','500ml. Proveedor: El Clásico.',                4, 3, 'EXTERNAL',  TRUE,  'UNIT', NULL, 2200.00, 12.000, TRUE, NOW(), NOW()),
(106, 'Jugo Estancias',                'Jugo Estancias. Proveedor: Estancias del Sur.', 4, 5, 'EXTERNAL',  TRUE,  'UNIT', NULL, 3500.00, 10.000, TRUE, NOW(), NOW()),
(107, 'Jugo Citric',                   'Jugo Citric. Proveedor: Macro.',                4, 2, 'EXTERNAL',  TRUE,  'UNIT', NULL, 3500.00, 10.000, TRUE, NOW(), NOW()),
(108, 'Cerveza',                       'Cerveza en lata/botella. Proveedor: Macro.',    4, 2, 'EXTERNAL',  TRUE,  'UNIT', NULL, 4000.00,  8.000, TRUE, NOW(), NOW());

-- --- CAFÉ E INFUSIONES (externos - precios de venta para referencia) ---
-- ACLARACIÓN: estos productos se preparan en el momento.
-- El stock real se controla por los insumos (categoría 9).
-- Se cargan aquí solo para poder registrar ventas manuales si se desea.
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(201, 'Café jarrito',           'Café solo, lágrima o cortado. Preparado en el momento.',5, 4, 'EXTERNAL',  FALSE, 'UNIT', NULL, 3300.00, NULL, TRUE, NOW(), NOW()),
(202, 'Café con leche para llevar', 'Preparado en el momento.',                          5, 4, 'EXTERNAL',  FALSE, 'UNIT', NULL, 3000.00, NULL, TRUE, NOW(), NOW()),
(203, 'Café con leche salón',   'Preparado en el momento.',                              5, 4, 'EXTERNAL',  FALSE, 'UNIT', NULL, 3600.00, NULL, TRUE, NOW(), NOW()),
(204, 'Café en pocillo',        'Café solo, lágrima o cortado. Preparado en el momento.',5, 4, 'EXTERNAL',  FALSE, 'UNIT', NULL, 2500.00, NULL, TRUE, NOW(), NOW()),
(205, 'Té',                     'Preparado en el momento.',                              5, 2, 'EXTERNAL',  FALSE, 'UNIT', NULL, 2200.00, NULL, TRUE, NOW(), NOW()),
(206, 'Té con leche',           'Preparado en el momento.',                              5, 2, 'EXTERNAL',  FALSE, 'UNIT', NULL, 2800.00, NULL, TRUE, NOW(), NOW()),
(207, 'Submarino',              'Preparado en el momento.',                              5, 2, 'EXTERNAL',  FALSE, 'UNIT', NULL, 5500.00, NULL, TRUE, NOW(), NOW()),
(208, 'Taza de leche',          'Sola, fría o caliente. Preparada en el momento.',       5, 2, 'EXTERNAL',  FALSE, 'UNIT', NULL, 2500.00, NULL, TRUE, NOW(), NOW()),
(209, 'Cindor/Nesquik cajita',  'Cajita lista para servir.',                             5, 2, 'EXTERNAL',  TRUE,  'UNIT', NULL, 3000.00, 6.000, TRUE, NOW(), NOW()),
(210, 'Capuccino',              'Con canela y chocolate. Preparado en el momento.',      5, 4, 'EXTERNAL',  FALSE, 'UNIT', NULL, 6500.00, NULL, TRUE, NOW(), NOW()),
(211, 'Capuccino con crema',    'Crema, canela y cacao amargo. Preparado en el momento.',5, 4, 'EXTERNAL',  FALSE, 'UNIT', NULL, 8500.00, NULL, TRUE, NOW(), NOW()),
(212, 'Capuccino para llevar',  'Canela y cacao. Preparado en el momento.',              5, 4, 'EXTERNAL',  FALSE, 'UNIT', NULL, 5000.00, NULL, TRUE, NOW(), NOW());

-- --- SIN TACC (externos) ---
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(301, 'Alfajor sin TACC',      'Apto celíacos. Proveedor: Gustavo Acuña.',              6, 6, 'EXTERNAL',  TRUE,  'UNIT', NULL, 2800.00, 10.000, TRUE, NOW(), NOW());

-- --- CHOCOLATES Y GOLOSINAS (externos) ---
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(401, 'Alfajor 70 negro o blanco', 'Alfajor de chocolate. Proveedor: Gustavo Acuña.',   7, 6, 'EXTERNAL',  TRUE,  'UNIT', NULL, 1800.00, 10.000, TRUE, NOW(), NOW()),
(402, 'Cubanito',               'Proveedor: Gustavo Acuña.',                            7, 6, 'EXTERNAL',  TRUE,  'UNIT', NULL, 1500.00, 10.000, TRUE, NOW(), NOW());

-- --- INSUMOS CAFETERÍA (lo que realmente se stockea para preparar bebidas) ---
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(501, 'Granos de café',        'Para preparación de café. Proveedor: Guajira.',         9, 4, 'EXTERNAL',  TRUE,  'KG',    NULL, 0.00, 2.000, TRUE, NOW(), NOW()),
(502, 'Azúcar',                'Para mesas y preparaciones. Proveedor: Guajira.',       9, 4, 'EXTERNAL',  FALSE, 'KG',    NULL, 0.00, 3.000, TRUE, NOW(), NOW()),
(503, 'Edulcorante',           'Para mesas. Proveedor: Guajira.',                       9, 4, 'EXTERNAL',  FALSE, 'PACK',  NULL, 0.00, 2.000, TRUE, NOW(), NOW()),
(504, 'Leche',                 'Para café con leche, submarino, etc. Proveedor: Macro.',9, 2, 'EXTERNAL',  TRUE,  'LITER', NULL, 0.00, 5.000, TRUE, NOW(), NOW()),
(505, 'Té en saquitos',        'Proveedor: Macro.',                                     9, 2, 'EXTERNAL',  FALSE, 'PACK',  NULL, 0.00, 2.000, TRUE, NOW(), NOW()),
(506, 'Canela',                'Para capuccino. Proveedor: Campiña.',                   9, 7, 'EXTERNAL',  FALSE, 'PACK',  NULL, 0.00, 1.000, TRUE, NOW(), NOW()),
(507, 'Cacao en polvo',        'Para capuccino. Proveedor: Campiña.',                   9, 7, 'EXTERNAL',  FALSE, 'PACK',  NULL, 0.00, 1.000, TRUE, NOW(), NOW());

-- --- INSUMOS DESCARTABLES ---
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(601, 'Vasos descartables',    'Vasos para café para llevar.',                          8, NULL, 'EXTERNAL', FALSE, 'PACK', NULL, 0.00, 5.000, TRUE, NOW(), NOW()),
(602, 'Servilletas',           'Servilletas para mesas.',                               8, NULL, 'EXTERNAL', FALSE, 'PACK', NULL, 0.00, 5.000, TRUE, NOW(), NOW());

-- -------------------------------------------------------
-- CONFIGURACIONES
-- -------------------------------------------------------
INSERT INTO app_settings (id, setting_key, setting_value, description) VALUES
(1, 'expiration_alert_days',     '2', 'Cantidad de días para considerar un lote próximo a vencer.'),
(2, 'promotion_suggestion_days', '2', 'Cantidad de días para sugerir promoción antes del vencimiento.');

-- =========================================================
-- LOTES DE INVENTARIO (mock para testing)
--
-- Lotes id 1-21: stock operativo normal (bebidas, sin TACC, chocolates, insumos).
-- Lotes id 22-24: lotes de prueba del semáforo, uno por cada estado urgente:
--   id=22 → ExpirationStatus.RED    (vence HOY,  days=0)
--   id=23 → ExpirationStatus.YELLOW (vence mañana, days=1, dentro de alertDays=2)
--   id=24 → ExpirationStatus.EXPIRED (venció ayer, days=-1)
-- =========================================================

INSERT INTO inventory_batches (id, product_id, supplier_id, received_date, expiration_date, initial_quantity, current_quantity, unit_cost, unit_sale_price, storage_type, batch_status, notes, created_at, updated_at) VALUES
-- Bebidas
(1,  104, 3, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 110 DAY), 24.000, 24.000, NULL, 2500.00, 'FRIDGE',   'AVAILABLE', 'Gaseosa Coca Cola.',           NOW(), NOW()),
(2,  105, 3, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 110 DAY), 24.000, 24.000, NULL, 2200.00, 'FRIDGE',   'AVAILABLE', 'Agua saborizada.',             NOW(), NOW()),
(3,  106, 5, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 25 DAY),  18.000, 18.000, NULL, 3500.00, 'FRIDGE',   'AVAILABLE', 'Jugo Estancias.',              NOW(), NOW()),
(4,  107, 2, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 85 DAY),  18.000, 18.000, NULL, 3500.00, 'FRIDGE',   'AVAILABLE', 'Jugo Citric.',                 NOW(), NOW()),
(5,  108, 2, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 175 DAY), 12.000, 12.000, NULL, 4000.00, 'FRIDGE',   'AVAILABLE', 'Cerveza.',                     NOW(), NOW()),
(6,  101, 2, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 175 DAY), 24.000, 24.000, NULL, 1500.00, 'STORAGE',  'AVAILABLE', 'Agua sin gas Cellier.',        NOW(), NOW()),
(7,  102, 2, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 175 DAY), 24.000, 24.000, NULL, 1500.00, 'STORAGE',  'AVAILABLE', 'Agua con gas Cellier.',        NOW(), NOW()),
(8,  103, 2, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 175 DAY), 24.000, 24.000, NULL, 2000.00, 'STORAGE',  'AVAILABLE', 'Agua sin gas Smart.',          NOW(), NOW()),
-- Sin TACC y chocolates
(9,  301, 6, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 75 DAY),  24.000, 20.000, NULL, 2800.00, 'DISPLAY',  'AVAILABLE', 'Alfajor sin TACC.',            NOW(), NOW()),
(10, 401, 6, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 75 DAY),  24.000, 20.000, NULL, 1800.00, 'DISPLAY',  'AVAILABLE', 'Alfajor 70.',                  NOW(), NOW()),
(11, 402, 6, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 75 DAY),  24.000, 20.000, NULL, 1500.00, 'DISPLAY',  'AVAILABLE', 'Cubanito.',                    NOW(), NOW()),
-- Cindor (tiene stock físico, a diferencia de los preparados)
(12, 209, 2, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 80 DAY),  12.000, 10.000, NULL, 3000.00, 'DISPLAY',  'AVAILABLE', 'Cindor/Nesquik cajita.',       NOW(), NOW()),
-- Insumos cafetería
(13, 501, 4, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 160 DAY),  5.000,  4.000, NULL,    0.00, 'STORAGE',  'AVAILABLE', 'Granos de café.',              NOW(), NOW()),
(14, 502, 4, DATE_SUB(CURDATE(), INTERVAL 20 DAY), NULL,                                   5.000,  4.000, NULL,    0.00, 'STORAGE',  'AVAILABLE', 'Azúcar.',                      NOW(), NOW()),
(15, 504, 2, DATE_SUB(CURDATE(), INTERVAL 3 DAY),  DATE_ADD(CURDATE(), INTERVAL 7 DAY),   10.000,  8.000, NULL,    0.00, 'FRIDGE',   'AVAILABLE', 'Leche.',                       NOW(), NOW()),
(16, 505, 2, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 160 DAY),  3.000,  2.000, NULL,    0.00, 'STORAGE',  'AVAILABLE', 'Té en saquitos.',              NOW(), NOW()),
(17, 506, 7, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 160 DAY),  2.000,  2.000, NULL,    0.00, 'STORAGE',  'AVAILABLE', 'Canela.',                      NOW(), NOW()),
(18, 507, 7, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 160 DAY),  2.000,  2.000, NULL,    0.00, 'STORAGE',  'AVAILABLE', 'Cacao en polvo.',              NOW(), NOW()),
-- Insumos descartables
(19, 601, NULL, DATE_SUB(CURDATE(), INTERVAL 30 DAY), NULL,                               10.000, 10.000, NULL,    0.00, 'STORAGE',  'AVAILABLE', 'Vasos descartables.',          NOW(), NOW()),
(20, 602, NULL, DATE_SUB(CURDATE(), INTERVAL 30 DAY), NULL,                               10.000, 10.000, NULL,    0.00, 'STORAGE',  'AVAILABLE', 'Servilletas.',                 NOW(), NOW()),
-- Lote de leche próximo a vencer — queda DEPLETED tras las mermas mock (ver más abajo)
(21, 504, 2, DATE_SUB(CURDATE(), INTERVAL 8 DAY),  DATE_ADD(CURDATE(), INTERVAL 1 DAY),    5.000,  3.000, NULL,    0.00, 'FRIDGE',   'AVAILABLE', 'Leche próxima a vencer.',      NOW(), NOW()),
-- -------------------------------------------------------
-- LOTES DE PRUEBA DEL SEMÁFORO
--
-- id=22 → ExpirationStatus.RED    days=0  (vence HOY)
--   severity=RED  en la alerta; alertType=EXPIRING_SOON
-- id=23 → ExpirationStatus.YELLOW days=1  (vence mañana, <= alertDays=2)
--   severity=YELLOW en la alerta; alertType=EXPIRING_SOON
-- id=24 → ExpirationStatus.EXPIRED days=-1 (venció ayer)
--   severity=RED  en la alerta; alertType=EXPIRED
-- -------------------------------------------------------
(22, 301, 6, DATE_SUB(CURDATE(), INTERVAL 10 DAY), CURDATE(),                              6.000,  6.000, NULL, 2800.00, 'DISPLAY',  'AVAILABLE', 'Prueba semáforo RED — vence hoy.',       NOW(), NOW()),
(23, 402, 6, DATE_SUB(CURDATE(), INTERVAL 5 DAY),  DATE_ADD(CURDATE(), INTERVAL 1 DAY),    6.000,  6.000, NULL, 1500.00, 'DISPLAY',  'AVAILABLE', 'Prueba semáforo YELLOW — vence mañana.', NOW(), NOW()),
(24, 106, 5, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY),   12.000,  5.000, NULL, 3500.00, 'FRIDGE',   'AVAILABLE', 'Prueba semáforo EXPIRED — venció ayer.', NOW(), NOW());

-- =========================================================
-- MOVIMIENTOS ENTRY iniciales para todos los lotes
-- =========================================================
INSERT INTO stock_movements (product_id, batch_id, user_id, movement_type, quantity, movement_date, notes, related_waste_record_id, created_at)
SELECT product_id, id, 2, 'ENTRY', initial_quantity, DATE_SUB(NOW(), INTERVAL 3 DAY),
       CONCAT('Ingreso inicial para lote ', id), NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)
FROM inventory_batches;

-- =========================================================
-- ALERTAS iniciales (semáforo para testing)
--
-- Regla de severidad (AlertServiceImpl.generateExpirationAlerts):
--   days == 0       → severity RED   (alertType EXPIRING_SOON)
--   days >= 1 && <= alertDays → severity YELLOW (alertType EXPIRING_SOON)
--   days <  0       → severity RED   (alertType EXPIRED)
-- =========================================================
INSERT INTO alerts (alert_type, product_id, batch_id, message, severity, status, created_at, resolved_at) VALUES
-- Lote 22: vence HOY → RED
('EXPIRING_SOON', 301, 22,
 'Alfajor sin TACC vence hoy.',
 'RED', 'ACTIVE', NOW(), NULL),

-- Lote 23: vence mañana (days=1, dentro de alertDays=2) → YELLOW
('EXPIRING_SOON', 402, 23,
 'Cubanito vence dentro de 1 día.',
 'YELLOW', 'ACTIVE', NOW(), NULL),

-- Lote 24: ya venció (days=-1) → RED, tipo EXPIRED
('EXPIRED', 106, 24,
 'Jugo Estancias ya venció.',
 'RED', 'ACTIVE', NOW(), NULL);

-- =========================================================
-- VERIFICACIÓN RÁPIDA (descomentar para validar)
-- =========================================================

-- SELECT p.id, p.name, COALESCE(SUM(b.current_quantity), 0) AS stock_actual
-- FROM products p
-- LEFT JOIN inventory_batches b ON b.product_id = p.id AND b.batch_status = 'AVAILABLE'
-- GROUP BY p.id, p.name ORDER BY p.id;

-- SELECT b.id, p.name, b.current_quantity, b.batch_status, b.expiration_date,
--        DATEDIFF(b.expiration_date, CURDATE()) AS dias_para_vencer,
--        CASE
--          WHEN b.expiration_date IS NULL                    THEN 'NOT_APPLICABLE'
--          WHEN DATEDIFF(b.expiration_date, CURDATE()) < 0  THEN 'EXPIRED'
--          WHEN DATEDIFF(b.expiration_date, CURDATE()) = 0  THEN 'RED'
--          WHEN DATEDIFF(b.expiration_date, CURDATE()) <= 2 THEN 'YELLOW'
--          ELSE                                                   'GREEN'
--        END AS expiration_status_esperado
-- FROM inventory_batches b
-- JOIN products p ON p.id = b.product_id
-- ORDER BY b.expiration_date IS NULL, DATEDIFF(b.expiration_date, CURDATE()) ASC;

-- SELECT a.id, a.alert_type, p.name AS producto, a.severity, a.status,
--        b.expiration_date, DATEDIFF(b.expiration_date, CURDATE()) AS dias
-- FROM alerts a
-- JOIN products p  ON p.id  = a.product_id
-- LEFT JOIN inventory_batches b ON b.id = a.batch_id
-- ORDER BY a.created_at DESC;

-- SELECT status, COUNT(*) FROM alerts GROUP BY status;

-- =========================================================
-- REGISTROS DE MERMA (waste_records)
-- WASTE RECORDS mock con created_by_id poblado
-- =========================================================

-- Usuarios disponibles:
--   1 = lorena  (OWNER)
--   2 = gabriel (OWNER)
--   3 = martina (EMPLOYEE)
--
-- Lotes disponibles con stock > 0 (batch_status = AVAILABLE):
--   15  → leche (product_id=504, unit_sale_price=0)
--   21  → leche próxima a vencer (product_id=504)
--   9   → alfajor sin TACC (product_id=301, unit_sale_price=2800)
--   10  → alfajor 70 (product_id=401, unit_sale_price=1800)
--   11  → cubanito (product_id=402, unit_sale_price=1500)
--   12  → cindor (product_id=209, unit_sale_price=3000)
--   13  → granos de café (product_id=501)

INSERT INTO waste_records
    (product_id, batch_id, created_by_id, quantity, reason,
     waste_date, unit_cost, unit_sale_price, economic_loss, notes, created_at)
VALUES
-- Lorena descarta 2 alfajores sin TACC vencidos
(301, 9, 1, 2.000, 'EXPIRED',
 DATE_SUB(NOW(), INTERVAL 5 DAY),
 NULL, 2800.00, 5600.00,
 'Dos alfajores sin TACC encontrados vencidos en mostrador.', NOW()),

-- Gabriel descarta 3 alfajores 70 dañados
(401, 10, 2, 3.000, 'DAMAGED',
 DATE_SUB(NOW(), INTERVAL 4 DAY),
 NULL, 1800.00, 5400.00,
 'Packaging roto, producto no apto para venta.', NOW()),

-- Martina descarta 1 cindor por calidad
(209, 12, 3, 1.000, 'QUALITY_ISSUE',
 DATE_SUB(NOW(), INTERVAL 3 DAY),
 NULL, 3000.00, 3000.00,
 'Caja abollada, producto en mal estado.', NOW()),

-- Lorena: consumo interno de 2 cubanitos
(402, 11, 1, 2.000, 'INTERNAL_CONSUMPTION',
 DATE_SUB(NOW(), INTERVAL 2 DAY),
 NULL, 1500.00, 3000.00,
 'Consumo interno del turno mañana.', NOW()),

-- Martina: descarta 5 litros de leche vencida (agota el lote 21 → DEPLETED)
(504, 21, 3, 5.000, 'EXPIRED',
 DATE_SUB(NOW(), INTERVAL 1 DAY),
 NULL, 0.00, 0.00,
 'Leche del lote 21 vencida. Se descarta por completo.', NOW()),

-- Gabriel: 1 alfajor sin TACC por otro motivo
(301, 9, 2, 1.000, 'OTHER',
 NOW(),
 NULL, 2800.00, 2800.00,
 'Producto caído al suelo, no se puede vender.', NOW());

-- Actualizar current_quantity de los lotes afectados para reflejar las mermas
-- Lote 9  (alfajor sin TACC): 20 - 2 - 1 = 17
-- Lote 10 (alfajor 70):       20 - 3     = 17
-- Lote 11 (cubanito):         20 - 2     = 18
-- Lote 12 (cindor):           10 - 1     =  9
-- Lote 21 (leche prox):        3 - 3     =  0  → DEPLETED

UPDATE inventory_batches SET current_quantity = 17.000 WHERE id = 9;
UPDATE inventory_batches SET current_quantity = 17.000 WHERE id = 10;
UPDATE inventory_batches SET current_quantity = 18.000 WHERE id = 11;
UPDATE inventory_batches SET current_quantity =  9.000 WHERE id = 12;
UPDATE inventory_batches SET current_quantity =  0.000, batch_status = 'DEPLETED' WHERE id = 21;

-- Registrar los movimientos WASTE correspondientes en stock_movements
INSERT INTO stock_movements
    (product_id, batch_id, user_id, movement_type, quantity,
     movement_date, notes, related_waste_record_id, created_at)
SELECT
    w.product_id,
    w.batch_id,
    w.created_by_id,
    'WASTE',
    w.quantity,
    w.waste_date,
    CONCAT('Descuento por merma. Motivo: ', w.reason),
    w.id,
    w.created_at
FROM waste_records w
WHERE w.created_at >= DATE_SUB(NOW(), INTERVAL 6 DAY);

-- =========================================================
-- VERIFICACIÓN DE MERMAS (descomentar para validar)
-- =========================================================

-- SELECT wr.id, p.name AS producto, wr.quantity, wr.reason,
--        wr.economic_loss, u.first_name, u.last_name, wr.waste_date
-- FROM waste_records wr
-- JOIN products p ON p.id = wr.product_id
-- LEFT JOIN users u ON u.id = wr.created_by_id
-- ORDER BY wr.waste_date DESC;