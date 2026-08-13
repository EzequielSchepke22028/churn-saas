-- ============================================
-- Churn SaaS - Inicialización de base de datos
-- Multi-tenant con Row Level Security (RLS)
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
-- 2. ROL DE APLICACIÓN (no-superuser)
-- ============================================
-- Mismo patrón que el CRM: la API se conecta con app_user, nunca con
-- 'postgres'. RLS no se aplica a superusers ni al dueño de la tabla
-- salvo que se fuerce explícitamente con FORCE ROW LEVEL SECURITY.

CREATE ROLE app_user WITH LOGIN PASSWORD 'app_user_dev_pass';

GRANT CONNECT ON DATABASE churn_saas TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================
-- current_setting(..., true) es NULL-safe: si nadie seteó
-- app.current_workspace_id en la transacción, devuelve NULL en vez
-- de tirar error. NULLIF sobre '' cubre el caso de que se setee como
-- string vacío. Sin tenant_id seteado -> ninguna fila matchea ->
-- fail-safe (no se filtra nada por accidente).

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

-- 'tenants' queda sin RLS a propósito: es la tabla raíz que lista los
-- tenants en sí. La va a manejar un rol/endpoint de super-admin más
-- adelante, no app_user en contexto de un tenant específico.

-- ============================================
-- 4. TENANT DE PRUEBA (para validar hoy mismo)
-- ============================================
INSERT INTO tenants (nombre, slug, plan)
VALUES ('Tenant de Prueba', 'tenant-prueba', 'trial');