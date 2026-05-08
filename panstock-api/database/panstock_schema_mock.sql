-- =========================================================
-- PanStock - Esquema inicial + datos mock completos
-- Backend MVP - Java 21 + Spring Boot 4.x + Spring Data JPA + MariaDB/MySQL
--
-- Este script borra y recrea la base panstock_db.
-- Usar solo en desarrollo/local. No usar sobre datos reales.
--
-- Uso Linux/Mac:
--   mariadb -u root -p < database/panstock_schema_mock.sql
--   sudo /usr/bin/mariadb < database/panstock_schema_mock.sql
--
-- Uso Windows:
--   mysql -u root -p < database\panstock_schema_mock.sql
-- =========================================================

DROP DATABASE IF EXISTS panstock_db;
CREATE DATABASE panstock_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usuario local recomendado para Spring Boot.
-- Se crean permisos tanto para localhost como para 127.0.0.1 para evitar diferencias entre sistemas.
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
-- DATOS MOCK
-- =========================================================

-- Usuarios: incluye usuarios activos e inactivos para probar /api/users y filtros.
INSERT INTO users (id, first_name, last_name, email, password, role, enabled, created_at, updated_at) VALUES
(1, 'Lorena', 'Elmallian', 'lorena@panstock.local', '1234', 'ADMIN_OWNER', TRUE, NOW(), NOW()),
(2, 'Gabriel', 'Arias', 'gabriel@panstock.local', '1234', 'MANAGER', TRUE, NOW(), NOW()),
(3, 'Martina', 'Empleado', 'martina@panstock.local', '1234', 'EMPLOYEE', TRUE, NOW(), NOW()),
(4, 'Federico', 'Temporal', 'federico.temporal@panstock.local', '1234', 'EMPLOYEE', FALSE, NOW(), NOW());

-- Categorías: incluye una inactiva para probar activeOnly.
INSERT INTO product_categories (id, name, description, active, created_at, updated_at) VALUES
(1, 'Panadería', 'Productos principales de panadería de la franquicia.', TRUE, NOW(), NOW()),
(2, 'Pastelería', 'Tortas, postres y productos dulces refrigerados o de mostrador.', TRUE, NOW(), NOW()),
(3, 'Sector salado', 'Tostados, sandwiches, ensaladas, tartas y wraps.', TRUE, NOW(), NOW()),
(4, 'Bebidas', 'Bebidas de mayorista o proveedores externos.', TRUE, NOW(), NOW()),
(5, 'Café', 'Café e insumos específicos de cafetería.', TRUE, NOW(), NOW()),
(6, 'Sin TACC', 'Productos externos aptos para personas celíacas.', TRUE, NOW(), NOW()),
(7, 'Chocolates', 'Chocolates y productos artesanales externos.', TRUE, NOW(), NOW()),
(8, 'Insumos', 'Vasos, servilletas y descartables no comestibles.', TRUE, NOW(), NOW()),
(9, 'Temporada discontinuada', 'Categoría inactiva de prueba.', FALSE, NOW(), NOW());

