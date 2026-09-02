"""
Endpoints de billing: iniciar una suscripcion recurrente contra
Mercado Pago (Preapproval) y persistir su estado inicial.
"""

import psycopg2.extras
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import UsuarioActual, get_current_user, requerir_roles
from app.config import FRONTEND_URL
from app.database import get_tenant_connection
from app.logging_config import logger
from app.schemas.billing import SuscribirseRequest, SuscripcionResponse, DetalleSuscripcionResponse
from app.services.billing_service import MercadoPagoError, crear_suscripcion

router = APIRouter(prefix="/billing", tags=["billing"])

ESTADOS_QUE_BLOQUEAN_NUEVA_SUSCRIPCION = ("authorized", "paused")


@router.post("/suscribirse", response_model=SuscripcionResponse)
def suscribirse(
    datos: SuscribirseRequest,
    usuario: UsuarioActual = Depends(requerir_roles("owner", "admin")),
):
    with get_tenant_connection(usuario.tenant_id) as conn:
        # 1. Traer el plan
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, nombre, precio_mensual FROM planes WHERE slug = %s AND activo = true",
                (datos.plan_slug,),
            )
            plan = cur.fetchone()

        if plan is None:
            raise HTTPException(status_code=404, detail=f"Plan '{datos.plan_slug}' no encontrado o inactivo.")

        # 2. Verificar que no haya suscripcion ya autorizada o pausada
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT estado FROM suscripciones WHERE tenant_id = %s", (usuario.tenant_id,))
            suscripcion_actual = cur.fetchone()

        if suscripcion_actual and suscripcion_actual["estado"] in ESTADOS_QUE_BLOQUEAN_NUEVA_SUSCRIPCION:
            raise HTTPException(
                status_code=409,
                detail=f"El tenant ya tiene una suscripcion en estado '{suscripcion_actual['estado']}'.",
            )

        # 3. Email del usuario logueado (payer_email para Mercado Pago)
        with conn.cursor() as cur:
            cur.execute("SELECT email FROM usuarios_tenant WHERE id = %s", (usuario.user_id,))
            fila_email = cur.fetchone()

        if fila_email is None:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")

        email_pagador = fila_email[0]

        # 4. Crear el preapproval en Mercado Pago
        try:
            respuesta_mp = crear_suscripcion(
                tenant_id=usuario.tenant_id,
                email_pagador=email_pagador,
                monto_mensual=float(plan["precio_mensual"]),
                razon=f"Churn SaaS - {plan['nombre']}",
                back_url=f"{FRONTEND_URL}/billing/confirmacion",
            )
        except MercadoPagoError as e:
            logger.error(f"ERROR Mercado Pago | tenant={usuario.tenant_id} | detalle={e}")
            raise HTTPException(status_code=502, detail="No se pudo generar el link de pago. Intenta de nuevo.")

        # 5. Guardar/actualizar la fila en 'suscripciones' (UNIQUE tenant_id -> upsert)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO suscripciones (tenant_id, plan_id, mercadopago_subscription_id, estado)
                VALUES (%s, %s, %s, 'pending')
                ON CONFLICT (tenant_id) DO UPDATE SET
                    plan_id = EXCLUDED.plan_id,
                    mercadopago_subscription_id = EXCLUDED.mercadopago_subscription_id,
                    estado = 'pending',
                    updated_at = now()
                RETURNING id, estado
                """,
                (usuario.tenant_id, plan["id"], respuesta_mp.get("id")),
            )
            fila_suscripcion = cur.fetchone()

    logger.info(
        f"SUSCRIPCION_INICIADA | tenant={usuario.tenant_id} | plan={datos.plan_slug} "
        f"| preapproval_id={respuesta_mp.get('id')}"
    )

    return SuscripcionResponse(
        suscripcion_id=str(fila_suscripcion["id"]),
        estado=fila_suscripcion["estado"],
        init_point=respuesta_mp["init_point"],
        plan_slug=datos.plan_slug,
    )

    """
