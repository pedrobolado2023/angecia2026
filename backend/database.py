"""
HÓSPEDE CLUB — Módulo de Banco de Dados PostgreSQL (FastAPI + psycopg / asyncpg)
Gerencia conexão segura com o PostgreSQL no Easypanel ou nuvem.
"""

import os
import re
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("hospede_club.database")

def sanitize_database_url(url: str) -> str:
    """
    Higieniza a DATABASE_URL. Se a senha contiver caracteres especiais como '@',
    codifica automaticamente para '%40' evitando que o parser quebre o hostname.
    Exemplo: postgres://user:pass@word@host:5432/db -> postgres://user:pass%40word@host:5432/db
    """
    if not url:
        return url
    
    url = url.strip()
    pattern = r'^(postgres(?:ql)?:\/\/[^:]+:)(.*)@([^@\/]+(?::\d+)?\/.*)$'
    match = re.match(pattern, url)
    if match:
        prefix = match.group(1)       # postgres://user:
        raw_password = match.group(2) # senha
        suffix = match.group(3)       # host:5432/banco
        if '@' in raw_password:
            encoded_password = raw_password.replace('@', '%40')
            return f"{prefix}{encoded_password}@{suffix}"
    return url

DATABASE_URL = sanitize_database_url(os.getenv("DATABASE_URL", ""))

def get_db_connection():
    """
    Retorna uma conexão síncrona usando psycopg se disponível e DATABASE_URL configurada.
    """
    active_url = sanitize_database_url(os.getenv("DATABASE_URL", DATABASE_URL))
    if not active_url:
        return None
    try:
        import psycopg
        conn = psycopg.connect(active_url)
        return conn
    except Exception as e:
        logger.warning(f"[PostgreSQL] Não foi possível conectar ao banco via DATABASE_URL: {e}")
        return None

def init_postgres_tables():
    """
    Garante a criação das tabelas customers e bookings no PostgreSQL
    """
    conn = get_db_connection()
    if not conn:
        return False

    init_sql = """
    CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_code VARCHAR(30) UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        full_name VARCHAR(180) NOT NULL,
        email VARCHAR(180) UNIQUE NOT NULL,
        country VARCHAR(80) NOT NULL DEFAULT 'Brasil',
        cpf VARCHAR(20),
        whatsapp VARCHAR(40) NOT NULL,
        birth_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_code VARCHAR(50) UNIQUE NOT NULL,
        voucher_code VARCHAR(50) UNIQUE NOT NULL,
        hotel_id VARCHAR(120) NOT NULL,
        hotel_name VARCHAR(200) NOT NULL,
        room_id VARCHAR(120) NOT NULL,
        room_name VARCHAR(200) NOT NULL,
        check_in DATE NOT NULL,
        nights_count INT NOT NULL DEFAULT 1,
        guests_count INT NOT NULL DEFAULT 2,
        total_charged_brl NUMERIC(10, 2) NOT NULL,
        primary_first_name VARCHAR(100) NOT NULL,
        primary_last_name VARCHAR(100) NOT NULL,
        primary_email VARCHAR(180) NOT NULL,
        primary_country VARCHAR(80) NOT NULL DEFAULT 'Brasil',
        primary_cpf VARCHAR(20) NOT NULL,
        primary_whatsapp VARCHAR(40) NOT NULL,
        primary_birth_date DATE,
        second_guest_first_name VARCHAR(100),
        second_guest_last_name VARCHAR(100),
        second_guest_cpf VARCHAR(20),
        second_guest_birth_date DATE,
        payment_method VARCHAR(20) NOT NULL,
        payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        installments INT DEFAULT 1,
        mp_payment_id VARCHAR(100),
        mp_status VARCHAR(50),
        mp_qr_code TEXT,
        mp_qr_code_base64 TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """
    try:
        with conn.cursor() as cur:
            cur.execute(init_sql)
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.warning(f"[PostgreSQL] Erro ao criar tabelas: {e}")
        try:
            conn.close()
        except Exception:
            pass
        return False