-- Proveedores: incluye proveedores de franquicia, mayorista, externos e inactivos.
INSERT INTO suppliers (id, name, supplier_type, contact_name, phone, email, notes, active, created_at, updated_at) VALUES
(1, 'Dulce Hora Franquicia', 'FRANCHISE', 'Distribuidora Dulce Hora', NULL, NULL, 'Proveedor oficial de productos de franquicia.', TRUE, NOW(), NOW()),
(2, 'Mayorista Makro', 'WHOLESALER', 'Atención comercial', '11-4000-1000', 'ventas@makro.local', 'Compra mayorista de bebidas e insumos según rotación.', TRUE, NOW(), NOW()),
(3, 'Jugos Estancias', 'EXTERNAL', 'Proveedor de bebidas', '11-5555-1111', 'ventas@jugosestancias.local', 'Proveedor directo por WhatsApp.', TRUE, NOW(), NOW()),
(4, 'Café Don Ernesto', 'EXTERNAL', 'Técnico de cafetera', '11-5555-2222', 'contacto@donernesto.local', 'Proveedor independiente de café, entrega aproximada cada 15 días.', TRUE, NOW(), NOW()),
(5, 'Sin TACC Buenos Aires', 'EXTERNAL', 'Ventas', '11-5555-3333', 'ventas@sintaccba.local', 'Alfajores y cubanitos sin TACC.', TRUE, NOW(), NOW()),
(6, 'Chocolates Artesanales Sur', 'EXTERNAL', 'Ventas', '11-5555-4444', 'ventas@chocosur.local', 'Chocolates artesanales externos.', TRUE, NOW(), NOW()),
(7, 'Papelera Avellaneda', 'EXTERNAL', 'Ventas', '11-5555-5555', 'ventas@papeleraavellaneda.local', 'Vasos con logo, servilletas y descartables.', TRUE, NOW(), NOW()),
(8, 'Proveedor dado de baja', 'EXTERNAL', 'Sin contacto', NULL, NULL, 'Proveedor inactivo para probar filtros.', FALSE, NOW(), NOW());

-- Productos: incluye franquicia, externos, perecederos, no perecederos e inactivos.
INSERT INTO products (id, name, description, category_id, default_supplier_id, origin, perishable, unit_type, cost_price, sale_price, minimum_stock, active, created_at, updated_at) VALUES
(1, 'Medialunas manteca', 'Producto de panadería de franquicia.', 1, 1, 'FRANCHISE', TRUE, 'UNIT', 250.00, 700.00, 24.000, TRUE, NOW(), NOW()),
(2, 'Medialunas grasa', 'Producto de panadería de franquicia.', 1, 1, 'FRANCHISE', TRUE, 'UNIT', 230.00, 650.00, 24.000, TRUE, NOW(), NOW()),
(3, 'Pan de Campo', 'Pan de campo de franquicia.', 1, 1, 'FRANCHISE', TRUE, 'UNIT', 1300.00, 3000.00, 5.000, TRUE, NOW(), NOW()),
(4, 'Chipa', 'Producto de panadería de franquicia.', 1, 1, 'FRANCHISE', TRUE, 'UNIT', 200.00, 600.00, 20.000, TRUE, NOW(), NOW()),
(5, 'Prepizza', 'Producto de panadería de franquicia.', 1, 1, 'FRANCHISE', TRUE, 'UNIT', 800.00, 1800.00, 8.000, TRUE, NOW(), NOW()),
(6, 'Postre cheesecake frutos rojos', 'Postre refrigerado de franquicia.', 2, 1, 'FRANCHISE', TRUE, 'UNIT', 2200.00, 5200.00, 3.000, TRUE, NOW(), NOW()),
(7, 'Chocotorta', 'Torta/postre de franquicia.', 2, 1, 'FRANCHISE', TRUE, 'UNIT', 2500.00, 5800.00, 3.000, TRUE, NOW(), NOW()),
(8, 'Lemon pie', 'Tarta dulce de franquicia.', 2, 1, 'FRANCHISE', TRUE, 'UNIT', 2400.00, 5600.00, 3.000, TRUE, NOW(), NOW()),
(9, 'Tostado de miga', 'Producto salado de franquicia.', 3, 1, 'FRANCHISE', TRUE, 'UNIT', 1300.00, 3200.00, 4.000, TRUE, NOW(), NOW()),
(10, 'Sandwich de miga', 'Producto salado de franquicia.', 3, 1, 'FRANCHISE', TRUE, 'UNIT', 1100.00, 2800.00, 6.000, TRUE, NOW(), NOW()),
(11, 'Tarta de Jamón & Queso', 'Tarta salada de franquicia.', 3, 1, 'FRANCHISE', TRUE, 'UNIT', 2700.00, 6200.00, 3.000, TRUE, NOW(), NOW()),
(12, 'Wrap Caprese', 'Wrap salado de franquicia.', 3, 1, 'FRANCHISE', TRUE, 'UNIT', 1900.00, 4300.00, 4.000, TRUE, NOW(), NOW()),
(13, 'Tarta de Caprese', 'Tarta salada de franquicia.', 3, 1, 'FRANCHISE', TRUE, 'UNIT', 2700.00, 6200.00, 3.000, TRUE, NOW(), NOW()),
(14, 'Mini rogel', 'Mini torta/postre de franquicia.', 2, 1, 'FRANCHISE', TRUE, 'UNIT', 1500.00, 3600.00, 4.000, TRUE, NOW(), NOW()),
(101, 'Coca-Cola 500ml', 'Bebida externa comprada a mayorista.', 4, 2, 'EXTERNAL', TRUE, 'UNIT', 650.00, 1400.00, 12.000, TRUE, NOW(), NOW()),
(102, 'Jugo Estancias naranja 500ml', 'Bebida externa de proveedor directo.', 4, 3, 'EXTERNAL', TRUE, 'UNIT', 550.00, 1300.00, 10.000, TRUE, NOW(), NOW()),
(103, 'Café blend 1kg', 'Café externo para preparación en local.', 5, 4, 'EXTERNAL', TRUE, 'KG', 9500.00, 0.00, 2.000, TRUE, NOW(), NOW()),
(104, 'Alfajor sin TACC chocolate', 'Producto externo apto celíacos.', 6, 5, 'EXTERNAL', TRUE, 'UNIT', 700.00, 1600.00, 10.000, TRUE, NOW(), NOW()),
(105, 'Cubanito sin TACC', 'Producto externo apto celíacos.', 6, 5, 'EXTERNAL', TRUE, 'UNIT', 500.00, 1200.00, 10.000, TRUE, NOW(), NOW()),
(106, 'Chocolate artesanal 70%', 'Chocolate externo artesanal.', 7, 6, 'EXTERNAL', TRUE, 'UNIT', 1100.00, 2500.00, 8.000, TRUE, NOW(), NOW()),
(107, 'Vasos con logo', 'Insumo no perecedero.', 8, 7, 'EXTERNAL', FALSE, 'PACK', 4500.00, 0.00, 5.000, TRUE, NOW(), NOW()),
(108, 'Servilletas', 'Insumo no perecedero.', 8, 7, 'EXTERNAL', FALSE, 'PACK', 2500.00, 0.00, 5.000, TRUE, NOW(), NOW()),
(109, 'Producto discontinuado mock', 'Producto inactivo para probar activeOnly=false.', 9, 8, 'EXTERNAL', FALSE, 'UNIT', 100.00, 250.00, 1.000, FALSE, NOW(), NOW());

