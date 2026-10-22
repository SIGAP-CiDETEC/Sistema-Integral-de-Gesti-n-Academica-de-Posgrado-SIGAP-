-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoPostulacion" AS ENUM ('BORRADOR', 'REGISTRO_INCOMPLETO', 'ENVIADA', 'EN_REVISION', 'OBSERVADA', 'VALIDADA', 'ENTREVISTA_PROGRAMADA', 'EN_EVALUACION', 'ESPERANDO_RESOLUCION', 'ADMITIDA', 'NO_ADMITIDA', 'CONCLUIDA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('PENDIENTE', 'APROBADO', 'OBSERVADO', 'PRORROGA');

-- CreateEnum
CREATE TYPE "EstadoFormato" AS ENUM ('BORRADOR', 'GENERADO', 'PENDIENTE_FIRMA', 'FIRMADO', 'VALIDADO', 'OBSERVADO');

-- CreateEnum
CREATE TYPE "ModalidadEvaluacion" AS ENUM ('PROPEDEUTICO', 'EXAMEN');

-- CreateEnum
CREATE TYPE "TipoResultadoEvaluacion" AS ENUM ('PROPEDEUTICO', 'EXAMEN');

-- CreateEnum
CREATE TYPE "AreaEvaluacion" AS ENUM ('MATEMATICAS', 'PROGRAMACION');

