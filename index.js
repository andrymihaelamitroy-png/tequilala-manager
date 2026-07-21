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
  ChannelType
} = require('discord.js');

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
// INICIO DEL BOT
// =============================

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot conectado como ${readyClient.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(
      process.env.DISCORD_TOKEN
    );

    await rest.put(
      Routes.applicationGuildCommands(readyClient.user.id, GUILD_ID),
      { body: commands }
    );

    console.log('Comandos registrados correctamente.');
  } catch (error) {
    console.error('Error registrando los comandos:', error);
  }
});

// =============================
// INTERACCIONES
// =============================

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Comando /panel-postulaciones
    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === 'panel-postulaciones'
    ) {
      const esEncargado = interaction.member.roles.cache.has(
        ENCARGADOS_ROLE_ID
      );

      const esGerencia = interaction.member.roles.cache.has(
        GERENCIA_ROLE_ID
      );

      const esAdministrador = interaction.member.permissions.has(
        PermissionFlagsBits.Administrator
      );

      if (!esEncargado && !esGerencia && !esAdministrador) {
        return interaction.reply({
          content: '❌ No tienes permiso para publicar este panel.',
          ephemeral: true
        });
      }

      const canal = await client.channels.fetch(
        POSTULACIONES_CHANNEL_ID
      );

      if (!canal || !canal.isTextBased()) {
        return interaction.reply({
          content: '❌ No se ha encontrado el canal de postulaciones.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🍹 Trabaja con nosotros en Tequilala')
        .setDescription(
          [
            '¿Quieres formar parte del equipo de **Tequilala**?',
            '',
            'Selecciona el puesto al que deseas postularte.',
            'Se creará una solicitud privada para que puedas completar el formulario.',
            '',
            '📌 Envía una sola postulación y responde con sinceridad.'
          ].join('\n')
        )
        .addFields(
          {
            name: '🍸 Camarero/a',
            value: 'Atención al público y preparación de bebidas.',
            inline: false
          },
          {
            name: '🛡️ Portero/a',
            value: 'Control de acceso y seguridad del establecimiento.',
            inline: false
          },
          {
            name: '💃 Bailarín/a',
            value: 'Animación y espectáculos dentro del local.',
            inline: false
          }
        )
        .setFooter({
          text: 'Tequilala Manager'
        });

      const botones = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('postulacion_camarero')
          .setLabel('Camarero/a')
          .setEmoji('🍸')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('postulacion_portero')
          .setLabel('Portero/a')
          .setEmoji('🛡️')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('postulacion_bailarin')
          .setLabel('Bailarín/a')
          .setEmoji('💃')
          .setStyle(ButtonStyle.Success)
      );
// Buscar y eliminar paneles anteriores publicados por el bot
const mensajes = await canal.messages.fetch({ limit: 100 });

const panelesAnteriores = mensajes.filter((mensaje) => {
  const titulo = mensaje.embeds[0]?.title;

  return (
    mensaje.author.id === client.user.id &&
    titulo === '🍹 Trabaja con nosotros en Tequilala'
  );
});

for (const mensaje of panelesAnteriores.values()) {
  await mensaje.delete().catch(() => null);
}
      await canal.send({
        embeds: [embed],
        components: [botones]
      });

      return interaction.reply({
        content: `✅ Panel publicado correctamente en <#${POSTULACIONES_CHANNEL_ID}>.`,
        ephemeral: true
      });
    }

 // Crear ticket privado de postulación
if (
  interaction.isButton() &&
  interaction.customId.startsWith('postulacion_')
) {
  await interaction.deferReply({
    ephemeral: true
  });

  const puestos = {
    postulacion_camarero: 'Camarero/a',
    postulacion_portero: 'Portero/a',
    postulacion_bailarin: 'Bailarín/a'
  };

  const puestoSeleccionado = puestos[interaction.customId];

  if (!puestoSeleccionado) {
    return interaction.editReply({
      content: '❌ No se ha podido identificar el puesto seleccionado.'
    });
  }

  const nombreUsuario = interaction.user.username
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

  const nombreCanal = `postulacion-${nombreUsuario}`;

  const canalTicket = await interaction.guild.channels.create({
    name: nombreCanal,
    type: ChannelType.GuildText,
    parent: POSTULACIONES_CATEGORY_ID,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: ENCARGADOS_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: GERENCIA_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ]
  });

  const bienvenida = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('🍹 Postulación para Tequilala')
    .setDescription(
      [
        `¡Bienvenido/a, ${interaction.user}!`,
        '',
        `Has solicitado el puesto de **${puestoSeleccionado}**.`,
        '',
        'En el siguiente paso comenzaremos el formulario de postulación.'
      ].join('\n')
    )
    .setFooter({
      text: 'Tequilala Manager'
    });

  await canalTicket.send({
    content: `${interaction.user} <@&${ENCARGADOS_ROLE_ID}> <@&${GERENCIA_ROLE_ID}>`,
    embeds: [bienvenida]
  });

  return interaction.editReply({
    content: `✅ Tu postulación ha sido creada: ${canalTicket}`
  });
}
  }
});

client.login(process.env.DISCORD_TOKEN);