-- Reglas de duración referenciales. No todos los endpoints las usan todavía, pero documentan la lógica operativa.
INSERT INTO product_shelf_life_rules (product_id, condition_type, duration_days, duration_hours, notes) VALUES
(1, 'COLD_CHAIN', 3, NULL, '72 horas manteniendo cadena de frío.'),
(1, 'BROKEN_COLD_CHAIN', 2, NULL, '48 horas habiendo perdido cadena de frío.'),
(2, 'COLD_CHAIN', 3, NULL, '72 horas manteniendo cadena de frío.'),
(2, 'BROKEN_COLD_CHAIN', 2, NULL, '48 horas habiendo perdido cadena de frío.'),
(3, 'COLD_CHAIN', 5, NULL, '5 días manteniendo cadena de frío.'),
(3, 'BROKEN_COLD_CHAIN', 5, NULL, '5 días habiendo perdido cadena de frío.'),
(4, 'COLD_CHAIN', 180, NULL, '6 meses manteniendo cadena de frío.'),
(4, 'BROKEN_COLD_CHAIN', 3, NULL, '72 horas habiendo perdido cadena de frío.'),
(5, 'COLD_CHAIN', 7, NULL, '7 días manteniendo cadena de frío.'),
(5, 'BROKEN_COLD_CHAIN', 5, NULL, '5 días habiendo perdido cadena de frío.'),
(6, 'WINTER', 7, NULL, '7 días en invierno.'),
(6, 'SUMMER', 5, NULL, '5 días en verano.'),
(7, 'WINTER', 12, NULL, '12 días en invierno.'),
(7, 'SUMMER', 10, NULL, '10 días en verano.'),
(8, 'WINTER', 7, NULL, '7 días en invierno.'),
(8, 'SUMMER', 5, NULL, '5 días en verano.'),
(14, 'WINTER', 10, NULL, '10 días en invierno.'),
(14, 'SUMMER', 10, NULL, '10 días en verano.'),
(9, 'WINTER', 3, NULL, '3 días en invierno.'),
(9, 'SUMMER', 3, NULL, '3 días en verano.'),
(10, 'WINTER', 3, NULL, '3 días en invierno.'),
(10, 'SUMMER', 3, NULL, '3 días en verano.'),
(11, 'FREEZER', 180, NULL, '6 meses en freezer.'),
(11, 'FRIDGE', 5, NULL, '5 días en heladera.'),
(12, 'FREEZER', 180, NULL, '6 meses en freezer.'),
(12, 'FRIDGE', 5, NULL, '5 días en heladera.'),
(13, 'FREEZER', 180, NULL, '6 meses en freezer.'),
(13, 'FRIDGE', 5, NULL, '5 días en heladera.'),
(101, 'ROOM_TEMPERATURE', 180, NULL, 'Mock: bebida externa con vencimiento largo.'),
(102, 'FRIDGE', 30, NULL, 'Mock: jugo externo refrigerado.'),
(103, 'STORAGE', 180, NULL, 'Mock: café externo almacenado en depósito.'),
(104, 'ROOM_TEMPERATURE', 90, NULL, 'Mock: alfajor sin TACC.'),
(105, 'ROOM_TEMPERATURE', 90, NULL, 'Mock: cubanito sin TACC.'),
(106, 'ROOM_TEMPERATURE', 60, NULL, 'Mock: chocolate artesanal.');

