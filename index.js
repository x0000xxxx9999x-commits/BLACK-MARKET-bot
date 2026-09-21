const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '!';

// عند تشغيل البوت
client.once('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح كـ ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // أمر الإعداد: !setup
    if (command === 'setup') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ هذا الأمر للمشرفين فقط.');
        }

        const guild = message.guild;
        const categories = [
            { name: '📜 قوانين البلاك ماركت', type: 'text' },
            { name: '🛒 عروض الشراء', type: 'text' },
            { name: '⏳ خصم الشراء المؤقت', type: 'text' },
            { name: '🚗 شراء سيارات', type: 'text' },
            { name: '🔫 شراء أسلحة خارج القانون', type: 'text' },
            { name: '🏠 شراء بيوت', type: 'text' },
            { name: '❓ طلب شيء معين', type: 'text' },
            { name: '💰 أبيع الأشياء', type: 'text' },
            { name: '🎫 التذاكر', type: 'text' }
        ];

        message.reply('⏳ جاري إنشاء الأقسام...');

        for (const cat of categories) {
            try {
                await guild.channels.create({
                    name: cat.name,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionsBitField.Flags.SendMessages], // منع الكتابة للجميع
                        },
                    ],
                });
            } catch (error) {
                console.error(error);
            }
        }
        message.channel.send('✅ تم إنشاء جميع الأقسام بنجاح!');
    }

    // أمر إضافة عرض: !offer [النوع] [الاسم] [السعر] [الوصف]
    if (command === 'offer') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ هذا الأمر للمشرفين فقط.');
        }

        const type = args[0];
        const itemName = args[1];
        const price = args[2];
        const description = args.slice(3).join(' ');

        if (!type || !itemName || !price) {
            return message.reply('❌ الاستخدام الصحيح: `!offer [النوع] [الاسم] [السعر] [الوصف]`\nمثال: `!offer سيارة بورش 50000 سيارة نظيفة جداً`');
        }

        const embed = new EmbedBuilder()
            .setTitle(`🕶️ BLACK MARKET | ${itemName}`)
            .setDescription(`**الوصف:** ${description || 'لا يوجد وصف'}\n**السعر:** ${price}`)
            .setColor(0x000000)
            .setFooter({ text: 'BLACK MARKET RP' });

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`buy_${itemName}`)
                    .setLabel('🎫 شراء')
                    .setStyle(ButtonStyle.Success)
            );

        // تحديد القناة المناسبة بناءً على النوع
        const channelNames = {
            'سيارة': '🚗 شراء سيارات',
            'سلاح': '🔫 شراء أسلحة خارج القانون',
            'بيت': '🏠 شراء بيوت',
            'طلب': '❓ طلب شيء معين',
            'بيع': '💰 أبيع الأشياء'
        };

        const targetChannel = message.guild.channels.cache.find(c => c.name === channelNames[type]);
        if (!targetChannel) {
            return message.reply('❌ لم يتم العثور على القناة المناسبة. تأكد من كتابة النوع بشكل صحيح (سيارة، سلاح، بيت، طلب، بيع).');
        }

        await targetChannel.send({ embeds: [embed], components: [button] });
        message.reply(`✅ تم نشر العرض في ${targetChannel}`);
    }

    // أمر إغلاق التذكرة: !close
    if (command === 'close') {
        if (message.channel.name.startsWith('تذكرة-')) {
            await message.channel.delete();
        } else {
            message.reply('❌ هذا الأمر يعمل فقط داخل قنوات التذاكر.');
        }
    }
});

// التعامل مع الأزرار
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('buy_')) {
        const itemName = interaction.customId.replace('buy_', '');
        const guild = interaction.guild;
        const user = interaction.user;

        // البحث عن قناة التذاكر
        let ticketCategory = guild.channels.cache.find(c => c.name === '🎫 التذاكر' && c.type === ChannelType.GuildCategory);
        if (!ticketCategory) {
            // إذا لم تكن موجودة، نقوم بإنشائها
            ticketCategory = await guild.channels.create({
                name: '🎫 التذاكر',
                type: ChannelType.GuildCategory,
            });
        }

        // إنشاء قناة التذكرة
        const ticketChannel = await guild.channels.create({
            name: `تذكرة-${user.username}`,
            type: ChannelType.GuildText,
            parent: ticketCategory.id,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: guild.ownerId, // صاحب السيرفر (أنت)
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        await interaction.reply({ content: `✅ تم إنشاء تذكرتك: ${ticketChannel}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🎫 تذكرة شراء جديدة')
            .setDescription(`مرحباً ${user}، لقد قمت بطلب شراء: **${itemName}**\nالرجاء الانتظار حتى يأتي صاحب السوق للتعامل معك.`)
            .setColor(0x000000);

        await ticketChannel.send({ content: `${user} | <@${guild.ownerId}>`, embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
