const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// =============================
// CLIENTE DE DISCORD
// =============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

// =============================
// CONFIGURACIÓN
// =============================

const GUILD_ID = '1311766874542837871';

const POSTULACIONES_CHANNEL_ID = '1529194473072889896';
const POSTULACIONES_CATEGORY_ID = '1529220895846174730';
const REGISTRO_POSTULACIONES_CHANNEL_ID = '1529221287262818584';

const ENCARGADOS_ROLE_ID = '1529222035950014625';
const GERENCIA_ROLE_ID = '1311766874568261670';

// =============================
// CONFIGURACIÓN DE FICHAJES
// =============================

const FICHAJE_CHANNEL_ID = '1462059526978142321';
const REGISTRO_FICHAJES_CHANNEL_ID = '1529264534299214037';

const CAMARERO_ROLE_ID = '1450612244999045244';
const BAILARINA_ROLE_ID = '1450612439002382346';
const PORTERO_ROLE_ID = '1450621997586321509';
const ENCARGADO_ROLE_ID = '1529222035950014625';
const SUBJEFE_ROLE_ID = '1311766874568261671';
const JEFE_ROLE_ID = '1311766874568261672';
const GERENTE_ROLE_ID = '1311766874568261670';

const ROLES_QUE_PUEDEN_FICHAR = [
  CAMARERO_ROLE_ID,
  BAILARINA_ROLE_ID,
  PORTERO_ROLE_ID,
  ENCARGADO_ROLE_ID,
  SUBJEFE_ROLE_ID,
  JEFE_ROLE_ID,
  GERENTE_ROLE_ID
];

const ROLES_ADMIN_HORAS = [
  SUBJEFE_ROLE_ID,
  JEFE_ROLE_ID,
  GERENTE_ROLE_ID
];

const ZONA_HORARIA = 'Europe/Madrid';

// =============================
// CONFIGURACIÓN DE SUPABASE
// =============================

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (
  supabaseUrl &&
  supabaseServiceRoleKey
) {
  supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },

      realtime: {
        transport: WebSocket
      }
    }
  );

  console.log(
    '✅ Supabase configurado correctamente.'
  );
} else {
  console.warn(
    '⚠️ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. El sistema de fichajes no funcionará hasta configurarlas.'
  );
}

// =============================
// COMANDOS
// =============================

const commands = [
  new SlashCommandBuilder()
    .setName('panel-postulaciones')
    .setDescription('Publica el panel de postulaciones de Tequilala'),

  new SlashCommandBuilder()
    .setName('panel-fichaje')
    .setDescription('Publica el panel de control de horas'),

  new SlashCommandBuilder()
    .setName('anadir-horas')
    .setDescription('Añade horas manualmente a un trabajador')
    .addUserOption((opcion) =>
      opcion
        .setName('usuario')
        .setDescription('Trabajador al que se añadirán las horas')
        .setRequired(true)
    )
    .addIntegerOption((opcion) =>
      opcion
        .setName('horas')
        .setDescription('Cantidad de horas (0 o más)')
        .setMinValue(0)
        .setMaxValue(500)
        .setRequired(true)
    )
    .addIntegerOption((opcion) =>
      opcion
        .setName('minutos')
        .setDescription('Minutos adicionales (0-59)')
        .setMinValue(0)
        .setMaxValue(59)
        .setRequired(true)
    )
    .addStringOption((opcion) =>
      opcion
        .setName('motivo')
        .setDescription('Motivo del ajuste')
        .setMinLength(3)
        .setMaxLength(500)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('quitar-horas')
    .setDescription('Quita horas manualmente a un trabajador')
    .addUserOption((opcion) =>
      opcion
        .setName('usuario')
        .setDescription('Trabajador al que se quitarán las horas')
        .setRequired(true)
    )
    .addIntegerOption((opcion) =>
      opcion
        .setName('horas')
        .setDescription('Cantidad de horas (0 o más)')
        .setMinValue(0)
        .setMaxValue(500)
        .setRequired(true)
    )
    .addIntegerOption((opcion) =>
      opcion
        .setName('minutos')
        .setDescription('Minutos adicionales (0-59)')
        .setMinValue(0)
        .setMaxValue(59)
        .setRequired(true)
    )
    .addStringOption((opcion) =>
      opcion
        .setName('motivo')
        .setDescription('Motivo del ajuste')
        .setMinLength(3)
        .setMaxLength(500)
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('horas-empleado')
    .setDescription('Consulta las horas de un trabajador')
    .addUserOption((opcion) =>
      opcion
        .setName('usuario')
        .setDescription('Trabajador que quieres consultar')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('ranking-horas')
    .setDescription('Muestra el ranking semanal de horas'),

  new SlashCommandBuilder()
    .setName('personal-activo')
    .setDescription('Muestra quién está actualmente de servicio')
].map((comando) => comando.toJSON());

// =============================
// FUNCIONES AUXILIARES
// =============================

function esPersonalAutorizado(interaction) {
  if (!interaction.member) return false;

  const esEncargado = interaction.member.roles.cache.has(
    ENCARGADOS_ROLE_ID
  );

  const esGerencia = interaction.member.roles.cache.has(
    GERENCIA_ROLE_ID
  );

  const esAdministrador = interaction.member.permissions.has(
    PermissionFlagsBits.Administrator
  );

  return esEncargado || esGerencia || esAdministrador;
}

function tieneAlgunRol(member, roles) {
  return Boolean(
    member?.roles?.cache &&
    roles.some((rolId) => member.roles.cache.has(rolId))
  );
}

function puedeFichar(member) {
  return (
    tieneAlgunRol(member, ROLES_QUE_PUEDEN_FICHAR) ||
    member?.permissions?.has(PermissionFlagsBits.Administrator)
  );
}

function puedeGestionarHoras(member) {
  return (
    tieneAlgunRol(member, ROLES_ADMIN_HORAS) ||
    member?.permissions?.has(PermissionFlagsBits.Administrator)
  );
}

function comprobarSupabase() {
  return supabase !== null;
}

function formatearMinutos(minutos) {
  const valor = Math.max(0, Math.round(Number(minutos) || 0));
  const horas = Math.floor(valor / 60);
  const resto = valor % 60;

  return `${horas}h ${resto.toString().padStart(2, '0')}m`;
}

function formatearAjuste(minutos) {
  const numero = Math.round(Number(minutos) || 0);
  const signo = numero > 0 ? '+' : numero < 0 ? '-' : '';

  return `${signo}${formatearMinutos(Math.abs(numero))}`;
}

function obtenerPartesZona(fecha, zona = ZONA_HORARIA) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(fecha);

  const resultado = {};

  for (const parte of partes) {
    if (parte.type !== 'literal') {
      resultado[parte.type] = Number(parte.value);
    }
  }

  return resultado;
}

function fechaLocalAUtc({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0
}) {
  let estimacion = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );

  for (let intento = 0; intento < 3; intento += 1) {
    const local = obtenerPartesZona(
      new Date(estimacion)
    );

    const representacionLocal = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second
    );

    const deseado = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    );

    estimacion += deseado - representacionLocal;
  }

  return new Date(estimacion);
}

function sumarDiasCalendario(partes, dias) {
  const fecha = new Date(
    Date.UTC(
      partes.year,
      partes.month - 1,
      partes.day + dias
    )
  );

  return {
    year: fecha.getUTCFullYear(),
    month: fecha.getUTCMonth() + 1,
    day: fecha.getUTCDate()
  };
}

function inicioSemanaMadrid(fecha = new Date()) {
  const partes = obtenerPartesZona(fecha);

  const fechaCalendario = new Date(
    Date.UTC(
      partes.year,
      partes.month - 1,
      partes.day
    )
  );

  const diaSemana = fechaCalendario.getUTCDay();
  const diasDesdeLunes = (diaSemana + 6) % 7;

  const lunes = sumarDiasCalendario(
    partes,
    -diasDesdeLunes
  );

  return fechaLocalAUtc(lunes);
}

function inicioMesMadrid(fecha = new Date()) {
  const partes = obtenerPartesZona(fecha);

  return fechaLocalAUtc({
    year: partes.year,
    month: partes.month,
    day: 1
  });
}

function formatearFechaHora(fecha) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: ZONA_HORARIA,
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(fecha));
}

function minutosSolapados(
  entrada,
  salida,
  inicio,
  fin
) {
  const desde = Math.max(
    new Date(entrada).getTime(),
    inicio.getTime()
  );

  const hasta = Math.min(
    salida
      ? new Date(salida).getTime()
      : Date.now(),
    fin.getTime()
  );

  return Math.max(
    0,
    Math.floor((hasta - desde) / 60000)
  );
}