-- Configuraciones usadas por Settings, StockService y PromotionService.
INSERT INTO app_settings (id, setting_key, setting_value, description) VALUES
(1, 'expiration_alert_days', '2', 'Cantidad de días para considerar un lote próximo a vencer.'),
(2, 'promotion_suggestion_days', '2', 'Cantidad de días para sugerir promoción antes del vencimiento.');

-- Lotes: se incluyen vencidos, rojos, amarillos, verdes, no perecederos y varios lotes del mismo producto para probar FEFO.
INSERT INTO inventory_batches (id, product_id, supplier_id, received_date, expiration_date, initial_quantity, current_quantity, unit_cost, unit_sale_price, storage_type, batch_status, notes, created_at, updated_at) VALUES
(1, 1, 1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), CURDATE(), 48.000, 30.000, 250.00, 700.00, 'FRIDGE', 'AVAILABLE', 'Lote rojo: vence hoy. Sirve para semáforo, ventas FEFO y promoción activa.', NOW(), NOW()),
(2, 2, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 60.000, 40.000, 230.00, 650.00, 'FRIDGE', 'AVAILABLE', 'Lote amarillo sin promoción activa: sirve para sugerencias.', NOW(), NOW()),
(3, 4, 1, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 20 DAY), 40.000, 25.000, 200.00, 600.00, 'FREEZER', 'AVAILABLE', 'Lote verde.', NOW(), NOW()),
(4, 5, 1, DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 12.000, 9.000, 800.00, 1800.00, 'FRIDGE', 'AVAILABLE', 'Lote amarillo con promoción activa.', NOW(), NOW()),
(5, 6, 1, DATE_SUB(CURDATE(), INTERVAL 8 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 8.000, 6.000, 2200.00, 5200.00, 'FRIDGE', 'EXPIRED', 'Lote vencido: cheesecake. No debe venderse.', NOW(), NOW()),
(6, 8, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), 6.000, 6.000, 2400.00, 5600.00, 'FRIDGE', 'AVAILABLE', 'Lote verde: lemon pie.', NOW(), NOW()),
(7, 11, 1, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 90 DAY), 10.000, 10.000, 2700.00, 6200.00, 'FREEZER', 'AVAILABLE', 'Tartas en freezer.', NOW(), NOW()),
(8, 12, 1, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 8.000, 5.000, 1900.00, 4300.00, 'FRIDGE', 'AVAILABLE', 'Wraps próximos a vencer. Tiene promoción cancelada, por lo que puede sugerirse otra.', NOW(), NOW()),
(9, 104, 5, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 24.000, 18.000, 700.00, 1600.00, 'DISPLAY', 'AVAILABLE', 'Alfajores sin TACC externos.', NOW(), NOW()),
(10, 102, 3, DATE_SUB(CURDATE(), INTERVAL 25 DAY), CURDATE(), 18.000, 12.000, 550.00, 1300.00, 'FRIDGE', 'AVAILABLE', 'Jugos externos vencen hoy con promoción activa.', NOW(), NOW()),
(11, 103, 4, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 100 DAY), 5.000, 4.000, 9500.00, 0.00, 'STORAGE', 'AVAILABLE', 'Café externo.', NOW(), NOW()),
(12, 106, 6, DATE_SUB(CURDATE(), INTERVAL 70 DAY), DATE_SUB(CURDATE(), INTERVAL 2 DAY), 20.000, 17.000, 1100.00, 2500.00, 'DISPLAY', 'EXPIRED', 'Chocolate artesanal externo vencido.', NOW(), NOW()),
(13, 101, 2, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 120 DAY), 36.000, 30.000, 650.00, 1400.00, 'FRIDGE', 'AVAILABLE', 'Bebidas externas.', NOW(), NOW()),
(14, 107, 7, DATE_SUB(CURDATE(), INTERVAL 5 DAY), NULL, 10.000, 8.000, 4500.00, 0.00, 'STORAGE', 'AVAILABLE', 'Insumo no perecedero. Sirve para probar expirationDate null.', NOW(), NOW()),
(15, 108, 7, DATE_SUB(CURDATE(), INTERVAL 5 DAY), NULL, 10.000, 12.000, 2500.00, 0.00, 'STORAGE', 'AVAILABLE', 'Insumo no perecedero. Tiene ajuste positivo mock.', NOW(), NOW()),
(16, 1, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 25.000, 25.000, 250.00, 700.00, 'FRIDGE', 'AVAILABLE', 'Segundo lote de medialunas manteca. Sirve para probar FEFO con varios lotes.', NOW(), NOW()),
(17, 1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 4 DAY), 30.000, 30.000, 250.00, 700.00, 'FRIDGE', 'AVAILABLE', 'Tercer lote de medialunas manteca. FEFO debería consumirlo después de los lotes 1 y 16.', NOW(), NOW()),
(18, 3, 1, DATE_SUB(CURDATE(), INTERVAL 6 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 5.000, 0.000, 1300.00, 3000.00, 'FRIDGE', 'DEPLETED', 'Lote agotado/vencido para probar que no se vende.', NOW(), NOW());

-- Movimientos ENTRY iniciales para todos los lotes.
INSERT INTO stock_movements (product_id, batch_id, user_id, movement_type, quantity, movement_date, notes, related_waste_record_id, created_at)
SELECT product_id, id, 2, 'ENTRY', initial_quantity, DATE_SUB(NOW(), INTERVAL 3 DAY), CONCAT('Ingreso inicial mock para lote ', id), NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)
FROM inventory_batches;

