-- =====================================================
-- CREACIÓN DE BASE DE DATOS
-- =====================================================

CREATE SCHEMA IF NOT EXISTS gestion_academica;
USE gestion_academica;

-- =====================================================
-- 1. TABLA ESCUELA
-- =====================================================

CREATE TABLE Escuela (
    id_escuela INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fecha_creacion DATE
);

-- =====================================================
-- 2. TABLA FACULTAD
-- =====================================================

CREATE TABLE Facultad (
    id_facultad INT AUTO_INCREMENT PRIMARY KEY,
    id_escuela INT,
    nombre VARCHAR(100) NOT NULL,
    fecha_creacion DATE,
    CONSTRAINT fk_facultad_escuela 
        FOREIGN KEY (id_escuela) 
        REFERENCES Escuela(id_escuela)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- =====================================================
-- 3. TABLA USUARIO
-- =====================================================

CREATE TABLE Usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(50)
);

-- =====================================================
-- 4. TABLA REPORTE (ACTUALIZADA)
-- =====================================================

CREATE TABLE Reporte (
    id_reporte INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50),
    id_facultad INT,
    disponible BOOLEAN DEFAULT TRUE,
    id_creador INT,
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    descripcion TEXT,
    archivo_nombre VARCHAR(255),
    fecha_creacion DATE,
    CONSTRAINT fk_reporte_facultad 
        FOREIGN KEY (id_facultad) 
        REFERENCES Facultad(id_facultad)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_reporte_usuario 
        FOREIGN KEY (id_creador) 
        REFERENCES Usuario(id_usuario)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- =====================================================
-- 5. TABLA ASIGNATURA (ACTUALIZADA)
-- =====================================================

CREATE TABLE Asignatura (
    id_asignatura INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    codigo_materia INT NULL
);

-- =====================================================
-- 6. TABLA MATERIA (ACTUALIZADA)
-- =====================================================

CREATE TABLE Materia (
    id_materia INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dia ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'),
    hora_inicio TIME,
    hora_fin TIME,
    salon VARCHAR(50),
    fecha_exacta DATE NULL
);

-- =====================================================
-- 7. TABLA CURSO
-- =====================================================

CREATE TABLE Curso (
    id_curso INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- =====================================================
-- 8. TABLA SEMESTRE
-- =====================================================

CREATE TABLE Semestre (
    id_semestre INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- =====================================================
-- 9. TABLA OPCION
-- =====================================================

CREATE TABLE Opcion (
    id_opcion INT AUTO_INCREMENT PRIMARY KEY,
    id_semestre INT NOT NULL,
    nombre VARCHAR(20) NOT NULL,
    CONSTRAINT fk_opcion_semestre 
        FOREIGN KEY (id_semestre) 
        REFERENCES Semestre(id_semestre)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =====================================================
-- 10. TABLA PUBLICACION (ACTUALIZADA)
-- =====================================================

CREATE TABLE Publicacion (
    id_publicacion INT AUTO_INCREMENT PRIMARY KEY,
    nrc VARCHAR(20) NOT NULL,
    id_facultad INT,
    id_asignatura INT,
    id_curso INT,
    id_opcion INT,
    creditos INT,
    id_reporte INT NULL,
    CONSTRAINT fk_pub_facultad 
        FOREIGN KEY (id_facultad) 
        REFERENCES Facultad(id_facultad)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_pub_asignatura 
        FOREIGN KEY (id_asignatura) 
        REFERENCES Asignatura(id_asignatura)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_pub_curso 
        FOREIGN KEY (id_curso) 
        REFERENCES Curso(id_curso)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_pub_opcion 
        FOREIGN KEY (id_opcion) 
        REFERENCES Opcion(id_opcion)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_pub_reporte 
        FOREIGN KEY (id_reporte) 
        REFERENCES Reporte(id_reporte)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- =====================================================
-- 11. TABLA INTERMEDIA PUBLICACION_MATERIA
-- =====================================================

CREATE TABLE Publicacion_Materia (
    id_publicacion INT,
    id_materia INT,
    PRIMARY KEY (id_publicacion, id_materia),
    CONSTRAINT fk_pm_pub 
        FOREIGN KEY (id_publicacion) 
        REFERENCES Publicacion(id_publicacion)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_pm_mat 
        FOREIGN KEY (id_materia) 
        REFERENCES Materia(id_materia)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- =====================================================
-- 12. TABLA PUBLICACION_BACKUP (ACTUALIZADA)
-- =====================================================

CREATE TABLE Publicacion_Backup (
    id_backup INT AUTO_INCREMENT PRIMARY KEY,
    id_publicacion_original INT,
    nrc VARCHAR(20),
    id_facultad INT,
    id_asignatura INT,
    codigo_materia INT NULL,
    id_curso INT,
    id_opcion INT,
    creditos INT,
    id_reporte INT NULL,
    fecha_respaldo DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_respaldo VARCHAR(50),
    motivo VARCHAR(255)
);