async function obtenerTurnoActivo(usuarioId) {
  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('discord_user_id', usuarioId)
    .is('salida', null)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function obtenerTurnosSolapados(
  usuarioId,
  inicio,
  fin
) {
  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('discord_user_id', usuarioId)
    .lt('entrada', fin.toISOString())
    .or(
      `salida.is.null,salida.gt.${inicio.toISOString()}`
    )
    .order('entrada', {
      ascending: true
    });

  if (error) throw error;

  return data || [];
}

async function obtenerAjustesPeriodo(
  usuarioId,
  inicio = null,
  fin = null
) {
  let consulta = supabase
    .from('ajustes_horas')
    .select('*')
    .eq('discord_user_id', usuarioId);

  if (inicio) {
    consulta = consulta.gte(
      'creado_en',
      inicio.toISOString()
    );
  }

  if (fin) {
    consulta = consulta.lt(
      'creado_en',
      fin.toISOString()
    );
  }

  const { data, error } = await consulta.order(
    'creado_en',
    {
      ascending: true
    }
  );

  if (error) throw error;

  return data || [];
}

async function calcularPeriodo(
  usuarioId,
  inicio,
  fin
) {
  const [turnos, ajustes] = await Promise.all([
    obtenerTurnosSolapados(
      usuarioId,
      inicio,
      fin
    ),
    obtenerAjustesPeriodo(
      usuarioId,
      inicio,
      fin
    )
  ]);

  const minutosTurnos = turnos.reduce(
    (total, turno) =>
      total +
      minutosSolapados(
        turno.entrada,
        turno.salida,
        inicio,
        fin
      ),
    0
  );

  const minutosAjustes = ajustes.reduce(
    (total, ajuste) =>
      total + Number(ajuste.minutos || 0),
    0
  );

  return {
    turnos,
    ajustes,
    minutosTurnos,
    minutosAjustes,
    total: Math.max(
      0,
      minutosTurnos + minutosAjustes
    )
  };
}

async function calcularHorasUsuario(usuarioId) {
  const ahora = new Date();
  const inicioSemana = inicioSemanaMadrid(ahora);
  const inicioMes = inicioMesMadrid(ahora);
  const origen = new Date(
    '2000-01-01T00:00:00.000Z'
  );

  const [
    semana,
    mes,
    total,
    turnoActivo
  ] = await Promise.all([
    calcularPeriodo(
      usuarioId,
      inicioSemana,
      ahora
    ),
    calcularPeriodo(
      usuarioId,
      inicioMes,
      ahora
    ),
    calcularPeriodo(
      usuarioId,
      origen,
      ahora
    ),
    obtenerTurnoActivo(usuarioId)
  ]);

  return {
    semana,
    mes,
    total,
    turnoActivo
  };
}

async function enviarRegistroFichaje({
  guild,
  titulo,
  color,
  usuario,
  responsable,
  campos = []
}) {
  const canal = await guild.channels
    .fetch(REGISTRO_FICHAJES_CHANNEL_ID)
    .catch(() => null);

  if (!canal?.isTextBased()) {
    console.error(
      'No se ha encontrado el canal de registro de fichajes.'
    );

    return;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(titulo)
    .addFields(
      {
        name: '👤 Empleado',
        value: usuario
          ? `<@${usuario.id}>\n\`${usuario.id}\``
          : 'No disponible',
        inline: true
      },
      {
        name: '🛡️ Responsable',
        value: responsable
          ? `<@${responsable.id}>`
          : 'Sistema',
        inline: true
      },
      ...campos
    )
    .setTimestamp()
    .setFooter({
      text:
        'Tequilala Manager • Control de horas'
    });

  await canal.send({
    embeds: [embed]
  });
}

function crearEmbedHoras(usuario, datos) {
  const activo = datos.turnoActivo;

  const duracionActual = activo
    ? Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            new Date(activo.entrada).getTime()
          ) / 60000
        )
      )
    : 0;

  return new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle(
      `⏱️ Horas de ${usuario.username}`
    )
    .setDescription(
      activo
        ? `🟢 **Turno activo** desde ${formatearFechaHora(
            activo.entrada
          )} (${formatearMinutos(
            duracionActual
          )})`
        : '🔴 **No tiene un turno activo.**'
    )
    .addFields(
      {
        name: 'Esta semana',
        value: [
          `Fichadas: **${formatearMinutos(
            datos.semana.minutosTurnos
          )}**`,
          `Ajustes: **${formatearAjuste(
            datos.semana.minutosAjustes
          )}**`,
          `Total: **${formatearMinutos(
            datos.semana.total
          )}**`
        ].join('\n'),
        inline: true
      },
      {
        name: 'Este mes',
        value: [
          `Fichadas: **${formatearMinutos(
            datos.mes.minutosTurnos
          )}**`,
          `Ajustes: **${formatearAjuste(
            datos.mes.minutosAjustes
          )}**`,
          `Total: **${formatearMinutos(
            datos.mes.total
          )}**`
        ].join('\n'),
        inline: true
      },
      {
        name: 'Total acumulado',
        value: [
          `Fichadas: **${formatearMinutos(
            datos.total.minutosTurnos
          )}**`,
          `Ajustes: **${formatearAjuste(
            datos.total.minutosAjustes
          )}**`,
          `Total: **${formatearMinutos(
            datos.total.total
          )}**`
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({
      text:
        'Semana calculada desde el lunes 00:00 • Europe/Madrid'
    })
    .setTimestamp();
}

async function crearEmbedHorasDiarias(
  usuarioId,
  usuario
) {
  const inicioSemana =
    inicioSemanaMadrid();

  const nombres = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo'
  ];

  const lineas = [];
  let totalTurnos = 0;

  for (let i = 0; i < 7; i += 1) {
    const partesInicio =
      obtenerPartesZona(inicioSemana);

    const fechaDia =
      sumarDiasCalendario(
        partesInicio,
        i
      );

    const inicio =
      fechaLocalAUtc(fechaDia);

    const fechaSiguiente =
      sumarDiasCalendario(
        fechaDia,
        1
      );

    const fin =
      fechaLocalAUtc(fechaSiguiente);

    const limiteFin = new Date(
      Math.min(
        fin.getTime(),
        Date.now()
      )
    );

    if (inicio.getTime() > Date.now()) {
      lineas.push(
        `**${nombres[i]}:** —`
      );

      continue;
    }

    const turnos =
      await obtenerTurnosSolapados(
        usuarioId,
        inicio,
        limiteFin
      );

    const minutos = turnos.reduce(
      (total, turno) =>
        total +
        minutosSolapados(
          turno.entrada,
          turno.salida,
          inicio,
          limiteFin
        ),
      0
    );

    totalTurnos += minutos;

    lineas.push(
      `**${nombres[i]}:** ${
        minutos
          ? formatearMinutos(minutos)
          : '—'
      }`
    );
  }

  const ajustes =
    await obtenerAjustesPeriodo(
      usuarioId,
      inicioSemana,
      new Date()
    );

  const totalAjustes = ajustes.reduce(
    (suma, ajuste) =>
      suma +
      Number(ajuste.minutos || 0),
    0
  );

  return new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle(
      `📅 Semana de ${usuario.username}`
    )
    .setDescription(
      lineas.join('\n')
    )
    .addFields(
      {
        name: 'Horas fichadas',
        value:
          formatearMinutos(totalTurnos),
        inline: true
      },
      {
        name: 'Ajustes',
        value:
          formatearAjuste(totalAjustes),
        inline: true
      },
      {
        name: 'Total semanal',
        value: formatearMinutos(
          Math.max(
            0,
            totalTurnos + totalAjustes
          )
        ),
        inline: false
      }
    )
    .setFooter({
      text:
        'Los ajustes se muestran en el total, no en un día concreto.'
    })
    .setTimestamp();
}

function obtenerPuesto(codigoPuesto) {
  const puestos = {
    camarero: 'Camarero/a',
    portero: 'Portero/a',
    bailarin: 'Bailarín/a'
  };

  return puestos[codigoPuesto] || null;
}

function obtenerCodigoPuesto(customId) {
  const puestos = {
    postulacion_camarero:
      'camarero',
    postulacion_portero:
      'portero',
    postulacion_bailarin:
      'bailarin'
  };

  return puestos[customId] || null;
}

function limpiarNombreCanal(nombre) {
  let nombreLimpio = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .replace(
      /[^a-z0-9]/g,
      '-'
    )
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

  if (!nombreLimpio) {
    nombreLimpio = 'usuario';
  }

  return nombreLimpio;
}

function obtenerDatosTema(canal) {
  if (!canal?.topic) return null;

  const coincidenciaUsuario =
    canal.topic.match(
      /postulante:(\d+)/
    );

  const coincidenciaPuesto =
    canal.topic.match(
      /puesto:([a-z]+)/
    );

  if (!coincidenciaUsuario) {
    return null;
  }

  return {
    usuarioId:
      coincidenciaUsuario[1],

    codigoPuesto:
      coincidenciaPuesto
        ? coincidenciaPuesto[1]
        : null
  };
}

async function buscarTicketAbierto(
  guild,
  usuarioId
) {
  const canalesServidor =
    await guild.channels.fetch();

  return canalesServidor.find(
    (canal) => {
      if (!canal) return false;

      const datosTema =
        obtenerDatosTema(canal);

      return (
        canal.type ===
          ChannelType.GuildText &&
        canal.parentId ===
          POSTULACIONES_CATEGORY_ID &&
        datosTema?.usuarioId ===
          usuarioId
      );
    }
  );
}

async function buscarMensajeFormulario(
  canal
) {
  const mensajes =
    await canal.messages.fetch({
      limit: 100
    });

  return mensajes.find(
    (mensaje) => {
      if (
        mensaje.author.id !==
        client.user.id
      ) {
        return false;
      }

      const titulo =
        mensaje.embeds[0]?.title;

      return (
        titulo ===
          '📝 Formulario de postulación en curso' ||
        titulo ===
          '📋 Nueva postulación' ||
        titulo ===
          '✅ Postulación aceptada' ||
        titulo ===
          '❌ Postulación rechazada'
      );
    }
  );
}

async function enviarRegistro({
  guild,
  titulo,
  color,
  usuarioId,
  puesto,
  responsable,
  canal,
  motivo
}) {
  const canalRegistro =
    await guild.channels
      .fetch(
        REGISTRO_POSTULACIONES_CHANNEL_ID
      )
      .catch(() => null);

  if (
    !canalRegistro ||
    !canalRegistro.isTextBased()
  ) {
    console.error(
      'No se ha encontrado el canal de registro de postulaciones.'
    );

    return;
  }

  const embedRegistro =
    new EmbedBuilder()
      .setColor(color)
      .setTitle(titulo)
      .addFields(
        {
          name: '👤 Postulante',
          value: `<@${usuarioId}>`,
          inline: true
        },
        {
          name: '🍹 Puesto',
          value:
            puesto ||
            'No especificado',
          inline: true
        },
        {
          name: '🛡️ Responsable',
          value: responsable
            ? `${responsable}`
            : 'Sistema',
          inline: true
        },
        {
          name: '📁 Canal',
          value: canal
            ? `${canal.name} (${canal.id})`
            : 'No disponible',
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({
        text: 'Tequilala Manager'
      });

  if (motivo) {
    embedRegistro.addFields({
      name: '📝 Información',
      value: motivo.slice(
        0,
        1024
      ),
      inline: false
    });
  }

  await canalRegistro.send({
    embeds: [embedRegistro]
  });
}
// =============================
// INICIO DEL BOT
// =============================

client.once(
  Events.ClientReady,
  async (readyClient) => {
    console.log(
      `✅ Bot conectado como ${readyClient.user.tag}`
    );

    try {
      const rest = new REST({
        version: '10'
      }).setToken(
        process.env.DISCORD_TOKEN
      );

      await rest.put(
        Routes.applicationGuildCommands(
          readyClient.user.id,
          GUILD_ID
        ),
        {
          body: commands
        }
      );

      console.log(
        '✅ Comandos registrados correctamente.'
      );
    } catch (error) {
      console.error(
        '❌ Error registrando los comandos:',
        error
      );
    }
  }
);

// =============================
// INTERACCIONES
// =============================

client.on(
  Events.InteractionCreate,
  async (interaction) => {
    try {
      // =====================================
      // COMANDO /panel-fichaje
      // =====================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          'panel-fichaje'
      ) {
        if (
          !puedeGestionarHoras(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ Solo Jefe, Subjefe, Gerente o Administradores pueden publicar el panel.',
            ephemeral: true
          });
        }

        const canal =
          await interaction.guild.channels
            .fetch(FICHAJE_CHANNEL_ID)
            .catch(() => null);

        if (
          !canal ||
          !canal.isTextBased()
        ) {
          return interaction.reply({
            content:
              '❌ No se ha encontrado el canal de fichaje.',
            ephemeral: true
          });
        }

        const embed =
          new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle(
              '⏱️ Control de horas de Tequilala'
            )
            .setDescription(
              [
                'Utiliza los botones de este panel para gestionar tu jornada.',
                '',
                '🟢 **Iniciar turno**',
                'Registra el comienzo de tu jornada.',
                '',
                '🔴 **Finalizar turno**',
                'Registra la finalización de tu jornada.',
                '',
                '📊 **Ver mis horas**',
                'Consulta tus horas semanales, mensuales y totales.',
                '',
                '📅 **Horas por día**',
                'Consulta el desglose de la semana actual.',
                '',
                '⚠️ No olvides finalizar tu turno cuando termines.'
              ].join('\n')
            )
            .setFooter({
              text:
                'Tequilala Manager • Europe/Madrid'
            })
            .setTimestamp();

        const filaBotones =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  'fichaje_iniciar'
                )
                .setLabel(
                  'Iniciar turno'
                )
                .setEmoji('🟢')
                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()
                .setCustomId(
                  'fichaje_finalizar'
                )
                .setLabel(
                  'Finalizar turno'
                )
                .setEmoji('🔴')
                .setStyle(
                  ButtonStyle.Danger
                ),

              new ButtonBuilder()
                .setCustomId(
                  'fichaje_mis_horas'
                )
                .setLabel(
                  'Ver mis horas'
                )
                .setEmoji('📊')
                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()
                .setCustomId(
                  'fichaje_horas_dia'
                )
                .setLabel(
                  'Horas por día'
                )
                .setEmoji('📅')
                .setStyle(
                  ButtonStyle.Secondary
                )
            );

        const mensajes =
          await canal.messages.fetch({
            limit: 100
          });

        const panelesAnteriores =
          mensajes.filter(
            (mensaje) => {
              return (
                mensaje.author.id ===
                  client.user.id &&
                mensaje.embeds[0]
                  ?.title ===
                  '⏱️ Control de horas de Tequilala'
              );
            }
          );

        for (
          const mensaje
          of panelesAnteriores.values()
        ) {
          await mensaje
            .delete()
            .catch(() => null);
        }

        await canal.send({
          embeds: [embed],
          components: [filaBotones]
        });

        return interaction.reply({
          content:
            `✅ Panel de fichaje publicado correctamente en <#${FICHAJE_CHANNEL_ID}>.`,
          ephemeral: true
        });
      }

      // =====================================
      // BOTÓN INICIAR TURNO
      // =====================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'fichaje_iniciar'
      ) {
        if (
          !puedeFichar(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ No tienes un rol autorizado para fichar.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente en Railway.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const turnoActivo =
          await obtenerTurnoActivo(
            interaction.user.id
          );

        if (turnoActivo) {
          return interaction.editReply({
            content:
              `❌ Ya tienes un turno activo desde **${formatearFechaHora(
                turnoActivo.entrada
              )}**.`
          });
        }

        const ahora = new Date();

        const {
          error
        } = await supabase
          .from('turnos')
          .insert({
            discord_user_id:
              interaction.user.id,

            discord_username:
              interaction.user.username,

            entrada:
              ahora.toISOString()
          });

        if (error) {
          if (
            error.code === '23505'
          ) {
            return interaction.editReply({
              content:
                '❌ Ya tienes un turno activo.'
            });
          }

          throw error;
        }

        await enviarRegistroFichaje({
          guild:
            interaction.guild,

          titulo:
            '🟢 Turno iniciado',

          color:
            0x2ECC71,

          usuario:
            interaction.user,

          responsable:
            interaction.user,

          campos: [
            {
              name:
                '🕒 Hora de entrada',
              value:
                formatearFechaHora(
                  ahora
                ),
              inline: false
            }
          ]
        });

        return interaction.editReply({
          content:
            `🟢 Turno iniciado correctamente a las **${formatearFechaHora(
              ahora
            )}**.`
        });
      }

      // =====================================
      // BOTÓN FINALIZAR TURNO
      // =====================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'fichaje_finalizar'
      ) {
        if (
          !puedeFichar(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ No tienes un rol autorizado para fichar.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente en Railway.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const turnoActivo =
          await obtenerTurnoActivo(
            interaction.user.id
          );

        if (!turnoActivo) {
          return interaction.editReply({
            content:
              '❌ No tienes ningún turno activo.'
          });
        }

        const salida = new Date();

        const minutosTrabajados =
          Math.max(
            0,
            Math.floor(
              (
                salida.getTime() -
                new Date(
                  turnoActivo.entrada
                ).getTime()
              ) / 60000
            )
          );

        const {
          data: turnoCerrado,
          error
        } = await supabase
          .from('turnos')
          .update({
            salida:
              salida.toISOString(),

            minutos_trabajados:
              minutosTrabajados
          })
          .eq(
            'id',
            turnoActivo.id
          )
          .is(
            'salida',
            null
          )
          .select()
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!turnoCerrado) {
          return interaction.editReply({
            content:
              '❌ El turno ya había sido finalizado o no se pudo actualizar.'
          });
        }

        await enviarRegistroFichaje({
          guild:
            interaction.guild,

          titulo:
            '🔴 Turno finalizado',

          color:
            0xE74C3C,

          usuario:
            interaction.user,

          responsable:
            interaction.user,

          campos: [
            {
              name:
                '🕒 Entrada',
              value:
                formatearFechaHora(
                  turnoActivo.entrada
                ),
              inline: true
            },
            {
              name:
                '🕒 Salida',
              value:
                formatearFechaHora(
                  salida
                ),
              inline: true
            },
            {
              name:
                '⏱️ Duración',
              value:
                formatearMinutos(
                  minutosTrabajados
                ),
              inline: false
            }
          ]
        });

        return interaction.editReply({
          content:
            [
              '🔴 Turno finalizado correctamente.',
              '',
              `⏱️ Tiempo trabajado: **${formatearMinutos(
                minutosTrabajados
              )}**`
            ].join('\n')
        });
      }

      // =====================================
      // BOTÓN VER MIS HORAS
      // =====================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'fichaje_mis_horas'
      ) {
        if (
          !puedeFichar(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ No tienes un rol autorizado para consultar horas.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const datos =
          await calcularHorasUsuario(
            interaction.user.id
          );

        const embed =
          crearEmbedHoras(
            interaction.user,
            datos
          );

        return interaction.editReply({
          embeds: [embed]
        });
      }

      // =====================================
      // BOTÓN HORAS POR DÍA
      // =====================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'fichaje_horas_dia'
      ) {
        if (
          !puedeFichar(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ No tienes un rol autorizado para consultar horas.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const embed =
          await crearEmbedHorasDiarias(
            interaction.user.id,
            interaction.user
          );

        return interaction.editReply({
          embeds: [embed]
        });
      }

      // =====================================
      // COMANDO /anadir-horas
      // =====================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          'anadir-horas'
      ) {
        if (
          !puedeGestionarHoras(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ Solo Jefe, Subjefe, Gerente o Administradores pueden añadir horas.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const usuario =
          interaction.options.getUser(
            'usuario',
            true
          );

        const horas =
          interaction.options.getInteger(
            'horas',
            true
          );

        const minutos =
          interaction.options.getInteger(
            'minutos',
            true
          );

        const motivo =
          interaction.options.getString(
            'motivo',
            true
          );

        const totalMinutos =
          horas * 60 + minutos;

        if (totalMinutos <= 0) {
          return interaction.editReply({
            content:
              '❌ Debes añadir al menos un minuto.'
          });
        }

        const {
          error
        } = await supabase
          .from('ajustes_horas')
          .insert({
            discord_user_id:
              usuario.id,

            discord_username:
              usuario.username,

            minutos:
              totalMinutos,

            motivo,

            responsable_id:
              interaction.user.id,

            responsable_nombre:
              interaction.user.username
          });

        if (error) {
          throw error;
        }

        await enviarRegistroFichaje({
          guild:
            interaction.guild,

          titulo:
            '➕ Horas añadidas',

          color:
            0x2ECC71,

          usuario,

          responsable:
            interaction.user,

          campos: [
            {
              name:
                '⏱️ Cantidad',
              value:
                `+${formatearMinutos(
                  totalMinutos
                )}`,
              inline: true
            },
            {
              name:
                '📝 Motivo',
              value:
                motivo.slice(
                  0,
                  1024
                ),
              inline: false
            }
          ]
        });

        return interaction.editReply({
          content:
            `✅ Se han añadido **${formatearMinutos(
              totalMinutos
            )}** a ${usuario}.`
        });
      }

      // =====================================
      // COMANDO /quitar-horas
      // =====================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          'quitar-horas'
      ) {
        if (
          !puedeGestionarHoras(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ Solo Jefe, Subjefe, Gerente o Administradores pueden quitar horas.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const usuario =
          interaction.options.getUser(
            'usuario',
            true
          );

        const horas =
          interaction.options.getInteger(
            'horas',
            true
          );

        const minutos =
          interaction.options.getInteger(
            'minutos',
            true
          );

        const motivo =
          interaction.options.getString(
            'motivo',
            true
          );

        const totalMinutos =
          horas * 60 + minutos;

        if (totalMinutos <= 0) {
          return interaction.editReply({
            content:
              '❌ Debes retirar al menos un minuto.'
          });
        }

        const datosActuales =
          await calcularHorasUsuario(
            usuario.id
          );

        if (
          totalMinutos >
          datosActuales.total.total
        ) {
          return interaction.editReply({
            content:
              [
                '❌ No puedes retirar más horas de las que tiene acumuladas.',
                '',
                `Horas disponibles: **${formatearMinutos(
                  datosActuales.total.total
                )}**`
              ].join('\n')
          });
        }

        const {
          error
        } = await supabase
          .from('ajustes_horas')
          .insert({
            discord_user_id:
              usuario.id,

            discord_username:
              usuario.username,

            minutos:
              -totalMinutos,

            motivo,

            responsable_id:
              interaction.user.id,

            responsable_nombre:
              interaction.user.username
          });

        if (error) {
          throw error;
        }

        await enviarRegistroFichaje({
          guild:
            interaction.guild,

          titulo:
            '➖ Horas retiradas',

          color:
            0xE74C3C,

          usuario,

          responsable:
            interaction.user,

          campos: [
            {
              name:
                '⏱️ Cantidad',
              value:
                `-${formatearMinutos(
                  totalMinutos
                )}`,
              inline: true
            },
            {
              name:
                '📝 Motivo',
              value:
                motivo.slice(
                  0,
                  1024
                ),
              inline: false
            }
          ]
        });

        return interaction.editReply({
          content:
            `✅ Se han retirado **${formatearMinutos(
              totalMinutos
            )}** a ${usuario}.`
        });
      }

      // =====================================
      // COMANDO /horas-empleado
      // =====================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          'horas-empleado'
      ) {
        if (
          !puedeGestionarHoras(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ Solo Jefe, Subjefe, Gerente o Administradores pueden consultar las horas de otros empleados.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const usuario =
          interaction.options.getUser(
            'usuario',
            true
          );

        const datos =
          await calcularHorasUsuario(
            usuario.id
          );

        const embed =
          crearEmbedHoras(
            usuario,
            datos
          );

        return interaction.editReply({
          embeds: [embed]
        });
      }

      // =====================================
      // COMANDO /personal-activo
      // =====================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          'personal-activo'
      ) {
        if (
          !puedeGestionarHoras(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ Solo Jefe, Subjefe, Gerente o Administradores pueden consultar el personal activo.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const {
          data: turnos,
          error
        } = await supabase
          .from('turnos')
          .select('*')
          .is(
            'salida',
            null
          )
          .order(
            'entrada',
            {
              ascending: true
            }
          );

        if (error) {
          throw error;
        }

        if (
          !turnos ||
          turnos.length === 0
        ) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95A5A6)
                .setTitle(
                  '👥 Personal activo'
                )
                .setDescription(
                  '🔴 No hay ningún empleado de servicio actualmente.'
                )
                .setTimestamp()
            ]
          });
        }

        const lineas =
          turnos.map(
            (turno) => {
              const duracion =
                Math.max(
                  0,
                  Math.floor(
                    (
                      Date.now() -
                      new Date(
                        turno.entrada
                      ).getTime()
                    ) / 60000
                  )
                );

              return [
                `🟢 <@${turno.discord_user_id}>`,
                `└ Desde: ${formatearFechaHora(
                  turno.entrada
                )}`,
                `└ Duración: ${formatearMinutos(
                  duracion
                )}`
              ].join('\n');
            }
          );

        const embed =
          new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(
              '👥 Personal activo'
            )
            .setDescription(
              lineas.join('\n\n')
            )
            .setFooter({
              text:
                `${turnos.length} empleado(s) de servicio`
            })
            .setTimestamp();

        return interaction.editReply({
          embeds: [embed]
        });
      }

      // =====================================
      // COMANDO /ranking-horas
      // =====================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          'ranking-horas'
      ) {
        if (
          !puedeGestionarHoras(
            interaction.member
          )
        ) {
          return interaction.reply({
            content:
              '❌ Solo Jefe, Subjefe, Gerente o Administradores pueden consultar el ranking.',
            ephemeral: true
          });
        }

        if (!comprobarSupabase()) {
          return interaction.reply({
            content:
              '❌ Supabase no está configurado correctamente.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const inicioSemana =
          inicioSemanaMadrid();

        const ahora =
          new Date();

        const {
          data: turnos,
          error: errorTurnos
        } = await supabase
          .from('turnos')
          .select('*')
          .lt(
            'entrada',
            ahora.toISOString()
          )
          .or(
            `salida.is.null,salida.gt.${inicioSemana.toISOString()}`
          );

        if (errorTurnos) {
          throw errorTurnos;
        }

        const {
          data: ajustes,
          error: errorAjustes
        } = await supabase
          .from('ajustes_horas')
          .select('*')
          .gte(
            'creado_en',
            inicioSemana.toISOString()
          )
          .lt(
            'creado_en',
            ahora.toISOString()
          );

        if (errorAjustes) {
          throw errorAjustes;
        }

        const usuarios =
          new Map();

        for (
          const turno
          of turnos || []
        ) {
          const actual =
            usuarios.get(
              turno.discord_user_id
            ) || {
              usuarioId:
                turno.discord_user_id,

              nombre:
                turno.discord_username ||
                'Usuario desconocido',

              minutosTurnos: 0,
              minutosAjustes: 0
            };

          actual.minutosTurnos +=
            minutosSolapados(
              turno.entrada,
              turno.salida,
              inicioSemana,
              ahora
            );

          if (
            turno.discord_username
          ) {
            actual.nombre =
              turno.discord_username;
          }

          usuarios.set(
            turno.discord_user_id,
            actual
          );
        }

        for (
          const ajuste
          of ajustes || []
        ) {
          const actual =
            usuarios.get(
              ajuste.discord_user_id
            ) || {
              usuarioId:
                ajuste.discord_user_id,

              nombre:
                ajuste.discord_username ||
                'Usuario desconocido',

              minutosTurnos: 0,
              minutosAjustes: 0
            };

          actual.minutosAjustes +=
            Number(
              ajuste.minutos || 0
            );

          if (
            ajuste.discord_username
          ) {
            actual.nombre =
              ajuste.discord_username;
          }

          usuarios.set(
            ajuste.discord_user_id,
            actual
          );
        }

        const ranking =
          [...usuarios.values()]
            .map(
              (registro) => ({
                ...registro,

                total:
                  Math.max(
                    0,
                    registro.minutosTurnos +
                    registro.minutosAjustes
                  )
              })
            )
            .filter(
              (registro) =>
                registro.total > 0
            )
            .sort(
              (a, b) =>
                b.total - a.total
            )
            .slice(0, 15);

        if (
          ranking.length === 0
        ) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x95A5A6)
                .setTitle(
                  '📈 Ranking semanal'
                )
                .setDescription(
                  'Todavía no hay horas registradas esta semana.'
                )
                .setFooter({
                  text:
                    'Semana desde el lunes 00:00'
                })
                .setTimestamp()
            ]
          });
        }

        const medallas = [
          '🥇',
          '🥈',
          '🥉'
        ];

        const lineas =
          ranking.map(
            (
              registro,
              indice
            ) => {
              const posicion =
                medallas[indice] ||
                `**${indice + 1}.**`;

              return (
                `${posicion} <@${registro.usuarioId}> — ` +
                `**${formatearMinutos(
                  registro.total
                )}**`
              );
            }
          );

        const embed =
          new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(
              '📈 Ranking semanal de horas'
            )
            .setDescription(
              lineas.join('\n')
            )
            .setFooter({
              text:
                'Semana calculada desde el lunes 00:00 • Europe/Madrid'
            })
            .setTimestamp();

        return interaction.editReply({
          embeds: [embed]
        });
      }

      // =====================================
      // A PARTIR DE AQUÍ CONTINÚAN
      // LAS POSTULACIONES
      // =====================================
          // =====================================
      // COMANDO /panel-postulaciones
      // =====================================

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          'panel-postulaciones'
      ) {
        if (
          !esPersonalAutorizado(
            interaction
          )
        ) {
          return interaction.reply({
            content:
              '❌ No tienes permiso para publicar este panel.',
            ephemeral: true
          });
        }

        const canal =
          await client.channels.fetch(
            POSTULACIONES_CHANNEL_ID
          );

        if (
          !canal ||
          !canal.isTextBased()
        ) {
          return interaction.reply({
            content:
              '❌ No se ha encontrado el canal de postulaciones.',
            ephemeral: true
          });
        }

        const embed =
          new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle(
              '🍹 Trabaja con nosotros en Tequilala'
            )
            .setDescription(
              [
                '¿Quieres formar parte del equipo de **Tequilala**?',
                '',
                'Selecciona el puesto al que deseas postularte.',
                'Se abrirá un formulario privado para completar tu solicitud.',
                '',
                '📌 Envía una sola postulación y responde con sinceridad.'
              ].join('\n')
            )
            .addFields(
              {
                name:
                  '🍸 Camarero/a',
                value:
                  'Atención al público y preparación de bebidas.',
                inline: false
              },
              {
                name:
                  '🛡️ Portero/a',
                value:
                  'Control de acceso y seguridad del establecimiento.',
                inline: false
              },
              {
                name:
                  '💃 Bailarín/a',
                value:
                  'Animación y espectáculos dentro del local.',
                inline: false
              }
            )
            .setFooter({
              text:
                'Tequilala Manager'
            });

        const botones =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  'postulacion_camarero'
                )
                .setLabel(
                  'Camarero/a'
                )
                .setEmoji('🍸')
                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()
                .setCustomId(
                  'postulacion_portero'
                )
                .setLabel(
                  'Portero/a'
                )
                .setEmoji('🛡️')
                .setStyle(
                  ButtonStyle.Secondary
                ),

              new ButtonBuilder()
                .setCustomId(
                  'postulacion_bailarin'
                )
                .setLabel(
                  'Bailarín/a'
                )
                .setEmoji('💃')
                .setStyle(
                  ButtonStyle.Success
                )
            );

        const mensajes =
          await canal.messages.fetch({
            limit: 100
          });

        const panelesAnteriores =
          mensajes.filter(
            (mensaje) => {
              const titulo =
                mensaje.embeds[0]
                  ?.title;

              return (
                mensaje.author.id ===
                  client.user.id &&
                titulo ===
                  '🍹 Trabaja con nosotros en Tequilala'
              );
            }
          );

        for (
          const mensaje
          of panelesAnteriores.values()
        ) {
          await mensaje
            .delete()
            .catch(() => null);
        }

        await canal.send({
          embeds: [embed],
          components: [botones]
        });

        return interaction.reply({
          content:
            `✅ Panel publicado correctamente en <#${POSTULACIONES_CHANNEL_ID}>.`,
          ephemeral: true
        });
      }

      // =====================================
      // BOTONES DEL PANEL DE POSTULACIONES
      // =====================================

      if (
        interaction.isButton() &&
        [
          'postulacion_camarero',
          'postulacion_portero',
          'postulacion_bailarin'
        ].includes(
          interaction.customId
        )
      ) {
        const codigoPuesto =
          obtenerCodigoPuesto(
            interaction.customId
          );

        const puestoSeleccionado =
          obtenerPuesto(
            codigoPuesto
          );

        if (
          !codigoPuesto ||
          !puestoSeleccionado
        ) {
          return interaction.reply({
            content:
              '❌ No se ha podido identificar el puesto seleccionado.',
            ephemeral: true
          });
        }

        const ticketExistente =
          await buscarTicketAbierto(
            interaction.guild,
            interaction.user.id
          );

        if (ticketExistente) {
          return interaction.reply({
            content:
              `❌ Ya tienes una postulación abierta: ${ticketExistente}`,
            ephemeral: true
          });
        }

        const modalDatos =
          new ModalBuilder()
            .setCustomId(
              `modal_datos_${codigoPuesto}`
            )
            .setTitle(
              `Postulación: ${puestoSeleccionado}`
            );

        const nombreIC =
          new TextInputBuilder()
            .setCustomId(
              'nombre_ic'
            )
            .setLabel(
              'Nombre y apellido IC'
            )
            .setPlaceholder(
              'Ejemplo: Antonio García'
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setMinLength(3)
            .setMaxLength(80)
            .setRequired(true);

        const edadOOC =
          new TextInputBuilder()
            .setCustomId(
              'edad_ooc'
            )
            .setLabel(
              'Edad OOC'
            )
            .setPlaceholder(
              'Ejemplo: 22'
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setMinLength(1)
            .setMaxLength(3)
            .setRequired(true);

        const telefonoIC =
          new TextInputBuilder()
            .setCustomId(
              'telefono_ic'
            )
            .setLabel(
              'Teléfono IC'
            )
            .setPlaceholder(
              'Ejemplo: 555-1234'
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setMinLength(3)
            .setMaxLength(30)
            .setRequired(true);

        modalDatos.addComponents(
          new ActionRowBuilder()
            .addComponents(
              nombreIC
            ),

          new ActionRowBuilder()
            .addComponents(
              edadOOC
            ),

          new ActionRowBuilder()
            .addComponents(
              telefonoIC
            )
        );

        return interaction.showModal(
          modalDatos
        );
      }
            // =====================================
      // MODAL 1: DATOS BÁSICOS
      // =====================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(
          'modal_datos_'
        )
      ) {
        await interaction.deferReply({
          ephemeral: true
        });

        const codigoPuesto =
          interaction.customId.replace(
            'modal_datos_',
            ''
          );

        const puestoSeleccionado =
          obtenerPuesto(codigoPuesto);

        if (!puestoSeleccionado) {
          return interaction.editReply({
            content:
              '❌ No se ha podido identificar el puesto.'
          });
        }

        const ticketExistente =
          await buscarTicketAbierto(
            interaction.guild,
            interaction.user.id
          );

        if (ticketExistente) {
          return interaction.editReply({
            content:
              `❌ Ya tienes una postulación abierta: ${ticketExistente}`
          });
        }

        const nombreIC =
          interaction.fields.getTextInputValue(
            'nombre_ic'
          );

        const edadOOC =
          interaction.fields.getTextInputValue(
            'edad_ooc'
          );

        const telefonoIC =
          interaction.fields.getTextInputValue(
            'telefono_ic'
          );

        const nombreUsuario =
          limpiarNombreCanal(
            interaction.user.username
          );

        const nombreCanal =
          `postulacion-${nombreUsuario}`.slice(
            0,
            90
          );

        const canalTicket =
          await interaction.guild.channels.create(
            {
              name: nombreCanal,
              type: ChannelType.GuildText,
              parent:
                POSTULACIONES_CATEGORY_ID,

              topic:
                `postulante:${interaction.user.id};` +
                `puesto:${codigoPuesto}`,

              permissionOverwrites: [
                {
                  id:
                    interaction.guild.roles
                      .everyone.id,

                  deny: [
                    PermissionFlagsBits.ViewChannel
                  ]
                },

                {
                  id:
                    interaction.user.id,

                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                  ]
                },

                {
                  id:
                    ENCARGADOS_ROLE_ID,

                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                  ]
                },

                {
                  id:
                    GERENCIA_ROLE_ID,

                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                  ]
                },

                {
                  id:
                    client.user.id,

                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ManageMessages
                  ]
                }
              ]
            }
          );

        const formularioParcial =
          new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(
              '📝 Formulario de postulación en curso'
            )
            .setDescription(
              [
                `${interaction.user}, has completado la primera parte.`,
                '',
                'Pulsa **Continuar formulario** para responder las preguntas restantes.'
              ].join('\n')
            )
            .addFields(
              {
                name:
                  '👤 Usuario de Discord',

                value:
                  `${interaction.user}\n` +
                  `\`${interaction.user.id}\``,

                inline: false
              },

              {
                name:
                  '🍹 Puesto solicitado',

                value:
                  puestoSeleccionado,

                inline: false
              },

              {
                name:
                  '🪪 Nombre IC',

                value:
                  nombreIC,

                inline: false
              },

              {
                name:
                  '🎂 Edad OOC',

                value:
                  edadOOC,

                inline: true
              },

              {
                name:
                  '📱 Teléfono IC',

                value:
                  telefonoIC,

                inline: true
              }
            )
            .setTimestamp()
            .setFooter({
              text:
                'Tequilala Manager'
            });

        const botonContinuar =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  'continuar_postulacion'
                )
                .setLabel(
                  'Continuar formulario'
                )
                .setEmoji('📝')
                .setStyle(
                  ButtonStyle.Primary
                )
            );

        await canalTicket.send({
          content:
            `${interaction.user} ` +
            `<@&${ENCARGADOS_ROLE_ID}> ` +
            `<@&${GERENCIA_ROLE_ID}>`,

          embeds: [
            formularioParcial
          ],

          components: [
            botonContinuar
          ],

          allowedMentions: {
            users: [
              interaction.user.id
            ],

            roles: [
              ENCARGADOS_ROLE_ID,
              GERENCIA_ROLE_ID
            ]
          }
        });

        return interaction.editReply({
          content:
            `✅ Tu ticket ha sido creado: ${canalTicket}\n` +
            'Entra en el canal y pulsa **Continuar formulario**.'
        });
      }
            // =====================================
      // BOTÓN CONTINUAR FORMULARIO
      // =====================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'continuar_postulacion'
      ) {
        const datosTema =
          obtenerDatosTema(
            interaction.channel
          );

        if (!datosTema) {
          return interaction.reply({
            content:
              '❌ Este canal no es un ticket de postulación válido.',
            ephemeral: true
          });
        }

        if (
          datosTema.usuarioId !==
          interaction.user.id
        ) {
          return interaction.reply({
            content:
              '❌ Solo el postulante puede continuar este formulario.',
            ephemeral: true
          });
        }

        const mensajeFormulario =
          await buscarMensajeFormulario(
            interaction.channel
          );

        if (!mensajeFormulario) {
          return interaction.reply({
            content:
              '❌ No se han encontrado los datos de la primera parte.',
            ephemeral: true
          });
        }

        if (
          mensajeFormulario.embeds[0]
            ?.title !==
          '📝 Formulario de postulación en curso'
        ) {
          return interaction.reply({
            content:
              '❌ Este formulario ya ha sido completado.',
            ephemeral: true
          });
        }

        const modalEntrevista =
          new ModalBuilder()
            .setCustomId(
              'modal_entrevista'
            )
            .setTitle(
              'Entrevista de Tequilala'
            );

        const experiencia =
          new TextInputBuilder()
            .setCustomId(
              'experiencia'
            )
            .setLabel(
              '¿Qué experiencia tienes?'
            )
            .setPlaceholder(
              'Cuéntanos tu experiencia laboral o en roleplay.'
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setMinLength(10)
            .setMaxLength(900)
            .setRequired(true);

        const negocioAnterior =
          new TextInputBuilder()
            .setCustomId(
              'negocio_anterior'
            )
            .setLabel(
              '¿Has trabajado en otro negocio?'
            )
            .setPlaceholder(
              'Indica cuál y qué función realizabas. Si no, escribe No.'
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setMinLength(2)
            .setMaxLength(900)
            .setRequired(true);

        const disponibilidad =
          new TextInputBuilder()
            .setCustomId(
              'disponibilidad'
            )
            .setLabel(
              '¿Cuál es tu disponibilidad?'
            )
            .setPlaceholder(
              'Días, horarios y zona horaria.'
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setMinLength(5)
            .setMaxLength(900)
            .setRequired(true);

        const motivacion =
          new TextInputBuilder()
            .setCustomId(
              'motivacion'
            )
            .setLabel(
              '¿Por qué quieres entrar en Tequilala?'
            )
            .setPlaceholder(
              'Explícanos por qué quieres formar parte del equipo.'
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setMinLength(10)
            .setMaxLength(900)
            .setRequired(true);

        modalEntrevista.addComponents(
          new ActionRowBuilder()
            .addComponents(
              experiencia
            ),

          new ActionRowBuilder()
            .addComponents(
              negocioAnterior
            ),

          new ActionRowBuilder()
            .addComponents(
              disponibilidad
            ),

          new ActionRowBuilder()
            .addComponents(
              motivacion
            )
        );

        return interaction.showModal(
          modalEntrevista
        );
      }
            // =====================================
      // MODAL 2: ENTREVISTA
      // =====================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          'modal_entrevista'
      ) {
        await interaction.deferReply({
          ephemeral: true
        });

        const datosTema =
          obtenerDatosTema(
            interaction.channel
          );

        if (!datosTema) {
          return interaction.editReply({
            content:
              '❌ Este canal no es un ticket de postulación válido.'
          });
        }

        if (
          datosTema.usuarioId !==
          interaction.user.id
        ) {
          return interaction.editReply({
            content:
              '❌ Solo el postulante puede completar este formulario.'
          });
        }

        const mensajeFormulario =
          await buscarMensajeFormulario(
            interaction.channel
          );

        if (!mensajeFormulario) {
          return interaction.editReply({
            content:
              '❌ No se han encontrado los datos de la primera parte.'
          });
        }

        const embedAnterior =
          mensajeFormulario.embeds[0];

        if (
          embedAnterior.title !==
          '📝 Formulario de postulación en curso'
        ) {
          return interaction.editReply({
            content:
              '❌ Este formulario ya ha sido completado.'
          });
        }

        const obtenerCampo = (nombre) => {
          return (
            embedAnterior.fields.find(
              (campo) =>
                campo.name === nombre
            )?.value ||
            'No especificado'
          );
        };

        const puestoSeleccionado =
          obtenerCampo(
            '🍹 Puesto solicitado'
          );

        const nombreIC =
          obtenerCampo(
            '🪪 Nombre IC'
          );

        const edadOOC =
          obtenerCampo(
            '🎂 Edad OOC'
          );

        const telefonoIC =
          obtenerCampo(
            '📱 Teléfono IC'
          );

        const experiencia =
          interaction.fields.getTextInputValue(
            'experiencia'
          );

        const negocioAnterior =
          interaction.fields.getTextInputValue(
            'negocio_anterior'
          );

        const disponibilidad =
          interaction.fields.getTextInputValue(
            'disponibilidad'
          );

        const motivacion =
          interaction.fields.getTextInputValue(
            'motivacion'
          );

        const resumen =
          new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle(
              '📋 Nueva postulación'
            )
            .setDescription(
              'La solicitud está lista para ser revisada por el equipo de Tequilala.'
            )
            .addFields(
              {
                name:
                  '👤 Usuario de Discord',

                value:
                  `${interaction.user}\n` +
                  `\`${interaction.user.id}\``,

                inline: false
              },

              {
                name:
                  '🍹 Puesto solicitado',

                value:
                  puestoSeleccionado,

                inline: false
              },

              {
                name:
                  '🪪 Nombre IC',

                value:
                  nombreIC,

                inline: false
              },

              {
                name:
                  '🎂 Edad OOC',

                value:
                  edadOOC,

                inline: true
              },

              {
                name:
                  '📱 Teléfono IC',

                value:
                  telefonoIC,

                inline: true
              },

              {
                name:
                  '💼 Experiencia',

                value:
                  experiencia,

                inline: false
              },

              {
                name:
                  '🏢 Negocio anterior',

                value:
                  negocioAnterior,

                inline: false
              },

              {
                name:
                  '🕒 Disponibilidad',

                value:
                  disponibilidad,

                inline: false
              },

              {
                name:
                  '❤️ Motivación',

                value:
                  motivacion,

                inline: false
              }
            )
            .setTimestamp()
            .setFooter({
              text:
                'Pendiente de revisión • Tequilala Manager'
            });

        const botonesRevision =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  'postulacion_aceptar'
                )
                .setLabel(
                  'Aceptar'
                )
                .setEmoji('✅')
                .setStyle(
                  ButtonStyle.Success
                ),

              new ButtonBuilder()
                .setCustomId(
                  'postulacion_rechazar'
                )
                .setLabel(
                  'Rechazar'
                )
                .setEmoji('❌')
                .setStyle(
                  ButtonStyle.Danger
                ),

              new ButtonBuilder()
                .setCustomId(
                  'postulacion_cerrar'
                )
                .setLabel(
                  'Cerrar ticket'
                )
                .setEmoji('🔒')
                .setStyle(
                  ButtonStyle.Secondary
                )
            );

        await mensajeFormulario.edit({
          content:
            `${interaction.user} ` +
            `<@&${ENCARGADOS_ROLE_ID}> ` +
            `<@&${GERENCIA_ROLE_ID}>`,

          embeds: [
            resumen
          ],

          components: [
            botonesRevision
          ],

          allowedMentions: {
            users: [
              interaction.user.id
            ],

            roles: [
              ENCARGADOS_ROLE_ID,
              GERENCIA_ROLE_ID
            ]
          }
        });

        await interaction.channel.send({
          content:
            `✅ ${interaction.user}, tu postulación ha sido enviada correctamente. ` +
            'El equipo de Tequilala la revisará próximamente.'
        });

        return interaction.editReply({
          content:
            '✅ Formulario completado y enviado correctamente.'
        });
      }
            // =====================================
      // BOTÓN ACEPTAR POSTULACIÓN
      // =====================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'postulacion_aceptar'
      ) {
        if (
          !esPersonalAutorizado(
            interaction
          )
        ) {
          return interaction.reply({
            content:
              '❌ No tienes permiso para aceptar postulaciones.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const datosTema =
          obtenerDatosTema(
            interaction.channel
          );

        if (!datosTema) {
          return interaction.editReply({
            content:
              '❌ Este canal no es un ticket de postulación válido.'
          });
        }

        const mensajeFormulario =
          await buscarMensajeFormulario(
            interaction.channel
          );

        if (!mensajeFormulario) {
          return interaction.editReply({
            content:
              '❌ No se ha encontrado el formulario de la postulación.'
          });
        }

        const embedAnterior =
          mensajeFormulario.embeds[0];

        if (
          embedAnterior?.title !==
          '📋 Nueva postulación'
        ) {
          return interaction.editReply({
            content:
              '❌ Esta postulación ya ha sido gestionada.'
          });
        }

        const postulante =
          await interaction.guild.members
            .fetch(
              datosTema.usuarioId
            )
            .catch(() => null);

        const codigoPuesto =
          datosTema.codigoPuesto;

        const rolPuestoId =
          obtenerRolPuesto(
            codigoPuesto
          );

        const puestoSeleccionado =
          obtenerPuesto(
            codigoPuesto
          ) ||
          'Puesto desconocido';

        if (
          postulante &&
          rolPuestoId
        ) {
          await postulante.roles
            .add(
              rolPuestoId,
              `Postulación aceptada por ${interaction.user.tag}`
            )
            .catch(
              (error) => {
                console.error(
                  '❌ Error asignando el rol:',
                  error
                );
              }
            );
        }

        const embedAceptado =
          EmbedBuilder.from(
            embedAnterior
          )
            .setColor(0x2ECC71)
            .setTitle(
              '✅ Postulación aceptada'
            )
            .setFooter({
              text:
                `Aceptada por ${interaction.user.tag}`
            })
            .setTimestamp();

        const botonCerrar =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  'postulacion_cerrar'
                )
                .setLabel(
                  'Cerrar ticket'
                )
                .setEmoji('🔒')
                .setStyle(
                  ButtonStyle.Secondary
                )
            );

        await mensajeFormulario.edit({
          embeds: [
            embedAceptado
          ],

          components: [
            botonCerrar
          ]
        });

        if (postulante) {
          await postulante.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle(
                  '✅ Postulación aceptada'
                )
                .setDescription(
                  [
                    `Tu postulación para **${puestoSeleccionado}** en **Tequilala** ha sido aceptada.`,
                    '',
                    '¡Bienvenido/a al equipo! 🎉',
                    '',
                    `Servidor: **${interaction.guild.name}**`
                  ].join('\n')
                )
                .setTimestamp()
            ]
          }).catch(() => null);
        }

        await interaction.channel.send({
          content:
            `<@${datosTema.usuarioId}> 🎉 Tu postulación ha sido **aceptada** por ${interaction.user}.`
        });

        await enviarRegistro({
          guild:
            interaction.guild,

          titulo:
            '✅ Postulación aceptada',

          color:
            0x2ECC71,

          usuarioId:
            datosTema.usuarioId,

          responsable:
            interaction.user,

          canal:
            interaction.channel,

          campos: [
            {
              name:
                '🍹 Puesto',
              value:
                puestoSeleccionado,
              inline: true
            },
            {
              name:
                '🎭 Rol asignado',
              value:
                rolPuestoId
                  ? `<@&${rolPuestoId}>`
                  : 'No configurado',
              inline: true
            }
          ]
        });

        return interaction.editReply({
          content:
            postulante &&
            rolPuestoId
              ? `✅ Postulación aceptada y rol <@&${rolPuestoId}> asignado correctamente.`
              : '✅ Postulación aceptada. No se pudo asignar el rol automáticamente.'
        });
      }

      // =====================================
      // BOTÓN RECHAZAR POSTULACIÓN
      // =====================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'postulacion_rechazar'
      ) {
        if (
          !esPersonalAutorizado(
            interaction
          )
        ) {
          return interaction.reply({
            content:
              '❌ No tienes permiso para rechazar postulaciones.',
            ephemeral: true
          });
        }

        const datosTema =
          obtenerDatosTema(
            interaction.channel
          );

        if (!datosTema) {
          return interaction.reply({
            content:
              '❌ Este canal no es un ticket de postulación válido.',
            ephemeral: true
          });
        }

        const mensajeFormulario =
          await buscarMensajeFormulario(
            interaction.channel
          );

        if (!mensajeFormulario) {
          return interaction.reply({
            content:
              '❌ No se ha encontrado el formulario de la postulación.',
            ephemeral: true
          });
        }

        if (
          mensajeFormulario.embeds[0]
            ?.title !==
          '📋 Nueva postulación'
        ) {
          return interaction.reply({
            content:
              '❌ Esta postulación ya ha sido gestionada.',
            ephemeral: true
          });
        }

        const modalRechazo =
          new ModalBuilder()
            .setCustomId(
              'modal_rechazar_postulacion'
            )
            .setTitle(
              'Rechazar postulación'
            );

        const motivo =
          new TextInputBuilder()
            .setCustomId(
              'motivo_rechazo'
            )
            .setLabel(
              'Motivo del rechazo'
            )
            .setPlaceholder(
              'Explica brevemente por qué se rechaza la postulación.'
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setMinLength(5)
            .setMaxLength(1000)
            .setRequired(true);

        modalRechazo.addComponents(
          new ActionRowBuilder()
            .addComponents(
              motivo
            )
        );

        return interaction.showModal(
          modalRechazo
        );
      }

      // =====================================
      // MODAL: MOTIVO DEL RECHAZO
      // =====================================

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          'modal_rechazar_postulacion'
      ) {
        if (
          !esPersonalAutorizado(
            interaction
          )
        ) {
          return interaction.reply({
            content:
              '❌ No tienes permiso para rechazar postulaciones.',
            ephemeral: true
          });
        }

        await interaction.deferReply({
          ephemeral: true
        });

        const datosTema =
          obtenerDatosTema(
            interaction.channel
          );

        if (!datosTema) {
          return interaction.editReply({
            content:
              '❌ Este canal no es un ticket de postulación válido.'
          });
        }

        const mensajeFormulario =
          await buscarMensajeFormulario(
            interaction.channel
          );

        if (!mensajeFormulario) {
          return interaction.editReply({
            content:
              '❌ No se ha encontrado el formulario de la postulación.'
          });
        }

        const embedAnterior =
          mensajeFormulario.embeds[0];

        if (
          embedAnterior?.title !==
          '📋 Nueva postulación'
        ) {
          return interaction.editReply({
            content:
              '❌ Esta postulación ya ha sido gestionada.'
          });
        }

        const motivo =
          interaction.fields
            .getTextInputValue(
              'motivo_rechazo'
            )
            .trim();

        const codigoPuesto =
          datosTema.codigoPuesto;

        const puestoSeleccionado =
          obtenerPuesto(
            codigoPuesto
          ) ||
          'Puesto desconocido';

        const embedRechazado =
          EmbedBuilder.from(
            embedAnterior
          )
            .setColor(0xE74C3C)
            .setTitle(
              '❌ Postulación rechazada'
            )
            .addFields({
              name:
                '📝 Motivo del rechazo',

              value:
                motivo.slice(
                  0,
                  1024
                ),

              inline: false
            })
            .setFooter({
              text:
                `Rechazada por ${interaction.user.tag}`
            })
            .setTimestamp();

        const botonCerrar =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  'postulacion_cerrar'
                )
                .setLabel(
                  'Cerrar ticket'
                )
                .setEmoji('🔒')
                .setStyle(
                  ButtonStyle.Secondary
                )
            );

        await mensajeFormulario.edit({
          embeds: [
            embedRechazado
          ],

          components: [
            botonCerrar
          ]
        });

        const postulante =
          await interaction.guild.members
            .fetch(
              datosTema.usuarioId
            )
            .catch(() => null);

        if (postulante) {
          await postulante.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle(
                  '❌ Postulación rechazada'
                )
                .setDescription(
                  [
                    `Tu postulación para **${puestoSeleccionado}** en **Tequilala** no ha sido aceptada.`,
                    '',
                    `**Motivo:**`,
                    motivo,
                    '',
                    'Gracias por tu interés en formar parte del equipo.'
                  ].join('\n')
                )
                .setTimestamp()
            ]
          }).catch(() => null);
        }

        await interaction.channel.send({
          content:
            `<@${datosTema.usuarioId}> tu postulación ha sido **rechazada** por ${interaction.user}.\n\n` +
            `**Motivo:** ${motivo}`
        });

        await enviarRegistro({
          guild:
            interaction.guild,

          titulo:
            '❌ Postulación rechazada',

          color:
            0xE74C3C,

          usuarioId:
            datosTema.usuarioId,

          responsable:
            interaction.user,

          canal:
            interaction.channel,

          campos: [
            {
              name:
                '🍹 Puesto',
              value:
                puestoSeleccionado,
              inline: true
            },
            {
              name:
                '📝 Motivo',
              value:
                motivo.slice(
                  0,
                  1024
                ),
              inline: false
            }
          ]
        });

        return interaction.editReply({
          content:
            '✅ La postulación ha sido rechazada correctamente.'
        });
      }
            // =====================================
      // BOTÓN CERRAR TICKET
      // =====================================

      if (
        interaction.isButton() &&
        interaction.customId ===
          'postulacion_cerrar'
      ) {
        const datosTema =
          obtenerDatosTema(
            interaction.channel
          );

        if (!datosTema) {
          return interaction.reply({
            content:
              '❌ Este canal no es un ticket de postulación válido.',
            ephemeral: true
          });
        }

        const esPostulante =
          datosTema.usuarioId ===
          interaction.user.id;

        const esStaff =
          esPersonalAutorizado(
            interaction
          );

        if (
          !esPostulante &&
          !esStaff
        ) {
          return interaction.reply({
            content:
              '❌ No tienes permiso para cerrar este ticket.',
            ephemeral: true
          });
        }

        await interaction.reply({
          content:
            '🔒 El ticket se cerrará en 5 segundos.',
          ephemeral: true
        });

        await enviarRegistro({
          guild:
            interaction.guild,

          titulo:
            '🔒 Ticket de postulación cerrado',

          color:
            0x95A5A6,

          usuarioId:
            datosTema.usuarioId,

          responsable:
            interaction.user,

          canal:
            interaction.channel,

          campos: [
            {
              name:
                '📄 Canal',
              value:
                interaction.channel.name,
              inline: true
            },
            {
              name:
                '🍹 Puesto',
              value:
                obtenerPuesto(
                  datosTema.codigoPuesto
                ) ||
                'Puesto desconocido',
              inline: true
            }
          ]
        });

        setTimeout(
          async () => {
            await interaction.channel
              .delete(
                `Ticket cerrado por ${interaction.user.tag}`
              )
              .catch(
                (error) => {
                  console.error(
                    '❌ Error eliminando el ticket:',
                    error
                  );
                }
              );
          },
          5000
        );

        return;
      }
    } catch (error) {
      console.error(
        '❌ Error procesando interacción:',
        error
      );

      const mensajeError = {
        content:
          '❌ Ha ocurrido un error al procesar esta acción.',
        ephemeral: true
      };

      if (
        interaction.deferred ||
        interaction.replied
      ) {
        await interaction
          .followUp(mensajeError)
          .catch(() => null);
      } else {
        await interaction
          .reply(mensajeError)
          .catch(() => null);
      }
    }
  }
);

// =============================
// ERRORES DEL PROCESO
// =============================

process.on(
  'unhandledRejection',
  (error) => {
    console.error(
      '❌ Promesa rechazada sin gestionar:',
      error
    );
  }
);

process.on(
  'uncaughtException',
  (error) => {
    console.error(
      '❌ Excepción no capturada:',
      error
    );
  }
);

// =============================
// INICIAR SESIÓN
// =============================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    '❌ Falta la variable DISCORD_TOKEN.'
  );

  process.exit(1);
}

client.login(
  process.env.DISCORD_TOKEN
);