-- CreateEnum
CREATE TYPE "ResolucionEntrevista" AS ENUM ('APROBADO', 'CON_RESERVAS', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "ResolucionColegio" AS ENUM ('ACEPTADO', 'CONDICIONADO', 'NO_ACEPTADO');

-- CreateEnum
CREATE TYPE "ModalidadEntrevista" AS ENUM ('PRESENCIAL', 'EN_LINEA');

-- CreateEnum
CREATE TYPE "ModalidadCurso" AS ENUM ('PRESENCIAL', 'EN_LINEA', 'MIXTA');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO');

-- CreateEnum
CREATE TYPE "TipoNombramientoProfesor" AS ENUM ('COLEGIADO', 'ASIGNATURA');

-- CreateEnum
CREATE TYPE "DecisionSegundaOportunidad" AS ENUM ('EXAMEN', 'NO_PRESENTAR');

-- CreateEnum
CREATE TYPE "DedicacionInscripcion" AS ENUM ('TIEMPO_COMPLETO', 'TIEMPO_PARCIAL');

-- CreateEnum
CREATE TYPE "TipoRecordatorio" AS ENUM ('ENTREVISTA_UN_DIA', 'ENTREVISTA_UNA_HORA', 'EXAMEN_UNA_SEMANA', 'EXAMEN_UN_DIA', 'EXAMEN_MISMO_DIA');

-- CreateEnum
CREATE TYPE "CanalRecordatorio" AS ENUM ('CORREO', 'NOTIFICACION_SIGAP');

-- CreateEnum
CREATE TYPE "EstadoRecordatorio" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AreaPersonal" AS ENUM ('ASPIRANTES', 'PROFESORES', 'POSGRADO', 'UTEYCV', 'SUBDIRECCION', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "CanalAviso" AS ENUM ('CORREO', 'NOTIFICACION_SIGAP');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('SISTEMA', 'DOCUMENTO', 'ENTREVISTA', 'EVALUACION', 'RESULTADO', 'INSCRIPCION', 'RECORDATORIO');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'ENVIADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "Aspirante" (
    "id" TEXT NOT NULL,
    "idTemporal" TEXT,
    "nombres" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT,
    "curp" TEXT,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "sip02CompletadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aspirante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convocatoria" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "limiteArchivoMB" INTEGER NOT NULL DEFAULT 5,
    "calendarioImagenUrl" TEXT,
    "calendarioPublicadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Convocatoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "descripcion" TEXT,
    "unidadAcademicaId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadAcademica" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "institucion" TEXT NOT NULL DEFAULT 'IPN',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadAcademica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postulacion" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "aspiranteId" TEXT NOT NULL,
    "convocatoriaId" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "estado" "EstadoPostulacion" NOT NULL DEFAULT 'BORRADOR',
    "respuestasRegistro" JSONB NOT NULL DEFAULT '{}',
    "enviadaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoDocumento" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CatalogoDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoPostulacion" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "catalogoId" TEXT NOT NULL,
    "nombreArchivo" TEXT,
    "urlArchivo" TEXT,
    "tipoMime" TEXT,
    "tamanoBytes" INTEGER,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,
    "prorrogaHasta" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoPostulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionDocumento" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "revisor" TEXT NOT NULL,
    "estado" "EstadoDocumento" NOT NULL,
    "observaciones" TEXT,
    "fechaRevision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionEvaluacion" (
    "id" TEXT NOT NULL,
    "convocatoriaId" TEXT NOT NULL,
    "inicioPropedeutico" TIMESTAMP(3) NOT NULL,
    "finPropedeutico" TIMESTAMP(3) NOT NULL,
    "modalidadCurso" "ModalidadCurso" NOT NULL DEFAULT 'PRESENCIAL',
    "duracionPropedeutico" TEXT NOT NULL,
    "fechaExamen" TIMESTAMP(3) NOT NULL,
    "horaExamen" TEXT NOT NULL,
    "lugarExamen" TEXT NOT NULL,
    "calificacionMinima" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MateriaPropedeutica" (
    "id" TEXT NOT NULL,
    "configuracionId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "MateriaPropedeutica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profesor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "tipoNombramiento" "TipoNombramientoProfesor" NOT NULL,
    "vigenteHasta" TIMESTAMP(3),
    "lineaInvestigacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoPropedeutico" (
    "id" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "lugar" TEXT,
    "docenteId" TEXT,

    CONSTRAINT "GrupoPropedeutico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionGrupo" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "dia" "DiaSemana" NOT NULL,
    "inicio" TEXT NOT NULL,
    "fin" TEXT NOT NULL,

    CONSTRAINT "SesionGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EleccionEvaluacion" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "modalidad" "ModalidadEvaluacion" NOT NULL,
    "elegidaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "segundaOportunidad" "DecisionSegundaOportunidad",
    "segundaOportunidadEn" TIMESTAMP(3),
    "areasSegundaOportunidad" JSONB,

    CONSTRAINT "EleccionEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoElegido" (
    "id" TEXT NOT NULL,
    "eleccionId" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,

    CONSTRAINT "GrupoElegido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoEvaluacion" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "tipo" "TipoResultadoEvaluacion" NOT NULL,
    "calificacion" DOUBLE PRECISION,
    "acreditado" BOOLEAN,
    "registradoEn" TIMESTAMP(3),
    "publicadoEn" TIMESTAMP(3),

    CONSTRAINT "ResultadoEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalificacionArea" (
    "id" TEXT NOT NULL,
    "resultadoId" TEXT NOT NULL,
    "area" "AreaEvaluacion" NOT NULL,
    "calificacion" DOUBLE PRECISION NOT NULL,
    "acreditado" BOOLEAN NOT NULL,
    "profesorId" TEXT,
    "capturadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalificacionArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrevista" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "modalidad" "ModalidadEntrevista" NOT NULL,
    "sala" TEXT NOT NULL,
    "horarioPublicadoEn" TIMESTAMP(3),
    "publicadaAspiranteEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrevista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegranteSinodo" (
    "id" TEXT NOT NULL,
    "entrevistaId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "elegidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firmadoEn" TIMESTAMP(3),

    CONSTRAINT "IntegranteSinodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActaEntrevista" (
    "id" TEXT NOT NULL,
    "entrevistaId" TEXT NOT NULL,
    "hoja1" JSONB,
    "criterios" JSONB,
    "proyeccion" TEXT,
    "observaciones" TEXT,
    "resolucion" "ResolucionEntrevista",
    "motivo" TEXT,
    "capturadaPor" TEXT,
    "capturadaEn" TIMESTAMP(3),
    "firmadaArchivoNombre" TEXT,
    "firmadaArchivoRuta" TEXT,
    "firmadaSubidaPorId" TEXT,
    "firmadaSubidaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActaEntrevista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmaActaEntrevista" (
    "id" TEXT NOT NULL,
    "actaId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "firmadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmaActaEntrevista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroResolucionColegio" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "resolucion" "ResolucionColegio" NOT NULL,
    "fechaSesion" TIMESTAMP(3),
    "numeroSesion" TEXT,
    "registradaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicadaEn" TIMESTAMP(3),
    "registradaPor" TEXT,

    CONSTRAINT "RegistroResolucionColegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "dedicacion" "DedicacionInscripcion",
    "sip08PublicadoEn" TIMESTAMP(3),
    "fotoRecibida" BOOLEAN NOT NULL DEFAULT false,
    "sip01FirmadoEn" TIMESTAMP(3),
    "sip04FirmadoEn" TIMESTAMP(3),
    "sip05FirmadoEn" TIMESTAMP(3),
    "sip06FirmadoEn" TIMESTAMP(3),
    "sip08FirmadoEn" TIMESTAMP(3),
    "sicep" TEXT,
    "formalizadaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoFormato" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fase" TEXT NOT NULL,
    "llenaPor" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "plantillaUrl" TEXT,
    "definicion" JSONB,
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoFormato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormatoPostulacion" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "catalogoFormatoId" TEXT NOT NULL,
    "estado" "EstadoFormato" NOT NULL DEFAULT 'BORRADOR',
    "capturas" JSONB NOT NULL DEFAULT '{}',
    "urlPdfGenerado" TEXT,
    "urlPdfFirmado" TEXT,
    "observaciones" TEXT,
    "generadoEn" TIMESTAMP(3),
    "subidoEn" TIMESTAMP(3),
    "validadoEn" TIMESTAMP(3),
    "validadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormatoPostulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoInscripcion" (
    "id" TEXT NOT NULL,
    "inscripcionId" TEXT NOT NULL,
    "claveFormato" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoInscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "identificadorAcceso" TEXT,
    "hashContrasena" TEXT NOT NULL,
    "debeCambiarContrasena" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAccesoEn" TIMESTAMP(3),
    "area" "AreaPersonal" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "aspiranteId" TEXT,
    "profesorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esBase" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioRol" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "id" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "publico" BOOLEAN NOT NULL DEFAULT false,
    "areaDestinataria" "AreaPersonal",
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "iniciaEn" TIMESTAMP(3),
    "terminaEn" TIMESTAMP(3),
    "publicadoEn" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "canal" "CanalAviso" NOT NULL DEFAULT 'NOTIFICACION_SIGAP',
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "referenciaEntidad" TEXT,
    "referenciaId" TEXT,
    "enviadaEn" TIMESTAMP(3),
    "leidaEn" TIMESTAMP(3),
    "ultimoError" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comunicado" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "areaDestinataria" "AreaPersonal",
    "publico" BOOLEAN NOT NULL DEFAULT false,
    "publicadoEn" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinatarioComunicado" (
    "id" TEXT NOT NULL,
    "comunicadoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leidoEn" TIMESTAMP(3),

    CONSTRAINT "DestinatarioComunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordatorioProgramado" (
    "id" TEXT NOT NULL,
    "claveIdempotencia" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "tipo" "TipoRecordatorio" NOT NULL,
    "canal" "CanalRecordatorio" NOT NULL,
    "estado" "EstadoRecordatorio" NOT NULL DEFAULT 'PENDIENTE',
    "eventoFecha" TIMESTAMP(3) NOT NULL,
    "programadoPara" TIMESTAMP(3) NOT NULL,
    "asunto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "enviadoEn" TIMESTAMP(3),
    "ultimoError" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordatorioProgramado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoBitacora" (
    "id" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "actor" TEXT,
    "detalle" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoBitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Aspirante_idTemporal_key" ON "Aspirante"("idTemporal");

-- CreateIndex
CREATE UNIQUE INDEX "Aspirante_curp_key" ON "Aspirante"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "Aspirante_correo_key" ON "Aspirante"("correo");

-- CreateIndex
CREATE INDEX "Convocatoria_fechaInicio_fechaFin_idx" ON "Convocatoria"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE UNIQUE INDEX "Convocatoria_clave_nombre_key" ON "Convocatoria"("clave", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Programa_codigo_key" ON "Programa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadAcademica_codigo_key" ON "UnidadAcademica"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Postulacion_folio_key" ON "Postulacion"("folio");

-- CreateIndex
CREATE INDEX "Postulacion_aspiranteId_idx" ON "Postulacion"("aspiranteId");

-- CreateIndex
CREATE INDEX "Postulacion_convocatoriaId_estado_idx" ON "Postulacion"("convocatoriaId", "estado");

-- CreateIndex
CREATE INDEX "Postulacion_programaId_idx" ON "Postulacion"("programaId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoDocumento_clave_key" ON "CatalogoDocumento"("clave");

-- CreateIndex
CREATE INDEX "DocumentoPostulacion_postulacionId_estado_idx" ON "DocumentoPostulacion"("postulacionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoPostulacion_postulacionId_catalogoId_key" ON "DocumentoPostulacion"("postulacionId", "catalogoId");

-- CreateIndex
CREATE INDEX "RevisionDocumento_postulacionId_fechaRevision_idx" ON "RevisionDocumento"("postulacionId", "fechaRevision");

-- CreateIndex
CREATE INDEX "RevisionDocumento_documentoId_fechaRevision_idx" ON "RevisionDocumento"("documentoId", "fechaRevision");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionEvaluacion_convocatoriaId_key" ON "ConfiguracionEvaluacion"("convocatoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "MateriaPropedeutica_configuracionId_clave_key" ON "MateriaPropedeutica"("configuracionId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "Profesor_correo_key" ON "Profesor"("correo");

-- CreateIndex
CREATE INDEX "GrupoPropedeutico_docenteId_idx" ON "GrupoPropedeutico"("docenteId");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoPropedeutico_materiaId_clave_key" ON "GrupoPropedeutico"("materiaId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "SesionGrupo_grupoId_dia_inicio_fin_key" ON "SesionGrupo"("grupoId", "dia", "inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "EleccionEvaluacion_postulacionId_key" ON "EleccionEvaluacion"("postulacionId");

-- CreateIndex
CREATE INDEX "GrupoElegido_grupoId_idx" ON "GrupoElegido"("grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoElegido_eleccionId_materiaId_key" ON "GrupoElegido"("eleccionId", "materiaId");

-- CreateIndex
CREATE INDEX "ResultadoEvaluacion_tipo_publicadoEn_idx" ON "ResultadoEvaluacion"("tipo", "publicadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "ResultadoEvaluacion_postulacionId_tipo_key" ON "ResultadoEvaluacion"("postulacionId", "tipo");

-- CreateIndex
CREATE INDEX "CalificacionArea_profesorId_capturadaEn_idx" ON "CalificacionArea"("profesorId", "capturadaEn");

-- CreateIndex
CREATE UNIQUE INDEX "CalificacionArea_resultadoId_area_key" ON "CalificacionArea"("resultadoId", "area");

-- CreateIndex
CREATE UNIQUE INDEX "Entrevista_postulacionId_key" ON "Entrevista"("postulacionId");

-- CreateIndex
CREATE INDEX "Entrevista_fechaHora_publicadaAspiranteEn_idx" ON "Entrevista"("fechaHora", "publicadaAspiranteEn");

-- CreateIndex
CREATE INDEX "IntegranteSinodo_profesorId_firmadoEn_idx" ON "IntegranteSinodo"("profesorId", "firmadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "IntegranteSinodo_entrevistaId_profesorId_key" ON "IntegranteSinodo"("entrevistaId", "profesorId");

-- CreateIndex
CREATE UNIQUE INDEX "ActaEntrevista_entrevistaId_key" ON "ActaEntrevista"("entrevistaId");

-- CreateIndex
CREATE UNIQUE INDEX "FirmaActaEntrevista_actaId_profesorId_key" ON "FirmaActaEntrevista"("actaId", "profesorId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroResolucionColegio_postulacionId_key" ON "RegistroResolucionColegio"("postulacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_postulacionId_key" ON "Inscripcion"("postulacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_sicep_key" ON "Inscripcion"("sicep");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoFormato_clave_key" ON "CatalogoFormato"("clave");

-- CreateIndex
CREATE INDEX "FormatoPostulacion_postulacionId_estado_idx" ON "FormatoPostulacion"("postulacionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "FormatoPostulacion_postulacionId_catalogoFormatoId_key" ON "FormatoPostulacion"("postulacionId", "catalogoFormatoId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoInscripcion_inscripcionId_claveFormato_key" ON "DocumentoInscripcion"("inscripcionId", "claveFormato");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_identificadorAcceso_key" ON "Usuario"("identificadorAcceso");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_aspiranteId_key" ON "Usuario"("aspiranteId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_profesorId_key" ON "Usuario"("profesorId");

-- CreateIndex
CREATE INDEX "Usuario_area_activo_idx" ON "Usuario"("area", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_clave_key" ON "Permiso"("clave");

-- CreateIndex
CREATE INDEX "UsuarioRol_rolId_idx" ON "UsuarioRol"("rolId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioRol_usuarioId_rolId_key" ON "UsuarioRol"("usuarioId", "rolId");

-- CreateIndex
CREATE INDEX "RolPermiso_permisoId_idx" ON "RolPermiso"("permisoId");

-- CreateIndex
CREATE UNIQUE INDEX "RolPermiso_rolId_permisoId_key" ON "RolPermiso"("rolId", "permisoId");

-- CreateIndex
CREATE INDEX "Aviso_activo_iniciaEn_terminaEn_idx" ON "Aviso"("activo", "iniciaEn", "terminaEn");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_leidaEn_creadoEn_idx" ON "Notificacion"("usuarioId", "leidaEn", "creadoEn");

-- CreateIndex
CREATE INDEX "Notificacion_estado_creadoEn_idx" ON "Notificacion"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Notificacion_referenciaEntidad_referenciaId_idx" ON "Notificacion"("referenciaEntidad", "referenciaId");

-- CreateIndex
CREATE INDEX "Comunicado_publicadoEn_areaDestinataria_idx" ON "Comunicado"("publicadoEn", "areaDestinataria");

-- CreateIndex
CREATE INDEX "DestinatarioComunicado_usuarioId_leidoEn_idx" ON "DestinatarioComunicado"("usuarioId", "leidoEn");

-- CreateIndex
CREATE UNIQUE INDEX "DestinatarioComunicado_comunicadoId_usuarioId_key" ON "DestinatarioComunicado"("comunicadoId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordatorioProgramado_claveIdempotencia_key" ON "RecordatorioProgramado"("claveIdempotencia");

-- CreateIndex
CREATE INDEX "RecordatorioProgramado_estado_programadoPara_idx" ON "RecordatorioProgramado"("estado", "programadoPara");

-- CreateIndex
CREATE INDEX "RecordatorioProgramado_postulacionId_programadoPara_idx" ON "RecordatorioProgramado"("postulacionId", "programadoPara");

-- CreateIndex
CREATE UNIQUE INDEX "RecordatorioProgramado_postulacionId_tipo_canal_programadoP_key" ON "RecordatorioProgramado"("postulacionId", "tipo", "canal", "programadoPara");

-- CreateIndex
CREATE INDEX "EventoBitacora_entidad_entidadId_creadoEn_idx" ON "EventoBitacora"("entidad", "entidadId", "creadoEn");

-- AddForeignKey
ALTER TABLE "Programa" ADD CONSTRAINT "Programa_unidadAcademicaId_fkey" FOREIGN KEY ("unidadAcademicaId") REFERENCES "UnidadAcademica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_aspiranteId_fkey" FOREIGN KEY ("aspiranteId") REFERENCES "Aspirante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "Convocatoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postulacion" ADD CONSTRAINT "Postulacion_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoPostulacion" ADD CONSTRAINT "DocumentoPostulacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoPostulacion" ADD CONSTRAINT "DocumentoPostulacion_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "CatalogoDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionDocumento" ADD CONSTRAINT "RevisionDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoPostulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionDocumento" ADD CONSTRAINT "RevisionDocumento_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionEvaluacion" ADD CONSTRAINT "ConfiguracionEvaluacion_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "Convocatoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MateriaPropedeutica" ADD CONSTRAINT "MateriaPropedeutica_configuracionId_fkey" FOREIGN KEY ("configuracionId") REFERENCES "ConfiguracionEvaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoPropedeutico" ADD CONSTRAINT "GrupoPropedeutico_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "MateriaPropedeutica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoPropedeutico" ADD CONSTRAINT "GrupoPropedeutico_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Profesor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionGrupo" ADD CONSTRAINT "SesionGrupo_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoPropedeutico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EleccionEvaluacion" ADD CONSTRAINT "EleccionEvaluacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoElegido" ADD CONSTRAINT "GrupoElegido_eleccionId_fkey" FOREIGN KEY ("eleccionId") REFERENCES "EleccionEvaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoElegido" ADD CONSTRAINT "GrupoElegido_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "MateriaPropedeutica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoElegido" ADD CONSTRAINT "GrupoElegido_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoPropedeutico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoEvaluacion" ADD CONSTRAINT "ResultadoEvaluacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionArea" ADD CONSTRAINT "CalificacionArea_resultadoId_fkey" FOREIGN KEY ("resultadoId") REFERENCES "ResultadoEvaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionArea" ADD CONSTRAINT "CalificacionArea_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrevista" ADD CONSTRAINT "Entrevista_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteSinodo" ADD CONSTRAINT "IntegranteSinodo_entrevistaId_fkey" FOREIGN KEY ("entrevistaId") REFERENCES "Entrevista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteSinodo" ADD CONSTRAINT "IntegranteSinodo_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaEntrevista" ADD CONSTRAINT "ActaEntrevista_entrevistaId_fkey" FOREIGN KEY ("entrevistaId") REFERENCES "Entrevista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmaActaEntrevista" ADD CONSTRAINT "FirmaActaEntrevista_actaId_fkey" FOREIGN KEY ("actaId") REFERENCES "ActaEntrevista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmaActaEntrevista" ADD CONSTRAINT "FirmaActaEntrevista_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroResolucionColegio" ADD CONSTRAINT "RegistroResolucionColegio_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatoPostulacion" ADD CONSTRAINT "FormatoPostulacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatoPostulacion" ADD CONSTRAINT "FormatoPostulacion_catalogoFormatoId_fkey" FOREIGN KEY ("catalogoFormatoId") REFERENCES "CatalogoFormato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoInscripcion" ADD CONSTRAINT "DocumentoInscripcion_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_aspiranteId_fkey" FOREIGN KEY ("aspiranteId") REFERENCES "Aspirante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "Permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comunicado" ADD CONSTRAINT "Comunicado_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinatarioComunicado" ADD CONSTRAINT "DestinatarioComunicado_comunicadoId_fkey" FOREIGN KEY ("comunicadoId") REFERENCES "Comunicado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinatarioComunicado" ADD CONSTRAINT "DestinatarioComunicado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordatorioProgramado" ADD CONSTRAINT "RecordatorioProgramado_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

