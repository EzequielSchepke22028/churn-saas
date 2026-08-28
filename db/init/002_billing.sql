-- ============================================
-- Churn SaaS - Módulo de Billing (Mercado Pago)
-- ============================================

-- ============================================
-- 1. TABLAS
-- ============================================

CREATE TABLE planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    precio_mensual NUMERIC(10,2) NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'ARS',
    mercadopago_plan_id VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE suscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES planes(id),
    mercadopago_subscription_id VARCHAR(255),
    estado VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (estado IN ('pending', 'authorized', 'paused', 'cancelled')),
    fecha_inicio TIMESTAMPTZ,
    fecha_proximo_pago TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pagos_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    suscripcion_id UUID REFERENCES suscripciones(id),
    mercadopago_payment_id VARCHAR(255) NOT NULL UNIQUE,
    monto NUMERIC(10,2) NOT NULL,
    moneda VARCHAR(3) NOT NULL DEFAULT 'ARS',
    estado VARCHAR(30) NOT NULL,
    raw_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para optimizar las consultas y búsquedas de webhooks
CREATE INDEX idx_suscripciones_tenant_id ON suscripciones(tenant_id);
CREATE INDEX idx_pagos_tenant_id ON pagos_historial(tenant_id);
CREATE INDEX idx_pagos_mercadopago_id ON pagos_historial(mercadopago_payment_id);

-- ============================================
-- 2. PERMISOS PARA app_user
-- ============================================
-- Otorgamos privilegios al rol limitado del backend sobre las nuevas tablas B2B
GRANT SELECT, INSERT, UPDATE, DELETE ON planes, suscripciones, pagos_historial TO app_user;

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_suscripciones ON suscripciones
    USING (tenant_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

ALTER TABLE pagos_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_historial FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_pagos ON pagos_historial
    USING (tenant_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);

-- 'planes' queda sin RLS a propósito: catálogo compartido (mismo criterio que 'tenants')

-- ============================================
-- 4. SEED: Plan único del roadmap ($20.000 ARS/mes)
-- ============================================
INSERT INTO planes (nombre, slug, precio_mensual, moneda)
VALUES ('Plan Estándar', 'plan-estandar', 20000.00, 'ARS');