-- ============================================
-- Churn SaaS - Inicializacion de base de datos
-- Multi-tenant con Row Level Security (RLS)
-- Version reproducible: incluye factor_conversion
-- y seeds de desarrollo (tenant, usuario, mapeo)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. TABLAS
-- ============================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'trial',
    activo BOOLEAN NOT NULL DEFAULT true,
    factor_conversion NUMERIC(10,4) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usuarios_tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('owner', 'admin', 'colaborador')),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE mapeo_columnas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    columna_pipeline VARCHAR(100) NOT NULL,
    columna_origen VARCHAR(150) NOT NULL,
    mapeo_valores JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, columna_pipeline)
);

CREATE TABLE predicciones_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_identificador VARCHAR(255),
    input_data JSONB NOT NULL,
    churn_probability NUMERIC(6,4) NOT NULL,
    creado_por UUID REFERENCES usuarios_tenant(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_tenant_tenant_id ON usuarios_tenant(tenant_id);
CREATE INDEX idx_mapeo_columnas_tenant_id ON mapeo_columnas(tenant_id);
CREATE INDEX idx_predicciones_tenant_id ON predicciones_historial(tenant_id);
CREATE INDEX idx_predicciones_created_at ON predicciones_historial(created_at);

-- ============================================
-- 2. ROL DE APLICACION (no-superuser)
-- ============================================

CREATE ROLE app_user WITH LOGIN PASSWORD 'app_user_dev_pass';

GRANT CONNECT ON DATABASE churn_saas TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE usuarios_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_tenant FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_usuarios ON usuarios_tenant
    USING (tenant_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

ALTER TABLE mapeo_columnas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapeo_columnas FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_mapeo ON mapeo_columnas
    USING (tenant_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

ALTER TABLE predicciones_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicciones_historial FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_predicciones ON predicciones_historial
    USING (tenant_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

-- 'tenants' queda sin RLS: tabla raiz, la maneja un rol de
-- super-admin mas adelante, no app_user en contexto de tenant.

-- ============================================
-- 4. SEEDS DE DESARROLLO
-- ============================================
-- UUID del tenant FIJO (no gen_random_uuid()) para que los scripts
-- de prueba (test_mapeo_aislado.py, curl de referencia) sigan
-- funcionando sin cambios aunque se reconstruya la DB desde cero.

INSERT INTO tenants (id, nombre, slug, plan, factor_conversion)
VALUES (
    'dc2f4eb0-1483-4f1e-8143-dd6ac08e8826',
    'Tenant de Prueba',
    'tenant-prueba',
    'trial',
    100.0
);

-- Usuario admin de prueba. La contrasena se hashea con pgcrypto
-- (crypt + gen_salt('bf') = bcrypt), formato compatible con la
-- libreria bcrypt de Python usada en auth.py (bcrypt.checkpw).
-- Password en texto plano: test1234
INSERT INTO usuarios_tenant (tenant_id, email, password_hash, rol)
VALUES (
    'dc2f4eb0-1483-4f1e-8143-dd6ac08e8826',
    'gimnasio@test.com',
    crypt('test1234', gen_salt('bf')),
    'owner'
);

-- Mapeo de columnas: CSV en espanol de un gimnasio -> columnas del pipeline.
INSERT INTO mapeo_columnas (tenant_id, columna_pipeline, columna_origen, mapeo_valores) VALUES

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'tenure', 'Meses_Cliente', NULL),
('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'MonthlyCharges', 'Cuota_Mensual', NULL),
('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'TotalCharges', 'Total_Pagado', NULL),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'gender', 'Sexo',
    '{"M": "Male", "F": "Female"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'SeniorCitizen', 'Es_Mayor',
    '{"Si": 1, "No": 0}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'Partner', 'Tiene_Pareja',
    '{"Si": "Yes", "No": "No"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'Dependents', 'Tiene_Hijos',
    '{"Si": "Yes", "No": "No"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'PhoneService', 'Tiene_Telefono',
    '{"Si": "Yes", "No": "No"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'MultipleLines', 'Lineas_Multiples',
    '{"Si": "Yes", "No": "No", "Sin_Telefono": "No phone service"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'InternetService', 'Tipo_Internet',
    '{"DSL": "DSL", "Fibra": "Fiber optic", "No": "No"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'OnlineSecurity', 'Seguridad_Online',
    '{"Si": "Yes", "No": "No", "Sin_Internet": "No internet service"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'OnlineBackup', 'Backup_Online',
    '{"Si": "Yes", "No": "No", "Sin_Internet": "No internet service"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'DeviceProtection', 'Proteccion_Dispositivo',
    '{"Si": "Yes", "No": "No", "Sin_Internet": "No internet service"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'TechSupport', 'Soporte_Tecnico',
    '{"Si": "Yes", "No": "No", "Sin_Internet": "No internet service"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'StreamingTV', 'Streaming_TV',
    '{"Si": "Yes", "No": "No", "Sin_Internet": "No internet service"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'StreamingMovies', 'Streaming_Peliculas',
    '{"Si": "Yes", "No": "No", "Sin_Internet": "No internet service"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'Contract', 'Tipo_Contrato',
    '{"Mensual": "Month-to-month", "Anual": "One year", "Bianual": "Two year"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'PaperlessBilling', 'Factura_Digital',
    '{"Si": "Yes", "No": "No"}'),

('dc2f4eb0-1483-4f1e-8143-dd6ac08e8826', 'PaymentMethod', 'Metodo_Pago',
    '{"Cheque_Electronico": "Electronic check", "Cheque_Correo": "Mailed check", "Transferencia_Bancaria": "Bank transfer (automatic)", "Tarjeta_Credito": "Credit card (automatic)"}');