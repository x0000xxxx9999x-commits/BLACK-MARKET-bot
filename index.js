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

client.once('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح كـ ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // ميزة التخفي: إذا كنت أنت (صاحب السيرفر) في قناة تذكرة
    if (message.channel.name.startsWith('تذكرة-') && message.author.id === message.guild.ownerId) {
        await message.delete().catch(() => {});
        
        const webhooks = await message.channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.name === 'BLACK MARKET');
        if (!webhook) {
            webhook = await message.channel.createWebhook({
                name: 'BLACK MARKET',
                avatar: client.user.displayAvatarURL(),
            });
        }
        
        await webhook.send({
            content: message.content,
            files: Array.from(message.attachments.values()),
            username: 'BLACK MARKET',
            avatarURL: client.user.displayAvatarURL()
        });
        return; 
    }

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
            { name: '📜-قوانين-البلاك-ماركت', type: 'text' },
            { name: '🛒-عروض-الشراء', type: 'text' },
            { name: '⏳-خصم-الشراء-المؤقت', type: 'text' },
            { name: '🚗-شراء-سيارات', type: 'text' },
            { name: '🔫-شراء-أسلحة-خارج-القانون', type: 'text' },
            { name: '🏠-شراء-بيوت', type: 'text' },
            { name: '❓-طلب-شيء-معين', type: 'text' },
            { name: '💰-أبيع-الأشياء', type: 'text' },
            { name: '🎫-التذاكر', type: 'text' }
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
                            deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        },
                        {
                            id: guild.ownerId,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        }
                    ],
                });
            } catch (error) {
                console.error(error);
            }
        }
        message.channel.send('✅ تم إنشاء جميع الأقسام بنجاح! (لن يراها إلا أنت)');
    }

    // أمر إضافة عرض: !offer [العنوان] [السعر] [الوصف] (يعمل في أي قناة بدون شروط)
    if (command === 'offer') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ هذا الأمر للمشرفين فقط.');
        }

        const itemName = args[0]; // العنوان
        const price = args[1];    // السعر
        const description = args.slice(2).join(' '); // الوصف

        if (!itemName || !price) {
            return message.reply('❌ الاستخدام الصحيح: `!offer [العنوان] [السعر] [الوصف]`\nمثال: `!offer بورش 50000 سيارة نظيفة`');
        }

        // التحقق من وجود صورة مرفقة
        const attachment = message.attachments.first();
        let imageUrl = null;
        if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
            imageUrl = attachment.url;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🕶️ BLACK MARKET | ${itemName}`)
            .setDescription(`**الوصف:** ${description || 'لا يوجد وصف'}\n**السعر:** ${price}`)
            .setColor(0x000000)
            .setFooter({ text: 'BLACK MARKET RP' });

        if (imageUrl) {
            embed.setImage(imageUrl); // إضافة الصورة إذا وجدت
        }

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`buy_${itemName}`)
                    .setLabel('🎫 شراء')
                    .setStyle(ButtonStyle.Success)
            );

        // إرسال العرض في نفس القناة التي كتبت فيها الأمر
        await message.channel.send({ embeds: [embed], components: [button] });
        
        // حذف رسالة الأمر الأصلية
        await message.delete().catch(() => {});
    }

    // أمر إنشاء لوحة البيع: !sell_panel
    if (command === 'sell_panel') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ هذا الأمر للمشرفين فقط.');
        }

        const embed = new EmbedBuilder()
            .setTitle('💰 BLACK MARKET | بيع الأشياء')
            .setDescription('هل لديك شيء تريد بيعه لصاحب السوق؟\nاضغط على الزر أدناه لفتح تذكرة خاصة والتفاوض مع صاحب السوق بشكل سري.')
            .setColor(0x000000)
            .setFooter({ text: 'BLACK MARKET RP' });

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('sell_item')
                    .setLabel('💰 تقديم طلب بيع')
                    .setStyle(ButtonStyle.Primary)
            );

        await message.channel.send({ embeds: [embed], components: [button] });
        await message.delete().catch(() => {});
    }

    // أمر إغلاق التذكرة: !close
    if (command === 'close') {
        if (message.channel.name.startsWith('تذكرة-') || message.channel.name.startsWith('بيع-')) {
            await message.channel.delete();
        } else {
            message.reply('❌ هذا الأمر يعمل فقط داخل قنوات التذاكر.');
        }
    }
});

// التعامل مع الأزرار
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // زر الشراء (يأتي من العروض)
    if (interaction.customId.startsWith('buy_')) {
        const itemName = interaction.customId.replace('buy_', '');
        const guild = interaction.guild;
        const user = interaction.user;

        let ticketCategory = guild.channels.cache.find(c => c.name.includes('🎫-التذاكر') && c.type === ChannelType.GuildCategory);
        if (!ticketCategory) {
            ticketCategory = await guild.channels.create({
                name: '🎫-التذاكر',
                type: ChannelType.GuildCategory,
            });
        }

        const ticketChannel = await guild.channels.create({
            name: `تذكرة-${user.username}`,
            type: ChannelType.GuildText,
            parent: ticketCategory.id,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: guild.ownerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ],
        });

        await interaction.reply({ content: `✅ تم إنشاء تذكرتك: ${ticketChannel}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🎫 تذكرة شراء جديدة')
            .setDescription(`مرحباً ${user}، لقد قمت بطلب شراء: **${itemName}**\nالرجاء الانتظار حتى يأتي صاحب السوق للتعامل معك.`)
            .setColor(0x000000);

        await ticketChannel.send({ content: `${user} | <@${guild.ownerId}>`, embeds: [embed] });
    }

    // زر البيع (يأتي من لوحة البيع)
    if (interaction.customId === 'sell_item') {
        const guild = interaction.guild;
        const user = interaction.user;

        let ticketCategory = guild.channels.cache.find(c => c.name.includes('🎫-التذاكر') && c.type === ChannelType.GuildCategory);
        if (!ticketCategory) {
            ticketCategory = await guild.channels.create({
                name: '🎫-التذاكر',
                type: ChannelType.GuildCategory,
            });
        }

        const ticketChannel = await guild.channels.create({
            name: `بيع-${user.username}`,
            type: ChannelType.GuildText,
            parent: ticketCategory.id,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: guild.ownerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ],
        });

        await interaction.reply({ content: `✅ تم إنشاء تذكرة البيع الخاصة بك: ${ticketChannel}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('💰 تذكرة بيع جديدة')
            .setDescription(`مرحباً ${user}، لقد قمت بتقديم طلب لبيع شيء ما.\nالرجاء كتابة تفاصيل ما تريد بيعه وسعره المطلوب، وسيتواصل معك صاحب السوق قريباً.`)
            .setColor(0x000000);

        await ticketChannel.send({ content: `${user} | <@${guild.ownerId}>`, embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
