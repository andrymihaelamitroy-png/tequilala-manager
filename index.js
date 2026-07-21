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
// COMANDOS
// =============================

const commands = [
  new SlashCommandBuilder()
    .setName('panel-postulaciones')
    .setDescription('Publica el panel de postulaciones de Tequilala')
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
      titulo === '📝 Formulario de postulación en curso' ||
      titulo === '📋 Nueva postulación' ||
      titulo === '✅ Postulación aceptada' ||
      titulo === '❌ Postulación rechazada'
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
        name: '👤 Postulante',
        value: `<@${usuarioId}>`,
        inline: true
      },
      {
        name: '🍹 Puesto',
        value: puesto || 'No especificado',
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
              '❌ No tienes permiso para publicar este panel.',
            ephemeral: true
          });
        }

        const canal = await client.channels.fetch(
          POSTULACIONES_CHANNEL_ID
        );

        if (!canal || !canal.isTextBased()) {
          return interaction.reply({
            content:
              '❌ No se ha encontrado el canal de postulaciones.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
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
              name: '🍸 Camarero/a',
              value:
                'Atención al público y preparación de bebidas.',
              inline: false
            },
            {
              name: '🛡️ Portero/a',
              value:
                'Control de acceso y seguridad del establecimiento.',
              inline: false
            },
            {
              name: '💃 Bailarín/a',
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
              .setEmoji('🍸')
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId(
                'postulacion_portero'
              )
              .setLabel('Portero/a')
              .setEmoji('🛡️')
              .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
              .setCustomId(
                'postulacion_bailarin'
              )
              .setLabel('Bailarín/a')
              .setEmoji('💃')
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
                '🍹 Trabaja con nosotros en Tequilala'
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
                name: '👤 Usuario de Discord',
                value:
                  `${interaction.user}\n\`${interaction.user.id}\``,
                inline: false
              },
              {
                name: '🍹 Puesto solicitado',
                value: puestoSeleccionado,
                inline: false
              },
              {
                name: '🪪 Nombre IC',
                value: nombreIC,
                inline: false
              },
              {
                name: '🎂 Edad OOC',
                value: edadOOC,
                inline: true
              },
              {
                name: '📱 Teléfono IC',
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
              .setEmoji('📝')
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
          mensajeFormulario.embeds[0]?.title !==
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
            )?.value || 'No especificado'
          );
        };

        const puestoSeleccionado =
          obtenerCampo(
            '🍹 Puesto solicitado'
          );

        const nombreIC =
          obtenerCampo('🪪 Nombre IC');

        const edadOOC =
          obtenerCampo('🎂 Edad OOC');

        const telefonoIC =
          obtenerCampo('📱 Teléfono IC');

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
                name: '👤 Usuario de Discord',
                value:
                  `${interaction.user}\n\`${interaction.user.id}\``,
                inline: false
              },
              {
                name: '🍹 Puesto solicitado',
                value: puestoSeleccionado,
                inline: false
              },
              {
                name: '🪪 Nombre IC',
                value: nombreIC,
                inline: false
              },
              {
                name: '🎂 Edad OOC',
                value: edadOOC,
                inline: true
              },
              {
                name: '📱 Teléfono IC',
                value: telefonoIC,
                inline: true
              },
              {
                name: '💼 Experiencia',
                value: experiencia,
                inline: false
              },
              {
                name: '🏢 Negocio anterior',
                value: negocioAnterior,
                inline: false
              },
              {
                name: '🕒 Disponibilidad',
                value: disponibilidad,
                inline: false
              },
              {
                name: '❤️ Motivación',
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
              .setEmoji('✅')
              .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
              .setCustomId(
                'postulacion_rechazar'
              )
              .setLabel('Rechazar')
              .setEmoji('❌')
              .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
              .setCustomId(
                'postulacion_cerrar'
              )
              .setLabel('Cerrar ticket')
              .setEmoji('🔒')
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
            `✅ ${interaction.user}, tu postulación ha sido enviada correctamente. El equipo de Tequilala la revisará próximamente.`
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
        if (!esPersonalAutorizado(interaction)) {
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
              '❌ No se han encontrado los datos del postulante.'
          });
        }

        const mensajeFormulario =
          await buscarMensajeFormulario(
            interaction.channel
          );

        if (!mensajeFormulario) {
          return interaction.editReply({
            content:
              '❌ No se ha encontrado el resumen de la postulación.'
          });
        }

        const embedAnterior =
          mensajeFormulario.embeds[0];

        if (
          embedAnterior.title ===
            '✅ Postulación aceptada' ||
          embedAnterior.title ===
            '❌ Postulación rechazada'
        ) {
          return interaction.editReply({
            content:
              '❌ Esta postulación ya ha sido resuelta.'
          });
        }

        const puesto =
          embedAnterior.fields.find(
            (campo) =>
              campo.name ===
              '🍹 Puesto solicitado'
          )?.value || 'No especificado';

        const embedAceptada =
          EmbedBuilder.from(embedAnterior)
            .setColor(0x2ECC71)
            .setTitle(
              '✅ Postulación aceptada'
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
              .setEmoji('🔒')
              .setStyle(ButtonStyle.Secondary)
          );

        await mensajeFormulario.edit({
          embeds: [embedAceptada],
          components: [botonCerrar]
        });

        await interaction.channel.send({
          content:
            `🎉 <@${datosTema.usuarioId}>, tu postulación para **${puesto}** ha sido **aceptada**.\n` +
            'Un miembro del equipo se pondrá en contacto contigo.'
        });

        await enviarRegistro({
          guild: interaction.guild,
          titulo:
            '✅ Postulación aceptada',
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
            '✅ Postulación aceptada correctamente.'
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
              '❌ No se han encontrado los datos del postulante.'
          });
        }

        const mensajeFormulario =
          await buscarMensajeFormulario(
            interaction.channel
          );

        if (!mensajeFormulario) {
          return interaction.editReply({
            content:
              '❌ No se ha encontrado el resumen de la postulación.'
          });
        }

        const embedAnterior =
          mensajeFormulario.embeds[0];

        if (
          embedAnterior.title ===
            '✅ Postulación aceptada' ||
          embedAnterior.title ===
            '❌ Postulación rechazada'
        ) {
          return interaction.editReply({
            content:
              '❌ Esta postulación ya ha sido resuelta.'
          });
        }

        const puesto =
          embedAnterior.fields.find(
            (campo) =>
              campo.name ===
              '🍹 Puesto solicitado'
          )?.value || 'No especificado';

        const embedRechazada =
          EmbedBuilder.from(embedAnterior)
            .setColor(0xE74C3C)
            .setTitle(
              '❌ Postulación rechazada'
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
              .setEmoji('🔒')
              .setStyle(ButtonStyle.Secondary)
          );

        await mensajeFormulario.edit({
          embeds: [embedRechazada],
          components: [botonCerrar]
        });

        await interaction.channel.send({
          content:
            `Hola, <@${datosTema.usuarioId}>. Tu postulación para **${puesto}** ha sido **rechazada**.\n` +
            'Gracias por tu interés en formar parte de Tequilala.'
        });

        await enviarRegistro({
          guild: interaction.guild,
          titulo:
            '❌ Postulación rechazada',
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
            '✅ Postulación rechazada correctamente.'
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
              '❌ No tienes permiso para cerrar este ticket.',
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
            '🔒 El ticket se cerrará en 5 segundos.'
        });

        if (datosTema) {
          await enviarRegistro({
            guild: interaction.guild,
            titulo:
              '🔒 Ticket de postulación cerrado',
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
              '❌ Ha ocurrido un error al procesar la acción.',
            ephemeral: true
          })
          .catch(() => null);
      } else if (interaction.deferred) {
        await interaction
          .editReply({
            content:
              '❌ Ha ocurrido un error al procesar la acción.'
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