Endpoints de billing: iniciar una suscripción recurrente contra Mercado Pago (Preapproval) 
y persistir su estado inicial en la base de datos multi-tenant bajo RLS.
"""

router = APIRouter(prefix="/billing", tags=["billing"])

ESTADOS_QUE_BLOQUEAN_NUEVA_SUSCRIPCION = ("authorized", "paused")

@router.get("/suscripcion", response_model=DetalleSuscripcionResponse)
def obtener_suscripcion(usuario: UsuarioActual = Depends(get_current_user)):
    """
    Obtiene la suscripción activa del tenant actual.
    Cualquier usuario autenticado del tenant (owner, admin o colaborador) puede consultar el estado.
    """
    with get_tenant_connection(usuario.tenant_id) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT s.id::text as id, s.estado, s.mercadopago_subscription_id, 
                       s.fecha_inicio::text as fecha_inicio, s.fecha_proximo_pago::text as fecha_proximo_pago,
                       p.nombre as plan_nombre, p.precio_mensual, p.moneda
                FROM suscripciones s
                JOIN planes p ON s.plan_id = p.id
                WHERE s.tenant_id = %s
                """,
                (usuario.tenant_id,)
            )
            suscripcion = cur.fetchone()
            
        if suscripcion:
            return suscripcion
        else:
            return {
                "id": None,
                "estado": "inactive",
                "mercadopago_subscription_id": None,
                "fecha_inicio": None,
                "fecha_proximo_pago": None,
                "plan_nombre": "Sin plan activo",
                "precio_mensual": 0.0,
                "moneda": "ARS"
            }

@router.post("/suscribirse", response_model=SuscripcionResponse)
def suscribirse(
    datos: SuscribirseRequest,
    usuario: UsuarioActual = Depends(requerir_roles("owner", "admin")),
):
    """
    Crea o re-crea una suscripción en Mercado Pago en estado 'pending'.
    Sólo los usuarios con rol 'owner' o 'admin' pueden suscribirse a un plan.
    """
    with get_tenant_connection(usuario.tenant_id) as conn:
        # 1. Obtener los datos del plan solicitado
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, nombre, precio_mensual FROM planes WHERE slug = %s AND activo = true",
                (datos.plan_slug,),
            )
            plan = cur.fetchone()
            
        if not plan:
            raise HTTPException(status_code=404, detail="El plan solicitado no existe o está inactivo.")
            
        # 2. Verificar el estado actual de la suscripción del tenant
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, estado FROM suscripciones WHERE tenant_id = %s",
                (usuario.tenant_id,)
            )
            suscripcion_existente = cur.fetchone()
            
        if suscripcion_existente and suscripcion_existente[1] in ESTADOS_QUE_BLOQUEAN_NUEVA_SUSCRIPCION:
            raise HTTPException(
                status_code=409, 
                detail=f"Tu workspace ya cuenta con una suscripción activa o pausada (Estado: {suscripcion_existente[1]})."
            )
            
        # 3. Disparar preapproval en Mercado Pago
        try:
            back_url = f"{FRONTEND_URL}/billing"
            razon = f"Suscripción Churn-SaaS - {plan['nombre']}"
            
            # Se requiere el correo del pagador. Lo tomamos de la sesión autenticada.
            email_pagador = usuario.email if usuario.email else "gimnasio@test.com"
            
            mp_response = crear_suscripcion(
                tenant_id=str(usuario.tenant_id),
                email_pagador=email_pagador,
                monto_mensual=float(plan["precio_mensual"]),
                razon=razon,
                back_url=back_url
            )
            
            mp_preapproval_id = mp_response.get("id")
            init_point = mp_response.get("init_point")
            
            if not mp_preapproval_id or not init_point:
                raise MercadoPagoError(500, {"message": "Respuesta incompleta de Mercado Pago"})
                
            # 4. Upsert de la suscripción local en la base de datos bajo RLS
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO suscripciones (tenant_id, plan_id, mercadopago_subscription_id, estado, fecha_inicio)
                    VALUES (%s, %s, %s, 'pending', now())
                    ON CONFLICT (tenant_id)
                    DO UPDATE SET
                        plan_id = EXCLUDED.plan_id,
                        mercadopago_subscription_id = EXCLUDED.mercadopago_subscription_id,
                        estado = 'pending',
                        updated_at = now()
                    RETURNING id::text
                    """,
                    (usuario.tenant_id, plan["id"], mp_preapproval_id)
                )
                suscripcion_id = cur.fetchone()[0]
                
            logger.info(f"Suscripción creada: ID={suscripcion_id} | MP_ID={mp_preapproval_id} | Tenant={usuario.tenant_id}")
            
            return SuscripcionResponse(
                suscripcion_id=suscripcion_id,
                estado="pending",
                init_point=init_point,
                plan_slug=datos.plan_slug
            )
            
        except MercadoPagoError as e:
            logger.error(f"Error de Mercado Pago al suscribirse: {e.respuesta}")
            raise HTTPException(
                status_code=502, 
                detail=f"Mercado Pago rechazó la operación: {e.respuesta.get('message', 'Verifica el email de prueba')}"
            )
        except Exception as e:
            logger.error(f"Error interno en proceso de billing: {e}")
            raise HTTPException(status_code=500, detail="Error interno al procesar el alta de la suscripción.")
