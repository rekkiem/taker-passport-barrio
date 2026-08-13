-- Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios (Givers y Takers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rut VARCHAR(12) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(15) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) CHECK (role IN ('giver', 'taker', 'both')),
    verified BOOLEAN DEFAULT FALSE,
    verification_photo_url TEXT,
    passport_score DECIMAL(3,2) DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tareas
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    giver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    taker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(100) NOT NULL,
    budget DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('open', 'assigned', 'completed', 'confirmed', 'cancelled')),
    photos TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Postulaciones a tareas
CREATE TABLE task_applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    taker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(task_id, taker_id)
);

-- Pagos (Escrow)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'held', 'released', 'refunded')),
    webpay_token VARCHAR(100),
    webpay_response JSONB,
    held_at TIMESTAMP,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Passport (historial del Taker)
CREATE TABLE passports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_tasks INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    skills TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    earnings DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Calificaciones
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE UNIQUE,
    giver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    taker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_location ON tasks(location);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_task_applicants_task ON task_applicants(task_id);
CREATE INDEX idx_payments_task ON payments(task_id);
CREATE INDEX idx_passports_user ON passports(user_id);
CREATE INDEX idx_ratings_taker ON ratings(taker_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_passports_updated_at BEFORE UPDATE ON passports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
