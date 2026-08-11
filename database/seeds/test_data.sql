-- Usuarios de prueba (password: 'password123' hasheado con bcrypt)
-- Hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

INSERT INTO users (rut, name, email, phone, password_hash, role, verified) VALUES
('12.345.678-9', 'Ana Gómez', 'ana@example.com', '+56912345678', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'giver', true),
('13.456.789-0', 'Carlos Díaz', 'carlos@example.com', '+56923456789', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'taker', true),
('14.567.890-1', 'María López', 'maria@example.com', '+56934567890', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'both', true),
('15.678.901-2', 'Pedro Soto', 'pedro@example.com', '+56945678901', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'giver', false),
('16.789.012-3', 'Laura Vega', 'laura@example.com', '+56956789012', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'taker', true),
('17.890.123-4', 'Diego Rojas', 'diego@example.com', '+56967890123', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'taker', false),
('18.901.234-5', 'Camila Torres', 'camila@example.com', '+56978901234', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'giver', true),
('19.012.345-6', 'Javier Muñoz', 'javier@example.com', '+56989012345', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'both', true);

-- Passports para takers
INSERT INTO passports (user_id, total_tasks, completion_rate, avg_rating, skills, earnings) VALUES
((SELECT id FROM users WHERE rut = '13.456.789-0'), 12, 92.00, 4.8, ARRAY['Jardinería', 'Pintura', 'Electricidad básica'], 485000),
((SELECT id FROM users WHERE rut = '14.567.890-1'), 8, 100.00, 5.0, ARRAY['Limpieza', 'Organización', 'Cuidado de mascotas'], 320000),
((SELECT id FROM users WHERE rut = '16.789.012-3'), 25, 88.00, 4.5, ARRAY['Plomería', 'Carpintería', 'Albañilería'], 1200000),
((SELECT id FROM users WHERE rut = '17.890.123-4'), 3, 100.00, 4.7, ARRAY['Diseño gráfico', 'Redes sociales'], 95000),
((SELECT id FROM users WHERE rut = '19.012.345-6'), 15, 93.00, 4.9, ARRAY['Fotografía', 'Video', 'Edición'], 750000);

-- Tareas de ejemplo
INSERT INTO tasks (giver_id, category, description, location, budget, status) VALUES
((SELECT id FROM users WHERE rut = '12.345.678-9'), 'Jardinería', 'Necesito podar el pasto y regar plantas en patio de 50m2. Traer herramientas.', 'Providencia', 35000, 'open'),
((SELECT id FROM users WHERE rut = '12.345.678-9'), 'Pintura', 'Pintar una habitación de 3x4 metros. Incluye techo. Yo compro la pintura.', 'Providencia', 80000, 'assigned'),
((SELECT id FROM users WHERE rut = '15.678.901-2'), 'Limpieza', 'Limpieza profunda de departamento de 2 dormitorios. Incluir ventanas.', 'Ñuñoa', 45000, 'open'),
((SELECT id FROM users WHERE rut = '18.901.234-5'), 'Electricidad', 'Instalar 3 lámparas nuevas y revisar enchufe que no funciona.', 'Ñuñoa', 55000, 'open'),
((SELECT id FROM users WHERE rut = '18.901.234-5'), 'Plomería', 'Destapar lavaplatos y revisar fuga en grifería de baño.', 'Providencia', 40000, 'completed'),
((SELECT id FROM users WHERE rut = '12.345.678-9'), 'Mudanza', 'Ayuda para bajar muebles por escalera. Sofá, cama y 3 cajas.', 'Providencia', 60000, 'open'),
((SELECT id FROM users WHERE rut = '15.678.901-2'), 'Cuidado de mascotas', 'Pasear perro golden retriever 1 hora diaria por 5 días.', 'Ñuñoa', 50000, 'open'),
((SELECT id FROM users WHERE rut = '18.901.234-5'), 'Carpintería', 'Arreglar puerta de closet que se atasca. Cambiar bisagras.', 'Ñuñoa', 30000, 'open');

-- Asignar tarea 2 al taker Carlos Díaz
UPDATE tasks SET taker_id = (SELECT id FROM users WHERE rut = '13.456.789-0') WHERE id = (SELECT id FROM tasks WHERE description LIKE '%Pintar una habitación%');

-- Asignar tarea 5 al taker Laura Vega
UPDATE tasks SET taker_id = (SELECT id FROM users WHERE rut = '16.789.012-3') WHERE id = (SELECT id FROM tasks WHERE description LIKE '%Destapar lavaplatos%');

-- Pagos de ejemplo
INSERT INTO payments (task_id, amount, status) VALUES
((SELECT id FROM tasks WHERE description LIKE '%Pintar una habitación%'), 80000, 'held'),
((SELECT id FROM tasks WHERE description LIKE '%Destapar lavaplatos%'), 40000, 'released');

-- Ratings de ejemplo
INSERT INTO ratings (task_id, giver_id, taker_id, score, comment) VALUES
((SELECT id FROM tasks WHERE description LIKE '%Destapar lavaplatos%'),
 (SELECT id FROM users WHERE rut = '18.901.234-5'),
 (SELECT id FROM users WHERE rut = '16.789.012-3'),
 5, 'Excelente trabajo, muy puntual y profesional. Recomendado 100%.');
