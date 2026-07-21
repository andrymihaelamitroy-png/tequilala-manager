const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
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

client.once('clientReady', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