-- Mermas precargadas: sirven para reportes por fecha, categoría, proveedor y pérdida económica.
INSERT INTO waste_records (id, product_id, batch_id, created_by_id, quantity, reason, waste_date, unit_cost, unit_sale_price, economic_loss, notes, created_at) VALUES
(1, 6, 5, 3, 2.000, 'EXPIRED', NOW(), 2200.00, 5200.00, 10400.00, 'Merma mock de cheesecake vencido.', NOW()),
(2, 106, 12, 3, 3.000, 'EXPIRED', NOW(), 1100.00, 2500.00, 7500.00, 'Merma mock de chocolate externo vencido.', NOW()),
(3, 2, 2, 3, 3.000, 'EXPIRED', NOW(), 230.00, 650.00, 1950.00, 'Merma mock de medialunas grasa próximas a vencer.', NOW()),
(4, 102, 10, 2, 2.000, 'EXPIRED', DATE_SUB(NOW(), INTERVAL 1 DAY), 550.00, 1300.00, 2600.00, 'Merma mock de jugos externos.', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Movimientos WASTE asociados a las mermas.
INSERT INTO stock_movements (product_id, batch_id, user_id, movement_type, quantity, movement_date, notes, related_waste_record_id, created_at) VALUES
(6, 5, 3, 'WASTE', 2.000, NOW(), 'Descuento por merma mock de cheesecake.', 1, NOW()),
(106, 12, 3, 'WASTE', 3.000, NOW(), 'Descuento por merma mock de chocolate externo.', 2, NOW()),
(2, 2, 3, 'WASTE', 3.000, NOW(), 'Descuento por merma mock de medialunas grasa.', 3, NOW()),
(102, 10, 2, 'WASTE', 2.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Descuento por merma mock de jugos externos.', 4, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Movimientos de prueba para historial: SALE, ADJUSTMENT_IN y ADJUSTMENT_OUT.
-- Están pensados para probar filtros por productId, batchId, movementType y fechas.
INSERT INTO stock_movements (product_id, batch_id, user_id, movement_type, quantity, movement_date, notes, related_waste_record_id, created_at) VALUES
(1, 1, 2, 'SALE', 10.000, DATE_SUB(NOW(), INTERVAL 2 DAY), 'Venta manual mock: medialunas manteca, primer lote FEFO.', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 1, 2, 'ADJUSTMENT_OUT', 8.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Ajuste mock por diferencia de recuento.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 2, 2, 'SALE', 12.000, DATE_SUB(NOW(), INTERVAL 2 DAY), 'Venta manual mock: medialunas grasa.', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 2, 2, 'ADJUSTMENT_OUT', 5.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Ajuste mock de salida.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 3, 2, 'SALE', 10.000, DATE_SUB(NOW(), INTERVAL 2 DAY), 'Venta manual mock: chipa.', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 3, 2, 'ADJUSTMENT_OUT', 5.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Ajuste mock de salida: chipa.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, 4, 2, 'SALE', 3.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Venta manual mock: prepizza.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(12, 8, 2, 'SALE', 3.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Venta manual mock: wrap caprese.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(104, 9, 2, 'SALE', 6.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Venta manual mock: alfajor sin TACC.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(102, 10, 2, 'SALE', 4.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Venta manual mock: jugos externos.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 18, 2, 'ADJUSTMENT_OUT', 5.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Ajuste mock: lote agotado de pan de campo.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(103, 11, 2, 'ADJUSTMENT_OUT', 1.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Ajuste mock de café por consumo interno.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(101, 13, 2, 'SALE', 6.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Venta manual mock: bebidas externas.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(107, 14, 2, 'ADJUSTMENT_OUT', 2.000, DATE_SUB(NOW(), INTERVAL 1 DAY), 'Ajuste mock de vasos usados.', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(108, 15, 2, 'ADJUSTMENT_IN', 2.000, NOW(), 'Ajuste mock positivo: se encontraron packs no registrados.', NULL, NOW());


-- Promociones: activas, canceladas y vencidas para probar listados y reglas.
INSERT INTO promotions (id, product_id, batch_id, created_by_id, title, description, discount_type, discount_percentage, promotional_price, start_date, end_date, status, suggested_by_system, created_at, updated_at) VALUES
(1, 1, 1, 2, 'Promo medialunas manteca', 'Medialunas que vencen hoy con 20% de descuento.', 'PERCENTAGE', 20.00, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 'ACTIVE', TRUE, NOW(), NOW()),
(2, 5, 4, 2, 'Promo prepizzas', 'Prepizzas próximas a vencer con precio promocional.', 'FIXED_PRICE', NULL, 1400.00, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'ACTIVE', TRUE, NOW(), NOW()),
(3, 102, 10, 2, 'Promo jugos Estancias', 'Jugos externos que vencen hoy con 15% de descuento.', 'PERCENTAGE', 15.00, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 'ACTIVE', TRUE, NOW(), NOW()),
(4, 12, 8, 2, 'Promo wraps cancelada', 'Promoción cancelada para probar que no cuenta como activa.', 'PERCENTAGE', 10.00, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY), 'CANCELLED', TRUE, NOW(), NOW()),
(5, 104, 9, 2, 'Promo alfajores vencida', 'Promoción vencida para probar /api/promotions y /api/promotions/active.', 'FIXED_PRICE', NULL, 1200.00, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'EXPIRED', TRUE, DATE_SUB(NOW(), INTERVAL 5 DAY), NOW());

-- Alertas: activas y resueltas. /api/alerts/generate puede crear nuevas LOW_STOCK si todavía no existen.
INSERT INTO alerts (id, alert_type, product_id, batch_id, message, severity, status, created_at, resolved_at) VALUES
(1, 'EXPIRING_SOON', 1, 1, 'Medialunas manteca vencen hoy.', 'RED', 'ACTIVE', NOW(), NULL),
(2, 'EXPIRING_SOON', 2, 2, 'Medialunas grasa vencen dentro de 2 días.', 'YELLOW', 'ACTIVE', NOW(), NULL),
(3, 'EXPIRING_SOON', 5, 4, 'Prepizzas vencen mañana.', 'YELLOW', 'ACTIVE', NOW(), NULL),
(4, 'EXPIRED', 6, 5, 'Postre cheesecake frutos rojos ya venció.', 'RED', 'ACTIVE', NOW(), NULL),
(5, 'EXPIRING_SOON', 102, 10, 'Jugos Estancias vencen hoy.', 'RED', 'ACTIVE', NOW(), NULL),
(6, 'EXPIRED', 106, 12, 'Chocolate artesanal externo ya venció.', 'RED', 'ACTIVE', NOW(), NULL),
(7, 'LOW_STOCK', 3, NULL, 'Pan de Campo está por debajo del stock mínimo. Stock actual: 0.000, mínimo: 5.000.', 'YELLOW', 'ACTIVE', NOW(), NULL),
(8, 'EXPIRING_SOON', 4, 3, 'Alerta resuelta mock de chipa.', 'YELLOW', 'RESOLVED', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY));

-- =========================================================
-- CONSULTAS ÚTILES PARA VERIFICAR LA BASE
-- =========================================================

-- SELECT p.id, p.name, p.origin, p.active, SUM(COALESCE(b.current_quantity, 0)) AS stock_actual
-- FROM products p
-- LEFT JOIN inventory_batches b ON b.product_id = p.id
-- GROUP BY p.id, p.name, p.origin, p.active
-- ORDER BY p.id;
--
-- SELECT b.id AS batch_id, p.name, b.current_quantity, b.batch_status, b.expiration_date,
--        DATEDIFF(b.expiration_date, CURDATE()) AS dias_para_vencer
-- FROM inventory_batches b
-- JOIN products p ON p.id = b.product_id
-- ORDER BY b.expiration_date IS NULL, b.expiration_date ASC, b.id ASC;
--
-- SELECT movement_type, COUNT(*) AS cantidad_movimientos
-- FROM stock_movements
-- GROUP BY movement_type
-- ORDER BY movement_type;
--
-- SELECT SUM(economic_loss) AS perdida_total FROM waste_records;
--
-- SELECT status, COUNT(*) AS cantidad_promociones
-- FROM promotions
-- GROUP BY status;
--
-- SELECT status, COUNT(*) AS cantidad_alertas
-- FROM alerts
-- GROUP BY status;
