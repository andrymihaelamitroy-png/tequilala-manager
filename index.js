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
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");
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
process.env.TZ = process.env.TZ || 'Europe/Madrid';
const supabase =
process.env.SUPABASE_URL &&
process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase =
process.env.SUPABASE_URL &&
process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        realtime: {
          transport: WebSocket
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    )
  : null;
// =============================
// CONFIGURACIÓN
// =============================
const GUILD_ID = '1311766874542837871';
const POSTULACIONES_CHANNEL_ID = '1529194473072889896';
const POSTULACIONES_CATEGORY_ID = '1529220895846174730';
const REGISTRO_POSTULACIONES_CHANNEL_ID = '1529221287262818584';
const ENCARGADOS_ROLE_ID = '1529222035950014625';
const GERENCIA_ROLE_ID = '1311766874568261670';
const FICHAJE_CHANNEL_ID = '1462059526978142321';
const REGISTRO_FICHAJES_CHANNEL_ID = '1529264534299214037';
const CAMARERO_ROLE_ID = '1450612244999045244';
const BAILARINA_ROLE_ID = '1450612439002382346';
const PORTERO_ROLE_ID = '1450621997586321509';
const SUBJEFE_ROLE_ID = '1311766874568261671';
const JEFE_ROLE_ID = '1311766874568261672';
const ROLES_QUE_PUEDEN_FICHAR = [
CAMARERO_ROLE_ID,
BAILARINA_ROLE_ID,
PORTERO_ROLE_ID,
ENCARGADOS_ROLE_ID,
SUBJEFE_ROLE_ID,
JEFE_ROLE_ID,
GERENCIA_ROLE_ID
];
const ROLES_ADMIN_HORAS = [
SUBJEFE_ROLE_ID,
JEFE_ROLE_ID,
GERENCIA_ROLE_ID
];
// =============================
// COMANDOS
// =============================
const commands = [
new SlashCommandBuilder()
.setName('panel-postulaciones')
.setDescription('Publica el panel de postulaciones de Tequilala')
.toJSON(),
new SlashCommandBuilder()
.setName('panel-fichaje')
.setDescription('Publica el panel de control de horas')
.toJSON(),
new SlashCommandBuilder()
.setName('añadir-horas')
.setDescription('Añade horas manualmente a un empleado')
.addUserOption((opcion) =>
opcion
.setName('empleado')
.setDescription('Empleado al que se añadirán las horas')
.setRequired(true)
)
.addStringOption((opcion) =>
opcion
.setName('motivo')
.setDescription('Motivo del ajuste')
.setMaxLength(500)
.setRequired(true)
)
.addIntegerOption((opcion) =>
opcion
.setName('horas')
.setDescription('Cantidad de horas')
.setMinValue(0)
.setMaxValue(500)
)
.addIntegerOption((opcion) =>
opcion
.setName('minutos')
.setDescription('Minutos adicionales')
.setMinValue(0)
.setMaxValue(59)
)
.toJSON(),
new SlashCommandBuilder()
.setName('quitar-horas')
.setDescription('Quita horas manualmente a un empleado')
.addUserOption((opcion) =>
opcion
.setName('empleado')
.setDescription('Empleado al que se quitarán las horas')
.setRequired(true)
)
.addStringOption((opcion) =>
opcion
.setName('motivo')
.setDescription('Motivo del ajuste')
.setMaxLength(500)
.setRequired(true)
)
.addIntegerOption((opcion) =>
opcion
.setName('horas')
.setDescription('Cantidad de horas')
.setMinValue(0)
.setMaxValue(500)
)
.addIntegerOption((opcion) =>
opcion
.setName('minutos')
.setDescription('Minutos adicionales')
.setMinValue(0)
.setMaxValue(59)
)
.toJSON(),
new SlashCommandBuilder()
.setName('horas-empleado')
.setDescription('Consulta las horas de un empleado')
.addUserOption((opcion) =>
opcion
.setName('empleado')
.setDescription('Empleado que quieres consultar')
.setRequired(true)
)
.toJSON(),
new SlashCommandBuilder()
.setName('ranking-horas')
.setDescription('Muestra el ranking semanal de horas')
.toJSON(),
new SlashCommandBuilder()
.setName('personal-activo')
.setDescription('Muestra quién está actualmente de servicio')
.toJSON()
];
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
function puedeFichar(interaction) {
if (!interaction.member?.roles?.cache) return false;
return ROLES_QUE_PUEDEN_FICHAR.some((roleId) =>
interaction.member.roles.cache.has(roleId)
);
}
function puedeGestionarHoras(interaction) {
if (!interaction.member?.roles?.cache) return false;
return ROLES_ADMIN_HORAS.some((roleId) =>
interaction.member.roles.cache.has(roleId)
);
}
function comprobarSupabase() {
if (!supabase) {
throw new Error(
'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Railway.'
);
}
}
function formatearMinutos(minutosTotales) {
const signo = minutosTotales < 0 ? '-' : '';
const minutosAbsolutos = Math.abs(Math.trunc(minutosTotales));
const horas = Math.floor(minutosAbsolutos / 60);
const minutos = minutosAbsolutos % 60;
return `${signo}${horas}h ${minutos.toString().padStart(2, '0')}m`;
}
function inicioDelDia(fecha = new Date()) {
const resultado = new Date(fecha);
resultado.setHours(0, 0, 0, 0);
return resultado;
}
function inicioSemanaActual(fecha = new Date()) {
const resultado = inicioDelDia(fecha);
const dia = resultado.getDay();
const diasDesdeLunes = dia === 0 ? 6 : dia - 1;
resultado.setDate(resultado.getDate() - diasDesdeLunes);
return resultado;
}
function inicioMesActual(fecha = new Date()) {
const resultado = inicioDelDia(fecha);
resultado.setDate(1);
return resultado;
}
function minutosSolapados(turno, inicio, fin) {
const entrada = new Date(turno.entrada);
const salida = turno.salida ? new Date(turno.salida) : new Date();
const inicioReal = Math.max(entrada.getTime(), inicio.getTime());
const finReal = Math.min(salida.getTime(), fin.getTime());
return Math.max(0, Math.floor((finReal - inicioReal) / 60000));
}
async function obtenerTurnoActivo(usuarioId) {
comprobarSupabase();
const { data, error } = await supabase
.from('turnos')
.select('*')
.eq('discord_user_id', usuarioId)
.is('salida', null)
.maybeSingle();
if (error) throw error;
return data;
}
async function obtenerTurnosPeriodo(inicio, fin, usuarioId = null) {
comprobarSupabase();
let consulta = supabase
.from('turnos')
.select('discord_user_id, discord_username, entrada, salida')
.lt('entrada', fin.toISOString())
.or(`salida.is.null,salida.gte.${inicio.toISOString()}`);
if (usuarioId) {
consulta = consulta.eq('discord_user_id', usuarioId);
}
const { data, error } = await consulta;
if (error) throw error;
return data || [];
}
async function obtenerAjustesPeriodo(inicio, fin, usuarioId = null) {
comprobarSupabase();
let consulta = supabase
.from('ajustes_horas')
.select('discord_user_id, discord_username, minutos, creado_en')
.gte('creado_en', inicio.toISOString())
.lt('creado_en', fin.toISOString());
if (usuarioId) {
consulta = consulta.eq('discord_user_id', usuarioId);
}
const { data, error } = await consulta;
if (error) throw error;
return data || [];
}
async function obtenerMinutosPeriodo(usuarioId, inicio, fin) {
const [turnos, ajustes] = await Promise.all([
obtenerTurnosPeriodo(inicio, fin, usuarioId),
obtenerAjustesPeriodo(inicio, fin, usuarioId)
]);
const minutosTurnos = turnos.reduce(
(total, turno) => total + minutosSolapados(turno, inicio, fin),
0
);
const minutosAjustes = ajustes.reduce(
(total, ajuste) => total + ajuste.minutos,
0
);
return {
turnos: minutosTurnos,
ajustes: minutosAjustes,
total: minutosTurnos + minutosAjustes
};
}
async function obtenerMinutosTotales(usuarioId) {
comprobarSupabase();
const [{ data: turnos, error: errorTurnos }, { data: ajustes, error: errorAjustes }] =
await Promise.all([
supabase
.from('turnos')
.select('entrada, salida')
.eq('discord_user_id', usuarioId),
supabase
.from('ajustes_horas')
.select('minutos')
.eq('discord_user_id', usuarioId)
]);
if (errorTurnos) throw errorTurnos;
if (errorAjustes) throw errorAjustes;
const ahora = new Date();
const inicioMuyAntiguo = new Date(0);
const minutosTurnos = (turnos || []).reduce(
(total, turno) =>
total + minutosSolapados(turno, inicioMuyAntiguo, ahora),
0
);
const minutosAjustes = (ajustes || []).reduce(
(total, ajuste) => total + ajuste.minutos,
0
);
return minutosTurnos + minutosAjustes;
}
async function crearEmbedHoras(usuario) {
const ahora = new Date();
const semana = inicioSemanaActual(ahora);
const mes = inicioMesActual(ahora);
const [resumenSemana, resumenMes, total, turnoActivo] =
await Promise.all([
obtenerMinutosPeriodo(usuario.id, semana, ahora),
obtenerMinutosPeriodo(usuario.id, mes, ahora),
obtenerMinutosTotales(usuario.id),
obtenerTurnoActivo(usuario.id)
]);
const estadoTurno = turnoActivo
? ` Activo desde <t:${Math.floor(
new Date(turnoActivo.entrada).getTime() / 1000
)}:t> (${formatearMinutos(
Math.floor(
(Date.now() - new Date(turnoActivo.entrada).getTime()) /
60000
)
)})`
: ' No iniciado';
return new EmbedBuilder()
.setColor(0xE67E22)
.setTitle(` Horas de ${usuario.username}`)
.addFields(
{
name: 'Esta semana',
value: formatearMinutos(resumenSemana.total),
inline: true
},
{
name: 'Este mes',
value: formatearMinutos(resumenMes.total),
inline: true
},
{
name: 'Total acumulado',
value: formatearMinutos(total),
inline: true
},
{
name: 'Detalle semanal',
value:
  `Fichado: ${formatearMinutos(resumenSemana.turnos)}\n` +
`Ajustes: ${formatearMinutos(resumenSemana.ajustes)}`,
inline: false
},
{
name: 'Turno actual',
value: estadoTurno,
inline: false
}
)
.setThumbnail(usuario.displayAvatarURL())
.setTimestamp()
.setFooter({ text: 'Tequilala Manager • Europe/Madrid' });
}
async function crearEmbedHorasPorDia(usuario) {
const inicioSemana = inicioSemanaActual();
const nombresDias = [
'Lunes',
'Martes',
'Miércoles',
'Jueves',
'Viernes',
'Sábado',
'Domingo'
];
const lineas = [];
for (let indice = 0; indice < 7; indice += 1) {
const inicio = new Date(inicioSemana);
inicio.setDate(inicio.getDate() + indice);
const fin = new Date(inicio);
fin.setDate(fin.getDate() + 1);
const resumen = await obtenerMinutosPeriodo(
usuario.id,
inicio,
fin
);
lineas.push(
`**${nombresDias[indice]}:** ${formatearMinutos(resumen.total)}`
);
}
const totalSemana = await obtenerMinutosPeriodo(
usuario.id,
inicioSemana,
new Date()
);
return new EmbedBuilder()
.setColor(0x3498DB)
.setTitle(` Semana de ${usuario.username}`)
.setDescription(
`${lineas.join('\n')}\n\n**Total:** ${formatearMinutos(
totalSemana.total
)}`
)
.setTimestamp()
.setFooter({ text: 'La semana comienza el lunes a las 00:00' });
}
async function enviarRegistroFichaje({ titulo, color, campos }) {
const canal = await client.channels
.fetch(REGISTRO_FICHAJES_CHANNEL_ID)
.catch(() => null);
if (!canal || !canal.isTextBased()) {
console.error('No se ha encontrado el canal de registro de fichajes.');
return;
}
const embed = new EmbedBuilder()
.setColor(color)
.setTitle(titulo)
.addFields(campos)
.setTimestamp()
.setFooter({ text: 'Tequilala Manager' });
await canal.send({ embeds: [embed] });
}
async function guardarAjusteHoras(interaction, signo) {
if (!puedeGestionarHoras(interaction)) {
return interaction.reply({
content:
' Solo Jefe, Subjefe y Gerente pueden modificar horas.',
ephemeral: true
});
}
await interaction.deferReply({ ephemeral: true });
comprobarSupabase();
const empleado = interaction.options.getUser('empleado', true);
const motivo = interaction.options.getString('motivo', true);
const horas = interaction.options.getInteger('horas') || 0;
const minutos = interaction.options.getInteger('minutos') || 0;
const cantidad = horas * 60 + minutos;
if (cantidad <= 0) {
return interaction.editReply({
content: ' Debes indicar al menos una hora o un minuto.'
});
}
const minutosFirmados = signo * cantidad;
const { error } = await supabase.from('ajustes_horas').insert({
discord_user_id: empleado.id,
discord_username: empleado.username,
minutos: minutosFirmados,
motivo,
responsable_id: interaction.user.id,
responsable_nombre: interaction.user.username
});
if (error) throw error;
await enviarRegistroFichaje({
titulo:
signo > 0 ? ' Horas añadidas' : ' Horas retiradas',
color: signo > 0 ? 0x2ECC71 : 0xE74C3C,
campos: [
{
name: 'Empleado',
value: `${empleado}`,
inline: true
},
{
name: 'Cantidad',
value: `${signo > 0 ? '+' : '-'}${formatearMinutos(cantidad)}`,
inline: true
},
{
name: 'Responsable',
value: `${interaction.user}`,
inline: true
},
{
name: 'Motivo',
value: motivo,
inline: false
}
]
});
return interaction.editReply({
content:
` Ajuste guardado: ${signo > 0 ? '+' : '-'}${formatearMinutos(
cantidad
)} para ${empleado}.`
});
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
postulacion_camarero: 'camarero',
postulacion_portero: 'portero',
postulacion_bailarin: 'bailarin'
};
return puestos[customId] || null;
}
function limpiarNombreCanal(nombre) {
let nombreLimpio = nombre
.toLowerCase()
.normalize('NFD')
.replace(/[\u0300-\u036f]/g, '')
.replace(/[^a-z0-9]/g, '-')
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
const coincidenciaUsuario = canal.topic.match(
/postulante:(\d+)/
);
const coincidenciaPuesto = canal.topic.match(
/puesto:([a-z]+)/
);
if (!coincidenciaUsuario) return null;
return {
usuarioId: coincidenciaUsuario[1],
codigoPuesto: coincidenciaPuesto
? coincidenciaPuesto[1]
: null
};
}
async function buscarTicketAbierto(guild, usuarioId) {
const canalesServidor = await guild.channels.fetch();
return canalesServidor.find((canal) => {
if (!canal) return false;
const datosTema = obtenerDatosTema(canal);
return (
canal.type === ChannelType.GuildText &&
canal.parentId === POSTULACIONES_CATEGORY_ID &&
datosTema?.usuarioId === usuarioId
);
});
}
async function buscarMensajeFormulario(canal) {
const mensajes = await canal.messages.fetch({
limit: 100
});
return mensajes.find((mensaje) => {
if (mensaje.author.id !== client.user.id) return false;
const titulo = mensaje.embeds[0]?.title;
return (
titulo === ' Formulario de postulación en curso' ||
titulo === ' Nueva postulación' ||
titulo === ' Postulación aceptada' ||
titulo === ' Postulación rechazada'
);
});
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
const canalRegistro = await guild.channels.fetch(
REGISTRO_POSTULACIONES_CHANNEL_ID
).catch(() => null);
if (!canalRegistro || !canalRegistro.isTextBased()) {
console.error(
'No se ha encontrado el canal de registro de postulaciones.'
);
return;
}
const embedRegistro = new EmbedBuilder()
.setColor(color)
.setTitle(titulo)
.addFields(
{
name: ' Postulante',
value: `<@${usuarioId}>`,
inline: true
},
{
name: ' Puesto',
value: puesto || 'No especificado',
inline: true
},
{
name: ' Responsable',
value: responsable
? `${responsable}`
: 'Sistema',
inline: true
},
{
name: ' Canal',
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
name: ' Información',
value: motivo.slice(0, 1024),
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
client.once(Events.ClientReady, async (readyClient) => {
console.log(
`Bot conectado como ${readyClient.user.tag}`
);
try {
const rest = new REST({
version: '10'
}).setToken(process.env.DISCORD_TOKEN);
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
'Comandos registrados correctamente.'
);
} catch (error) {
console.error(
'Error registrando los comandos:',
error
);
}
});
// =============================
// INTERACCIONES
// =============================
client.on(
Events.InteractionCreate,
async (interaction) => {
try {
// =====================================
// SISTEMA DE FICHAJE
// =====================================
if (
interaction.isChatInputCommand() &&
interaction.commandName === 'panel-fichaje'
) {
if (!puedeGestionarHoras(interaction)) {
return interaction.reply({
content:
' Solo Jefe, Subjefe y Gerente pueden publicar este panel.',
ephemeral: true
});
}
const canal = await client.channels
.fetch(FICHAJE_CHANNEL_ID)
.catch(() => null);
if (!canal || !canal.isTextBased()) {
return interaction.reply({
content: ' No se ha encontrado el canal de fichaje.',
ephemeral: true
});
}
const embed = new EmbedBuilder()
.setColor(0xE67E22)
.setTitle(' Control de horas de Tequilala')
.setDescription(
[
'Utiliza los botones para registrar tu jornada.',
'',
' **Iniciar turno:** comienza tu jornada.',
' **Finalizar turno:** cierra tu jornada.',
' **Ver mis horas:** consulta semana, mes y total.',
' **Horas por día:** consulta el detalle semanal.',
'',
'⚠ No olvides finalizar el turno al terminar.'
].join('\n')
)
.setFooter({ text: 'Tequilala Manager' });
const botones = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId('fichaje_iniciar')
.setLabel('Iniciar turno')
.setEmoji('')
.setStyle(ButtonStyle.Success),
new ButtonBuilder()
.setCustomId('fichaje_finalizar')
.setLabel('Finalizar turno')
.setEmoji('')
.setStyle(ButtonStyle.Danger),
new ButtonBuilder()
.setCustomId('fichaje_mis_horas')
.setLabel('Ver mis horas')
.setEmoji('')
.setStyle(ButtonStyle.Primary),
new ButtonBuilder()
.setCustomId('fichaje_por_dia')
.setLabel('Horas por día')
.setEmoji('')
.setStyle(ButtonStyle.Secondary)
);
const mensajes = await canal.messages.fetch({ limit: 100 });
const paneles = mensajes.filter(
(mensaje) =>
mensaje.author.id === client.user.id &&
mensaje.embeds[0]?.title ===
' Control de horas de Tequilala'
);
for (const mensaje of paneles.values()) {
await mensaje.delete().catch(() => null);
}
await canal.send({ embeds: [embed], components: [botones] });
return interaction.reply({
content: ` Panel publicado en <#${FICHAJE_CHANNEL_ID}>.`,
ephemeral: true
});
}
if (
interaction.isButton() &&
interaction.customId === 'fichaje_iniciar'
) {
if (!puedeFichar(interaction)) {
return interaction.reply({
content: ' Tu rol no tiene permiso para fichar.',
ephemeral: true
});
}
await interaction.deferReply({ ephemeral: true });
comprobarSupabase();
const turnoActivo = await obtenerTurnoActivo(interaction.user.id);
if (turnoActivo) {
return interaction.editReply({
content:
` Ya tienes un turno activo desde <t:${Math.floor(
new Date(turnoActivo.entrada).getTime() / 1000
)}:F>.`
});
}
const entrada = new Date();
const { error } = await supabase.from('turnos').insert({
discord_user_id: interaction.user.id,
discord_username: interaction.user.username,
entrada: entrada.toISOString()
});
if (error) throw error;
await enviarRegistroFichaje({
titulo: ' Turno iniciado',
color: 0x2ECC71,
campos: [
{
name: 'Empleado',
value: `${interaction.user}`,
inline: true
},
{
name: 'Entrada',
value: `<t:${Math.floor(entrada.getTime() / 1000)}:F>`,
inline: true
}
]
});
return interaction.editReply({
content:
` Turno iniciado correctamente a las <t:${Math.floor(
entrada.getTime() / 1000
)}:t>.`
});
}
if (
interaction.isButton() &&
interaction.customId === 'fichaje_finalizar'
) {
if (!puedeFichar(interaction)) {
return interaction.reply({
content: ' Tu rol no tiene permiso para fichar.',
ephemeral: true
});
}
await interaction.deferReply({ ephemeral: true });
comprobarSupabase();
const turnoActivo = await obtenerTurnoActivo(interaction.user.id);
if (!turnoActivo) {
return interaction.editReply({
content: ' No tienes ningún turno activo.'
});
}
const salida = new Date();
const entrada = new Date(turnoActivo.entrada);
const minutosTrabajados = Math.max(
0,
Math.floor((salida.getTime() - entrada.getTime()) / 60000)
);
const { error } = await supabase
.from('turnos')
.update({
salida: salida.toISOString(),
minutos_trabajados: minutosTrabajados
})
.eq('id', turnoActivo.id);
if (error) throw error;
await enviarRegistroFichaje({
titulo: ' Turno finalizado',
color: 0xE74C3C,
campos: [
{
name: 'Empleado',
value: `${interaction.user}`,
inline: true
},
{
name: 'Duración',
value: formatearMinutos(minutosTrabajados),
inline: true
},
{
name: 'Entrada',
value: `<t:${Math.floor(entrada.getTime() / 1000)}:t>`,
inline: true
},
{
name: 'Salida',
value: `<t:${Math.floor(salida.getTime() / 1000)}:t>`,
inline: true
}
]
});
return interaction.editReply({
content:
` Turno finalizado. Has trabajado **${formatearMinutos(
minutosTrabajados
)}**.`
});
}
if (
interaction.isButton() &&
interaction.customId === 'fichaje_mis_horas'
) {
if (!puedeFichar(interaction)) {
return interaction.reply({
content: ' Tu rol no tiene permiso para consultar horas.',
ephemeral: true
});
}
await interaction.deferReply({ ephemeral: true });
const embed = await crearEmbedHoras(interaction.user);
return interaction.editReply({ embeds: [embed] });
}
if (
interaction.isButton() &&
interaction.customId === 'fichaje_por_dia'
) {
if (!puedeFichar(interaction)) {
return interaction.reply({
content: ' Tu rol no tiene permiso para consultar horas.',
ephemeral: true
});
}
await interaction.deferReply({ ephemeral: true });
const embed = await crearEmbedHorasPorDia(interaction.user);
return interaction.editReply({ embeds: [embed] });
}
if (
interaction.isChatInputCommand() &&
interaction.commandName === 'añadir-horas'
) {
return guardarAjusteHoras(interaction, 1);
}
if (
interaction.isChatInputCommand() &&
interaction.commandName === 'quitar-horas'
) {
return guardarAjusteHoras(interaction, -1);
}
if (
interaction.isChatInputCommand() &&
interaction.commandName === 'horas-empleado'
) {
if (!puedeGestionarHoras(interaction)) {
return interaction.reply({
content:
' Solo Jefe, Subjefe y Gerente pueden consultar horas ajenas.',
ephemeral: true
});
}
await interaction.deferReply({ ephemeral: true });
const empleado = interaction.options.getUser('empleado', true);
const embed = await crearEmbedHoras(empleado);
return interaction.editReply({ embeds: [embed] });
}
if (
interaction.isChatInputCommand() &&
interaction.commandName === 'ranking-horas'
) {
if (!puedeGestionarHoras(interaction)) {
return interaction.reply({
content:
' Solo Jefe, Subjefe y Gerente pueden ver el ranking.',
ephemeral: true
});
}
await interaction.deferReply({ ephemeral: true });
const inicio = inicioSemanaActual();
const fin = new Date();
const [turnos, ajustes] = await Promise.all([
obtenerTurnosPeriodo(inicio, fin),
obtenerAjustesPeriodo(inicio, fin)
]);
const totales = new Map();
const nombres = new Map();
for (const turno of turnos) {
const minutos = minutosSolapados(turno, inicio, fin);
totales.set(
turno.discord_user_id,
(totales.get(turno.discord_user_id) || 0) + minutos
);
nombres.set(
turno.discord_user_id,
turno.discord_username || turno.discord_user_id
);
}
for (const ajuste of ajustes) {
totales.set(
ajuste.discord_user_id,
(totales.get(ajuste.discord_user_id) || 0) +
ajuste.minutos
);
nombres.set(
ajuste.discord_user_id,
ajuste.discord_username || ajuste.discord_user_id
);
}
const ranking = [...totales.entries()]
.sort((a, b) => b[1] - a[1])
.slice(0, 10);
const descripcion = ranking.length
? ranking
.map(
([usuarioId, minutos], indice) =>
`**${indice + 1}.** <@${usuarioId}> — ${formatearMinutos(
minutos
)}`
)
.join('\n')
: 'Todavía no hay horas registradas esta semana.';
const embed = new EmbedBuilder()
.setColor(0xF1C40F)
.setTitle(' Ranking semanal de horas')
.setDescription(descripcion)
.setTimestamp()
.setFooter({ text: 'Desde el lunes a las 00:00' });
return interaction.editReply({ embeds: [embed] });
}
if (
interaction.isChatInputCommand() &&
interaction.commandName === 'personal-activo'
) {
if (!puedeGestionarHoras(interaction)) {
return interaction.reply({
content:
' Solo Jefe, Subjefe y Gerente pueden consultar el personal activo.',
ephemeral: true
});
}
await interaction.deferReply({ ephemeral: true });
comprobarSupabase();
const { data, error } = await supabase
.from('turnos')
.select('discord_user_id, discord_username, entrada')
.is('salida', null)
.order('entrada', { ascending: true });
if (error) throw error;
const descripcion = data?.length
? data
.map((turno) => {
const entrada = new Date(turno.entrada);
const duracion = Math.floor(
(Date.now() - entrada.getTime()) / 60000
);
return (
` <@${turno.discord_user_id}> — ` +
`${formatearMinutos(duracion)} ` +
`(desde <t:${Math.floor(entrada.getTime() / 1000)}:t>)`
);
})
.join('\n')
: ' No hay personal de servicio actualmente.';
const embed = new EmbedBuilder()
.setColor(0x2ECC71)
.setTitle(' Personal activo')
.setDescription(descripcion)
.setTimestamp()
.setFooter({ text: 'Tequilala Manager' });
return interaction.editReply({ embeds: [embed] });
}
// =====================================
// COMANDO /panel-postulaciones
// =====================================
if (
interaction.isChatInputCommand() &&
interaction.commandName ===
'panel-postulaciones'
) {
if (!esPersonalAutorizado(interaction)) {
return interaction.reply({
content:
' No tienes permiso para publicar este panel.',
ephemeral: true
});
}
const canal = await client.channels.fetch(
POSTULACIONES_CHANNEL_ID
);
if (!canal || !canal.isTextBased()) {
return interaction.reply({
content:
' No se ha encontrado el canal de postulaciones.',
ephemeral: true
});
}
const embed = new EmbedBuilder()
.setColor(0xE67E22)
.setTitle(
' Trabaja con nosotros en Tequilala'
)
.setDescription(
[
'¿Quieres formar parte del equipo de **Tequilala**?',
'',
'Selecciona el puesto al que deseas postularte.',
'Se abrirá un formulario privado para completar tu solicitud.',
'',
' Envía una sola postulación y responde con sinceridad.'
].join('\n')
)
.addFields(
{
name: ' Camarero/a',
value:
'Atención al público y preparación de bebidas.',
inline: false
},
{
name: ' Portero/a',
value:
'Control de acceso y seguridad del establecimiento.',
inline: false
},
{
name: ' Bailarín/a',
value:
'Animación y espectáculos dentro del local.',
inline: false
}
)
.setFooter({
text: 'Tequilala Manager'
});
const botones =
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(
'postulacion_camarero'
)
.setLabel('Camarero/a')
.setEmoji('')
.setStyle(ButtonStyle.Primary),
new ButtonBuilder()
.setCustomId(
'postulacion_portero'
)
.setLabel('Portero/a')
.setEmoji('')
.setStyle(ButtonStyle.Secondary),
new ButtonBuilder()
.setCustomId(
'postulacion_bailarin'
)
.setLabel('Bailarín/a')
.setEmoji('')
.setStyle(ButtonStyle.Success)
);
const mensajes =
await canal.messages.fetch({
limit: 100
});
const panelesAnteriores =
mensajes.filter((mensaje) => {
const titulo =
mensaje.embeds[0]?.title;
return (
mensaje.author.id ===
client.user.id &&
titulo ===
' Trabaja con nosotros en Tequilala'
);
});
for (
const mensaje of panelesAnteriores.values()
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
` Panel publicado correctamente en <#${POSTULACIONES_CHANNEL_ID}>.`,
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
].includes(interaction.customId)
) {
const codigoPuesto =
obtenerCodigoPuesto(
interaction.customId
);
const puestoSeleccionado =
obtenerPuesto(codigoPuesto);
if (
!codigoPuesto ||
!puestoSeleccionado
) {
return interaction.reply({
content:
' No se ha podido identificar el puesto seleccionado.',
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
` Ya tienes una postulación abierta: ${ticketExistente}`,
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
.setCustomId('nombre_ic')
.setLabel('Nombre y apellido IC')
.setPlaceholder(
'Ejemplo: Antonio García'
)
.setStyle(TextInputStyle.Short)
.setMinLength(3)
.setMaxLength(80)
.setRequired(true);
const edadOOC =
new TextInputBuilder()
.setCustomId('edad_ooc')
.setLabel('Edad OOC')
.setPlaceholder('Ejemplo: 22')
.setStyle(TextInputStyle.Short)
.setMinLength(1)
.setMaxLength(3)
.setRequired(true);
const telefonoIC =
new TextInputBuilder()
.setCustomId('telefono_ic')
.setLabel('Teléfono IC')
.setPlaceholder(
'Ejemplo: 555-1234'
)
.setStyle(TextInputStyle.Short)
.setMinLength(3)
.setMaxLength(30)
.setRequired(true);
modalDatos.addComponents(
new ActionRowBuilder().addComponents(
nombreIC
),
new ActionRowBuilder().addComponents(
edadOOC
),
new ActionRowBuilder().addComponents(
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
' No se ha podido identificar el puesto.'
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
` Ya tienes una postulación abierta: ${ticketExistente}`
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
id: interaction.guild.roles
.everyone.id,
deny: [
PermissionFlagsBits.ViewChannel
]
},
{
id: interaction.user.id,
allow: [
PermissionFlagsBits.ViewChannel,
PermissionFlagsBits.SendMessages,
PermissionFlagsBits
.ReadMessageHistory,
PermissionFlagsBits
.AttachFiles,
PermissionFlagsBits
.EmbedLinks
]
},
{
id: ENCARGADOS_ROLE_ID,
allow: [
PermissionFlagsBits.ViewChannel,
PermissionFlagsBits
.SendMessages,
PermissionFlagsBits
.ReadMessageHistory
]
},
{
id: GERENCIA_ROLE_ID,
allow: [
PermissionFlagsBits.ViewChannel,
PermissionFlagsBits
.SendMessages,
PermissionFlagsBits
.ReadMessageHistory
]
},
{
id: client.user.id,
allow: [
PermissionFlagsBits.ViewChannel,
PermissionFlagsBits
.SendMessages,
PermissionFlagsBits
.ReadMessageHistory,
PermissionFlagsBits
.ManageChannels,
PermissionFlagsBits
.ManageMessages
]
}
]
}
);
const formularioParcial =
new EmbedBuilder()
.setColor(0xF1C40F)
.setTitle(
' Formulario de postulación en curso'
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
name: ' Usuario de Discord',
value:
`${interaction.user}\n\`${interaction.user.id}\``,
inline: false
},
{
name: ' Puesto solicitado',
value: puestoSeleccionado,
inline: false
},
{
name: ' Nombre IC',
value: nombreIC,
inline: false
},
{
name: ' Edad OOC',
value: edadOOC,
inline: true
},
{
name: ' Teléfono IC',
value: telefonoIC,
inline: true
}
)
.setTimestamp()
.setFooter({
text: 'Tequilala Manager'
});
const botonContinuar =
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(
'continuar_postulacion'
)
.setLabel(
'Continuar formulario'
)
.setEmoji('')
.setStyle(ButtonStyle.Primary)
);
await canalTicket.send({
content:
`${interaction.user} ` +
`<@&${ENCARGADOS_ROLE_ID}> ` +
`<@&${GERENCIA_ROLE_ID}>`,
embeds: [formularioParcial],
components: [botonContinuar],
allowedMentions: {
users: [interaction.user.id],
roles: [
ENCARGADOS_ROLE_ID,
GERENCIA_ROLE_ID
]
}
});
return interaction.editReply({
content:
` Tu ticket ha sido creado: ${canalTicket}\n` +
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
' Este canal no es un ticket de postulación válido.',
ephemeral: true
});
}
if (
datosTema.usuarioId !==
interaction.user.id
) {
return interaction.reply({
content:
' Solo el postulante puede continuar este formulario.',
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
' No se han encontrado los datos de la primera parte.',
ephemeral: true
});
}
if (
mensajeFormulario.embeds[0]?.title !==
' Formulario de postulación en curso'
) {
return interaction.reply({
content:
' Este formulario ya ha sido completado.',
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
.setCustomId('experiencia')
.setLabel(
'¿Qué experiencia tienes?'
)
.setPlaceholder(
'Cuéntanos tu experiencia laboral o en roleplay.'
)
.setStyle(TextInputStyle.Paragraph)
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
.setStyle(TextInputStyle.Paragraph)
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
.setStyle(TextInputStyle.Paragraph)
.setMinLength(5)
.setMaxLength(900)
.setRequired(true);
const motivacion =
new TextInputBuilder()
.setCustomId('motivacion')
.setLabel(
'¿Por qué quieres entrar en Tequilala?'
)
.setPlaceholder(
'Explícanos por qué quieres formar parte del equipo.'
)
.setStyle(TextInputStyle.Paragraph)
.setMinLength(10)
.setMaxLength(900)
.setRequired(true);
modalEntrevista.addComponents(
new ActionRowBuilder().addComponents(
experiencia
),
new ActionRowBuilder().addComponents(
negocioAnterior
),
new ActionRowBuilder().addComponents(
disponibilidad
),
new ActionRowBuilder().addComponents(
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
' Este canal no es un ticket de postulación válido.'
});
}
if (
datosTema.usuarioId !==
interaction.user.id
) {
return interaction.editReply({
content:
' Solo el postulante puede completar este formulario.'
});
}
const mensajeFormulario =
await buscarMensajeFormulario(
interaction.channel
);
if (!mensajeFormulario) {
return interaction.editReply({
content:
' No se han encontrado los datos de la primera parte.'
});
}
const embedAnterior =
mensajeFormulario.embeds[0];
if (
embedAnterior.title !==
' Formulario de postulación en curso'
) {
return interaction.editReply({
content:
' Este formulario ya ha sido completado.'
});
}
const obtenerCampo = (nombre) => {
return (
embedAnterior.fields.find(
(campo) =>
campo.name === nombre
)?.value || 'No especificado'
);
};
const puestoSeleccionado =
obtenerCampo(
' Puesto solicitado'
);
const nombreIC =
obtenerCampo(' Nombre IC');
const edadOOC =
obtenerCampo(' Edad OOC');
const telefonoIC =
obtenerCampo(' Teléfono IC');
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
' Nueva postulación'
)
.setDescription(
'La solicitud está lista para ser revisada por el equipo de Tequilala.'
)
.addFields(
{
name: ' Usuario de Discord',
value:
`${interaction.user}\n\`${interaction.user.id}\``,
inline: false
},
{
name: ' Puesto solicitado',
value: puestoSeleccionado,
inline: false
},
{
name: ' Nombre IC',
value: nombreIC,
inline: false
},
{
name: ' Edad OOC',
value: edadOOC,
inline: true
},
{
name: ' Teléfono IC',
value: telefonoIC,
inline: true
},
{
name: ' Experiencia',
value: experiencia,
inline: false
},
{
name: ' Negocio anterior',
value: negocioAnterior,
inline: false
},
{
name: ' Disponibilidad',
value: disponibilidad,
inline: false
},
{
name: '❤ Motivación',
value: motivacion,
inline: false
}
)
.setTimestamp()
.setFooter({
text:
'Pendiente de revisión • Tequilala Manager'
});
const botonesRevision =
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(
'postulacion_aceptar'
)
.setLabel('Aceptar')
.setEmoji('')
.setStyle(ButtonStyle.Success),
new ButtonBuilder()
.setCustomId(
'postulacion_rechazar'
)
.setLabel('Rechazar')
.setEmoji('')
.setStyle(ButtonStyle.Danger),
new ButtonBuilder()
.setCustomId(
'postulacion_cerrar'
)
.setLabel('Cerrar ticket')
.setEmoji('')
.setStyle(ButtonStyle.Secondary)
);
await mensajeFormulario.edit({
content:
`${interaction.user} ` +
`<@&${ENCARGADOS_ROLE_ID}> ` +
`<@&${GERENCIA_ROLE_ID}>`,
embeds: [resumen],
components: [botonesRevision],
allowedMentions: {
users: [interaction.user.id],
roles: [
ENCARGADOS_ROLE_ID,
GERENCIA_ROLE_ID
]
}
});
await interaction.channel.send({
content:
` ${interaction.user}, tu postulación ha sido enviada correctamente. El equipo de
Tequilala la revisará próximamente.`
});
return interaction.editReply({
content:
' Formulario completado y enviado correctamente.'
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
if (!esPersonalAutorizado(interaction)) {
return interaction.reply({
content:
' No tienes permiso para aceptar postulaciones.',
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
' No se han encontrado los datos del postulante.'
});
}
const mensajeFormulario =
await buscarMensajeFormulario(
interaction.channel
);
if (!mensajeFormulario) {
return interaction.editReply({
content:
' No se ha encontrado el resumen de la postulación.'
});
}
const embedAnterior =
mensajeFormulario.embeds[0];
if (
embedAnterior.title ===
' Postulación aceptada' ||
embedAnterior.title ===
' Postulación rechazada'
) {
return interaction.editReply({
content:
' Esta postulación ya ha sido resuelta.'
});
}
const puesto =
embedAnterior.fields.find(
(campo) =>
campo.name ===
' Puesto solicitado'
)?.value || 'No especificado';
const embedAceptada =
EmbedBuilder.from(embedAnterior)
.setColor(0x2ECC71)
.setTitle(
' Postulación aceptada'
)
.setDescription(
`La postulación ha sido aceptada por ${interaction.user}.`
)
.setFooter({
text:
'Aceptada • Tequilala Manager'
})
.setTimestamp();
const botonCerrar =
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(
'postulacion_cerrar'
)
.setLabel('Cerrar ticket')
.setEmoji('')
.setStyle(ButtonStyle.Secondary)
);
await mensajeFormulario.edit({
embeds: [embedAceptada],
components: [botonCerrar]
});
await interaction.channel.send({
content:
` <@${datosTema.usuarioId}>, tu postulación para **${puesto}** ha sido **aceptada*
*.\n` +
'Un miembro del equipo se pondrá en contacto contigo.'
});
await enviarRegistro({
guild: interaction.guild,
titulo:
' Postulación aceptada',
color: 0x2ECC71,
usuarioId:
datosTema.usuarioId,
puesto,
responsable:
interaction.user,
canal: interaction.channel,
motivo:
'La postulación fue aceptada.'
});
return interaction.editReply({
content:
' Postulación aceptada correctamente.'
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
if (!esPersonalAutorizado(interaction)) {
return interaction.reply({
content:
' No tienes permiso para rechazar postulaciones.',
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
' No se han encontrado los datos del postulante.'
});
}
const mensajeFormulario =
await buscarMensajeFormulario(
interaction.channel
);
if (!mensajeFormulario) {
return interaction.editReply({
content:
' No se ha encontrado el resumen de la postulación.'
});
}
const embedAnterior =
mensajeFormulario.embeds[0];
if (
embedAnterior.title ===
' Postulación aceptada' ||
embedAnterior.title ===
' Postulación rechazada'
) {
return interaction.editReply({
content:
' Esta postulación ya ha sido resuelta.'
});
}
const puesto =
embedAnterior.fields.find(
(campo) =>
campo.name ===
' Puesto solicitado'
)?.value || 'No especificado';
const embedRechazada =
EmbedBuilder.from(embedAnterior)
.setColor(0xE74C3C)
.setTitle(
' Postulación rechazada'
)
.setDescription(
`La postulación ha sido rechazada por ${interaction.user}.`
)
.setFooter({
text:
'Rechazada • Tequilala Manager'
})
.setTimestamp();
const botonCerrar =
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(
'postulacion_cerrar'
)
.setLabel('Cerrar ticket')
.setEmoji('')
.setStyle(ButtonStyle.Secondary)
);
await mensajeFormulario.edit({
embeds: [embedRechazada],
components: [botonCerrar]
});
await interaction.channel.send({
content:
`Hola, <@${datosTema.usuarioId}>. Tu postulación para **${puesto}** ha sido **recha
zada**.\n` +
'Gracias por tu interés en formar parte de Tequilala.'
});
await enviarRegistro({
guild: interaction.guild,
titulo:
' Postulación rechazada',
color: 0xE74C3C,
usuarioId:
datosTema.usuarioId,
puesto,
responsable:
interaction.user,
canal: interaction.channel,
motivo:
'La postulación fue rechazada.'
});
return interaction.editReply({
content:
' Postulación rechazada correctamente.'
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
if (!esPersonalAutorizado(interaction)) {
return interaction.reply({
content:
' No tienes permiso para cerrar este ticket.',
ephemeral: true
});
}
const datosTema =
obtenerDatosTema(
interaction.channel
);
const puesto =
obtenerPuesto(
datosTema?.codigoPuesto
) || 'No especificado';
await interaction.reply({
content:
' El ticket se cerrará en 5 segundos.'
});
if (datosTema) {
await enviarRegistro({
guild: interaction.guild,
titulo:
' Ticket de postulación cerrado',
color: 0x95A5A6,
usuarioId:
datosTema.usuarioId,
puesto,
responsable:
interaction.user,
canal: interaction.channel,
motivo:
'El canal de la postulación fue cerrado.'
});
}
setTimeout(async () => {
await interaction.channel
.delete(
`Ticket cerrado por ${interaction.user.tag}`
)
.catch((error) => {
console.error(
'Error eliminando el ticket:',
error
);
});
}, 5000);
return;
}
} catch (error) {
console.error(
'Error procesando la interacción:',
error
);
if (
!interaction.replied &&
!interaction.deferred
) {
await interaction
.reply({
content:
' Ha ocurrido un error al procesar la acción.',
ephemeral: true
})
.catch(() => null);
} else if (interaction.deferred) {
await interaction
.editReply({
content:
' Ha ocurrido un error al procesar la acción.'
})
.catch(() => null);
}
}
}
);
// =============================
// CONEXIÓN
// =============================
client.login(process.env.DISCORD_TOKEN);
